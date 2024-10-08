import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<any>();
  private connectionStatus = new BehaviorSubject<boolean>(false);

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`${environment.apiGatewayUrl}`);

      this.socket.onopen = () => {
        this.connectionStatus.next(true);
        resolve();
      };

      this.socket.onclose = (event) => {
        this.connectionStatus.next(false);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        this.messageSubject.next(JSON.parse(event.data));
      };
    });
  }

  isConnected(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  waitForConnection(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.connectionStatus
        .pipe(
          filter((isConnected) => isConnected),
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
}
