// crossrace-ng/src/app/services/game-logic/game-logic.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { PUZZLES } from '../../components/game/puzzles';
import { VALID_WORDS } from '../../components/game/valid-words';

interface ValidatedWord {
  word: string;
  isValid: boolean;
  startI: number;
  startJ: number;
  direction: 'horizontal' | 'vertical';
}

@Injectable({
  providedIn: 'root',
})
export class GameLogicService {
  // --- Constants ---
  private readonly GRID_SIZE = 24;
  private readonly CONDENSED_SIZE = 12;

  // --- Game State ---
  private grid: string[][][] = [];
  private bankLetters: string[] = [];
  private validLetterIndices: boolean[][] = [];
  private formedWords: ValidatedWord[] = [];
  private readonly validWords: Set<string> = new Set(VALID_WORDS);
  private condensedGrid: string[][] = [];

  // --- State Observables ---
  private readonly gridSubject = new BehaviorSubject<string[][][]>([]);
  public readonly grid$ = this.gridSubject.asObservable();

  private readonly bankLettersSubject = new BehaviorSubject<string[]>([]);
  public readonly bankLetters$ = this.bankLettersSubject.asObservable();

  private readonly validLetterIndicesSubject = new BehaviorSubject<boolean[][]>(
    [],
  );
  public readonly validLetterIndices$ =
    this.validLetterIndicesSubject.asObservable();

  // --- Event Subjects ---
  public readonly winSubject = new Subject<string[][]>();

  constructor() {}

  // --- Public Methods ---

  /**
   * Initializes a new game board with a given seed.
   */
  public initializeGame(seed: number): void {
    this.setLettersFromPuzzle(seed);
    this.shuffleLetters();
    this.initializeGrid();
    this.initializeValidLetterIndices();
    this.updateFormedWords(); // Initial validation (empty board)
    this.emitState();
  }

