import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ConfigService } from '../config/config.service';
import { MatDialog } from '@angular/material/dialog';
import { GameStateService } from '../game-state/game-state.service';
import { LoadingService } from '../loading/loading.service';
import {
  CreateGameResponse,
  JoinGameResponse,
} from '../../interfaces/api-responses';

import * as SocketIOClient from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: SocketIOClient.Socket;
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<string>('disconnected');
  private reconnectionTimeout: any = null;
  private readonly RECONNECTION_TIMEOUT_MS = 20000; // 20 seconds

  readonly dialog = inject(MatDialog);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private gameStateService = inject(GameStateService);
  private configService = inject(ConfigService);

  constructor() {
    this.socket = SocketIOClient.default(this.configService.serverUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupSocketListeners();
    window.addEventListener('beforeunload', () => this.disconnect());
  }

  ngOnDestroy() {
    this.clearReconnectionTimeout();
    this.disconnect();
    window.removeEventListener('beforeunload', () => this.disconnect());
  }

  clearAndDisconnect() {
    this.disconnect();
  }

  private startReconnectionTimeout(): void {
    this.clearReconnectionTimeout();
    this.reconnectionTimeout = setTimeout(() => {
      console.log('Reconnection timeout reached. Redirecting to home.');
      this.loadingService.hide();
      this.connectionStatus.next('failed');
      this.gameStateService.clearGameState();
      this.router.navigate(['/disconnected']);
    }, this.RECONNECTION_TIMEOUT_MS);
  }

  private clearReconnectionTimeout(): void {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
  }

  public connect(): void {
    if (this.socket.disconnected) {
      this.socket.connect();
    }
  }
  private setupSocketListeners(): void {
    // --- Socket.IO Event Listeners ---

    this.socket.on('connect', () => {
      console.log('Connected to server with socket ID:', this.socket!.id);
      this.connectionStatus.next('connected');
      this.loadingService.hide(); // Hide loading on successful connect/reconnect
      this.clearReconnectionTimeout(); // Clear timeout on successful connection
      // If we were in a game, attempt to rejoin
      this.rejoinGame();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from server. Reason:', reason);

      // If the disconnect was NOT initiated by our client code calling .disconnect()
      // then it's an unexpected event (server crash, network loss) and we should
      // immediately show the user we are trying to reconnect.
      if (reason !== 'io client disconnect') {
        // Immediately clear host status from client
        this.gameStateService.updateGameState({
          isHost: false,
        });
        this.connectionStatus.next('reconnecting');
        this.loadingService.show({
          message: 'Reconnecting',
        });
        this.startReconnectionTimeout(); // Start timeout for reconnection
      } else {
        // This was a deliberate disconnect (e.g., user left the lobby or game).
        // Just update the status, no loading spinner needed.
        this.connectionStatus.next('disconnected');
        this.clearReconnectionTimeout(); // Clear timeout for deliberate disconnects
      }
    });

    this.socket.on('forceDisconnect', (data: { message: string }) => {
      console.warn('Forcefully disconnected by server:', data.message);

      // We were kicked because a new tab took over.
      // 1. Stop any "reconnecting..." spinners.
      this.loadingService.hide();
      this.connectionStatus.next('disconnected');
      this.clearReconnectionTimeout(); // Clear timeout for force disconnect

      // 2. Prevent this client from attempting to reconnect automatically.
      // By calling disconnect(), we ensure 'io client disconnect' is the reason,
      // which our 'disconnect' handler above will ignore for reconnection purposes.
      this.disconnect();

      // 3. Redirect the user to the main menu with a disconnected state, which triggers the disconnected modal.
      this.router.navigate(['/disconnected']).then(() => {
        // 4. Clear local game state so a page refresh doesn't try to rejoin.
        // This is done after navigation completes to avoid race condition with LobbyComponent
        this.gameStateService.clearGameState();
      });
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Connection Error:', error);
      this.connectionStatus.next('error');
    });

    this.socket.on('reconnect_attempt', (attempt: any) => {
      console.log(`Reconnect attempt #${attempt}`);
    });

    this.socket.on('reconnect', (attempt: any) => {
      console.log(`Successfully reconnected after ${attempt} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to the server.');
      this.connectionStatus.next('failed');
      this.loadingService.hide();
      this.clearReconnectionTimeout(); // Clear timeout when reconnection definitively fails
      this.router.navigate(['/disconnected']);
    });

    this.socket.on('message', (data: { type: string; [key: string]: any }) => {
      // Update game state with the last game end timestamp when a game ends
      if (data.type === 'gameEnded' && data['lastGameEndTimestamp']) {
        this.gameStateService.updateGameState({
          lastGameEndTimestamp: data['lastGameEndTimestamp'],
        });
      }
      this.messageSubject.next(data);

      // Clear pending wins when the game ends
      if (data.type === 'gameEnded') {
        this.gameStateService.clearPendingWin();
      }
    });

    this.socket.on('error', (data: any) => {
      this.messageSubject.next({ type: 'error', ...data });

      // Clear pending wins on certain errors that indicate the game is no longer valid
      if (
        data.message &&
        (data.message.includes('not found') || data.message.includes('expired'))
      ) {
        this.gameStateService.clearPendingWin();
      }
    });
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  private async rejoinGame(): Promise<void> {
    // Get the game state from the GameStateService.
    const gameState = this.gameStateService.getCurrentState();
    const { gameCode, localPlayerId } = gameState;

    if (gameCode && localPlayerId) {
      console.log(
        `Attempting to rejoin game: ${gameCode} as player ${localPlayerId}`,
      );
      try {
        // First, await the acknowledgment that we have successfully rejoined the game.
        await this.joinGame(gameCode, localPlayerId);

        // After successfully rejoining, check for any pending win that needs to be sent
        if (this.gameStateService.hasPendingWin()) {
          const pendingWin = gameState.pendingWin;
          if (pendingWin && pendingWin.playerId === localPlayerId) {
            console.log(
              'Resending pending win announcement after reconnection',
            );
            this.socket.emit('win', {
              gameCode,
              playerId: pendingWin.playerId,
              condensedGrid: pendingWin.condensedGrid,
            });
            // Clear the pending win since we've now sent it
            this.gameStateService.clearPendingWin();
          }
        }
      } catch (error) {
        console.log('Failed to rejoin game:', error);
        // Handle failed rejoin if necessary (e.g., game was deleted while disconnected)
      }
    }
  }

  private async emitWithAck<T>(event: string, ...args: any[]): Promise<T> {
    if (!this.socket.connected) {
      console.log(
        `Socket not connected. Waiting for connection before emitting '${event}'...`,
      );
      this.socket.connect();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.socket.off('connect', resolve);
          reject('Connection timeout (1)');
        }, 15000);
        this.socket.once('connect', () => {
          clearTimeout(timeout);
          console.log(`Socket connected! Proceeding with emit for '${event}'.`);
          resolve();
        });
      });
    }

    return new Promise<T>((resolve, reject) => {
      const ackTimeout = setTimeout(() => {
        reject(`Server acknowledgement timeout for event '${event}'.`);
      }, 10000);
      this.socket.emit(
        event,
        ...args,
        (response: { success: boolean; message?: string } & T) => {
          clearTimeout(ackTimeout);
          if (response && response.success) {
            resolve(response);
          } else {
            reject(
              response?.message ||
                `Event '${event}' failed with an unknown error.`,
            );
          }
        },
      );
    });
  }

  async createGame(): Promise<CreateGameResponse> {
    const response = await this.emitWithAck<CreateGameResponse>('create');
    if (response.success && response.playerId) {
      // Tell the GameStateService to update the player ID and host status
      this.gameStateService.updateGameState({
        localPlayerId: response.playerId,
        players: response.players,
        isHost: response.players.some(
          (p) => p.isHost && p.id === response.playerId,
        ),
      });
    }
    return response;
  }

  async joinGame(
    gameCode: string,
    playerId?: string | null,
  ): Promise<JoinGameResponse> {
    // Get the playerId from GameStateService if not provided.
    const finalPlayerId =
      playerId || this.gameStateService.getCurrentState().localPlayerId;

    const response = await this.emitWithAck<JoinGameResponse>('join', {
      gameCode,
      playerId: finalPlayerId,
    });

    console.log('Join game response:', response);

    if (response.success && response.playerId) {
      // Tell the GameStateService to update the player ID
      this.gameStateService.updateGameState({
        localPlayerId: response.playerId,
        players: response.players,
        isHost: response.players.some(
          (p) => p.isHost && p.id === response.playerId,
        ),
        gameSeed: response.gameSeed,
        gameMode: 'versus',
        currentGameTime: response.currentGameTime,
        isInGame: response.isGameActive,
        lastGameEndTimestamp: response.lastGameEndTimestamp,
      });

      // Handle game state sync
      this.messageSubject.next({
        type: 'syncGameState',
        time: response.currentGameTime,
        isGameEnded: response.gameEnded,
        gameEndData: response.gameEndData,
      });
    }
    return response;
  }

  updatePlayer(gameCode: string, playerId: string, updates: any): Promise<any> {
    return this.emitWithAck('updatePlayer', { gameCode, playerId, updates });
  }

  startGame(gameCode: string): void {
    this.socket.emit('startGame', { gameCode });
  }

  playerReady(gameCode: string): Promise<any> {
    const playerId = this.gameStateService.getCurrentState().localPlayerId;
    if (!playerId) {
      return Promise.reject('Cannot ready up: local player ID not found.');
    }
    return this.emitWithAck('playerReady', { gameCode, playerId });
  }

  sendPostGameCellClick(gameCode: string, row: number, col: number): void {
    if (this.socket.connected) {
      this.socket.emit('postGameCellClick', { gameCode, row, col });
    }
  }

  async announceWin(
    playerId: string,
    condensedGrid: string[][],
  ): Promise<void> {
    // Get the current game code from GameStateService
    const gameCode = this.gameStateService.getCurrentState().gameCode;

    if (!gameCode) {
      console.error('Cannot announce win: no game code available.');
      return;
    }

    // Check if we're connected before attempting to send
    if (this.socket.connected) {
      try {
        // Use emitWithAck for reliable delivery of this critical message
        await this.emitWithAck('win', {
          gameCode,
          playerId,
          condensedGrid,
        });
        // Clear any pending win since we successfully sent it
        this.gameStateService.clearPendingWin();
        console.log('Win announcement sent successfully');
      } catch (error) {
        console.error('Failed to send win announcement:', error);
        // Store the win information for later transmission when we reconnect
        this.gameStateService.setPendingWin(playerId, condensedGrid);
      }
    } else {
      // Store the win information for later transmission when we reconnect
      console.log(
        'Socket disconnected during win announcement. Storing win information for reconnect.',
      );
      this.gameStateService.setPendingWin(playerId, condensedGrid);

      // Try to reconnect immediately
      this.connect();
    }
  }

  simulateDisconnect(): void {
    //this simulates a "clean" disconnect, triggered by the user.
    if (this.socket) {
      this.socket.disconnect();
      // need to manually show the loading spinner in this case because it's typically skipped for other clean disconnects
      // show this after a delay for debugging
      setTimeout(() => {
        // Immediately clear host status from client
        this.gameStateService.updateGameState({
          isHost: false,
        });
        this.loadingService.show({
          message: 'Reconnecting',
        });
        this.startReconnectionTimeout(); // Start timeout for simulated reconnection
      }, 0);
      setTimeout(() => {
        this.connectionStatus.next('reconnecting');
        setTimeout(() => {
          this.socket.connect();
        }, 500);
      }, 3000);
    }
  }

  getConnectionStatus(): Observable<string> {
    return this.connectionStatus.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connectionStatus
      .asObservable()
      .pipe(map((status) => status === 'connected'));
  }

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }
}
