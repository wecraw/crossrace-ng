import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private subject: Subject<any>;

  constructor() {
    this.subject = new Subject<any>();
  }

  connect(): Observable<any> {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = new WebSocket('ws://localhost:8080');

      this.socket.onmessage = (event) => {
        this.subject.next(JSON.parse(event.data));
      };
    }

    return this.subject.asObservable();
  }

  send(message: any): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Message not sent:', message);
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
