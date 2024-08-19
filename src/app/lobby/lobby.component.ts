import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewChecked,
  ViewChild,
  ElementRef,
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
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';

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
export class LobbyComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('nameInput') nameInputElement!: ElementRef;

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
  editingNameInput: string = '';
  gameState!: GameState;

  isHost: boolean = false;
  players: Player[] = [];
  private messageSubscription!: Subscription;
  isShareSupported: boolean = false;

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
    private clipboard: Clipboard
  ) {}

  dialogSettingsJoin: any = {
    dialogText: 'Joining game',
    showSpinner: true,
    showConfirm: false,
  };

  dialogSettingsStart: any = {
    dialogText: 'Starting game',
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

  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  async ngOnInit() {
    this.isShareSupported = !!navigator.share && this.isMobile();

    this.gameStateService.getGameState().subscribe((state) => {
      this.gameState = state;
      if (state.gameCode) {
        this.gameCode = state.gameCode;
        this.players = state.players;
        this.gameShareUrl = this.getShareUrl();
      }
      this.cdr.detectChanges();
    });

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
        } else {
          if (!this.gameState.isInGame || this.gameState.isCreating) {
            this.createGame();
            this.gameStateService.setGameState({
              isCreating: false,
            });
          } else {
            this.gameStateService.setGameState({
              isInGame: false,
            });
            this.updateLobbyUI();
          }
        }
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }

  ngOnDestroy() {
    if (!this.gameState.isInGame) {
      this.gameStateService.clearGameState();
    }
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    this.focusNameInput();
  }
  private focusNameInput() {
    if (this.nameInputElement && this.editingName) {
      this.nameInputElement.nativeElement.focus();
    }
  }
  onNameInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.displayNameInput = input.value;
  }

  submitName() {
    this.editingName = false;
    if (this.editingNameInput.trim() === '') return;

    const playerIndex = this.players.findIndex(
      (p) => p.id === this.localPlayerId
    );
    if (playerIndex !== -1) {
      this.players[playerIndex].displayName = this.editingNameInput.trim();
    }

    if (this.gameCode) {
      this.webSocketService.updateDisplayName(
        this.gameCode,
        this.localPlayerId,
        this.editingNameInput.trim()
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
    const shareString = `Race me on Crossrace! \n${this.gameShareUrl}`;

    if (navigator.share && this.isMobile()) {
      navigator.share({
        text: shareString,
      });
    } else {
      navigator.clipboard.writeText(this.gameShareUrl);
    }

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

  editName() {
    this.editingName = true;
    const localPlayer = this.players.find((p) => p.id === this.localPlayerId);
    if (localPlayer) {
      this.editingNameInput = localPlayer.displayName;
    }
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

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
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
    let gameCode = this.gameState.gameCode;
    this.gameStateService.setGameState({
      gameCode: gameCode,
    });
    if (gameCode && gameCode.length === 4) {
      this.openDialog(this.dialogSettingsJoin, true);
      this.webSocketService.joinGame(gameCode.toUpperCase());
    }
  }

  startGame(): void {
    this.openDialog(this.dialogSettingsStart, true);
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
    this.gameState.players.forEach((player) => {
      if (player.isHost && player.id === this.localPlayerId) {
        this.isHost = true;
        this.gameStateService.setGameState({
          isHost: true,
        });
      }
    });
  }

  anyNotReady() {
    let anyNotReady = false;
    this.players.forEach((player) => {
      if (!player.ready) anyNotReady = true;
    });

    return anyNotReady;
  }

  private updateLobbyUI() {
    this.players = this.gameState.players.map((player) => {
      if (player.id === this.localPlayerId && this.editingName) {
        // Preserve the local edit
        return { ...player, displayName: this.editingNameInput };
      } else {
        return player;
      }
    });

    this.gameCode = this.gameState.gameCode;
    this.localPlayerId = this.gameState.localPlayerId!;
    this.gameShareUrl = this.getShareUrl();
    this.creatingGame = false;
    this.checkIfHost();

    // Schedule a micro-task to focus the input after view updates
    if (this.editingName) {
      Promise.resolve().then(() => {
        this.focusNameInput();
      });
    }

    this.cdr.detectChanges();
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
        this.closeDialog();
        this.gameStateService.setGameState({
          isInGame: true,
          gameSeed: message.gameSeed,
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
