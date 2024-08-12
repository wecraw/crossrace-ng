import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { DialogAnimationsExampleDialog } from './dialog/dialog.component';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ClipboardModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatInputModule,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent implements OnInit, OnDestroy {
  gameCode: string | null = null;
  joinGameCode: string = '';
  gameShareUrl: string = '';
  displayName: string = '';
  isHost: boolean = false;
  players: { id: string; name: string }[] = [];
  private messageSubscription!: Subscription;

  joining: boolean = false;
  readonly dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private webSocketService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // this.openDialog();
    try {
      await this.webSocketService.connect();

      this.messageSubscription = this.webSocketService
        .getMessages()
        .subscribe((message) => this.handleMessage(message));

      this.route.params.subscribe((params) => {
        if (params['gameCode']) {
          this.joining = true;
          // this.openDialog();
          this.joinGameCode = params['gameCode'].toUpperCase();
          this.joinGame();
        }
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }

  openDialog() {
    const dialogRef = this.dialog.open(DialogAnimationsExampleDialog, {
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
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

  startGame(): void {
    if (this.isHost && this.gameCode) {
      console.log('Starting game:', this.gameCode);
      this.webSocketService.startGame(this.gameCode);
    } else {
      console.error('Cannot start game: not host or no game code');
    }
  }

  getShareUrl() {
    return window.location.origin + '/join/' + this.gameCode;
  }

  private handleMessage(message: any) {
    console.log('Received message in lobby:', message);
    switch (message.type) {
      case 'gameCreated':
        this.gameCode = message.gameCode;
        this.gameShareUrl = this.getShareUrl();
        this.isHost = true;
        this.displayName = message.displayName;
        this.players = [{ id: message.playerId, name: message.displayName }];
        break;
      case 'joinedGame':
        this.gameCode = message.gameCode;
        this.gameShareUrl = this.getShareUrl();
        this.displayName = message.displayName;
        this.players = message.players;
        break;
      case 'playerJoined':
        this.players.push({ id: message.playerId, name: message.displayName });
        break;
      case 'playerLeft':
        this.players = this.players.filter((p) => p.id !== message.playerId);
        break;
      case 'gameStarted':
        console.log('Game started, navigating to game page');
        this.router.navigate(['/game']);
        break;
      case 'error':
        console.error('Received error:', message.message);
        alert(message.message);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
    this.cdr.detectChanges();
  }
}
