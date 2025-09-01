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
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
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
import { GameFlowService } from '../../../services/game-flow/game-flow.service';
import { Dialog } from '../dialog/dialog.component';

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
    private webSocketService: WebSocketService, // Kept for postGameCellClick
    public gameFlowService: GameFlowService,
    private dialog: MatDialog,
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
        this.cdr.detectChanges();
      });

    // Subscribe ONLY for post-game cell clicks. All other flow is handled by GameFlowService.
    this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        if (message.type === 'postGameCellClicked') {
          this.triggerExclamation(message.row, message.col, message.color);
          this.highlightWordAt(message.row, message.col);
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
    const dialogRef = this.dialog.open(Dialog, {
      data: {
        dialogText: 'Are you sure you want to quit?',
        showConfirm: true,
        confirmText: 'Yes',
        showCancel: true,
        cancelText: 'No',
        isConfirmation: true,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.dialogRef.close({ event: 'quit' });
      }
    });
  }

  readyUp(): void {
    this.gameFlowService.playerReady();
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
