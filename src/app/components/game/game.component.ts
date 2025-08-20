import {
  AfterViewInit,
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
  CdkDragStart,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TimerComponent } from '../timer/timer.component';
import { DialogPostGame } from '../dialogs/dialog-post-game/dialog-post-game.component';
import { MOCK_WIN } from '../../mock/mock-winner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GameBoardComponent } from '../game-board/game-board.component';

import { Subject, Subscription, takeUntil } from 'rxjs';
import * as confetti from 'canvas-confetti';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStateService } from '../../services/game-state/game-state.service';
import { GameState } from '../../interfaces/game-state';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';
import {
  COUNTDOWN_INITIAL_VALUE,
  COUNTDOWN_INTERVAL,
  COUNTDOWN_FADEOUT_DELAY,
  COUNTDOWN_ANIMATION_DELAY,
  COUNTDOWN_START_DELAY,
  WIN_DIALOG_DELAY,
  DRAG_POSITION_INIT,
  LOBBY_GAME_START_COUNTDOWN_DURATION,
} from '../../constants/game-constants';
import { GameLogicService } from '../../services/game-logic/game-logic.service';
import { PUZZLES } from './puzzles';
import { GameResolverData } from '../../resolvers/game.resolver';
import { GameFlowService } from '../../services/game-flow/game-flow.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    CommonModule,
    TimerComponent,
    MatDialogModule,
    GameBoardComponent,
  ],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(TimerComponent) timerComponent!: TimerComponent;

  private readonly destroy$ = new Subject<void>();
  private dialogCloseSubscription: Subscription | null = null;

  // Local state for the template, synced from GameLogicService
  bankLetters: string[] = [];
  grid: string[][][] = [];
  validLetterIndices: boolean[][] = [];

  // Component-specific state
  condensedGrid: string[][] = [];
  gridCellIds: string[] = [];
  allDropListIds: string[] = ['letter-bank'];
  countdown: number = 3;

  // Grid DOM settings
  dragPosition = DRAG_POSITION_INIT;

  // Timer
  timerRunning = false;
  currentTimeString: string = '0:00';
  isPulsating: boolean = true;
  countdownEnded: boolean = false;

  // Debug
  debug: boolean = false;
  mockWin = MOCK_WIN;

  // Dialog
  readonly dialog = inject(MatDialog);

  //MP
  isGameOver: boolean = false;
  isGameStarted: boolean = false;

  // Game State
  gameState!: GameState;
  isCountingDown: boolean = false;
  waitingForRestart: boolean = false;
  isGridReady: boolean = false;
  timerStartTime: number = 0; // Used for setting time on reconnect/resume
  bankLettersVisible = false;

  constructor(
    private renderer2: Renderer2,
    private elementRef: ElementRef,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    public gameLogicService: GameLogicService,
    private gameFlowService: GameFlowService,
  ) {}

  ngOnInit(): void {
    this.generateGridCellIds();
    this.setupSubscriptions();

    const resolvedData = this.route.snapshot.data[
      'gameData'
    ] as GameResolverData;
    const gameMode = this.route.snapshot.data['gameMode'];

    if (resolvedData) {
      // Practice or Daily mode: data is pre-fetched by the resolver.
      this.timerStartTime = resolvedData.startTime;
      this.gameLogicService.initializeGame(resolvedData.gameSeed);
      this.startAfterCountDown();
    } else if (gameMode === 'versus') {
      // Versus mode: game state (seed, time) is set by the join/rejoin response.
      const currentState = this.gameStateService.getCurrentState();
      // startAfterCountDown handles game initialization from the seed and
      // will correctly sync the timer if a time is provided.
      this.startAfterCountDown(currentState.currentGameTime);
    } else {
      console.log(
        'Game component initialized without required data. Navigation likely cancelled by resolver.',
      );
    }
  }

  private setupSubscriptions(): void {
    // Subscribe to the game state
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        const oldState = this.gameState; // Capture previous state before overwriting
        const oldStateHasForceWinFlag = oldState?.debugForceWin;
        this.gameState = state;

        // Check if a new round has started in 'versus' mode.
        // This is detected by a change in the gameSeed while we are on the GameComponent.
        // 'oldState' check prevents this from running on component initialization.
        if (
          oldState && // Ensures this is not the first state emission
          oldState.gameSeed !== state.gameSeed &&
          state.gameMode === 'versus'
        ) {
          console.log(
            `New game seed detected (${state.gameSeed}). Starting new round.`,
          );
          // A new round always starts from a fresh state, not a sync.
          this.startAfterCountDown();
          return; // Stop further processing of this state update.
        }

        if (
          this.gameState.debugForceWin &&
          !oldStateHasForceWinFlag &&
          !this.isGameOver &&
          !this.waitingForRestart
        ) {
          this.forceWin();
          this.gameStateService.updateGameState({ debugForceWin: false });
        }
      });

    // Subscribe to game logic service state
    this.gameLogicService.grid$
      .pipe(takeUntil(this.destroy$))
      .subscribe((grid) => {
        this.grid = grid;
      });

    this.gameLogicService.bankLetters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((letters) => {
        this.bankLetters = letters;
      });

    this.gameLogicService.validLetterIndices$
      .pipe(takeUntil(this.destroy$))
      .subscribe((indices) => {
        this.validLetterIndices = indices;
      });

    // Subscribe to win events from the game logic service
    this.gameLogicService.winSubject
      .pipe(takeUntil(this.destroy$))
      .subscribe((condensedGrid) => {
        this.handleWin(condensedGrid);
      });
  }

  ngAfterViewInit() {
    requestAnimationFrame(() => this.prepareGrid());
  }

  prepareGrid() {
    setTimeout(() => {
      this.isGridReady = true;
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.dialogCloseSubscription) {
      this.dialogCloseSubscription.unsubscribe();
    }

    this.gameStateService.updateGameState({
      isInGame: false,
    });
  }

  getRandomPuzzleSeed() {
    return Math.floor(Math.random() * PUZZLES.length);
  }

  private startCountdown(onComplete: () => void) {
    this.countdown = COUNTDOWN_INITIAL_VALUE;
    this.ngZone.runOutsideAngular(() => {
      const countInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;

          this.isPulsating = false;
          setTimeout(() => {
            this.isPulsating = true;
          }, COUNTDOWN_ANIMATION_DELAY);

          if (this.countdown <= 0) {
            this.countdownEnded = true;
            setTimeout(() => {
              clearInterval(countInterval);
              onComplete();
            }, COUNTDOWN_FADEOUT_DELAY);
          }
        });
      }, COUNTDOWN_INTERVAL);
    });
  }

  /**
   * Triggers the full animation sequence before starting the game.
   * If a `syncTime` is provided, it syncs the timer after animations instead of starting fresh.
   */
  startAfterCountDown(syncTime?: number) {
    this.resetForNewGame();
    this.resetTimer();
    this.isCountingDown = true;
    this.waitingForRestart = false;

    if (
      this.gameState.gameMode === 'versus' &&
      this.gameState.gameSeed !== null
    ) {
      this.gameLogicService.initializeGame(this.gameState.gameSeed);
    }

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.bankLettersVisible = true;
        });
      });
    });

    setTimeout(() => {
      this.startCountdown(() => {
        // This is the completion handler for all animations.
        this.isCountingDown = false;

        if (syncTime !== undefined) {
          // This was a sync. The animations we just played on the client took time.
          // We need to estimate the current server time to sync the timer accurately.
          const clientAnimationDurationS =
            (COUNTDOWN_START_DELAY +
              COUNTDOWN_INITIAL_VALUE * COUNTDOWN_INTERVAL +
              COUNTDOWN_FADEOUT_DELAY) /
            1000;

          const estimatedServerTime = syncTime + clientAnimationDurationS;

          // syncTimer will correctly subtract the *full* animation offset (including lobby load time)
          this.syncTimer(estimatedServerTime);
        } else {
          // This was a fresh start, not a sync. Start the puzzle from zero.
          this.startPuzzle();
        }
      });
    }, COUNTDOWN_START_DELAY);
  }

  private resetForNewGame(): void {
    this.isGameOver = false;
    this.isGameStarted = false;
    this.waitingForRestart = false;
    this.countdownEnded = false;
    this.countdown = COUNTDOWN_INITIAL_VALUE;
    this.isPulsating = true;

    this.timerRunning = false;
    this.timerStartTime = 0;
    this.currentTimeString = '0:00';
    if (this.timerComponent) {
      this.timerComponent.resetTimer();
    }

    this.condensedGrid = [];
    this.bankLettersVisible = false;
    this.resetBoardPosition();
  }

  /**
   * Calculates the correct gameplay time from the server's raw time and syncs the timer.
   * This is only called for in-progress games on reconnect.
   */
  private syncTimer(serverTime: number): void {
    if (serverTime === undefined) return;
    this.isGameStarted = true; // Mark game as started since we are syncing a timer
    this.isCountingDown = false; // Ensure no animations are playing
    this.bankLettersVisible = true;
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];

    // The server provides raw elapsed time. The client-side gameplay time is that
    // value minus the total duration of the startup animations.
    const totalOffsetMs =
      LOBBY_GAME_START_COUNTDOWN_DURATION +
      COUNTDOWN_START_DELAY +
      COUNTDOWN_INITIAL_VALUE * COUNTDOWN_INTERVAL +
      COUNTDOWN_FADEOUT_DELAY;
    const animationOffsetS = totalOffsetMs / 1000;

    const gameplayTime = Math.max(0, serverTime - animationOffsetS);
    console.log(
      `Syncing timer. Server time: ${serverTime}s, Gameplay time: ${gameplayTime}s`,
    );

    this.timerStartTime = gameplayTime;
    this.onTimeChanged(gameplayTime); // Update display immediately
    this.startTimer();
  }

  /**
   * Starts the puzzle for a fresh game (not a reconnect/sync).
   */
  startPuzzle() {
    this.isGameStarted = true;
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    this.startTimer();
  }

  refreshPuzzle() {
    this.gameLogicService.refreshPuzzle();
    this.resetBoardPosition();
  }

  private handleWin(condensedGrid: string[][]): void {
    this.condensedGrid = condensedGrid;
    this.stopTimer();
    this.renderConfetti();
    this.isGameOver = true;

    if (this.gameState.gameMode === 'versus') {
      this.gameFlowService.reportWin(this.condensedGrid);
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
      }, WIN_DIALOG_DELAY);

      this.isGameStarted = false;
      this.waitingForRestart = true;
    }
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

  forceWin() {
    this.renderConfetti();
    this.condensedGrid = this.mockWin.grid;
    this.stopTimer();
    this.isGameOver = true;

    if (this.gameState.gameMode === 'versus') {
      this.gameFlowService.reportWin(this.mockWin.grid);
    } else {
      if (this.gameState.gameMode === 'daily') {
        this.updateDailyLocalStorage();
      }
      setTimeout(() => {
        this.openDialog({
          winnerDisplayName: 'You',
          grid: this.mockWin.grid,
          time: this.mockWin.time,
          singlePlayer: true,
          shareLink: this.generateShareLink(),
          daily: this.gameState.gameMode === 'daily',
        });
      }, WIN_DIALOG_DELAY);

      this.isGameStarted = false;
      this.waitingForRestart = true;
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
    const remainingSeconds = Math.round(time % 60);
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
    if (this.dialogCloseSubscription) {
      this.dialogCloseSubscription.unsubscribe();
      this.dialogCloseSubscription = null;
    }

    // This component now only opens the single-player dialog
    const dialogRef = this.dialog.open(DialogPostGame, {
      data: data,
      minWidth: 380,
    });

    this.dialogCloseSubscription = dialogRef
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          // Handles closing via Esc/backdrop click.
          this.router.navigate(['/']);
        } else {
          if (result.event === 'confirm') {
            if (this.gameState.gameMode === 'daily') {
              this.router.navigate(['/practice']);
            } else if (this.gameState.gameMode === 'practice') {
              this.gameStateService.updateGameState({
                gameSeed: this.getRandomPuzzleSeed(),
              });
              this.resetForNewGame();
              this.startAfterCountDown();
            }
          }
          if (result.event === 'quit') {
            this.router.navigate(['/']);
          }
        }
      });
  }

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 380,
    });
  }

  getFlipInClass(i: number) {
    if (!this.isGameStarted) return 'notouch flip-in-hor-bottom-' + i;
    return '';
  }

  onDragStarted(event: CdkDragStart) {
    const [i, j] = this.getCellCoordinates(event.source.dropContainer.id);
    if (i !== -1 && j !== -1) {
      this.gameLogicService.handleDragStartedFromGrid(i, j);
    }
  }

  generateGridCellIds() {
    const GRID_SIZE = 24;
    this.gridCellIds = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        this.gridCellIds.push(`cell-${i}-${j}`);
      }
    }
    this.resetBoardPosition();
  }

  resetBoardPosition() {
    if (window.innerWidth < 390) {
      this.dragPosition = { x: -254, y: -247 };
    } else {
      this.dragPosition = { x: -246, y: -246 };
    }
  }

  getCellCoordinates(id: string): [number, number] {
    if (id === 'letter-bank') return [-1, -1];
    const [_, i, j] = id.split('-').map(Number);
    return [i, j];
  }

  drop(event: CdkDragDrop<string[]>) {
    this.gameLogicService.handleDrop(event);
  }

  renderConfetti() {
    const canvas = this.renderer2.createElement('canvas');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.renderer2.setStyle(canvas, 'position', 'fixed');
    this.renderer2.setStyle(canvas, 'top', '0');
    this.renderer2.setStyle(canvas, 'left', '0');
    this.renderer2.setStyle(canvas, 'pointer-events', 'none');

    this.renderer2.appendChild(this.elementRef.nativeElement, canvas);

    const myConfetti = confetti.create(canvas, {
      resize: true,
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

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }
}
