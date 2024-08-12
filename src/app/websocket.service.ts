import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private subject: Subject<any>;
  private connectionStatus: BehaviorSubject<boolean>;

  constructor() {
    this.subject = new Subject<any>();
    this.connectionStatus = new BehaviorSubject<boolean>(false);
  }

  connect(): Observable<any> {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = new WebSocket('ws://localhost:8080');

      this.socket.onopen = () => {
        this.connectionStatus.next(true);
      };

      this.socket.onclose = () => {
        this.connectionStatus.next(false);
      };

      this.socket.onmessage = (event) => {
        this.subject.next(JSON.parse(event.data));
      };
    }

    return this.subject.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  send(message: any): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Message not sent:', message);
      // Optionally, you could queue the message to be sent when the connection opens
    }
  }

  createGame(): void {
    this.send({ type: 'create' });
  }

  joinGame(gameCode: string): void {
    this.send({ type: 'join', gameCode });
  }

  announceWin(): void {
    this.send({ type: 'win' });
  }
}
