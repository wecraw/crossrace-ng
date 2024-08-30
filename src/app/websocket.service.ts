import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<string>('disconnected');
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.initializeWebSocket(resolve, reject);
    });
  }

  private initializeWebSocket(
    resolve: () => void,
    reject: (reason?: any) => void
  ): void {
    this.socket = new WebSocket(`${environment.apiGatewayUrl}`);

    this.socket.onopen = () => {
      this.connectionStatus.next('connected');
      this.reconnectAttempts = 0;
      resolve();
    };

    this.socket.onclose = (event) => {
      this.connectionStatus.next('disconnected');
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    };

    this.socket.onmessage = (event) => {
      this.messageSubject.next(JSON.parse(event.data));
    };

    // Handle app visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConnection();
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus.next('reconnecting');
      setTimeout(() => {
        this.initializeWebSocket(() => {}, console.error);
      }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1));
    } else {
      this.connectionStatus.next('failed');
    }
  }

  private checkConnection(): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      this.attemptReconnect();
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
    if (this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.error('WebSocket is not open. Message not sent:', message);
    }
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

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  manualDisconnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    // The onclose event will trigger the reconnection process
  }

  manualReconnect(): void {
    this.reconnectAttempts = 0;
    this.attemptReconnect();
  }
}
