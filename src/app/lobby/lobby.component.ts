import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WebSocketService } from '../websocket.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { Dialog } from '../dialog/dialog.component';
import { GameState, GameStateService } from '../game-state.service';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Player } from '../interfaces/player';
import { DialogData } from '../interfaces/dialog-data';
import { LoadingService } from '../loading.service';

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

  gameState!: GameState;

  private readonly destroy$ = new Subject<void>();

  isShareSupported = false;
  isCopied = false;

  selfPlayer: Player | undefined;
  otherPlayers: Player[] = [];

  constructor(
    private webSocketService: WebSocketService,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private loadingService: LoadingService,
  ) {}

  get connectedPlayers(): Player[] {
    if (!this.gameState?.players) {
      return [];
    }
    return this.gameState.players.filter((p) => !p.disconnected);
  }

  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  updatePlayer(updates: Partial<Player>) {
    if (this.gameState.gameCode && this.gameState.localPlayerId) {
      this.webSocketService.updatePlayer(
        this.gameState.gameCode,
        this.gameState.localPlayerId,
        updates,
      );
    }
  }

  ngOnInit() {
    this.isShareSupported =
      !!navigator.share &&
      /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.setupSubscriptions();

    const gameCode = this.route.snapshot.paramMap.get('gameCode');
    if (!gameCode) {
      // This is now an error state. A lobby should not exist without a game code.
      console.error('LobbyComponent loaded without a game code.');
      this.router.navigate(['/versus-menu']);
      return;
    }

    // Ensure the WebSocket service knows the current game, especially for page reloads.
    this.webSocketService.setCurrentGame(gameCode);
    this.gameStateService.updateGameState({ gameCode });

    // On a fresh load/reload of the lobby, explicitly request the player list.
    // The server will respond with a 'playerList' message.
    this.webSocketService.getPlayers(gameCode);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (!this.gameState.gameCode && !this.gameState.localPlayerId) {
      this.gameStateService.clearGameState();
    }
  }

  readyUp() {
    if (this.gameState.gameCode && this.gameState.localPlayerId) {
      this.webSocketService.readyUp(
        this.gameState.gameCode,
        this.gameState.localPlayerId,
      );
    }
  }

  copyOrShare() {
    // UPDATED: The URL to share should be the public join URL.
    const gameShareUrl =
      window.location.origin + '/join/' + this.gameState.gameCode;
    const shareString = `Race me on Crossrace! \n${gameShareUrl}`;

    if (this.isShareSupported) {
      navigator.share({ text: shareString });
    } else {
      navigator.clipboard.writeText(gameShareUrl);
      this.isCopied = true;
      this.copiedTooltip.show();
      setTimeout(() => {
        this.copiedTooltip.hide();
        this.isCopied = false;
        this.cdr.detectChanges();
      }, 1500);
    }
  }

  getDisplayUrl(): string {
    // UPDATED: The URL to display should also be the public join URL.
    const gameShareUrl =
      window.location.origin + '/join/' + this.gameState.gameCode;
    const parsedUrl = new URL(gameShareUrl);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    return `${hostname}${parsedUrl.pathname}`;
  }

  isPlayerSelf(player: Player): boolean {
    return player.id === this.gameState.localPlayerId;
  }

  startGame(): void {
    if (this.gameState.isHost && this.gameState.gameCode) {
      this.webSocketService.startGame(this.gameState.gameCode);
    } else {
      console.error('Cannot start game: not host or no game code');
    }
  }

  anyNotReady(): boolean {
    return this.connectedPlayers.some((player) => !player.ready);
  }

  private setupSubscriptions(): void {
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
        const connected = state.players.filter((p) => !p.disconnected);
        this.selfPlayer = connected.find((p) => this.isPlayerSelf(p));
        this.otherPlayers = connected.filter((p) => !this.isPlayerSelf(p));
        this.cdr.detectChanges();
      });

    this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleMessage(message));

    this.webSocketService
      .getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        if (status === 'reconnecting') {
          this.loadingService.show();
        } else if (status === 'connected') {
          // The initial loading is handled by the connector. This only handles
          // loading from reconnections.
          this.loadingService.hide();
        }
      });
  }

  private async handleMessage(message: any) {
    console.log('Lobby received message:', message.type, message);
    switch (message.type) {
      case 'playerList':
        this.loadingService.hide(); // Hide any reconnecting spinners
        this.gameStateService.updateGameState({
          players: message.players,
          isHost:
            message.players.find(
              (p: Player) => p.isHost && p.id === this.gameState.localPlayerId,
            ) != null,
        });
        break;

      case 'gameStarted':
        this.gameStateService.updateGameState({
          gameSeed: message.gameSeed,
          isInGame: true,
          gameMode: 'versus',
        });

        await this.loadingService.showForDuration({
          message: 'Game starting!',
          duration: 2000, // timer before players are taken to the game
        });

        this.router.navigate(['/versus']);
        break;

      case 'gameEnded':
        if (!this.gameState.isInGame) {
          this.gameStateService.updateGameState({
            players: message.players,
            isHost:
              message.players.find(
                (p: Player) =>
                  p.isHost && p.id === this.gameState.localPlayerId,
              ) != null,
          });
        }
        break;

      case 'gameStatusCheck':
        this.handleGameStatusCheckResponse(message);
        break;

      case 'error':
        this.loadingService.hide();
        console.error('Received server error:', message.message);
        this.openDialog(
          {
            dialogText: message.message || 'An unknown error occurred.',
            showSpinner: false,
            showConfirm: true,
          },
          false,
        );
        break;
    }
  }

  private handleGameStatusCheckResponse(message: any): void {
    console.log('Lobby received game status check response:', message);
    if (message.gameEnded) {
      if (message.players) {
        this.gameStateService.updateGameState({
          players: message.players,
          isHost:
            message.players.find(
              (p: Player) => p.isHost && p.id === this.gameState.localPlayerId,
            ) != null,
        });
      }
    } else if (message.gameActive === false && message.gameNotFound) {
      console.log('Game session has expired, staying in lobby');
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
}
