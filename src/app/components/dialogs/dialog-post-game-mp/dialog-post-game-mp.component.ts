// crossrace-ng\src\app\components\dialogs\dialog-post-game-mp\dialog-post-game-mp.component.ts
import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { Player } from '../../../interfaces/player';
import { LeaderboardComponent } from '../../leaderboard/leaderboard.component';
import {
  GameState,
  GameStateService,
} from '../../../services/game-state/game-state.service';
import { WebSocketService } from '../../../services/websocket/websocket.service';

@Component({
  selector: 'dialog',
  templateUrl: 'dialog-post-game-mp.component.html',
  styleUrls: ['./dialog-post-game-mp.component.scss'],
  imports: [CommonModule, MatTooltipModule, LeaderboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideContent', [
      state('chessGrid', style({ transform: 'translateX(0%)' })),
      state('leaderboard', style({ transform: 'translateX(-150%)' })),
      transition('chessGrid <=> leaderboard', animate('300ms ease-in-out')),
    ]),
  ],
})
export class DialogPostGameMp implements OnInit, OnDestroy {
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  isShareSupported: boolean = false;
  isCopied: boolean = false;
  currentView: 'chessGrid' | 'leaderboard' = 'chessGrid';

  // New properties for next game logic
  gameState!: GameState;
  isHost: boolean = false;
  isStartingGame: boolean = false;
  isNextGameCountdown: boolean = true;
  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
      winnerEmoji: string;
      winnerColor: string;
      grid: string[][];
      time: string;
      singlePlayer?: boolean;
      daily?: boolean;
      shareLink?: string;
      players: Player[];
    },
    private cdr: ChangeDetectorRef,
    private gameStateService: GameStateService,
    private webSocketService: WebSocketService,
  ) {}

  readonly dialogRef = inject(MatDialogRef<DialogPostGameMp>);

  grid!: number[][];

  ngOnInit() {
    // Slightly dangerous because the longest word could theoretically be 12 characters long
    // In practice, this never happens
    const gridSize = 10;
    this.grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));

    // Subscribe to game state to react to host changes
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
        this.isHost = state.isHost;
        this.cdr.detectChanges(); // Update UI if host status changes
      });

    // 5-second countdown before host can start the next game
    setTimeout(() => {
      this.isNextGameCountdown = false;
      this.cdr.detectChanges();
    }, 5000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleView() {
    this.currentView =
      this.currentView === 'chessGrid' ? 'leaderboard' : 'chessGrid';
    this.cdr.detectChanges();
  }

  close() {
    this.dialogRef.close();
  }

  quit() {
    this.dialogRef.close({ event: 'quit' });
  }

  startNextGame(): void {
    if (this.isHost && this.gameState.gameCode) {
      this.isStartingGame = true;
      this.webSocketService.startGame(this.gameState.gameCode);
    }
  }
}
