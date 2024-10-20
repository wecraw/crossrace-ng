import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { Dialog } from '../dialog/dialog.component';
import { GameState, GameStateService } from '../game-state.service';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { Location } from '@angular/common';
import { DialogSettings } from '../dialog/dialog-settings';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Player } from '../interfaces/player';
import { DialogData } from '../interfaces/dialog-data';

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
    MatTooltipModule,
    PlayerCardComponent,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent implements OnInit, OnDestroy {
  @ViewChild('nameInput') nameInputElement!: ElementRef;
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  private location = inject(Location);

  localPlayer!: Player;
  localPlayerId: string = '';
  localPlayerReady: boolean | null = null;
  gameCode: string | null = null;
  gameShareUrl: string = '';
  joining: boolean = false;
  editingNameInput: string = '';
  gameState!: GameState;
  connectionStatus: string = 'disconnected';

  players: Player[] = [];
  isShareSupported: boolean = false;

  private messageSubscription: Subscription | null = null;
  private connectionStatusSubscription: Subscription | null = null;

  readonly dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  displayNameInput: string = '';
  creatingGame: boolean = false;
  editingName: boolean = false;

  isCopied: boolean = false;

  reconnectStarted: boolean = false;

  constructor(
    private webSocketService: WebSocketService,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  async ngOnInit() {
    this.gameStateService.setGameState({
      gameMode: 'versus',
    });

    this.isShareSupported = !!navigator.share && this.isMobile();

    this.setupSubscriptions();

    try {
      this.route.params.subscribe((params) => {
        if (params['gameCode']) {
          const gameCode = params['gameCode'].toUpperCase();
          if (this.gameState.isInGame) {
            //if rejoining after a versus game, get new player list in case players joined during the game
            this.webSocketService.getPlayers(gameCode);
            this.gameStateService.setGameState({
              isInGame: false,
            });
            this.updateLobbyUI();
          } else {
            if (/^[A-Z]{4}$/.test(gameCode)) {
              this.openDialog(DialogSettings.dialogSettingsJoin, true);
              this.gameStateService.setGameState({
                gameCode: gameCode,
              });
              this.joinGame();
            } else {
              // Route to '/' if gameCode is not exactly 4 alphabet letters
              this.router.navigate(['/']);
            }
          }
        } else {
          if (!this.gameState.isInGame) {
            this.openDialog(DialogSettings.dialogSettingsCreate, true);
            this.createGame();
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
    this.unsubscribeAll();
  }

  onNameInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.displayNameInput = input.value;
  }

  submitName(name: string) {
    if (this.gameState.gameCode) {
      this.webSocketService.updateDisplayName(
        this.gameState.gameCode,
        this.localPlayerId,
        name,
      );
      this.webSocketService.updateCurrentPlayerDisplayName(name);
    }
  }

  readyUp() {
    if (this.gameState.gameCode) {
      this.webSocketService.readyUp(
        this.gameState.gameCode,
        this.localPlayerId,
      );
    }
  }

  selectColor(color: string) {
    this.webSocketService.updatePlayerColor(
      this.gameState.gameCode!,
      this.localPlayerId,
      color,
    );
    this.webSocketService.updateCurrentPlayerColor(color);
  }

  selectEmoji(emoji: string) {
    this.webSocketService.updatePlayerEmoji(
      this.gameState.gameCode!,
      this.localPlayerId,
      emoji,
    );
    this.webSocketService.updateCurrentPlayerEmoji(emoji);
  }

  copyOrShare() {
    const shareString = `Race me on Crossrace! \n${this.gameShareUrl}`;

    if (navigator.share && this.isMobile()) {
      navigator.share({
        text: shareString,
      });
    } else {
      this.isCopied = true;
      this.copiedTooltip.show();
      setTimeout(() => {
        this.copiedTooltip.hide();
        this.isCopied = false;
        this.cdr.detectChanges();
      }, 1500);

      navigator.clipboard.writeText(this.gameShareUrl);
    }
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

  openDialog(data: DialogData, disableClose: boolean) {
    if (!disableClose) {
      const dialogRef = this.dialog.open(Dialog, {
        data: data,
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          if (result.event === 'confirm') {
            this.router.navigate(['/']);
          }
        } else {
          //closed modal by clicking outside
          this.router.navigate(['/']);
        }
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

  async createGame() {
    try {
      await this.webSocketService.connect();
      this.webSocketService.send({ action: 'create' });
    } catch (error) {
      console.error('Failed to connect:', error);
      // Handle connection error
    }
  }

  async joinGame() {
    if (!this.gameState.gameCode) return;

    this.joining = true;
    try {
      await this.webSocketService.connect();
      this.webSocketService.send({
        action: 'join',
        gameCode: this.gameState.gameCode,
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      this.joining = false;
      this.closeDialog();
      // Handle connection error
    }
  }

  startGame(): void {
    this.openDialog(DialogSettings.dialogSettingsStart, true);
    if (this.gameState.isHost && this.gameState.gameCode) {
      this.webSocketService.startGame(this.gameState.gameCode);
    } else {
      console.error('Cannot start game: not host or no game code');
    }
  }

  getShareUrl() {
    return window.location.origin + '/join/' + this.gameState.gameCode;
  }

  checkIfHost() {
    this.gameState.players.forEach((player) => {
      if (player.isHost && player.id === this.localPlayerId) {
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
    // Create a map of existing players for quick lookup
    const existingPlayers = new Map(
      this.players.map((player) => [player.id, player]),
    );

    // Update existing players and add new ones
    this.gameState.players.forEach((player) => {
      if (existingPlayers.has(player.id)) {
        // Update existing player
        const existingPlayer = existingPlayers.get(player.id)!;
        if (player.id === this.localPlayerId) {
          existingPlayer.displayName = this.editingName
            ? this.editingNameInput
            : player.displayName;
          existingPlayer.ready =
            this.localPlayerReady !== null
              ? this.localPlayerReady
              : player.ready;
          existingPlayer.isHost = player.isHost;
        } else {
          Object.assign(existingPlayer, player);
        }
        existingPlayers.delete(player.id);
      } else {
        // Add new player
        this.players.push(player);
      }
    });

    // Remove players that are no longer in the game state
    existingPlayers.forEach((player) => {
      const index = this.players.findIndex((p) => p.id === player.id);
      if (index !== -1) {
        this.players.splice(index, 1);
      }
    });

    // this.gameCode = this.gameState.gameCode;
    this.localPlayerId = this.gameState.localPlayerId!;
    this.gameShareUrl = this.getShareUrl();
    this.creatingGame = false;
    this.checkIfHost();

    this.cdr.detectChanges();
  }

  private unsubscribeAll() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
    }
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
      this.connectionStatusSubscription = null;
    }
  }

  private setupSubscriptions() {
    this.connectionStatusSubscription = this.webSocketService
      .getConnectionStatus()
      .subscribe((status) => {
        this.connectionStatus = status;
        if (status === 'disconnected') {
          this.gameStateService.setGameState({
            isHost: false,
          });
          this.reconnectStarted = true;
          this.webSocketService.reconnect();
        }
      });

    this.messageSubscription = this.webSocketService
      .getMessages()
      .subscribe((message) => {
        this.handleMessage(message);
      });

    this.gameStateService.getGameState().subscribe((state) => {
      this.gameState = state;
      if (state.gameCode) {
        this.gameShareUrl = this.getShareUrl();
      }
      this.cdr.detectChanges();
    });
  }

  private handleMessage(message: any) {
    console.log('Received message in lobby:', message);
    switch (message.type) {
      case 'gameCreated':
        this.closeDialog();
        this.reconnectStarted = false;
        this.location.replaceState('/join/' + message.gameCode);
        this.gameStateService.setGameState({
          gameCode: message.gameCode,
          isHost: true,
          localPlayerId: message.playerId,
          players: [
            {
              id: message.playerId,
              displayName: message.displayName,
              playerColor: message.playerColor,
              playerEmoji: message.playerEmoji,
              isHost: true,
            },
          ],
        });
        this.webSocketService.setCurrentGame(
          this.gameState.gameCode!,
          message.playerId,
          message.displayName,
          message.playerColor,
          message.playerEmoji,
        );
        this.localPlayerId = message.playerId;
        this.updateLobbyUI();
        break;
      case 'playerList': //triggered when the player list is pushed from server
        if (this.joining) {
          //first join
          this.closeDialog();
          this.joining = false;
        }
        if (this.reconnectStarted) {
          this.closeDialog();
          this.reconnectStarted = false;
        }
        this.gameStateService.setGameState({
          players: message.players,
        });

        this.updateLobbyUI();
        break;
      case 'selfJoined': //emitted only to the user who joins when they join
        this.webSocketService.setCurrentGame(
          this.gameState.gameCode!,
          message.playerId,
          message.displayName,
          message.playerColor,
          message.playerEmoji,
        );
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
        this.router.navigate(['/versus/' + message.gameSeed]);
        break;
      case 'gameEnded':
        if (this.gameState.gameCode)
          this.webSocketService.getPlayers(this.gameState.gameCode);
        this.updateLobbyUI();
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
            false,
          );
        }
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
    this.cdr.detectChanges();
  }

  simulateDisconnect() {
    this.webSocketService.manualDisconnect();
  }
}
