import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '../config/config.service';
import { MatDialog } from '@angular/material/dialog';
import { GameStateService } from '../game-state/game-state.service';
import { LoadingService } from '../loading/loading.service';
import {
  CreateGameResponse,
  JoinGameResponse,
} from '../../interfaces/api-responses';

import * as SocketIOClient from 'socket.io-client';

// REMOVED PLAYER_ID_STORAGE_KEY constant, as it's now managed by GameStateService

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: SocketIOClient.Socket;
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<string>('disconnected');

  readonly dialog = inject(MatDialog);
  private loadingService = inject(LoadingService);
  // Inject GameStateService here
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
    this.disconnect();
    window.removeEventListener('beforeunload', () => this.disconnect());
  }

  clearAndDisconnect() {
    this.disconnect();
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

      // If we were in a game, attempt to rejoin
      this.rejoinGame();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from server. Reason:', reason);
      this.connectionStatus.next('disconnected');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Connection Error:', error);
      this.connectionStatus.next('error');
    });

    this.socket.on('reconnect_attempt', (attempt: any) => {
      console.log(`Reconnect attempt #${attempt}`);
      this.connectionStatus.next('reconnecting');
      this.loadingService.show({ message: 'Reconnecting' });
    });

    this.socket.on('reconnect', (attempt: any) => {
      console.log(`Successfully reconnected after ${attempt} attempts`);
      this.connectionStatus.next('connected');
      this.loadingService.hide();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to the server.');
      this.connectionStatus.next('failed');
      this.loadingService.hide();
    });

    this.socket.on('message', (data: { type: string; [key: string]: any }) => {
      this.messageSubject.next(data);
    });

    this.socket.on('error', (data: any) =>
      this.messageSubject.next({ type: 'error', ...data }),
    );
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
        await this.joinGame(gameCode, localPlayerId, true);

        // // THE FIX: Now that we're back in the room, explicitly request the
        // // full player list to re-sync our client's state.
        // console.log('Rejoin successful. Requesting updated player list.');
        // this.getPlayers(gameCode);
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
          // MODIFIED: Removed non-null assertion
          this.socket.off('connect', resolve);
          reject('Connection timeout while waiting to emit event.');
        }, 15000);
        // MODIFIED: Removed non-null assertion
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
      // MODIFIED: Removed non-null assertion
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
      // Tell the GameStateService to update the player ID
      this.gameStateService.updateGameState({
        localPlayerId: response.playerId,
      });
    }
    return response;
  }

  async joinGame(
    gameCode: string,
    playerId?: string | null,
    isRejoin?: boolean,
  ): Promise<JoinGameResponse> {
    // Get the playerId from GameStateService if not provided.
    const finalPlayerId =
      playerId || this.gameStateService.getCurrentState().localPlayerId;

    const response = await this.emitWithAck<JoinGameResponse>('join', {
      gameCode,
      playerId: finalPlayerId,
    });

    if (response.success && response.playerId) {
      // Tell the GameStateService to update the player ID
      this.gameStateService.updateGameState({
        localPlayerId: response.playerId,
      });

      if (response.gameEnded && response.gameEndData) {
        this.messageSubject.next({
          type: 'gameEndedWhileDisconnected',
          ...response.gameEndData,
        });
      }

      // Handle timer synchronization data if rejoin
      if (
        isRejoin &&
        response.isGameActive &&
        response.currentGameTime !== undefined
      ) {
        this.messageSubject.next({
          type: 'timerSync',
          currentGameTime: response.currentGameTime,
          gameState: response.gameState,
          isGameActive: response.isGameActive,
        });
      }
    }
    return response;
  }

  getPlayers(gameCode: string): void {
    this.socket.emit('getPlayers', { gameCode });
  }

  updatePlayer(gameCode: string, playerId: string, updates: any): Promise<any> {
    return this.emitWithAck('updatePlayer', { gameCode, playerId, updates });
  }

  readyUp(gameCode: string, playerId: string): void {
    this.socket.emit('playerReady', { gameCode, playerId });
  }

  startGame(gameCode: string): void {
    this.socket.emit('startGame', { gameCode });
  }

  announceWin(playerId: string, condensedGrid: string[][]): void {
    // Get the current game code from GameStateService
    const gameCode = this.gameStateService.getCurrentState().gameCode;

    if (gameCode) {
      this.socket.emit('win', {
        gameCode,
        playerId,
        condensedGrid,
      });
    } else {
      console.error('Cannot announce win: no game code available.');
    }
  }

  requestGameState(gameCode: string): void {
    this.socket.emit('requestGameState', { gameCode });
  }

  simulateDisconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      setTimeout(() => {
        this.connectionStatus.next('reconnecting');
        setTimeout(() => {
          this.socket.connect();
        }, 500);
      }, 1000);
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
