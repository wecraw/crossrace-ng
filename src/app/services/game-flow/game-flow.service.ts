import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject, pairwise, startWith, takeUntil } from 'rxjs';
import { GameStateService } from '../game-state/game-state.service';
import { LoadingService } from '../loading/loading.service';
import { WebSocketService } from '../websocket/websocket.service';
import { DialogPostGameMp } from '../../components/dialogs/dialog-post-game-mp/dialog-post-game-mp.component';
import { LOBBY_GAME_START_COUNTDOWN_DURATION } from '../../constants/game-constants';
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
    this.destroy$.complete();
    this.stopCountdownTimer();
    this.closePostGameDialog();
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
        if (currentState.gameCode) {
          this.router.navigate(['/lobby', currentState.gameCode]);
        }
        break;
      }

      case 'IN_GAME': {
        this.gamePhaseSubject.next('IN_GAME');
        this.stopCountdownTimer();
        this.closePostGameDialog();

        // If we are rejoining an in-progress game (elapsed time > 0), skip the interstitial
        // and barrier entirely to allow immediate timer sync.
        const elapsed = currentState.currentGameTime ?? 0;
        if (elapsed > 0) {
          this.gameStateService.updateGameState({ startBarrierUntil: null });
          if (currentState.gameCode) {
            this.router.navigate(['/versus', currentState.gameCode]);
          }
          break;
        }

        // Set a barrier so GameComponent defers its own 3..2..1 countdown
        // until after the "Game starting!" animation finishes.
        const barrierUntil = Date.now() + LOBBY_GAME_START_COUNTDOWN_DURATION;
        this.gameStateService.updateGameState({
          startBarrierUntil: barrierUntil,
        });

        // Show "Game starting!" interstitial, then navigate.
        // If showAndHide doesn't truly await, the barrier still enforces the delay in GameComponent.
        await this.loadingService.showAndHide({
          message: 'Game starting!',
          duration: LOBBY_GAME_START_COUNTDOWN_DURATION,
        });

        if (currentState.gameCode) {
          this.router.navigate(['/versus', currentState.gameCode]);
        }
        break;
      }

      case 'POST_GAME': {
        this.gamePhaseSubject.next('POST_GAME');

        const data = currentState.postGameData;
        if (data && !this.postGameDialogRef) {
          this.postGameDialogRef = this.dialog.open(DialogPostGameMp, {
            data: {
              winnerDisplayName: data.winnerDisplayName,
              winnerColor: data.winnerColor,
              winnerEmoji: data.winnerEmoji,
              grid: data.condensedGrid,
              time: data.time,
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

  private stopCountdownTimer(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.countdownTargetMs = null;
    this.nextGameCountdownSubject.next('');
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
        this.nextGameCountdownSubject.next('Waiting for more players...');
      } else {
        this.nextGameCountdownSubject.next(
          'Waiting for players to ready up...',
        );
      }
      // No need to keep ticking after time has elapsed.
      this.stopCountdownTimer();
      return;
    }

    this.nextGameCountdownSubject.next(
      `Next game starts in: ${remainingSeconds}s`,
    );
  }
}
