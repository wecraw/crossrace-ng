import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject, Subscription, takeUntil } from 'rxjs';
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
  private wsSubscription: Subscription | null = null;
  private countdownInterval: any;
  private postGameDialogRef: MatDialogRef<DialogPostGameMp> | null = null;

  private readonly gamePhaseSubject = new BehaviorSubject<GamePhase>('LOBBY');
  public readonly gamePhase$ = this.gamePhaseSubject.asObservable();

  private readonly nextGameCountdownSubject = new BehaviorSubject<string>('');
  public readonly nextGameCountdown$ =
    this.nextGameCountdownSubject.asObservable();

  private gameState!: GameState;

  constructor() {
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
      });
  }

  public initialize(): void {
    // Prevent multiple initializations
    if (this.wsSubscription && !this.wsSubscription.closed) {
      return;
    }
    this.wsSubscription = this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleWebSocketMessage(message));
  }

  public destroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  public playerReady(): void {
    const currentState = this.gameStateService.getCurrentState();
    if (currentState.gameCode && currentState.localPlayerId) {
      // Optimistic update: Update the local state immediately.
      const newPlayers = currentState.players.map((player) => {
        if (player.id === currentState.localPlayerId) {
          // Create a new player object with the ready status updated
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

  private async handleWebSocketMessage(message: any): Promise<void> {
    console.log('GameFlowService received message:', message.type, message);

    switch (message.type) {
      case 'playerList':
        this.gameStateService.updateGameState({
          players: message.players,
        });
        break;

      case 'gameStarted':
        this.closePostGameDialog();
        this.gamePhaseSubject.next('STARTING');
        this.gameStateService.updateGameState({
          gameSeed: message.gameSeed,
          isInGame: true,
          gameMode: 'versus',
        });

        await this.loadingService.showAndHide({
          message: 'Game starting!',
          duration: LOBBY_GAME_START_COUNTDOWN_DURATION,
        });

        this.gamePhaseSubject.next('IN_GAME');
        this.router.navigate(['/versus', this.gameState.gameCode]);
        break;

      case 'gameEnded':
        this.gamePhaseSubject.next('POST_GAME');
        this.gameStateService.updateGameState({
          players: message.players,
          lastGameEndTimestamp: message.lastGameEndTimestamp,
        });
        this.openPostGameDialog(message);
        this.startCountdownTimer(message.lastGameEndTimestamp);
        break;

      case 'syncGameState':
        await this.syncGameState(
          message.time,
          message.isGameEnded,
          message.gameEndData,
        );
        break;

      case 'error':
        if (
          message.message?.includes(
            'A multiplayer game requires at least 2 players',
          )
        ) {
          this.handleNotEnoughPlayersError();
        } else if (message.message?.includes('Failed to start game')) {
          // This can be ignored as the lobby handles it locally.
          return;
        } else {
          // General error handling
          console.error('Received server error:', message.message);
          this.router.navigate(['/']); // Or a dedicated error page
        }
        break;
    }
  }

  private openPostGameDialog(data: any): void {
    if (this.postGameDialogRef) {
      return; // Dialog is already open
    }
    this.gamePhaseSubject.next('POST_GAME');
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

  private closePostGameDialog(): void {
    if (this.postGameDialogRef) {
      this.postGameDialogRef.close();
      this.postGameDialogRef = null;
    }
  }

  private startCountdownTimer(timestamp: string | Date): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    const AUTO_START_SECONDS = 30;
    const serverEndTime = new Date(timestamp).getTime();
    const autoStartTime = serverEndTime + AUTO_START_SECONDS * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const remainingSeconds = Math.round((autoStartTime - now) / 1000);
      const totalPlayers = this.gameState.players.filter(
        (p) => !p.disconnected,
      ).length;

      if (remainingSeconds <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
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
      }
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  private handleNotEnoughPlayersError(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    const totalPlayers = this.gameState.players.filter(
      (p) => !p.disconnected,
    ).length;
    if (totalPlayers < 2) {
      this.nextGameCountdownSubject.next('Waiting for more players...');
    } else {
      this.nextGameCountdownSubject.next('Waiting for players to ready up...');
    }
  }

  private async syncGameState(
    serverTime: number,
    gameEnded: boolean,
    gameEndData: any,
  ): Promise<void> {
    console.log(
      'Syncing game state on connection:',
      serverTime,
      gameEnded,
      gameEndData,
    );

    // Case 1: Game ended while player was disconnected. Show post-game dialog.
    if (gameEnded && gameEndData) {
      this.gamePhaseSubject.next('POST_GAME');
      console.log('Game ended while disconnected, showing end game dialog');
      this.gameStateService.updateGameState({
        players: gameEndData.players,
        lastGameEndTimestamp: gameEndData.lastGameEndTimestamp,
      });
      this.openPostGameDialog(gameEndData);
      if (gameEndData.lastGameEndTimestamp) {
        this.startCountdownTimer(gameEndData.lastGameEndTimestamp);
      }
      return;
    }

    // Case 2: Game is in progress. Navigate to game screen.
    // The GameComponent will receive the sync time from the GameStateService
    // and handle its own countdown and timer synchronization.
    if (this.gameState.isInGame) {
      this.gamePhaseSubject.next('IN_GAME');
      console.log(
        'Reconnected to an active game. Ensuring navigation to game screen.',
      );
      this.router.navigate(['/versus', this.gameState.gameCode]);
    } else {
      // Case 3: Player was in lobby/post-game, but is not in a game now.
      // This can happen if they were disconnected, the game ended, and the game start timer expired
      // but there weren't enough players to start a new one. Send them to the lobby.
      this.gamePhaseSubject.next('LOBBY');
      this.router.navigate([
        '/lobby',
        this.gameStateService.getCurrentState().gameCode,
      ]);
    }
  }
}
