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
import { GameStateService } from '../../../services/game-state/game-state.service';
import { GameState } from '../../../interfaces/game-state';
import { WebSocketService } from '../../../services/websocket/websocket.service';
import {
  COUNTDOWN_FADEOUT_DELAY,
  COUNTDOWN_INITIAL_VALUE,
  COUNTDOWN_INTERVAL,
  COUNTDOWN_START_DELAY,
  LOBBY_GAME_START_COUNTDOWN_DURATION,
} from '../../../constants/game-constants';

interface Word {
  text: string;
  cells: { row: number; col: number }[];
  direction: 'horizontal' | 'vertical';
}

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
  displayTime: string = '';

  // Game state and ready-up logic
  gameState!: GameState;
  isLocalPlayerReady = false;
  readyPlayersCount = 0;
  totalPlayersCount = 0;
  countdownDisplay: string = '30s';
  isWaitingForPlayers = false;
  private countdownInterval: any;
  private readonly destroy$ = new Subject<void>();

  // Word highlighting properties
  private words: Word[] = [];
  highlightedCells: { row: number; col: number }[] = [];
  private lastClickedIntersectionCell: { row: number; col: number } | null =
    null;
  private intersectionHighlightDirection: 'horizontal' | 'vertical' =
    'horizontal';

  // Sliced grid for display
  displayGrid: string[][] = [];

  // Property for exclamation animation
  exclamationCell: { row: number; col: number } | null = null;
  exclamations: {
    id: number;
    row: number;
    col: number;
    randX: number;
    randY: number;
    color: string;
  }[] = [];
  private nextExclamationId = 0;
  private exclamationTimeout: any;
  private lastMessageSentTime = 0;
  private readonly MESSAGE_THROTTLE_MS = 500;

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
    },
    private cdr: ChangeDetectorRef,
    private gameStateService: GameStateService,
    private webSocketService: WebSocketService,
  ) {}

  readonly dialogRef = inject(MatDialogRef<DialogPostGameMp>);

  ngOnInit() {
    this.adjustWinTime();

    const displayGridSize = 10;
    if (this.data.grid) {
      this.displayGrid = this.data.grid
        .slice(0, displayGridSize)
        .map((row) => row.slice(0, displayGridSize));
    }

    this.words = this.parseWordsFromGrid(this.data.grid);

    // Subscribe to game state to react to player changes
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.gameState = state;
        if (state.players) {
          this.updateReadyCounts(state.players);
        }
        // If the timestamp is already in the state when the dialog opens, start the timer
        if (state.lastGameEndTimestamp && !this.countdownInterval) {
          this.startCountdownTimer(state.lastGameEndTimestamp);
        }
        this.cdr.detectChanges();
      });

    // Subscribe to WebSocket messages
    this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        if (message.type === 'postGameCellClicked') {
          this.triggerExclamation(message.row, message.col, message.color);
          this.highlightWordAt(message.row, message.col);
        }
        if (message.type === 'gameEnded' && message.lastGameEndTimestamp) {
          this.startCountdownTimer(message.lastGameEndTimestamp);
        }
        if (message.type === 'playerList') {
          this.updateReadyCounts(message.players);
        }
        if (
          message.type === 'error' &&
          message.message?.includes(
            'A multiplayer game requires at least 2 players',
          )
        ) {
          this.isWaitingForPlayers = true;
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
          this.cdr.detectChanges();
        }
        if (message.type === 'gameStarted') {
          this.isWaitingForPlayers = false;
        }
      });
  }

  private adjustWinTime(): void {
    // For single-player games, the time is already correct.
    if (this.data.singlePlayer) {
      this.displayTime = this.data.time;
      return;
    }

    // For multiplayer games, subtract the animation delay from the raw server time.
    const totalOffsetMs =
      LOBBY_GAME_START_COUNTDOWN_DURATION +
      COUNTDOWN_START_DELAY +
      COUNTDOWN_INITIAL_VALUE * COUNTDOWN_INTERVAL +
      COUNTDOWN_FADEOUT_DELAY;
    const animationOffsetS = totalOffsetMs / 1000;

    // Parse the "M:SS" string from the server into seconds.
    const timeParts = this.data.time.split(':').map(Number);
    const totalSeconds = timeParts[0] * 60 + timeParts[1];

    // Calculate the adjusted time from the player's perspective.
    const adjustedSeconds = Math.max(0, totalSeconds - animationOffsetS);

    // Format back into a "M:SS" string for display.
    const minutes = Math.floor(adjustedSeconds / 60);
    const seconds = Math.round(adjustedSeconds % 60);
    this.displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.exclamationTimeout) {
      clearTimeout(this.exclamationTimeout);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
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
    this.webSocketService.disconnect();
    this.dialogRef.close({ event: 'quit' });
  }

  readyUp(): void {
    if (this.gameState.gameCode) {
      this.isLocalPlayerReady = true; // Optimistic update
      this.readyPlayersCount++; // Optimistic update
      this.webSocketService.playerReady(this.gameState.gameCode);
    }
  }

  get readyButtonText(): string {
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

  private startCountdownTimer(timestamp: string | Date): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    const AUTO_START_SECONDS = 30;
    const serverEndTime = new Date(timestamp).getTime();
    const autoStartTime = serverEndTime + AUTO_START_SECONDS * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const remainingSeconds = Math.round((autoStartTime - now) / 1000);

      if (remainingSeconds <= 0) {
        this.countdownDisplay = '0s';
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
        // If the countdown is over, the game either started (and this dialog is gone)
        // or it failed to start (e.g., not enough players).
        // Therefore, if this dialog is still open, we must be in a waiting state.
        // We only set this after a delay to prevent a flicker.
        setTimeout(() => {
          this.isWaitingForPlayers = true;
        }, 1000);
      } else {
        this.countdownDisplay = `${remainingSeconds}s`;
        this.isWaitingForPlayers = false; // Countdown is active, so we are not in a waiting state.
      }
      this.cdr.detectChanges();
    };

    updateCountdown(); // Run immediately to set initial state correctly

    // Only set an interval if the auto-start time is still in the future.
    // This prevents creating a useless interval for players reconnecting late.
    if (Date.now() < autoStartTime) {
      this.countdownInterval = setInterval(updateCountdown, 1000);
    }
  }

  private parseWordsFromGrid(grid: string[][]): Word[] {
    const words: Word[] = [];
    if (!grid || grid.length === 0) {
      return words;
    }
    const rows = grid.length;
    const cols = grid[0].length;

    // Horizontal words
    for (let i = 0; i < rows; i++) {
      let currentWord = '';
      let wordCells: { row: number; col: number }[] = [];
      for (let j = 0; j < cols; j++) {
        if (grid[i]?.[j]) {
          currentWord += grid[i][j];
          wordCells.push({ row: i, col: j });
        } else {
          if (currentWord.length > 1) {
            words.push({
              text: currentWord,
              cells: wordCells,
              direction: 'horizontal',
            });
          }
          currentWord = '';
          wordCells = [];
        }
      }
      if (currentWord.length > 1) {
        words.push({
          text: currentWord,
          cells: wordCells,
          direction: 'horizontal',
        });
      }
    }

    // Vertical words
    for (let j = 0; j < cols; j++) {
      let currentWord = '';
      let wordCells: { row: number; col: number }[] = [];
      for (let i = 0; i < rows; i++) {
        if (grid[i]?.[j]) {
          currentWord += grid[i][j];
          wordCells.push({ row: i, col: j });
        } else {
          if (currentWord.length > 1) {
            words.push({
              text: currentWord,
              cells: wordCells,
              direction: 'vertical',
            });
          }
          currentWord = '';
          wordCells = [];
        }
      }
      if (currentWord.length > 1) {
        words.push({
          text: currentWord,
          cells: wordCells,
          direction: 'vertical',
        });
      }
    }

    return words;
  }

  getExclamationsForCell(
    row: number,
    col: number,
  ): {
    id: number;
    row: number;
    col: number;
    randX: number;
    randY: number;
    color: string;
  }[] {
    return this.exclamations.filter((e) => e.row === row && e.col === col);
  }

  private triggerExclamation(row: number, col: number, color: string): void {
    const newId = this.nextExclamationId++;
    this.exclamations.push({
      id: newId,
      row,
      col,
      randX: Math.random() * 600 - 300,
      randY: Math.random() * -50 - 75,
      color: color,
    });
    this.cdr.detectChanges();

    setTimeout(() => {
      this.exclamations = this.exclamations.filter((e) => e.id !== newId);
      this.cdr.detectChanges();
    }, 2000); // Animation duration is 2s
  }

  private highlightWordAt(row: number, col: number): void {
    // Word highlighting logic
    let nextHighlightedCells: { row: number; col: number }[] = [];
    const wordsAtCell = this.words.filter((w) =>
      w.cells.some((c) => c.row === row && c.col === col),
    );

    if (wordsAtCell.length === 0) {
      this.lastClickedIntersectionCell = null;
    } else if (wordsAtCell.length === 1) {
      nextHighlightedCells = wordsAtCell[0].cells;
      this.lastClickedIntersectionCell = null;
    } else if (wordsAtCell.length >= 2) {
      const isSameIntersection =
        this.lastClickedIntersectionCell &&
        this.lastClickedIntersectionCell.row === row &&
        this.lastClickedIntersectionCell.col === col;

      const horizontalWord = wordsAtCell.find(
        (w) => w.direction === 'horizontal',
      );
      const verticalWord = wordsAtCell.find((w) => w.direction === 'vertical');

      if (!isSameIntersection) {
        this.lastClickedIntersectionCell = { row, col };
        if (horizontalWord) {
          nextHighlightedCells = horizontalWord.cells;
          this.intersectionHighlightDirection = 'horizontal';
        } else if (verticalWord) {
          nextHighlightedCells = verticalWord.cells;
          this.intersectionHighlightDirection = 'vertical';
        }
      } else {
        if (
          this.intersectionHighlightDirection === 'horizontal' &&
          verticalWord
        ) {
          nextHighlightedCells = verticalWord.cells;
          this.intersectionHighlightDirection = 'vertical';
        } else if (horizontalWord) {
          nextHighlightedCells = horizontalWord.cells;
          this.intersectionHighlightDirection = 'horizontal';
        }
      }
    }

    // Reset current highlights to force re-animation
    this.highlightedCells = [];
    this.cdr.detectChanges();

    // Use a minimal timeout to allow the DOM to update (remove the class)
    // before re-applying it. This forces the animation to restart.
    setTimeout(() => {
      this.highlightedCells = nextHighlightedCells;
      this.cdr.detectChanges();
    }, 10);
  }

  onCellClick(row: number, col: number): void {
    // 1. Trigger local effects immediately.
    // Find local player from the gameState to get their color.
    const localPlayer = this.gameState.players.find(
      (p: Player) => p.id === this.gameState.localPlayerId,
    );
    // Fallback to red if player not found (should not happen).
    const color = localPlayer ? localPlayer.playerColor : '#B50000';
    this.triggerExclamation(row, col, color);
    this.highlightWordAt(row, col);

    // 2. Send throttled WebSocket message.
    const now = Date.now();
    if (now - this.lastMessageSentTime > this.MESSAGE_THROTTLE_MS) {
      if (this.gameState.gameCode) {
        this.webSocketService.sendPostGameCellClick(
          this.gameState.gameCode,
          row,
          col,
        );
      }
      this.lastMessageSentTime = now;
    }
  }

  isCellHighlighted(row: number, col: number): boolean {
    return this.highlightedCells.some((c) => c.row === row && c.col === col);
  }

  isExclamationVisible(row: number, col: number): boolean {
    return (
      this.exclamationCell?.row === row && this.exclamationCell?.col === col
    );
  }
}
