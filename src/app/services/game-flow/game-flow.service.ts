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
      // No phase change; still update countdown label if in POST_GAME
      if (currPhase === 'POST_GAME' && currentState.lastGameEndTimestamp) {
        this.startCountdownTimer(currentState.lastGameEndTimestamp);
      }
      return;
    }

    switch (currPhase) {
      case 'LOBBY': {
        this.gamePhaseSubject.next('LOBBY');
        this.closePostGameDialog();
        if (currentState.gameCode) {
          this.router.navigate(['/lobby', currentState.gameCode]);
        }
        break;
      }

      case 'IN_GAME': {
        this.gamePhaseSubject.next('IN_GAME');
        this.closePostGameDialog();
        // Show "Game starting!" interstitial only on transitions from non-IN_GAME
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

  private startCountdownTimer(timestamp: string | Date): void {
    const AUTO_START_SECONDS = 30;
    const serverEndTime = new Date(timestamp).getTime();
    const autoStartTime = serverEndTime + AUTO_START_SECONDS * 1000;

    const now = Date.now();
    const remainingSeconds = Math.round((autoStartTime - now) / 1000);

    const totalPlayers = this.gameStateService
      .getCurrentState()
      .players.filter((p) => !p.disconnected).length;

    if (remainingSeconds <= 0) {
      if (totalPlayers < 2) {
        this.nextGameCountdownSubject.next('Waiting for more players...');
      } else {
        this.nextGameCountdownSubject.next(
          'Waiting for players to ready up...',
        );
      }
    } else {
      this.nextGameCountdownSubject.next(
        `Next game starts in: ${remainingSeconds}s`,
      );
      // schedule a tick to keep label reasonably fresh
      setTimeout(() => this.startCountdownTimer(timestamp), 1000);
    }
  }
}
