import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WebSocketService } from '../websocket.service';

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
export class LobbyComponent implements OnInit {
  private webSocketService = inject(WebSocketService);

  gameCode: string | null = null;
  joinGameCode: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    let urlSegments = this.location.path().split('/');
    console.log(urlSegments);
    if (urlSegments[1] === 'join') {
      this.joinGameCode = urlSegments[2].toUpperCase();
      setTimeout(() => {
        this.joinGame();
      }, 1000);
    }
  }

  createGame(): void {
    this.webSocketService.createGame();
    this.webSocketService.connect().subscribe((message) => {
      if (message.type === 'gameCreated') {
        this.gameCode = message.gameCode;
      } else if (message.type === 'gameStarted') {
        this.router.navigate(['/game']);
      }
    });
  }

  joinGame(): void {
    console.log;
    if (this.joinGameCode.length !== 4) {
      alert('Please enter a valid 4-character game code.');
      return;
    }
    this.webSocketService.joinGame(this.joinGameCode.toUpperCase());
    this.webSocketService.connect().subscribe((message) => {
      if (message.type === 'gameStarted') {
        this.router.navigate(['/game']);
      } else if (message.type === 'error') {
        alert(message.message);
      }
    });
  }
}
