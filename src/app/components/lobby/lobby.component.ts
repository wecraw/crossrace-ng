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
import { WebSocketService } from '../../services/websocket/websocket.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { Dialog } from '../dialogs/dialog/dialog.component';
import {
  GameState,
  GameStateService,
} from '../../services/game-state/game-state.service';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Player } from '../../interfaces/player';
import { DialogData } from '../../interfaces/dialog-data';
import { LoadingService } from '../../services/loading/loading.service';
import { LOBBY_GAME_START_COUNTDOWN_DURATION } from '../../constants/game-constants';

@Component({
  selector: 'app-lobby',
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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    // If we are not in a game, it means the user is leaving the lobby (e.g. back button).
    // In this case, we should disconnect them from the server and clear the game state.
    if (!this.gameState.isInGame) {
      this.webSocketService.disconnect();
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
        if (!this.gameState.gameCode) {
          // A lobby should not exist without a game code.
          console.error('LobbyComponent loaded without a game code.');
          this.router.navigate(['/versus-menu']);
          return;
        }

        const connected = state.players.filter((p) => !p.disconnected);
        this.selfPlayer = connected.find((p) => this.isPlayerSelf(p));
        this.otherPlayers = connected.filter((p) => !this.isPlayerSelf(p));
        this.cdr.detectChanges();
      });

    // On a fresh load/reload of the lobby, explicitly request the player list.
    this.gameStateService
      .getGameState()
      .pipe(take(1))
      .subscribe((state) => {
        if (state.gameCode) {
          console.log('Component initialized, fetching initial player list...');
          this.webSocketService.getPlayers(state.gameCode);
        }
      });

    this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleMessage(message));
  }

  private async handleMessage(message: any) {
    console.log('Lobby received message:', message.type, message);
    switch (message.type) {
      case 'playerList':
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
          duration: LOBBY_GAME_START_COUNTDOWN_DURATION,
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

      case 'error':
        const errorMessage = message.message || '';
        console.error('Received server error:', errorMessage);

        // Don't show a disruptive dialog for "start game" errors. The UI will
        // update to show the new host when the player list is refreshed,
        // which is better and sufficient feedback for the user.
        if (errorMessage.includes('Failed to start game')) {
          return; // Silently ignore, do not show dialog or navigate.
        }

        this.openDialog(
          {
            dialogText: errorMessage || 'An unknown error occurred.',
            showSpinner: false,
            showConfirm: true,
          },
          false,
        );
        break;
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
