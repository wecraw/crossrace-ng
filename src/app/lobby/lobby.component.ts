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
import { Clipboard } from '@angular/cdk/clipboard';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Player {
  id: string;
  displayName: string;
  ready?: boolean;
  isHost?: boolean;
}

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
  pastelRainbowColors = [
    '#F94144',
    '#43AA8B',
    '#277DA1',
    '#F8961E',
    '#ff006e',
    '#264653',
  ];
  localPlayer!: Player;
  gameCode: string | null = null;
  gameShareUrl: string = '';
  localPlayerId: string = '';
  joining: boolean = false;

  isHost: boolean = false;
  players: Player[] = [];
  private messageSubscription!: Subscription;

  readonly dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  displayNameInput: string = '';
  creatingGame: boolean = false;
  editingName: boolean = false;
  isCopied: boolean = false;

  constructor(
    private webSocketService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private clipboard: Clipboard
  ) {}

  joinGameForm!: FormGroup;

  dialogSettingsJoin: any = {
    dialogText: 'Joining game',
    showSpinner: true,
    showConfirm: false,
  };

  dialogSettingsCreate: any = {
    dialogText: 'Creating game',
    showSpinner: true,
    showConfirm: false,
  };

  getBackgroundColor(index: number): { 'background-color': string } {
    const colorIndex = index % this.pastelRainbowColors.length;
    return { 'background-color': this.pastelRainbowColors[colorIndex] };
  }

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
    this.editingName = false;
    if (this.displayNameInput === '') return;
    const playerIndex = this.players.findIndex(
      (p) => p.id === this.localPlayerId
    );
    if (playerIndex !== -1) {
      this.players[playerIndex].displayName = this.displayNameInput;
    }
    if (this.gameCode) {
      this.webSocketService.updateDisplayName(
        this.gameCode,
        this.displayNameInput
      );
    }
  }

  readyUp() {
    const playerIndex = this.players.findIndex(
      (p) => p.id === this.localPlayerId
    );
    if (playerIndex !== -1) {
      this.players[playerIndex].ready = true;
    }
    if (this.gameCode) this.webSocketService.readyUp(this.gameCode);
  }

  copyToClipboard() {
    this.clipboard.copy(this.gameShareUrl);
    this.isCopied = true;
    setTimeout(() => {
      this.isCopied = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  getDisplayUrl() {
    // Use URL constructor to parse the input
    const parsedUrl = new URL(this.gameShareUrl);

    // Check if the hostname is localhost. Not strictly needed, but nice for debugging
    if (parsedUrl.hostname === 'localhost') {
      // For localhost, we'll include the port number
      return `${parsedUrl.hostname}:${parsedUrl.port}${parsedUrl.pathname}`;
    } else {
      // For other hostnames, we'll use the domain without 'www' if present
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      return `${hostname}${parsedUrl.pathname}`;
    }
  }

  isPlayerSelf(player: Player) {
    return player.id === this.localPlayerId;
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    this.joinGameForm.patchValue({ gameCode: input.value });
  }

  editName() {
    this.editingName = true;
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
    this.openDialog(this.dialogSettingsCreate, true);
    this.webSocketService.createGame();
  }

  joinGame(): void {
    this.joining = true;
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

  checkIfHost() {
    this.players.forEach((player) => {
      if (player.isHost && player.id === this.localPlayerId) this.isHost = true;
    });
  }

  anyNotReady() {
    let anyNotReady = false;
    this.players.forEach((player) => {
      if (!player.ready) anyNotReady = true;
    });

    return anyNotReady;
  }

  private handleMessage(message: any) {
    console.log('Received message in lobby:', message);
    switch (message.type) {
      case 'gameCreated':
        this.closeDialog();
        this.gameCode = message.gameCode;
        this.gameShareUrl = this.getShareUrl();
        this.isHost = true;
        this.localPlayerId = message.playerId;
        this.players = [
          {
            id: message.playerId,
            displayName: message.displayName,
            isHost: true,
          },
        ];

        break;
      case 'playerList': //triggered when the player list is pushed from server
        if (this.joining) {
          //first join
          this.gameCode = this.joinGameForm.get('gameCode')?.value;
          this.closeDialog();
          this.joining = false;
        }
        this.gameShareUrl = this.getShareUrl();
        this.players = message.players;
        this.checkIfHost();
        break;
      case 'selfJoined':
        this.localPlayerId = message.playerId;
        this.checkIfHost(); //might be unnecessary
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
