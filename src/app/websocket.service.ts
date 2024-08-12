import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private messageSubject = new ReplaySubject<any>(1);
  private connectionStatus = new BehaviorSubject<boolean>(false);

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`${environment.apiGatewayUrl}`);

      this.socket.onopen = () => {
        this.connectionStatus.next(true);
        resolve();
      };

      this.socket.onclose = () => {
        this.connectionStatus.next(false);
      };

      this.socket.onerror = (error) => {
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
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Message not sent:', message);
    }
  }

  createGame(): void {
    this.send({ action: 'create' });
  }

  joinGame(gameCode: string): void {
    this.send({ action: 'join', gameCode });
  }

  announceWin(): void {
    this.send({ action: 'win' });
  }

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }
}
