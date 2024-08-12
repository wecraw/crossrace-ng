import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2>Word Game Lobby</h2>
      <button (click)="createGame()">Create New Game</button>
      <div *ngIf="gameCode">
        Share this code to invite a player: {{ gameCode }}
      </div>
      <div>
        <input
          [(ngModel)]="joinGameCode"
          placeholder="Enter 4-character Game Code"
          maxlength="4"
          style="text-transform: uppercase;"
        />
        <button (click)="joinGame()">Join Game</button>
      </div>
    </div>
  `,
})
export class LobbyComponent implements OnInit, OnDestroy {
  gameCode: string | null = null;
  joinGameCode: string = '';
  private messageSubscription!: Subscription;

  constructor(
    private webSocketService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    try {
      await this.webSocketService.connect();

      this.messageSubscription = this.webSocketService
        .getMessages()
        .subscribe((message) => this.handleMessage(message));

      // Check if we're joining a game from a URL
      this.route.params.subscribe((params) => {
        if (params['gameCode']) {
          this.joinGameCode = params['gameCode'].toUpperCase();
          this.joinGame();
        }
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      // Handle connection error (e.g., show an error message to the user)
    }
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    // You might want to close the WebSocket connection here if appropriate
  }

  createGame(): void {
    this.webSocketService.createGame();
  }

  joinGame(): void {
    if (this.joinGameCode.length !== 4) {
      alert('Please enter a valid 4-character game code.');
      return;
    }
    this.webSocketService.joinGame(this.joinGameCode.toUpperCase());
  }

  private handleMessage(message: any) {
    console.log(message);
    switch (message.type) {
      case 'gameCreated':
        this.gameCode = message.gameCode;
        break;
      case 'gameStarted':
        this.router.navigate(['/game']);
        break;
      case 'error':
        alert(message.message);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  }
}
