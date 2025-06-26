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
  transferArrayItem,
  moveItemInArray,
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
import { DialogPostGameMp } from '../dialog-post-game-mp/dialog-post-game-mp.component';

interface ValidatedWord {
  word: string;
  isValid: boolean;
  startI: number;
  startJ: number;
  direction: 'horizontal' | 'vertical';
}

const DRAG_POSITION_INIT = { x: -237, y: -232 };

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
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
  grid: string[][][] = [];
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
  isGameOver: boolean = false;
  isWinner: boolean = false;
  isGameStarted: boolean = false;
  connectionStatus: string = 'disconnected';

  // Game State
  gameState!: GameState;
  isCountingDown: boolean = false;
  waitingForRestart: boolean = false;
  isGridReady: boolean = false;
  timerStartTime: number = 0;

  constructor(
    private renderer2: Renderer2,
    private elementRef: ElementRef,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private location: Location,
    private gameSeedService: GameSeedService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    const navState = navigation?.extras.state as {
      gameSeed: number;
      isInGame: boolean;
      gameMode: 'versus' | 'daily' | 'practice';
    };

    const updates: Partial<GameState> = {};
    if (navState?.gameSeed !== undefined) updates.gameSeed = navState.gameSeed;
    if (navState?.isInGame !== undefined) updates.isInGame = navState.isInGame;
    if (navState?.gameMode !== undefined) updates.gameMode = navState.gameMode;

    if (Object.keys(updates).length > 0) {
      this.gameStateService.updateGameState(updates);
    }

    this.validWords = new Set(VALID_WORDS);
  }

  ngOnInit(): void {
    // Subscribe to services first
    this.webSocketService.getConnectionStatus().subscribe((status) => {
      this.connectionStatus = status;
    });

    this.wsSubscription = this.webSocketService
      .getMessages()
      .subscribe((message) => this.handleWebSocketMessage(message));

    // The GameStateService is our single source of truth.
    this.gameStateService.getGameState().subscribe((state) => {
      this.gameState = state;
    });

    // Generate grid IDs (doesn't depend on state)
    this.generateGridCellIds();

    // *** THE MAIN FIX IS HERE ***
    // We now initialize the game based on the state we've received.
    this.initializeGame();
  }

  private initializeGame(): void {
    // At this point, the constructor has already updated the GameStateService
    // with data from the router state if it existed.

    // The logic is now simple: what mode are we in?
    switch (this.gameState.gameMode) {
      case 'versus':
        // We are in a multiplayer game. Trust the state and start.
        if (this.gameState.gameSeed === null || !this.gameState.isInGame) {
          console.error('Versus mode state is invalid. Navigating home.');
          this.router.navigate(['/']);
          return;
        }
        this.startAfterCountDown();
        break;

      case 'daily':
      case 'practice':
        // This handles cases where the user navigates directly to a URL.
        // Let's create a separate helper for this to keep it clean.
        this.initializeFromUrl();
        break;

      default:
        // If we don't have a game mode, something is wrong.
        console.error('No game mode specified. Checking URL as a fallback.');
        // Fallback to the URL-based initialization
        this.initializeFromUrl();
    }
  }

  private initializeFromUrl(): void {
    if (this.route.snapshot.url[0]?.path === 'daily') {
      this.gameStateService.updateGameState({ gameMode: 'daily' });

      const dailySeed = this.gameSeedService.getDailySeed();
      const storageSeed = localStorage.getItem('dailySeed');

      // Check if it's the same daily challenge
      if (storageSeed && +storageSeed === dailySeed) {
        const finishedDaily = localStorage.getItem('finishedDaily');

        if (finishedDaily === 'true') {
          // Daily already completed, show post-game dialog
          const finalTime = localStorage.getItem('finalTime');
          const finalGrid = localStorage.getItem('finalGrid');

          if (finalTime && finalGrid) {
            this.isGridReady = true; // Prevent getting stuck on a loading state
            this.openDialog({
              time: finalTime,
              grid: JSON.parse(finalGrid),
              winnerDisplayName: 'You',
              daily: true,
              singlePlayer: true,
              shareLink: this.generateShareLink(),
            });
          }
          // Do not start the game
          return;
        } else {
          // This is a daily game in progress, resume it.
          const currentTime = localStorage.getItem('dailyCurrentTime');
          if (currentTime) {
            this.timerStartTime = +currentTime;
          }
        }
      }

      this.gameStateService.updateGameState({ gameSeed: dailySeed });
      this.startAfterCountDown();
      return;
    }

    // Default to a non-seeded practice game
    this.gameStateService.updateGameState({
      gameMode: 'practice',
      gameSeed: this.getRandomPuzzleSeed(),
    });
    this.startAfterCountDown();
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
    // It's good practice to only clear the 'in-game' part of the state here,
    // not the whole gameSeed, as the lobby might need it.
    this.gameStateService.updateGameState({
      isInGame: false,
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
    this.initializeGrid(); // Sets up empty grid array
    this.initializeValidLetterIndices();

    // *** Always get the seed from the GameState ***
    if (this.gameState.gameSeed === null) {
      console.error('Cannot start puzzle, game seed is null!');
      return;
    }

    if (this.gameState.gameMode === 'daily') {
      this.location.replaceState('/daily');
    }
    // For 'versus', the URL is already correct from the lobby.

    this.setLettersFromPuzzle();

    this.startCountdown(() => {
      this.isGameStarted = true;
      this.startPuzzle();
      this.isCountingDown = false;
    });
  }

  handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'gameEnded':
        this.isGameOver = true;
        this.isWinner = message.winner === this.gameState.localPlayerId; // More reliable check
        this.gameStateService.updateGameState({
          players: message.players,
          lastWinnerId: message.winner,
        });
        this.openDialog({
          winnerDisplayName: message.winnerDisplayName,
          winnerColor: message.winnerColor,
          winnerEmoji: message.winnerEmoji,
          players: message.players,
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
    // *** CHANGE: Always get the seed from the GameState ***
    if (this.gameState.gameSeed !== null) {
      this.bankLetters = [...PUZZLES[this.gameState.gameSeed].letters];
    } else {
      console.error('Cannot set letters, game seed is missing from state!');
    }
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
    if (this.gameState.gameMode === 'versus') {
      this.webSocketService.announceWin(
        this.gameState.localPlayerId!,
        this.condensedGrid,
        this.currentTimeString,
      );
    } else {
      if (this.gameState.gameMode === 'daily') {
        this.updateDailyLocalStorage();
      }
      setTimeout(() => {
        this.openDialog({
          winnerDisplayName: 'You',
          grid: this.condensedGrid,
          time: this.currentTimeString,
          singlePlayer: true,
          shareLink: this.generateShareLink(),
          daily: this.gameState.gameMode === 'daily',
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
    return window.location.origin;
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
      this.currentTimeString,
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

  identifyVerticalWords() {
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

  addWordToList(
    word: string,
    startI: number,
    startJ: number,
    direction: 'horizontal' | 'vertical',
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
    length: number,
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
    if (this.gameState.gameMode === 'daily') {
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
    let dialogRef;
    if (this.gameState.gameMode === 'versus') {
      dialogRef = this.dialog.open(DialogPostGameMp, {
        data: data,
        minWidth: 370,
      });
    } else {
      dialogRef = this.dialog.open(DialogPostGame, {
        data: data,
        minWidth: 370,
      });
    }

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        if (this.gameState.gameMode === 'versus') {
          this.router.navigate(['/join/' + this.gameState.gameCode]);
        } else {
          this.router.navigate(['/']);
        }
      } else {
        if (result.event === 'confirm') {
          if (this.gameState.gameMode === 'versus')
            this.router.navigate(['/join/' + this.gameState.gameCode]);
          if (this.gameState.gameMode === 'daily')
            this.router.navigate(['/practice']);
          if (this.gameState.gameMode === 'practice') {
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
        this.touchMoveListener,
      );
    }
  }

  isEmpty(cell: string[]) {
    return cell.length === 0;
  }

  dragStarted(event: CdkDragStart) {
    const [i, j] = this.getCellCoordinates(event.source.dropContainer.id);
    if (i !== -1 && j !== -1) {
      // Only handle drag start from grid cells, not the letter bank
      const letter = this.grid[i][j].pop();
      this.updateFormedWords(); // Revalidate words
      if (letter) {
        this.grid[i][j].push(letter); // Restore the letter
      }
    }
  }

  initializeGrid() {
    if (window.innerWidth < 390) {
      //init grid for iphone SE and other small devices
      this.dragPosition = { x: -254, y: -247 };
    } else {
      this.dragPosition = { x: -246, y: -246 };
    }
    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(this.GRID_SIZE)
          .fill(null)
          .map(() => []),
      );
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
          if (this.grid[i][j] && this.grid[i][j].length > 0) {
            this.condensedGrid[newRow][newCol] = this.grid[i][j][0];
          }
        }
      }
    }
  }
}
