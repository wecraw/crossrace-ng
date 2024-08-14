import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { DialogAnimationsExampleDialog } from './dialog/dialog.component';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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
    ReactiveFormsModule,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent implements OnInit, OnDestroy {
  gameCode: string | null = null;
  gameShareUrl: string = '';
  displayName: string = '';
  isHost: boolean = false;
  players: { id: string; displayName: string }[] = [];
  private messageSubscription!: Subscription;

  readonly dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  displayNameInput: string = '';

  constructor(
    private webSocketService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {}

  joinGameForm!: FormGroup;

  dialogSettingsJoin: any = {
    dialogText: 'Joining game',
    showSpinner: true,
    showConfirm: false,
  };

  async ngOnInit() {
    this.joinGameForm = this.fb.group({
      gameCode: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(4),
          Validators.pattern('^[A-Za-z]{4}$'),
        ],
      ],
    });
    try {
      await this.webSocketService.connect();

      this.messageSubscription = this.webSocketService
        .getMessages()
        .subscribe((message) => this.handleMessage(message));

      this.route.params.subscribe((params) => {
        if (params['gameCode']) {
          this.openDialog(this.dialogSettingsJoin, true);
          this.joinGameForm.patchValue({
            gameCode: params['gameCode'].toUpperCase(),
          });
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

  onNameInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.displayNameInput = input.value;
  }

  submitName() {
    if (this.gameCode) {
      this.webSocketService.updateDisplayName(
        this.gameCode,
        this.displayNameInput
      );
    }
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    this.joinGameForm.patchValue({ gameCode: input.value });
  }

  openDialog(data: any, disableClose: boolean) {
    if (!disableClose) {
      const dialogRef = this.dialog.open(DialogAnimationsExampleDialog, {
        data: data,
      });
    } else {
      const dialogRef = this.dialog.open(DialogAnimationsExampleDialog, {
        data: data,
        disableClose: true,
      });
    }
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  createGame(): void {
    this.webSocketService.createGame();
  }

  joinGame(): void {
    const gameCode = this.joinGameForm.get('gameCode')?.value;
    if (gameCode && gameCode.length === 4) {
      this.openDialog(this.dialogSettingsJoin, true);
      this.webSocketService.joinGame(gameCode.toUpperCase());
    } else {
      alert('Please enter a valid 4-character game code.');
    }
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

  readyUp() {
    if (this.gameCode) this.webSocketService.readyUp(this.gameCode);
  }

  private handleMessage(message: any) {
    console.log('Received message in lobby:', message);
    switch (message.type) {
      case 'gameCreated':
        this.gameCode = message.gameCode;
        this.gameShareUrl = this.getShareUrl();
        this.isHost = true;
        this.displayName = message.displayName;
        this.players = [
          { id: message.playerId, displayName: message.displayName },
        ];
        break;
      case 'playerList': //effectively when a new player (or self) joins, triggered when the player list is pushed from server
        if (!this.isHost) {
          this.gameCode = this.joinGameForm.get('gameCode')?.value;
          this.closeDialog();
        }
        this.gameShareUrl = this.getShareUrl();
        this.displayName = message.displayName;
        this.players = message.players;
        console.log(this.players);
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
        if (message.message === 'Game not found') {
          this.closeDialog();
          this.openDialog(
            {
              dialogText: 'Game not found',
              showSpinner: false,
              showConfirm: true,
            },
            false
          );
        }
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
    this.cdr.detectChanges();
  }
}
