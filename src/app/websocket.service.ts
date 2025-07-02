// src/app/websocket.service.ts

import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { DialogSettings } from './dialog/dialog-settings';
import { Dialog } from './dialog/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { GameStateService } from './game-state.service';
import {
  CreateGameResponse,
  JoinGameResponse,
} from './interfaces/api-responses';

// Import the new library
import * as SocketIOClient from 'socket.io-client';
const PLAYER_ID_STORAGE_KEY = 'crossrace_player_id';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  // Use the Socket.IO Socket type
  private socket: SocketIOClient.Socket | null = null;

  // We can keep these as they are, they're for internal app logic
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<string>('disconnected');

  // These state properties are still useful for rejoining
  private currentGameCode: string | null = null;
  // private currentPlayerId: string | null = null;

  readonly dialog = inject(MatDialog);

  constructor(private gameStateService: GameStateService) {
    this.connect(); // Connect immediately on service instantiation
    window.addEventListener('beforeunload', () => this.disconnect());
  }

  private getPlayerId(): string | null {
    return localStorage.getItem(PLAYER_ID_STORAGE_KEY);
  }

  private setPlayerId(id: string): void {
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, id);
  }

  ngOnDestroy() {
    this.disconnect();
    window.removeEventListener('beforeunload', () => this.disconnect());
  }

  clearAndDisconnect() {
    this.currentGameCode = null;
    this.disconnect();
  }

  // --- New Connection Logic with Socket.IO ---
  private connect(): void {
    if (this.socket) {
      // If a socket exists, don't create a new one. Let Socket.IO handle it.
      return;
    }

    // Connect to the server. Socket.IO will automatically handle reconnection.
    this.socket = SocketIOClient.default(environment.serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

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

      // Socket.IO will automatically attempt to reconnect for most disconnect reasons
      // except 'io client disconnect' (manual disconnect by client)
      // No need to manually call connect() here - let Socket.IO handle it
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Connection Error:', error);
      this.connectionStatus.next('error');
    });

    this.socket.on('reconnect_attempt', (attempt: any) => {
      console.log(`Reconnect attempt #${attempt}`);
      this.connectionStatus.next('reconnecting');
      // You can still show a dialog if you want
      this.openReconnectDialog();
    });

    this.socket.on('reconnect', (attempt: any) => {
      console.log(`Successfully reconnected after ${attempt} attempts`);
      this.connectionStatus.next('connected');
      // Note: rejoinGame() is already called in the 'connect' event handler
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to the server.');
      this.connectionStatus.next('failed');
    });

    // --- Unified Game Event Listener ---
    // All game-related messages will come through this single event.
    // The data object itself will contain the 'type' to distinguish them.
    this.socket.on('message', (data: { type: string; [key: string]: any }) => {
      this.messageSubject.next(data);
    });

    // A listener for errors from the server
    this.socket.on('error', (data: any) =>
      this.messageSubject.next({ type: 'error', ...data }),
    );
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  openReconnectDialog() {
    // This logic can remain the same
    const dialogRef = this.dialog.open(Dialog, {
      data: DialogSettings.dialogSettingsReconnecting,
      disableClose: true,
    });
  }

  // This logic is still useful for re-establishing game state on a fresh connect
  private rejoinGame(): void {
    const playerId = this.getPlayerId(); // Get ID from localStorage
    if (this.currentGameCode && playerId) {
      console.log(
        `Attempting to rejoin game: ${this.currentGameCode} as player ${playerId}`,
      );

      // Try to rejoin the game
      // The joinGame response will now include game end information if the game ended while disconnected
      this.joinGame(this.currentGameCode, playerId).catch((error) => {
        console.log('Failed to rejoin game:', error);
        // If rejoin fails completely, the game might not exist anymore
        // The error handling in the calling component will handle navigation
      });
    }
  }

  // Method to store game details for rejoining
  setCurrentGame(gameCode: string): void {
    this.currentGameCode = gameCode;
  }

  // --- Simplified Emitter Methods ---
  // We now use `socket.emit` and get responses via callbacks, which is cleaner than send/receive.

  private async emitWithAck<T>(event: string, ...args: any[]): Promise<T> {
    // This check remains valid.
    if (!this.socket) {
      return Promise.reject('Socket service has not been initialized.');
    }

    // If we're not connected, we need to connect and wait.
    if (!this.socket.connected) {
      console.log(
        `Socket not connected. Waiting for connection before emitting '${event}'...`,
      );

      // THE FIX: Simply call .connect(). The library will handle the state.
      // If it's already trying to connect, this call is safely ignored.
      // If it's disconnected, this will start the connection process.
      this.socket.connect();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.socket!.off('connect', resolve);
          reject('Connection timeout while waiting to emit event.');
        }, 15000);

        this.socket!.once('connect', () => {
          clearTimeout(timeout);
          console.log(`Socket connected! Proceeding with emit for '${event}'.`);
          resolve();
        });
      });
    }

    // At this point, we are guaranteed to be connected.
    return new Promise<T>((resolve, reject) => {
      const ackTimeout = setTimeout(() => {
        reject(`Server acknowledgement timeout for event '${event}'.`);
      }, 10000);

      this.socket!.emit(
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
    // Here, we tell emitWithAck that we expect the response to match the CreateGameResponse interface.
    const response = await this.emitWithAck<CreateGameResponse>('create');

    // Now, TypeScript knows `response` has a `.playerId`, `.success`, etc. The error is gone.
    if (response.success && response.playerId) {
      this.setPlayerId(response.playerId);
    }
    return response;
  }

  async joinGame(
    gameCode: string,
    playerId?: string | null,
  ): Promise<JoinGameResponse> {
    const finalPlayerId = playerId || this.getPlayerId();

    // Tell emitWithAck we expect a JoinGameResponse.
    const response = await this.emitWithAck<JoinGameResponse>('join', {
      gameCode,
      playerId: finalPlayerId,
    });

    // TypeScript now knows the shape of `response`. No more error.
    if (response.success && response.playerId) {
      this.setPlayerId(response.playerId);

      // Check if the game ended while we were disconnected
      if (response.gameEnded && response.gameEndData) {
        console.log('Game ended while disconnected, notifying components');
        // Send a gameEnded message to components
        this.messageSubject.next({
          type: 'gameEndedWhileDisconnected',
          ...response.gameEndData,
        });
      }
    }
    return response;
  }

  getPlayers(gameCode: string): void {
    // This event doesn't need an acknowledgement, it just triggers a `playerList` event
    this.socket?.emit('getPlayers', { gameCode });
  }

  updatePlayer(gameCode: string, playerId: string, updates: any): Promise<any> {
    return this.emitWithAck('updatePlayer', { gameCode, playerId, updates });
  }

  readyUp(gameCode: string, playerId: string): void {
    this.socket?.emit('playerReady', { gameCode, playerId });
  }

  startGame(gameCode: string): void {
    this.socket?.emit('startGame', { gameCode });
  }

  announceWin(playerId: string, condensedGrid: string[][], time: string): void {
    // Assuming gameCode is available in the component calling this
    if (this.currentGameCode) {
      this.socket?.emit('win', {
        gameCode: this.currentGameCode,
        playerId,
        condensedGrid,
        time,
      });
    } else {
      console.error('Cannot announce win: no game code available.');
    }
  }

  // Request current game state after reconnection
  requestGameState(gameCode: string): void {
    this.socket?.emit('requestGameState', { gameCode });
  }

  // Check if game has ended while disconnected (for reconnection edge cases)
  checkGameStatus(gameCode: string): void {
    console.log(`Checking if game ${gameCode} ended while disconnected...`);
    this.socket?.emit('checkGameStatus', { gameCode });
  }

  // Notify server that player is active in game (for reconnection tracking)
  confirmGameParticipation(gameCode: string, playerId: string): void {
    this.socket?.emit('confirmGameParticipation', { gameCode, playerId });
  }

  // DEBUG: Simulate disconnect for testing reconnection
  simulateDisconnect(): void {
    console.log('Simulating disconnect for testing...');
    if (this.socket) {
      // Force disconnect the socket
      this.socket.disconnect();

      // Since manual disconnect doesn't trigger auto-reconnect,
      // we need to manually simulate the reconnection process
      setTimeout(() => {
        console.log('Simulating reconnection attempt...');
        this.connectionStatus.next('reconnecting');

        // Then attempt to reconnect after showing reconnecting status
        setTimeout(() => {
          console.log('Attempting to reconnect after simulated disconnect...');
          this.socket?.connect();
        }, 500);
      }, 1000); // 1 second delay before showing "reconnecting"
    }
  }

  // --- Observable Getters (these can largely stay the same) ---

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
