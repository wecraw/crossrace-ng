import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject, pairwise, startWith, takeUntil } from 'rxjs';
import { GameStateService } from '../game-state/game-state.service';
import { LoadingService } from '../loading/loading.service';
import { WebSocketService } from '../websocket/websocket.service';
import { DialogPostGameMp } from '../../components/dialogs/dialog-post-game-mp/dialog-post-game-mp.component';
import {
  LOBBY_GAME_START_COUNTDOWN_DURATION,
  COUNTDOWN_START_DELAY,
  COUNTDOWN_INITIAL_VALUE,
  COUNTDOWN_INTERVAL,
  COUNTDOWN_FADEOUT_DELAY,
} from '../../constants/game-constants';
import { GameState } from '../../interfaces/game-state';

export type GamePhase = 'LOBBY' | 'STARTING' | 'IN_GAME' | 'POST_GAME';

@Injectable({
  providedIn: 'root',
})
export class GameFlowService {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private webSocketService = inject(WebSocketService);
  private gameStateService = inject(GameStateService);
  private loadingService = inject(LoadingService);

  private readonly destroy$ = new Subject<void>();
  private postGameDialogRef: MatDialogRef<DialogPostGameMp> | null = null;

  private readonly gamePhaseSubject = new BehaviorSubject<GamePhase>('LOBBY');
  public readonly gamePhase$ = this.gamePhaseSubject.asObservable();

  private readonly nextGameCountdownSubject = new BehaviorSubject<string>('');
  public readonly nextGameCountdown$ =
    this.nextGameCountdownSubject.asObservable();

  private initialized = false;

  // Countdown management (prevents multiple overlapping timers)
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private countdownTargetMs: number | null = null;

  // Cancellable "Game starting!" interstitial
  private activeBarrier: {
    hide: () => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null = null;

  public initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.gameStateService
      .getGameState()
      .pipe(
        startWith(this.gameStateService.getCurrentState()),
        pairwise(),
        takeUntil(this.destroy$),
      )
      .subscribe(([prev, curr]) => this.onStateChange(prev, curr));
  }

  public destroy(): void {
    this.initialized = false;
    this.destroy$.next();
    this.stopCountdownTimer();
    this.closePostGameDialog();
    this.clearBarrier();
  }

  public playerReady(): void {
    const currentState = this.gameStateService.getCurrentState();
    if (currentState.gameCode && currentState.localPlayerId) {
      // Optimistic update: Update the local state immediately.
      const newPlayers = currentState.players.map((player) => {
        if (player.id === currentState.localPlayerId) {
          return { ...player, ready: true };
        }
        return player;
      });
      this.gameStateService.updateGameState({ players: newPlayers });

      // Send the actual request to the server.
      this.webSocketService.playerReady(currentState.gameCode);
    }
  }

  public reportWin(condensedGrid: string[][]): void {
    const playerId = this.gameStateService.getCurrentState().localPlayerId;
    if (playerId) {
      this.webSocketService.announceWin(playerId, condensedGrid);
    }
  }

  private async onStateChange(
    previousState: GameState,
    currentState: GameState,
  ): Promise<void> {
    const prevPhase = previousState.gamePhase;
    const currPhase = currentState.gamePhase;

    // When the server confirms the game has ended, clear any pending win data.
    if (prevPhase === 'IN_GAME' && currPhase === 'POST_GAME') {
      this.gameStateService.clearPendingWin();
    }

    if (prevPhase === currPhase) {
      // If we remain in POST_GAME, ensure the single countdown for the current round is running.
      if (currPhase === 'POST_GAME' && currentState.lastGameEndTimestamp) {
        this.startCountdownTimer(currentState.lastGameEndTimestamp);
      }
      return;
    }

    switch (currPhase) {
      case 'LOBBY': {
        this.gamePhaseSubject.next('LOBBY');
        this.stopCountdownTimer();
        this.closePostGameDialog();
        this.clearBarrier();
        if (currentState.gameCode) {
          this.router.navigate(['/lobby', currentState.gameCode]);
        }
        break;
      }

      case 'IN_GAME': {
        this.gamePhaseSubject.next('IN_GAME');
        this.stopCountdownTimer();
        this.closePostGameDialog();

        // Rejoin mid-game? Skip interstitial/barrier.
        const elapsed = currentState.currentGameTime ?? 0;
        if (elapsed > 0) {
          this.clearBarrier();
          if (currentState.gameCode) {
            this.router.navigate(['/versus', currentState.gameCode]);
          }
          break;
        }

        // Fresh round start: set a barrier so GameComponent can honor it,
        // and show a cancellable interstitial.
        const barrierUntil = Date.now() + LOBBY_GAME_START_COUNTDOWN_DURATION;
        this.gameStateService.updateGameState({
          startBarrierUntil: barrierUntil,
        });

        this.clearBarrier(); // ensure at most one active
        const hide = this.loadingService.show({
          message: 'Game starting!',
        });
        const timeoutId = setTimeout(() => {
          hide();
          // Allow any stale barrier to be cleared by GameComponent too
        }, LOBBY_GAME_START_COUNTDOWN_DURATION);
        this.activeBarrier = { hide, timeoutId };

        if (currentState.gameCode) {
          this.router.navigate(['/versus', currentState.gameCode]);
        }
        break;
      }

      case 'POST_GAME': {
        this.gamePhaseSubject.next('POST_GAME');
        this.clearBarrier();

        const data = currentState.postGameData;
        if (data && !this.postGameDialogRef) {
          const adjustedTime = this.adjustServerTimeString(data.time);
          this.postGameDialogRef = this.dialog.open(DialogPostGameMp, {
            data: {
              winnerDisplayName: data.winnerDisplayName,
              winnerColor: data.winnerColor,
              winnerEmoji: data.winnerEmoji,
              grid: data.condensedGrid,
              // Show gameplay time (server elapsed minus animation offset)
              time: adjustedTime,
            },
            minWidth: 380,
            disableClose: true,
          });

          this.postGameDialogRef.afterClosed().subscribe((result) => {
            this.postGameDialogRef = null;
            if (result && result.event === 'quit') {
              this.webSocketService.disconnect();
              this.router.navigate(['/versus-menu']);
            }
          });
        }

        if (currentState.lastGameEndTimestamp) {
          this.startCountdownTimer(currentState.lastGameEndTimestamp);
        }
        break;
      }
    }
  }