  /**
   * Handles the drop event from the component, updating arrays and re-validating the board.
   */
  public handleDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.updateFormedWords();
    this.emitState(); // Emit updated grid and bank letters
  }

  /**
   * Handles the start of a drag from a grid cell, re-validating the board state
   * as if the tile were already removed.
   */
  public handleDragStartedFromGrid(i: number, j: number): void {
    if (i !== -1 && j !== -1) {
      const letter = this.grid[i]?.[j]?.pop();
      this.updateFormedWords();
      if (letter) {
        this.grid[i][j].push(letter);
      }
      // Only emit the validation change, not the grid/bank changes
      this.validLetterIndicesSubject.next(this.validLetterIndices);
    }
  }

  /**
   * Resets the puzzle by returning all letters from the grid to the bank and shuffling.
   */
  public refreshPuzzle(): void {
    // Collect all letters from the grid and add them back to the bank.
    for (const row of this.grid) {
      for (const cell of row) {
        if (!this.isEmpty(cell)) {
          this.bankLetters.push(...cell);
        }
      }
    }

    // Now that all letters are safe in the bank, reset the grid and other state.
    this.initializeGrid();
    this.initializeValidLetterIndices();
    this.shuffleLetters();
    this.updateFormedWords();
    this.emitState();
  }

  /**
   * Checks if a tile can be dropped in a given cell.
   */
  public canDropInCell(i: number, j: number): boolean {
    return this.isEmpty(this.grid[i]?.[j]);
  }

  // --- Private Methods ---

  private isEmpty(cell: string[] | undefined): boolean {
    return !cell || cell.length === 0;
  }

  private emitState(): void {
    this.gridSubject.next(this.grid);
    this.bankLettersSubject.next(this.bankLetters);
    this.validLetterIndicesSubject.next(this.validLetterIndices);
  }

  private initializeGrid(): void {
    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(this.GRID_SIZE)
          .fill(null)
          .map(() => []),
      );
  }

  private initializeValidLetterIndices(): void {
    this.validLetterIndices = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(false));
  }

  private setLettersFromPuzzle(seed: number): void {
    this.bankLetters = [...PUZZLES[seed].letters];
  }

  private shuffleLetters(): void {
    for (let i = this.bankLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bankLetters[i], this.bankLetters[j]] = [
        this.bankLetters[j],
        this.bankLetters[i],
      ];
    }
  }

  private updateFormedWords(): void {
    this.formedWords = [];
    this.resetValidLetterIndices();
    this.identifyWords();
    this.validateWords();
    this.invalidateLettersOfInvalidWords();
    this.checkWin();
  }

  private checkWin(): void {
    if (this.bankLetters.length > 0) return;

    let trueCount = 0;
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (this.validLetterIndices[i][j]) {
          trueCount++;
        }
      }
    }
    if (trueCount !== 12) return;

    if (!this.areWordsInterconnected()) return;
    if (!this.allWordsAreValid()) return;

    // Win condition met!
    this.createCondensedGrid();
    this.winSubject.next(this.condensedGrid);
  }

  private createCondensedGrid(): void {
    let minRow = this.GRID_SIZE;
    let minCol = this.GRID_SIZE;
    let maxRow = 0;
    let maxCol = 0;

    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (this.validLetterIndices[i][j]) {
          minRow = Math.min(minRow, i);
          minCol = Math.min(minCol, j);
          maxRow = Math.max(maxRow, i);
          maxCol = Math.max(maxCol, j);
        }
      }
    }

    const usedRows = maxRow - minRow + 1;
    const usedCols = maxCol - minCol + 1;

    const paddingTop = Math.floor((this.CONDENSED_SIZE - usedRows) / 2);
    const paddingLeft = Math.floor((this.CONDENSED_SIZE - usedCols) / 2);

    this.condensedGrid = Array(this.CONDENSED_SIZE)
      .fill(null)
      .map(() => Array(this.CONDENSED_SIZE).fill(''));

    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        if (this.validLetterIndices[i][j]) {
          const newRow = paddingTop + (i - minRow) - 1;
          const newCol = paddingLeft + (j - minCol) - 1;
          if (this.grid[i][j] && this.grid[i][j].length > 0) {
            this.condensedGrid[newRow][newCol] = this.grid[i][j][0];
          }
        }
      }
    }
  }

  private areWordsInterconnected(): boolean {
    const visited = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(false));
    let startI = -1,
      startJ = -1;

    outerLoop: for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (this.validLetterIndices[i][j]) {
          startI = i;
          startJ = j;
          break outerLoop;
        }
      }
    }

    if (startI === -1 || startJ === -1) {
      return false; // No valid letters found
    }

    this.dfs(startI, startJ, visited);

    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (this.validLetterIndices[i][j] && !visited[i][j]) {
          return false;
        }
      }
    }

    return true;
  }

  private dfs(i: number, j: number, visited: boolean[][]): void {
    if (
      i < 0 ||
      i >= this.GRID_SIZE ||
      j < 0 ||
      j >= this.GRID_SIZE ||
      !this.validLetterIndices[i][j] ||
      visited[i][j]
    ) {
      return;
    }

    visited[i][j] = true;

    this.dfs(i - 1, j, visited);
    this.dfs(i + 1, j, visited);
    this.dfs(i, j - 1, visited);
    this.dfs(i, j + 1, visited);
  }

  private allWordsAreValid(): boolean {
    return this.formedWords.every((word) => word.isValid);
  }

  private resetValidLetterIndices(): void {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        this.validLetterIndices[i][j] = false;
      }
    }
  }

  private identifyWords(): void {
    this.identifyHorizontalWords();
    this.identifyVerticalWords();
  }

  private identifyHorizontalWords(): void {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      let word = '';
      let startJ = 0;
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j][0];
        } else {
          this.addWordToList(word, i, startJ, 'horizontal');
          word = '';
          startJ = j + 1;
        }
      }
      this.addWordToList(word, i, startJ, 'horizontal');
    }
  }

  private identifyVerticalWords(): void {
    for (let j = 0; j < this.GRID_SIZE; j++) {
      let word = '';
      let startI = 0;
      for (let i = 0; i < this.GRID_SIZE; i++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j][0];
        } else {
          this.addWordToList(word, startI, j, 'vertical');
          word = '';
          startI = i + 1;
        }
      }
      this.addWordToList(word, startI, j, 'vertical');
    }
  }

  private addWordToList(
    word: string,
    startI: number,
    startJ: number,
    direction: 'horizontal' | 'vertical',
  ): void {
    if (word.length >= 2) {
      this.formedWords.push({
        word,
        isValid: word.length >= 3 && this.validWords.has(word.toLowerCase()),
        startI,
        startJ,
        direction,
      });
    }
  }

  private validateWords(): void {
    this.resetValidLetterIndices();
    for (const wordInfo of this.formedWords) {
      if (wordInfo.isValid) {
        this.markWordLetters(wordInfo, true);
      }
    }
  }

  private invalidateLettersOfInvalidWords(): void {
    for (const wordInfo of this.formedWords) {
      if (!wordInfo.isValid) {
        this.markWordLetters(wordInfo, false);
      }
    }
  }

  private markWordLetters(wordInfo: ValidatedWord, isValid: boolean): void {
    const { startI, startJ, direction, word } = wordInfo;
    for (let k = 0; k < word.length; k++) {
      if (direction === 'horizontal') {
        this.validLetterIndices[startI][startJ + k] = isValid;
      } else {
        this.validLetterIndices[startI + k][startJ] = isValid;
      }
    }
  }
}
