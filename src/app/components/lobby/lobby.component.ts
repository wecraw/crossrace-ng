import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { Subject, takeUntil } from 'rxjs';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { GameStateService } from '../../services/game-state/game-state.service';
import { PlayerCardComponent } from '../player-card/player-card.component';
import { Player } from '../../interfaces/player';
import { GameState } from '../../interfaces/game-state';
import { GameFlowService } from '../../services/game-flow/game-flow.service';

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
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  gameState!: GameState;
  private readonly destroy$ = new Subject<void>();

  isShareSupported = false;
  isCopied = false;

  selfPlayer: Player | undefined;
  otherPlayers: Player[] = [];

  // Ready-up state
  isLocalPlayerReady = false;
  readyPlayersCount = 0;
  totalPlayersCount = 0;

  constructor(
    private webSocketService: WebSocketService,
    private gameStateService: GameStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private gameFlowService: GameFlowService,
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
    this.gameFlowService.initialize();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    const currentState = this.gameStateService.getCurrentState();

    // If we are not in a game (i.e., we're in the lobby) and the user is navigating
    // away to a route that isn't a single-player game, we assume they are leaving
    // the multiplayer flow. In this case, disconnect from the server and clear the
    // multiplayer state to prevent issues. This avoids a race condition where this
    // OnDestroy hook clears state that the next route's resolver has just set up.
    if (
      !currentState.isInGame &&
      currentState.gameMode !== 'daily' &&
      currentState.gameMode !== 'practice'
    ) {
      this.gameFlowService.destroy();
      this.webSocketService.disconnect();
      this.gameStateService.clearGameState();
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

  isPlayerSelf(player: Player): boolean {
    return player.id === this.gameState.localPlayerId;
  }

  readyUp(): void {
    this.gameFlowService.playerReady();
  }

  get readyButtonText(): string {
    if (this.connectedPlayers.length < 2) {
      return `Waiting for players (${this.connectedPlayers.length}/2)`;
    }
    if (this.isLocalPlayerReady) {
      return `Ready! (${this.readyPlayersCount}/${this.totalPlayersCount})`;
    }
    return `Ready Up (${this.readyPlayersCount}/${this.totalPlayersCount})`;
  }

  private updateReadyCounts(players: Player[]): void {
    const connectedPlayers = players.filter((p) => !p.disconnected);
    this.totalPlayersCount = connectedPlayers.length;
    this.readyPlayersCount = connectedPlayers.filter((p) => p.ready).length;

    const self = players.find((p) => p.id === this.gameState.localPlayerId);
    if (self) {
      this.isLocalPlayerReady = !!self.ready;
    }
    this.cdr.detectChanges();
  }

  private setupSubscriptions(): void {
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
        if (!this.gameState.gameCode) {
          console.error('LobbyComponent loaded without a game code.');
          this.router.navigate(['/versus-menu']);
          return;
        }

        const connected = state.players.filter((p) => !p.disconnected);
        this.selfPlayer = connected.find((p) => this.isPlayerSelf(p));
        this.otherPlayers = connected.filter((p) => !this.isPlayerSelf(p));
        this.updateReadyCounts(state.players);

        console.log('Lobby received updated game state:', state);
        this.cdr.detectChanges();
      });
  }
}
