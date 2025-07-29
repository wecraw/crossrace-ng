// crossrace-ng/src/app/components/dialogs/dialog-post-game-mp/dialog-post-game-mp.component.ts
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

  // New properties for next game logic
  gameState!: GameState;
  isHost: boolean = false;
  isStartingGame: boolean = false;
  isNextGameCountdown: boolean = true;
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
  // Property for exclamation animations
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

  ngOnInit() {
    const displayGridSize = 10;
    if (this.data.grid) {
      this.displayGrid = this.data.grid
        .slice(0, displayGridSize)
        .map((row) => row.slice(0, displayGridSize));
    }

    this.words = this.parseWordsFromGrid(this.data.grid);

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
    this.dialogRef.close({ event: 'quit' });
  }

  startNextGame(): void {
    if (this.isHost && this.gameState.gameCode) {
      this.isStartingGame = true;
      this.webSocketService.startGame(this.gameState.gameCode);
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

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  onCellClick(row: number, col: number): void {
    // Exclamation animation
    const newId = this.nextExclamationId++;
    this.exclamations.push({
      id: newId,
      row,
      col,
      randX: Math.random() * 800 - 400, // Random horizontal drift (-100% to 100%)
      randY: Math.random() * -100 - 150, // Random upward drift (-150% to -250%)
      color: this.getRandomColor(),
    });
    this.cdr.detectChanges();

    setTimeout(() => {
      this.exclamations = this.exclamations.filter((e) => e.id !== newId);
      this.cdr.detectChanges();
    }, 2000); // Animation duration is 2s

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

  isCellHighlighted(row: number, col: number): boolean {
    return this.highlightedCells.some((c) => c.row === row && c.col === col);
  }

  isExclamationVisible(row: number, col: number): boolean {
    return (
      this.exclamationCell?.row === row && this.exclamationCell?.col === col
    );
  }
}
