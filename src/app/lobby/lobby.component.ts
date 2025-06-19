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

  gameState!: GameState;

  // This subject is used to automatically unsubscribe from all observables.
  private readonly destroy$ = new Subject<void>();

  // Local UI state
  isShareSupported = false;
  isCopied = false;
  isProcessing = false; // A single flag for spinners/dialogs (create/join)

  constructor(
    private webSocketService: WebSocketService,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private location: Location,
  ) {}

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
    this.handleRouteParameters();
  }

  ngOnDestroy() {
    // This is a clean way to manage subscriptions.
    this.destroy$.next();
    this.destroy$.complete();

    // Only clear the game state if we are not navigating into a game.
    if (!this.gameState.isInGame) {
      this.gameStateService.clearGameState();
      // Optionally tell the service to disconnect if leaving the app entirely
      // this.webSocketService.disconnect();
    }
  }

  readyUp() {
    if (this.gameState.gameCode && this.gameState.localPlayerId) {
      // This is a special case of updating the player
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

  async createGame() {
    this.isProcessing = true;
    this.openDialog(DialogSettings.dialogSettingsCreate, true);

    try {
      const response = await this.webSocketService.createGame();
      // The `create` event now directly returns all the info we need.
      this.webSocketService.setCurrentGame(
        response.gameCode,
        response.playerId,
      );
      this.location.replaceState('/join/' + response.gameCode);

      this.gameStateService.updateGameState({
        gameCode: response.gameCode,
        isHost: true,
        localPlayerId: response.playerId,
        players: [
          {
            id: response.playerId,
            connectionId: response.connectionId,
            displayName: response.displayName,
            playerColor: response.playerColor,
            playerEmoji: response.playerEmoji,
            isHost: true,
            ready: false,
            winCount: 0,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to create game:', error);
      // Handle error (e.g., show a dialog)
    } finally {
      this.isProcessing = false;
      this.dialog.closeAll();
      this.cdr.detectChanges();
    }
  }
  async joinGame(gameCode: string) {
    if (this.isProcessing) return; // Prevent double-calls

    this.isProcessing = true;
    this.openDialog(DialogSettings.dialogSettingsJoin, true);

    // We first set the gameCode in our state service. This is important
    // because if the connection drops and reconnects, the service knows which
    // game to attempt to rejoin.
    this.gameStateService.updateGameState({ gameCode: gameCode });

    try {
      // *** THE FIX IS HERE ***
      // Check if we already have a player ID from a previous session (e.g., returning from a game).
      const existingPlayerId = this.gameState.localPlayerId;

      // Pass the existing ID to the service. If it's null, the server will generate a new one.
      const response = await this.webSocketService.joinGame(
        gameCode,
        existingPlayerId || undefined,
      );

      // The response from a successful join should always be treated as the source of truth
      // for the player's ID. This handles both new joins and rejoins.
      const newPlayerId = response.playerId;

      this.webSocketService.setCurrentGame(gameCode, newPlayerId);
      this.gameStateService.updateGameState({ localPlayerId: newPlayerId });
    } catch (error) {
      // The promise from `joinGame` was rejected.
      console.error('Failed to join game:', error);
      this.isProcessing = false;
      this.dialog.closeAll(); // Close the "Joining..." dialog
      this.openDialog(
        {
          dialogText:
            typeof error === 'string'
              ? error
              : 'Game not found or an error occurred.',
          showSpinner: false,
          showConfirm: true,
        },
        false,
      );

      // Since the join failed, clear the invalid game code from the URL and state
      this.router.navigate(['/']);
      this.gameStateService.clearGameState();
    }
    // Note: We don't set `isProcessing = false` in the success case.
    // It gets set to false in `handleMessage` when the `playerList` arrives,
    // which signifies the process is truly complete.
  }

  startGame(): void {
    if (this.gameState.isHost && this.gameState.gameCode) {
      this.openDialog(DialogSettings.dialogSettingsStart, true);
      this.webSocketService.startGame(this.gameState.gameCode);
    } else {
      console.error('Cannot start game: not host or no game code');
    }
  }

  anyNotReady(): boolean {
    return this.gameState.players.some((player) => !player.ready);
  }

  private handleRouteParameters(): void {
    const gameCodeParam = this.route.snapshot.paramMap.get('gameCode');

    if (gameCodeParam) {
      // SCENARIO 1: A game code is in the URL, so we are joining.
      const gameCode = gameCodeParam.toUpperCase();
      if (/^[A-Z]{4}$/.test(gameCode)) {
        // This is the key change. We call joinGame, which will now handle
        // the connection logic internally.
        this.joinGame(gameCode);
      } else {
        this.router.navigate(['/']); // Invalid code format
      }
    } else {
      // SCENARIO 2: No game code, so we are creating a new game.
      if (!this.gameState.gameCode) {
        this.createGame();
      }
    }
  }

  private setupSubscriptions(): void {
    // Subscribe to the game state
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
        // Trigger change detection whenever the central state updates
        this.cdr.detectChanges();
      });

    // Subscribe to WebSocket messages
    this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleMessage(message));

    // Subscribe to connection status changes
    this.webSocketService
      .getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        if (status === 'reconnecting') {
          this.openDialog(DialogSettings.dialogSettingsReconnecting, true);
        } else if (status === 'connected') {
          this.dialog.closeAll();
        }
      });
  }

  private handleMessage(message: any) {
    console.log('Lobby received message:', message.type, message);
    switch (message.type) {
      case 'playerList':
        this.isProcessing = false; // We have received state, stop processing
        this.dialog.closeAll();
        // The playerList is the single source of truth for players
        this.gameStateService.updateGameState({
          players: message.players,
          // also update host status based on the new list
          isHost:
            message.players.find(
              (p: Player) => p.isHost && p.id === this.gameState.localPlayerId,
            ) != null,
        });
        break;

      case 'gameStarted':
        this.dialog.closeAll();
        this.gameStateService.updateGameState({
          isInGame: true,
          gameSeed: message.gameSeed,
          gameMode: 'versus', // Explicitly set the mode
        });

        this.router.navigate(['/versus', this.gameState.gameCode], {
          state: {
            gameSeed: message.gameSeed,
            isInGame: true,
            gameMode: 'versus',
          },
        });
        break;

      case 'gameEnded':
        // When a game ends, the server resets the game state.
        // The 'playerList' event within the gameEnded message provides the updated truth.
        this.gameStateService.updateGameState({
          isInGame: false,
          players: message.players,
          isHost:
            message.players.find(
              (p: Player) => p.isHost && p.id === this.gameState.localPlayerId,
            ) != null,
        });
        break;

      case 'error':
        this.isProcessing = false;
        this.dialog.closeAll();
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

  // Debugging
  // simulateDisconnect() {
  //   this.webSocketService.manualDisconnect();
  // }

  //UI Helpers
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
}
