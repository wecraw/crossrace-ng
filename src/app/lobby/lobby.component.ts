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
import { Dialog } from '../dialog/dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GameState, GameStateService } from '../game-state.service';

interface Player {
  id: string;
  displayName: string;
  ready?: boolean;
  isHost?: boolean;
}

interface DialogData {
  dialogText: string;
  showSpinner: boolean;
  showConfirm: boolean;
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

  gameState!: GameState;

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
    private gameStateService: GameStateService,
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

    this.gameStateService.getGameState().subscribe((state) => {
      this.gameState = state;
      if (state.gameCode) {
        this.gameCode = state.gameCode;
        this.players = state.players;
        this.gameShareUrl = this.getShareUrl();
      }
      this.cdr.detectChanges();
    });

    if (this.gameState.isInGame) {
      this.gameStateService.setGameState({
        isInGame: false,
      });
      this.updateLobbyUI();
    }
    try {
      await this.webSocketService.connect();

      this.messageSubscription = this.webSocketService
        .getMessages()
        .subscribe((message) => this.handleMessage(message));

      this.route.params.subscribe((params) => {
        if (params['gameCode']) {
          this.openDialog(this.dialogSettingsJoin, true);
          let gameCode = params['gameCode'].toUpperCase();
          this.gameState.gameCode = gameCode;
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
        this.localPlayerId,
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
    if (this.gameCode)
      this.webSocketService.readyUp(this.gameCode, this.localPlayerId);
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

  openDialog(data: DialogData, disableClose: boolean) {
    if (!disableClose) {
      const dialogRef = this.dialog.open(Dialog, {
        data: data,
      });
    } else {
      const dialogRef = this.dialog.open(Dialog, {
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

  joinGameClick() {
    this.gameStateService.setGameState({
      gameCode: this.joinGameForm.value.gameCode,
    });
    this.joinGame();
  }

  joinGame(): void {
    this.joining = true;
    let gameCode = this.gameState.gameCode;
    this.joinGameForm.patchValue({
      gameCode: gameCode,
    });
    this.gameStateService.setGameState({
      gameCode: gameCode,
    });
    if (gameCode && gameCode.length === 4) {
      this.openDialog(this.dialogSettingsJoin, true);
      this.webSocketService.joinGame(gameCode.toUpperCase());
    } else {
      //this should never happen because the button is connected to the validation
      alert('Please enter a valid 4-character game code.');
    }
  }

  startGame(): void {
    if (this.gameState.isHost && this.gameCode) {
      this.webSocketService.startGame(this.gameCode);
    } else {
      console.error('Cannot start game: not host or no game code');
    }
  }

  leaveLobby() {}

  getShareUrl() {
    return window.location.origin + '/join/' + this.gameCode;
  }

  checkIfHost() {
    console.log(this.gameState.players);
    console.log('local:', this.localPlayerId);
    console.log('state:', this.gameState.localPlayerId);
    this.gameState.players.forEach((player) => {
      if (player.isHost && player.id === this.localPlayerId) {
        this.isHost = true;
        this.gameStateService.setGameState({
          isHost: true,
        });
      }
    });
    console.log(this.isHost);
  }

  anyNotReady() {
    let anyNotReady = false;
    this.players.forEach((player) => {
      if (!player.ready) anyNotReady = true;
    });

    return anyNotReady;
  }

  private updateLobbyUI() {
    this.gameCode = this.gameState.gameCode;
    this.players = this.gameState.players;
    this.localPlayerId = this.gameState.localPlayerId!;
    this.gameShareUrl = this.getShareUrl();
    this.creatingGame = false;
    this.checkIfHost();
  }

  private handleMessage(message: any) {
    console.log('Received message in lobby:', message);
    switch (message.type) {
      case 'gameCreated':
        this.closeDialog();
        this.gameStateService.setGameState({
          gameCode: message.gameCode,
          isHost: true,
          localPlayerId: message.playerId,
          players: [
            {
              id: message.playerId,
              displayName: message.displayName,
              isHost: true,
            },
          ],
        });
        this.localPlayerId = message.playerId;
        this.updateLobbyUI();
        break;
      case 'playerList': //triggered when the player list is pushed from server
        if (this.joining) {
          //first join
          this.closeDialog();
          this.joining = false;
        }
        this.gameStateService.setGameState({
          players: message.players,
        });
        this.updateLobbyUI();
        break;
      case 'selfJoined': //emitted only to the user who joins when they join
        this.gameStateService.setGameState({
          localPlayerId: message.playerId,
        });
        this.localPlayerId = message.playerId;
        break;
      case 'gameStarted':
        console.log('Game started, navigating to game page');
        this.gameStateService.setGameState({
          isInGame: true,
        });
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
