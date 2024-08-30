import {
  Component,
  ElementRef,
  inject,
  NgZone,
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
  CdkDragEnter,
  CdkDragExit,
} from '@angular/cdk/drag-drop';
import { Location } from '@angular/common';
import { PUZZLES } from './puzzles';
import { VALID_WORDS } from './valid-words';
import { CommonModule } from '@angular/common';
import { TimerComponent } from '../timer/timer.component';
import { DialogPostGame } from '../dialog-post-game/dialog-post-game.component';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';
import * as confetti from 'canvas-confetti';
import { ActivatedRoute, Router } from '@angular/router';
import { GameState, GameStateService } from '../game-state.service';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { GameSeedService } from '../game-seed.service';

interface ValidatedWord {
  word: string;
  isValid: boolean;
  startI: number;
  startJ: number;
  direction: 'horizontal' | 'vertical';
}

const DRAG_POSITION_INIT = { x: -235, y: -237 };

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CommonModule,
    TimerComponent,
    MatDialogModule,
  ],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild(TimerComponent) timerComponent!: TimerComponent;
  @ViewChild('gridWrapper') gridWrapper!: ElementRef;
  @ViewChild('gridContainer') gridContainer!: ElementRef;

  private touchMoveListener!: (e: TouchEvent) => void;
  private webSocketService = inject(WebSocketService);

  bankLetters: string[] = [];
  grid: string[][] = [];
  validLetterIndices: boolean[][] = [];
  condensedGrid: string[][] = [];
  condensedGridDisplaySize: number = 10;
  gridCellIds: string[] = [];
  allDropListIds: string[] = ['letter-bank'];
  formedWords: ValidatedWord[] = [];
  validWords: Set<string>;
  countdown: number = 3;
  gameSeed: number | null = null;

  // Grid DOM settings
  GRID_SIZE: number = 24;
  CONDENSED_SIZE: number = 12;
  dragPosition = DRAG_POSITION_INIT;

  // Timer
  timerRunning = false;
  currentTimeString: string = '0:00';

  // Debug
  debug: boolean = false;

  // Dialog
  readonly dialog = inject(MatDialog);

  //MP
  private wsSubscription!: Subscription;
  isMultiplayer: boolean = false;
  isGameOver: boolean = false;
  isWinner: boolean = false;
  isGameStarted: boolean = false;

  // Game State
  gameState!: GameState;
  isCountingDown: boolean = false;
  waitingForRestart: boolean = false;
  isGridReady: boolean = false;
  isDaily: boolean = false;
  timerStartTime: number = 0;

  constructor(
    private renderer2: Renderer2,
    private elementRef: ElementRef,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private location: Location,
    private gameSeedService: GameSeedService
  ) {
    this.validWords = new Set(VALID_WORDS);
  }

  ngOnInit(): void {
    this.generateGridCellIds();

    this.gameStateService.getGameState().subscribe((state) => {
      this.gameState = state;
    });

    this.extractRouteInfo();

    if (this.isMultiplayer && !this.gameState.isInGame)
      this.router.navigate(['/']);

    if (this.isDaily) {
      let time = localStorage.getItem('dailyCurrentTime');
      if (time) {
        this.timerStartTime = +time;
      }
    }

    this.startAfterCountDown();

    this.wsSubscription = this.webSocketService
      .getMessages()
      .subscribe((message) => this.handleWebSocketMessage(message));
  }

  private extractRouteInfo() {
    if (this.router.url.split('/')[1] === 'versus') this.isMultiplayer = true;
    // Get the seed from the current route
    this.route.paramMap.subscribe((params) => {
      const seedParam = params.get('gameSeed');

      if (seedParam) {
        if (seedParam === 'daily') {
          this.isDaily = true;
          this.gameSeed = this.gameSeedService.getDailySeed();
          return;
        }

        const seedNumber = Number(seedParam);

        if (!isNaN(seedNumber) && seedNumber >= 0 && seedNumber <= 3650) {
          this.gameSeed = seedNumber;
        } else {
          console.error('Invalid seed value. Redirecting to home.');
          this.router.navigate(['/']);
        }
      }
    });
  }
  ngAfterViewInit() {
    requestAnimationFrame(() => this.prepareGrid());
  }
  prepareGrid() {
    // Simulate some preparation time
    setTimeout(() => {
      this.isGridReady = true;
      this.setupTouchEventHandling();

      // Perform any necessary grid setup here
    }, 0);
  }
  ngOnDestroy(): void {
    this.gameStateService.setGameState({
      gameSeed: null,
    });
    this.removeTouchEventHandling();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  getRandomPuzzleSeed() {
    return Math.floor(Math.random() * PUZZLES.length);
  }

  private startCountdown(onComplete: () => void) {
    this.countdown = 3;
    this.ngZone.runOutsideAngular(() => {
      const countInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;
          if (this.countdown <= 0) {
            clearInterval(countInterval);
            onComplete();
          }
        });
      }, 1000);
    });
  }

  startAfterCountDown() {
    this.resetTimer();
    this.isCountingDown = true;
    this.waitingForRestart = false;
    this.initializeGrid();
    this.initializeValidLetterIndices();
    if (!this.gameSeed) {
      this.gameSeed = this.getRandomPuzzleSeed();
    }
    if (!this.isMultiplayer) {
      // Update the URL to reflect the game seed or daily, for easier sharing
      if (this.isDaily) {
        this.location.replaceState('/daily');
      } else {
        this.location.replaceState('/challenge/' + this.gameSeed);
      }
    }
    this.setLettersFromPuzzle();
    this.shuffleLetters();

    this.startCountdown(() => {
      this.isGameStarted = true;
      this.startPuzzle();
      this.isCountingDown = false;
    });
  }

  handleWebSocketMessage(message: any): void {
    console.log(message);
    switch (message.type) {
      case 'gameStarted':
        this.isMultiplayer = true;
        this.startAfterCountDown();
        break;
      case 'gameEnded':
        this.isGameOver = true;
        this.isWinner = message.isWinner;
        this.gameStateService.setGameState({
          players: message.players,
        });
        this.openDialog({
          winnerDisplayName: message.winnerDisplayName,
          grid: message.condensedGrid,
          time: message.time,
        });
        this.stopTimer();
        break;
    }
  }

  startPuzzle() {
    this.startTimer();
    this.initializeGrid();
    this.initializeValidLetterIndices();
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    this.updateFormedWords();
    this.isGameStarted = true;
  }

  refreshPuzzle() {
    this.initializeGrid();
    this.initializeValidLetterIndices();
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    this.updateFormedWords();
    this.isGameStarted = true;
    this.setLettersFromPuzzle();
    this.shuffleLetters();
  }

  setLettersFromPuzzle() {
    if (this.gameSeed) this.bankLetters = [...PUZZLES[this.gameSeed].letters];
  }

  shuffleLetters() {
    for (let i = this.bankLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bankLetters[i], this.bankLetters[j]] = [
        this.bankLetters[j],
        this.bankLetters[i],
      ];
    }
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

    // Check if all formed words are valid
    if (!this.allWordsAreValid()) {
      return false;
    }

    // If all conditions are met, it's a win
    this.createCondensedGrid();
    this.stopTimer();
    if (this.isMultiplayer) {
      this.webSocketService.announceWin(
        this.gameState.localPlayerId!,
        this.condensedGrid,
        this.currentTimeString
      );
    } else {
      if (this.isDaily) {
        this.updateDailyLocalStorage();
      }
      setTimeout(() => {
        this.openDialog({
          winnerDisplayName: 'You',
          grid: this.condensedGrid,
          time: this.currentTimeString,
          singlePlayer: true,
          shareLink: this.generateShareLink(),
          daily: this.isDaily,
        });
      }, 1100);

      this.isGameStarted = false;
      this.waitingForRestart = true;
    }
    this.renderConfetti();
    return true;
  }

  updateDailyLocalStorage() {
    localStorage.setItem('finishedDaily', 'true');
    localStorage.setItem('finalGrid', JSON.stringify(this.condensedGrid));
    localStorage.setItem('finalTime', this.currentTimeString);

    let timesString = localStorage.getItem('allTimes');
    let times = [];
    let finalTimeNumber = +localStorage.getItem('dailyCurrentTime')!;
    if (timesString) {
      times = JSON.parse(timesString);
      times.push(finalTimeNumber);
    } else {
      times = [finalTimeNumber];
    }
    localStorage.setItem('allTimes', JSON.stringify(times));
  }

  generateShareLink() {
    if (this.isDaily) return window.location.origin + '/daily';
    return window.location.origin + '/challenge/' + this.gameSeed;
  }

  private allWordsAreValid(): boolean {
    return this.formedWords.every((word) => word.isValid);
  }
  forceWin() {
    this.renderConfetti();
    this.createCondensedGrid();
    this.webSocketService.announceWin(
      this.gameState.localPlayerId!,
      this.condensedGrid,
      this.currentTimeString
    );
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

  updateFormedWords() {
    this.formedWords = [];
    this.resetValidLetterIndices();

    // First pass: Identify all words
    this.identifyWords();

    // Second pass: Validate words and update indices
    this.validateWords();

    // Third pass: Invalidate letters of invalid words
    this.invalidateLettersOfInvalidWords();

    this.checkWin();
  }

  identifyWords() {
    this.identifyHorizontalWords();
    this.identifyVerticalWords();
  }

  identifyHorizontalWords() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      let word = '';
      let startJ = 0;
      for (let j = 0; j < this.GRID_SIZE; j++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j];
        } else {
          this.addWordToList(word, i, startJ, 'horizontal');
          word = '';
          startJ = j + 1;
        }
      }
      this.addWordToList(word, i, startJ, 'horizontal');
    }
  }

  identifyVerticalWords() {
    for (let j = 0; j < this.GRID_SIZE; j++) {
      let word = '';
      let startI = 0;
      for (let i = 0; i < this.GRID_SIZE; i++) {
        if (!this.isEmpty(this.grid[i][j])) {
          word += this.grid[i][j];
        } else {
          this.addWordToList(word, startI, j, 'vertical');
          word = '';
          startI = i + 1;
        }
      }
      this.addWordToList(word, startI, j, 'vertical');
    }
  }

  addWordToList(
    word: string,
    startI: number,
    startJ: number,
    direction: 'horizontal' | 'vertical'
  ) {
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

  validateWords() {
    // Reset all indices to false
    this.resetValidLetterIndices();

    // Mark valid words
    for (const wordInfo of this.formedWords) {
      if (wordInfo.isValid) {
        this.markWordLetters(wordInfo, true);
      }
    }
  }
  invalidateLettersOfInvalidWords() {
    for (const wordInfo of this.formedWords) {
      if (!wordInfo.isValid) {
        this.markWordLetters(wordInfo, false);
      }
    }
  }
  markWordLetters(wordInfo: ValidatedWord, isValid: boolean) {
    const { startI, startJ, direction, word } = wordInfo;
    for (let k = 0; k < word.length; k++) {
      if (direction === 'horizontal') {
        this.validLetterIndices[startI][startJ + k] = isValid;
      } else {
        this.validLetterIndices[startI + k][startJ] = isValid;
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

  startTimer() {
    this.timerRunning = true;
  }

  stopTimer() {
    this.timerRunning = false;
  }

  onTimeChanged(time: number) {
    if (this.isDaily) {
      localStorage.setItem('dailyCurrentTime', '' + time);
    }
    const minutes = Math.floor(time / 60);
    const remainingSeconds = time % 60;
    this.currentTimeString = `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  private resetTimer() {
    if (this.timerComponent) {
      this.timerComponent.resetTimer();
    }
  }

  // DOM Helpers=========================================================

  openDialog(data: any) {
    const dialogRef = this.dialog.open(DialogPostGame, {
      data: data,
      minWidth: 370,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        if (this.isMultiplayer) {
          this.router.navigate(['/lobby']);
        } else {
          this.router.navigate(['/']);
        }
      } else {
        if (result.event === 'confirm') {
          if (this.isMultiplayer) this.router.navigate(['/lobby']);
          if (this.isDaily) this.router.navigate(['/solo']);
          if (!this.isDaily && !this.isMultiplayer) {
            this.gameSeed = this.getRandomPuzzleSeed();
            this.startAfterCountDown();
          }
        }
        if (result.event === 'quit') {
          this.router.navigate(['/']);
        }
      }
    });
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  private setupTouchEventHandling() {
    //if the grid isn't ready yet, abort and try again in 100ms
    if (!this.gridWrapper || !this.gridContainer) {
      setTimeout(() => {
        this.setupTouchEventHandling();
      }, 100);
      return;
    }
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

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  getFlipInClass(i: number) {
    if (!this.isGameStarted) return 'notouch flip-in-hor-bottom-' + i;
    return '';
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
    this.dragPosition = { x: -235, y: -237 };

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

  entered(event: CdkDragEnter) {
    const dropList = event.container.element.nativeElement;
    dropList.classList.add('drop-list-highlight');
  }

  exited(event: CdkDragExit) {
    const dropList = event.container.element.nativeElement;
    dropList.classList.remove('drop-list-highlight');
  }

  drop(event: CdkDragDrop<string[]>) {
    const dropList = event.container.element.nativeElement;
    dropList.classList.remove('drop-list-highlight');

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

  createCondensedGrid(): void {
    let minRow = this.GRID_SIZE;
    let minCol = this.GRID_SIZE;
    let maxRow = 0;
    let maxCol = 0;

    // Find the boundaries of the valid letters
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

    // Calculate the size of the used area
    const usedRows = maxRow - minRow + 1;
    const usedCols = maxCol - minCol + 1;

    // Calculate padding to center the grid
    const paddingTop = Math.floor((this.CONDENSED_SIZE - usedRows) / 2);
    const paddingLeft = Math.floor((this.CONDENSED_SIZE - usedCols) / 2);

    // Create the condensed grid with the fixed size
    this.condensedGrid = Array(this.CONDENSED_SIZE)
      .fill(null)
      .map(() => Array(this.CONDENSED_SIZE).fill(''));

    // Fill the condensed grid with letters from valid positions, with padding
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        if (this.validLetterIndices[i][j]) {
          //subtracting one here so that it slightly aligns top left rather than bottom right
          const newRow = paddingTop + (i - minRow) - 1;
          const newCol = paddingLeft + (j - minCol) - 1;
          this.condensedGrid[newRow][newCol] = this.grid[i][j];
        }
      }
    }
  }
}
