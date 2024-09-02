import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<string>('disconnected');
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private connectionPromise: Promise<void> | null = null;
  private connectionTimeout: number | undefined;

  private currentGameCode: string | null = null;
  private currentPlayerId: string | null = null;

  constructor() {
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  ngOnDestroy() {
    this.disconnect();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleBeforeUnload(event: BeforeUnloadEvent) {
    this.disconnect();
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout !== undefined) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = undefined;
    }
  }

  // New method to set current game information
  setCurrentGame(gameCode: string, playerId: string): void {
    console.log('Setting current game information');
    this.currentGameCode = gameCode;
    this.currentPlayerId = playerId;
  }

  // New method to rejoin the game after reconnection
  private rejoinGame(): void {
    console.log(this.currentGameCode);
    console.log(this.currentPlayerId);
    if (this.currentGameCode && this.currentPlayerId) {
      console.log('yeah!');
      console.log(`Attempting to rejoin game: ${this.currentGameCode}`);
      this.send({
        action: 'join',
        gameCode: this.currentGameCode,
        playerId: this.currentPlayerId,
      });
    }
  }

  connect(): Promise<void> {
    console.log('Connect method called');
    if (this.connectionPromise) {
      console.log('Connection already in progress, returning existing promise');
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already open, resolving immediately');
        resolve();
        return;
      }

      console.log('Creating new WebSocket connection');
      this.socket = new WebSocket(`${environment.apiGatewayUrl}`);

      this.connectionTimeout = window.setTimeout(() => {
        console.log('Connection attempt timed out');
        this.socket?.close();
        reject(new Error('Connection timeout'));
      }, 10000); // 10 seconds timeout

      this.socket.onopen = () => {
        this.clearConnectionTimeout();
        console.log('WebSocket connection opened');
        this.connectionStatus.next('connected');
        this.reconnectAttempts = 0;
        this.connectionPromise = null;
        resolve();
        console.log('Attempting to rejoin game');
        this.rejoinGame(); // Attempt to rejoin the game after successful connection
      };

      this.socket.onclose = (event) => {
        this.clearConnectionTimeout();
        console.log('WebSocket connection closed', event);
        this.connectionStatus.next('disconnected');
        this.connectionPromise = null;
        if (!event.wasClean) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        clearTimeout(this.connectionTimeout);
        console.error('WebSocket error:', error);
        this.connectionStatus.next('error');
        this.connectionPromise = null;
        reject(error);
        this.attemptReconnect();
      };

      this.socket.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        this.messageSubject.next(JSON.parse(event.data));
      };
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    console.log('Disconnect method called');
    if (this.socket) {
      this.send({ action: 'disconnect' });
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
      this.connectionStatus.next('disconnected');
      this.connectionPromise = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus.next('reconnecting');
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.getReconnectDelay());
    } else {
      this.connectionStatus.next('failed');
    }
  }

  private getReconnectDelay(): number {
    const baseDelay =
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
  }

  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.attemptReconnect();
  }

  getConnectionStatus(): Observable<string> {
    return this.connectionStatus.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connectionStatus
      .asObservable()
      .pipe(map((status) => status === 'connected'));
  }

  waitForConnection(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.connectionStatus
        .pipe(
          filter((status) => status === 'connected'),
          take(1)
        )
        .subscribe(() => resolve());
    });
  }

  send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.error('WebSocket is not open. Message not sent:', message);
    }
  }

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  startGame(gameCode: string): void {
    this.send({ action: 'startGame', gameCode });
  }

  updateDisplayName(
    gameCode: string,
    playerId: string,
    displayName: string
  ): void {
    this.send({ action: 'updateDisplayName', gameCode, displayName, playerId });
  }

  createGame(): void {
    this.send({ action: 'create' });
  }

  joinGame(gameCode: string): void {
    this.send({ action: 'join', gameCode });
  }

  getPlayers(gameCode: string): void {
    this.send({ action: 'getPlayers', gameCode });
  }

  readyUp(gameCode: string, playerId: string): void {
    this.send({ action: 'playerReady', gameCode, playerId });
  }

  announceWin(playerId: string, condensedGrid: string[][], time: string): void {
    this.send({ action: 'win', playerId, condensedGrid, time });
  }

  manualDisconnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  manualReconnect(): void {
    this.reconnect();
  }
}