  private clearBarrier(): void {
    if (this.activeBarrier) {
      clearTimeout(this.activeBarrier.timeoutId);
      this.activeBarrier.hide();
      this.activeBarrier = null;
    }
  }

  private closePostGameDialog(): void {
    if (this.postGameDialogRef) {
      this.postGameDialogRef.close();
      this.postGameDialogRef = null;
    }
  }

  /**
   * Starts or updates a single countdown tied to a specific end timestamp.
   * Clears any previous countdown to prevent overlapping timers across rounds.
   */
  private startCountdownTimer(timestamp: string | Date): void {
    const AUTO_START_SECONDS = 30;
    const serverEndTime = new Date(timestamp).getTime();
    if (!isFinite(serverEndTime)) return;

    const targetMs = serverEndTime + AUTO_START_SECONDS * 1000;

    // If we're already counting down to this exact target, just tick once.
    if (this.countdownTargetMs === targetMs && this.countdownIntervalId) {
      this.updateCountdownLabel();
      return;
    }

    // Otherwise switch to the new target.
    this.stopCountdownTimer();
    this.countdownTargetMs = targetMs;

    // Immediate label update, then tick every second.
    this.updateCountdownLabel();
    this.countdownIntervalId = setInterval(() => {
      this.updateCountdownLabel();
    }, 1000);
  }

  /**
   * Stops the active countdown.
   * @param preserveLabel When true, keeps the current label text instead of clearing it.
   */
  private stopCountdownTimer(preserveLabel: boolean = false): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.countdownTargetMs = null;
    if (!preserveLabel) {
      this.nextGameCountdownSubject.next('');
    }
  }

  private updateCountdownLabel(): void {
    if (this.countdownTargetMs === null) return;

    const remainingSeconds = Math.round(
      (this.countdownTargetMs - Date.now()) / 1000,
    );

    if (remainingSeconds <= 0) {
      const totalPlayers = this.gameStateService
        .getCurrentState()
        .players.filter((p) => !p.disconnected).length;
      if (totalPlayers < 2) {
        this.nextGameCountdownSubject.next('Waiting for more players');
      } else {
        this.nextGameCountdownSubject.next(
          'Waiting for players to ready up...',
        );
      }
      // Stop the countdown but keep the label visible.
      this.stopCountdownTimer(true);
      return;
    }

    this.nextGameCountdownSubject.next(
      `Next game starts in: ${remainingSeconds}s`,
    );
  }

  // ===== Helpers to align server time with client-side gameplay timer =====

  /** Total client animation offset in seconds (interstitial + 3..2..1 + fade). */
  private getAnimationOffsetSeconds(): number {
    const totalOffsetMs =
      LOBBY_GAME_START_COUNTDOWN_DURATION +
      COUNTDOWN_START_DELAY +
      COUNTDOWN_INITIAL_VALUE * COUNTDOWN_INTERVAL +
      COUNTDOWN_FADEOUT_DELAY;
    return totalOffsetMs / 1000;
  }

  /** Convert "M:SS" -> seconds */
  private parseTimeStringToSeconds(time: string | null | undefined): number {
    if (!time) return 0;
    const parts = time.split(':');
    if (parts.length !== 2) return 0;
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (Number.isNaN(m) || Number.isNaN(s)) return 0;
    return Math.max(0, m * 60 + s);
  }

  /** Convert seconds -> "M:SS" */
  private formatSecondsToTimeString(totalSeconds: number): string {
    const secs = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Adjusts server-reported elapsed time (formatted) by subtracting the client animation offset.
   * Ensures the winner dialog shows the same "gameplay time" as local timers.
   */
  private adjustServerTimeString(serverTimeFormatted: string): string {
    const offset = this.getAnimationOffsetSeconds();
    const rawSeconds = this.parseTimeStringToSeconds(serverTimeFormatted);
    const gameplaySeconds = Math.max(0, rawSeconds - offset);
    return this.formatSecondsToTimeString(gameplaySeconds);
  }
}
