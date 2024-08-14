import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  transferArrayItem,
  CdkDragStart,
} from '@angular/cdk/drag-drop';

import { PUZZLES } from './puzzles';
import { VALID_WORDS } from './valid-words';
import { CommonModule } from '@angular/common';
import { TimerComponent } from '../timer/timer.component';

import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';
import * as confetti from 'canvas-confetti';

interface ValidatedWord {
  word: string;
  isValid: boolean;
}

@Component({
  selector: 'app-letter-tiles',
  standalone: true,
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CommonModule,
    TimerComponent,
  ],
  templateUrl: './letter-tiles.component.html',
  styleUrls: ['./letter-tiles.component.scss'],
})
export class LetterTilesComponent implements OnInit, OnDestroy {
  @ViewChild(TimerComponent) timerComponent!: TimerComponent;
  @ViewChild('gridWrapper') gridWrapper!: ElementRef;
  @ViewChild('gridContainer') gridContainer!: ElementRef;

  private touchMoveListener!: (e: TouchEvent) => void;
  private webSocketService = inject(WebSocketService);

  bankLetters: string[] = [];
  grid: string[][] = [];
  validLetterIndices: boolean[][] = [];
  gridCellIds: string[] = [];
  allDropListIds: string[] = ['letter-bank'];
  currentPuzzleIndex: number = 0;
  formedWords: ValidatedWord[] = [];
  validWords: Set<string>;

  // Grid DOM settings
  GRID_SIZE: number = 36;
  dragPosition = { x: -586, y: -586 };

  // Timer
  timerRunning = false;
  currentTime = 0;

  // Debug
  debug: boolean = false;

  //MP
  private wsSubscription!: Subscription;
  isMultiplayer: boolean = false;
  isGameOver: boolean = false;
  isWinner: boolean = false;
  isGameStarted: boolean = false;

  constructor(private renderer2: Renderer2, private elementRef: ElementRef) {
    this.validWords = new Set(VALID_WORDS);
  }

  ngOnInit(): void {
    this.initializeGrid();
    this.initializeValidLetterIndices();
    this.generateGridCellIds();
    this.wsSubscription = this.webSocketService
      .getMessages()
      .subscribe((message) => this.handleWebSocketMessage(message));
  }

  ngAfterViewInit() {
    this.setupTouchEventHandling();
  }

  ngOnDestroy(): void {
    this.removeTouchEventHandling();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  startRandomPuzzle() {
    this.currentPuzzleIndex = Math.floor(Math.random() * 1000);
    this.startPuzzle();
  }

  startSeededPuzzle(seed: number) {
    this.currentPuzzleIndex = seed;
    this.startPuzzle();
  }

  handleWebSocketMessage(message: any): void {
    console.log(message);
    switch (message.type) {
      case 'gameStarted':
        this.isMultiplayer = true;
        this.isGameStarted = true;
        this.startSeededPuzzle(message.gameSeed);
        break;
      case 'gameEnded':
        console.log('heard game ended', message);
        this.isGameOver = true;
        this.isWinner = message.winner;
        if (this.isWinner) {
          alert('You win!');
        } else {
          alert('You lose! ' + message.winnerDisplayName + ' was the winner.');
        }
        this.toggleTimer();
        break;
    }
  }

  startPuzzle(continueTimer?: boolean) {
    if (!continueTimer) this.toggleTimer();
    this.setLettersFromPuzzle();
    this.initializeGrid();
    this.initializeValidLetterIndices();
    this.generateGridCellIds();
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    this.updateFormedWords();
    this.isGameStarted = true;
  }

  setLettersFromPuzzle() {
    this.bankLetters = [...PUZZLES[this.currentPuzzleIndex].letters];
  }

  nextPuzzle() {
    this.currentPuzzleIndex = (this.currentPuzzleIndex + 1) % PUZZLES.length;
    this.startPuzzle();
  }

  resetPuzzle() {
    this.startPuzzle();
  }

  // Validators===========================================================

  checkWin(): boolean {
    // Check if all letters from the bank are used
    if (this.bankLetters.length > 0) {
      return false;
    }

    // Check for exactly 12 instances of true within validLetterIndices
    let trueCount = 0;
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (this.validLetterIndices[i][j]) {
          trueCount++;
        }
      }
    }
    if (trueCount !== 12) {
      return false;
    }

    // Check if all words are interconnected
    if (!this.areWordsInterconnected()) {
      return false;
    }

    // If all conditions are met, it's a win
    if (this.isMultiplayer) {
      this.webSocketService.announceWin();
      console.log('announcing win');
    } else {
      this.toggleTimer();
      this.isGameStarted = false;
      this.resetTimer();
    }
    this.renderConfetti();
    return true;
  }

  // Helper function to check if all words are interconnected
  private areWordsInterconnected(): boolean {
    let visited = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(false));
    let startI = -1,
      startJ = -1;

    // Find the first true cell in validLetterIndices
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

    // Perform DFS from the first true cell
    this.dfs(startI, startJ, visited);

    // Check if all true cells in validLetterIndices were visited
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (this.validLetterIndices[i][j] && !visited[i][j]) {
          return false; // Found a true cell that wasn't visited
        }
      }
    }

    return true;
  }

  anyTilePlaced() {
    return this.bankLetters.length < 12;
  }

  updateFormedWords() {
    this.formedWords = [];
    this.resetValidLetterIndices();
    this.checkHorizontalWords();
    this.checkVerticalWords();
    this.checkWin();
  }

  // Depth-First Search helper function
  private dfs(i: number, j: number, visited: boolean[][]) {
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

    // Check all adjacent cells
    this.dfs(i - 1, j, visited);
    this.dfs(i + 1, j, visited);
    this.dfs(i, j - 1, visited);
    this.dfs(i, j + 1, visited);
  }

  resetValidLetterIndices() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        this.validLetterIndices[i][j] = false;
      }
    }
  }

  checkHorizontalWords() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      let word = '';
      let startJ = 0;
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j];
        } else {
          this.addWordIfValid(word, i, startJ, 'horizontal');
          word = '';
          startJ = j + 1;
        }
      }
      this.addWordIfValid(word, i, startJ, 'horizontal');
    }
  }

  checkVerticalWords() {
    for (let j = 0; j < this.GRID_SIZE; j++) {
      let word = '';
      let startI = 0;
      for (let i = 0; i < this.GRID_SIZE; i++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j];
        } else {
          this.addWordIfValid(word, startI, j, 'vertical');
          word = '';
          startI = i + 1;
        }
      }
      this.addWordIfValid(word, startI, j, 'vertical');
    }
  }

  addWordIfValid(
    word: string,
    startI: number,
    startJ: number,
    direction: 'horizontal' | 'vertical'
  ) {
    if (word.length >= 2 && !this.formedWords.some((w) => w.word === word)) {
      const isValid =
        word.length >= 3 && this.validWords.has(word.toLowerCase());
      this.formedWords.push({ word, isValid });

      if (isValid) {
        for (let k = 0; k < word.length; k++) {
          if (direction === 'horizontal') {
            this.validLetterIndices[startI][startJ + k] = true;
          } else {
            this.validLetterIndices[startI + k][startJ] = true;
          }
        }
      } else if (word.length === 2) {
        // Mark letters in two-letter words as invalid
        this.markInvalidLetters(startI, startJ, direction, word.length);
      }
    }
  }

  markInvalidLetters(
    startI: number,
    startJ: number,
    direction: 'horizontal' | 'vertical',
    length: number
  ) {
    for (let k = 0; k < length; k++) {
      if (direction === 'horizontal') {
        this.validLetterIndices[startI][startJ + k] = false;
      } else {
        this.validLetterIndices[startI + k][startJ] = false;
      }
    }
  }

  // Timer===============================================================

  toggleTimer() {
    this.timerRunning = !this.timerRunning;
  }

  onTimeChanged(time: number) {
    this.currentTime = time;
  }

  private resetTimer() {
    if (this.timerComponent) {
      this.timerComponent.resetTimer();
    }
  }

  // DOM Helpers=========================================================

  private setupTouchEventHandling() {
    const wrapper = this.gridWrapper.nativeElement;
    const container = this.gridContainer.nativeElement;

    this.touchMoveListener = (e: TouchEvent) => {
      const touch = e.touches[0];
      const wrapperRect = wrapper.getBoundingClientRect();

      if (
        touch.clientX < wrapperRect.left ||
        touch.clientX > wrapperRect.right ||
        touch.clientY < wrapperRect.top ||
        touch.clientY > wrapperRect.bottom
      ) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', this.touchMoveListener, {
      passive: false,
    });
  }

  private removeTouchEventHandling() {
    if (this.touchMoveListener) {
      this.gridContainer.nativeElement.removeEventListener(
        'touchmove',
        this.touchMoveListener
      );
    }
  }

  isEmpty(cell: string) {
    return cell === null || cell === '';
  }

  dragStarted(event: CdkDragStart) {
    const [i, j] = this.getCellCoordinates(event.source.dropContainer.id);
    if (i !== -1 && j !== -1) {
      // Only handle drag start from grid cells, not the letter bank
      const originalLetter = this.grid[i][j];
      this.grid[i][j] = ''; // Temporarily remove the letter from the grid
      this.updateFormedWords(); // Revalidate words
      this.grid[i][j] = originalLetter; // Restore the letter
    }
  }

  initializeGrid() {
    this.dragPosition = { x: -586, y: -586 };

    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));
  }

  initializeValidLetterIndices() {
    this.validLetterIndices = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(false));
  }

  generateGridCellIds() {
    this.gridCellIds = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        this.gridCellIds.push(`cell-${i}-${j}`);
      }
    }
  }
  getCellCoordinates(id: string): [number, number] {
    if (id === 'letter-bank') return [-1, -1];
    const [_, i, j] = id.split('-').map(Number);
    return [i, j];
  }

  canEnter = (drag: CdkDrag, drop: CdkDropList) => {
    if (drop.id === 'letter-bank') return true;
    const [i, j] = this.getCellCoordinates(drop.id);
    return this.isEmpty(this.grid[i][j]);
  };

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      const [prevI, prevJ] = this.getCellCoordinates(
        event.previousContainer.id
      );
      const [nextI, nextJ] = this.getCellCoordinates(event.container.id);

      if (event.previousContainer.id === 'letter-bank') {
        if (this.isEmpty(this.grid[nextI][nextJ])) {
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            0
          );
          this.grid[nextI][nextJ] = event.container.data[0];
        }
      } else if (event.container.id === 'letter-bank') {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          0,
          event.currentIndex
        );
        this.grid[prevI][prevJ] = '';
      } else {
        if (this.isEmpty(this.grid[nextI][nextJ])) {
          this.grid[nextI][nextJ] = this.grid[prevI][prevJ];
          this.grid[prevI][prevJ] = '';
        } else {
          const temp = this.grid[nextI][nextJ];
          this.grid[nextI][nextJ] = this.grid[prevI][prevJ];
          this.grid[prevI][prevJ] = temp;
        }
      }
    }

    this.updateFormedWords();
  }
  renderConfetti() {
    const canvas = this.renderer2.createElement('canvas');

    // Set canvas dimensions to match the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Set canvas style to position it correctly
    this.renderer2.setStyle(canvas, 'position', 'fixed');
    this.renderer2.setStyle(canvas, 'top', '0');
    this.renderer2.setStyle(canvas, 'left', '0');
    this.renderer2.setStyle(canvas, 'pointer-events', 'none');

    this.renderer2.appendChild(this.elementRef.nativeElement, canvas);

    const myConfetti = confetti.create(canvas, {
      resize: true, // will fit all screen sizes
    });

    myConfetti({
      particleCount: 150,
      ticks: 150,
      spread: 70,
      angle: 60,
      origin: { y: 0.5, x: 0 },
    });

    myConfetti({
      particleCount: 150,
      ticks: 150,
      spread: 70,
      angle: 120,
      origin: { y: 0.5, x: 1 },
    });

    // Add event listener to resize canvas when window is resized
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
}
