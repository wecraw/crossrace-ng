// crossrace-ng/src/app/components/game/game.component.ts
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
  CdkDragStart,
  CdkDragEnter,
  CdkDragExit,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TimerComponent } from '../timer/timer.component';
import { DialogPostGame } from '../dialogs/dialog-post-game/dialog-post-game.component';
import { MOCK_WIN } from '../../mock/mock-winner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WebSocketService } from '../../services/websocket/websocket.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import * as confetti from 'canvas-confetti';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStateService } from '../../services/game-state/game-state.service';
import { GameState } from '../../interfaces/game-state';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';
import { GameSeedService } from '../../services/game-seed/game-seed.service';
import { DialogPostGameMp } from '../dialogs/dialog-post-game-mp/dialog-post-game-mp.component';
import { Player } from '../../interfaces/player';
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
import { LoadingService } from '../../services/loading/loading.service';
import { GameLogicService } from '../../services/game-logic/game-logic.service';
import { PUZZLES } from './puzzles';

@Component({
  selector: 'app-game',
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
  gameSeed: number | null = null;

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
  private wsSubscription!: Subscription;
  isGameOver: boolean = false;
  isWinner: boolean = false;
  isGameStarted: boolean = false;

  // Game State
  gameState!: GameState;
  isCountingDown: boolean = false;
  waitingForRestart: boolean = false;
  isGridReady: boolean = false;
  timerStartTime: number = 0;
  bankLettersVisible = false;

  constructor(
    private renderer2: Renderer2,
    private elementRef: ElementRef,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private gameSeedService: GameSeedService,
    private loadingService: LoadingService,
    private gameLogicService: GameLogicService,
  ) {}

  ngOnInit(): void {
    const modeFromRoute = this.route.snapshot.data['gameMode'] as
      | 'daily'
      | 'practice'
      | 'versus';

    if (modeFromRoute === 'daily' || modeFromRoute === 'practice') {
      this.gameStateService.updateGameState({ gameMode: modeFromRoute });
    }

    if (!this.gameStateService.getCurrentState().gameMode) {
      console.error(
        'FATAL: GameComponent loaded without a valid gameMode. Redirecting.',
      );
      this.router.navigate(['/']);
      return;
    }

    this.generateGridCellIds();
    this.setupSubscriptions();
    this.initializeGame();
  }

  private setupSubscriptions(): void {
    // Subscribe to the game state
    this.gameStateService
      .getGameState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        const oldStateHasForceWinFlag = this.gameState?.debugForceWin;
        this.gameState = state;

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

    // Subscribe to WebSocket messages
    this.webSocketService
      .getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleWebSocketMessage(message));

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

  private initializeGame(): void {
    switch (this.gameState.gameMode) {
      case 'versus':
        this.startAfterCountDown();
        break;

      case 'daily':
        this.initializeDaily();
        break;

      case 'practice':
        this.initializePractice();
        break;

      default:
        console.error('FATAL: initializeGame called with an invalid gameMode.');
        this.router.navigate(['/']);
        break;
    }
  }

  private initializeDaily(): void {
    const dailySeed = this.gameSeedService.getDailySeed();
    const storageSeed = localStorage.getItem('dailySeed');

    if (storageSeed && +storageSeed === dailySeed) {
      if (this.finishedDaily()) {
        const finalTime = localStorage.getItem('finalTime');
        const finalGrid = localStorage.getItem('finalGrid');

        const currentTime = localStorage.getItem('dailyCurrentTime');
        if (currentTime) {
          this.timerStartTime = +currentTime;
        }

        if (finalTime && finalGrid) {
          this.isGridReady = true;
          this.openDialog({
            time: finalTime,
            grid: JSON.parse(finalGrid),
            winnerDisplayName: 'You',
            daily: true,
            singlePlayer: true,
            shareLink: this.generateShareLink(),
          });
        }
        return;
      } else {
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

  private initializePractice(): void {
    this.gameStateService.updateGameState({
      gameSeed: this.getRandomPuzzleSeed(),
    });
    this.startAfterCountDown();
  }

  ngAfterViewInit() {
    requestAnimationFrame(() => this.prepareGrid());
  }

  prepareGrid() {
    setTimeout(() => {
      this.isGridReady = true;
      this.setupTouchEventHandling();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.dialogCloseSubscription) {
      this.dialogCloseSubscription.unsubscribe();
    }

    if (this.gameState.gameMode === 'versus') {
      this.gameStateService.clearPendingWin();
    }

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
    this.countdown = COUNTDOWN_INITIAL_VALUE;
    this.ngZone.runOutsideAngular(() => {
      const countInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;

          // Animate the countdown number
          this.isPulsating = false;
          setTimeout(() => {
            this.isPulsating = true;
          }, COUNTDOWN_ANIMATION_DELAY);

          if (this.countdown <= 0) {
            this.countdownEnded = true;
            setTimeout(() => {
              clearInterval(countInterval);
              onComplete();
            }, COUNTDOWN_FADEOUT_DELAY); //wait for the final fade out animation to finish
          }
        });
      }, COUNTDOWN_INTERVAL);
    });
  }

  startAfterCountDown() {
    this.resetTimer();
    this.isCountingDown = true;
    this.waitingForRestart = false;

    if (this.gameState.gameSeed === null) {
      console.error('Cannot start puzzle, game seed is null!');
      return;
    }

    this.gameLogicService.initializeGame(this.gameState.gameSeed);

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.bankLettersVisible = true;
        });
      });
    });

    setTimeout(() => {
      this.startCountdown(() => {
        this.startPuzzle();
        this.isCountingDown = false;
      });
    }, COUNTDOWN_START_DELAY);
  }

  private handleVersusGameOver(data: any): void {
    this.isWinner = data.winner === this.gameState.localPlayerId;
    this.gameStateService.updateGameState({
      players: data.players,
    });
    this.gameStateService.clearPendingWin();

    if (!this.isGameOver) {
      this.openDialog({
        winnerDisplayName: data.winnerDisplayName,
        winnerColor: data.winnerColor,
        winnerEmoji: data.winnerEmoji,
        grid: data.condensedGrid,
        time: data.time,
      });
      this.isGameOver = true;
    }
    this.stopTimer();
  }

  async handleWebSocketMessage(message: any): Promise<void> {
    console.log('Game received message:', message.type, message);

    switch (message.type) {
      case 'gameEnded':
        this.handleVersusGameOver(message);
        break;

      case 'gameStarted':
        if (this.isGameOver) {
          // Unsubscribe from the dialog's afterClosed event to prevent
          // the navigation logic from firing when we programmatically close it.
          if (this.dialogCloseSubscription) {
            this.dialogCloseSubscription.unsubscribe();
            this.dialogCloseSubscription = null;
          }

          this.closeDialog();

          this.gameStateService.updateGameState({
            gameSeed: message.gameSeed,
            isInGame: true,
          });

          // Show "Game starting!" for 2 seconds, and wait for it to finish.
          await this.loadingService.showAndHide({
            message: 'Game starting!',
            duration: LOBBY_GAME_START_COUNTDOWN_DURATION,
          });

          // Only after the message is gone, reset the game state and start the "3..2..1.." countdown.
          this.resetForNewGame();
          this.startAfterCountDown();
        }
        break;

      case 'playerList':
        // Handle player state updates during gameplay (e.g., after external join/reconnection)
        if (this.gameState.gameMode === 'versus') {
          console.log('Updating player list during gameplay');
          this.gameStateService.updateGameState({
            players: message.players,
            isHost:
              message.players.find(
                (p: Player) =>
                  p.isHost && p.id === this.gameState.localPlayerId,
              ) != null,
          });
        }
        break;

      case 'syncGameState':
        if (this.gameState.gameMode === 'versus') {
          console.log('Received game state sync after local reconnection');
          this.syncGameState(
            message.time,
            message.isGameEnded,
            message.gameEndData,
          );
        }
        break;

      case 'error':
        console.error(
          'Received server error during gameplay:',
          message.message,
        );
        this.router.navigate(['/']);

        break;
    }
  }

  private resetForNewGame(): void {
    this.isGameOver = false;
    this.isWinner = false;
    this.isGameStarted = false;
    this.waitingForRestart = false;
    this.countdownEnded = false;
    this.countdown = COUNTDOWN_INITIAL_VALUE;
    this.isPulsating = true;
    this.isCountingDown = false;

    this.timerRunning = false;
    this.timerStartTime = 0;
    this.currentTimeString = '0:00';
    if (this.timerComponent) {
      this.timerComponent.resetTimer();
    }

    this.condensedGrid = [];
    this.bankLettersVisible = false;
  }

  private syncGameState(
    serverTime: number,
    gameEnded: boolean,
    gameEndData: any,
  ): void {
    console.log(
      'Syncing game state on connection:',
      serverTime,
      gameEnded,
      gameEndData,
    );

    this.isGameStarted = !gameEnded;

    if (
      serverTime !== undefined &&
      this.timerComponent &&
      !gameEnded // Game is active, so sync the timer
    ) {
      const serverGameTime = serverTime;
      console.log(
        `Syncing local timer to server time: ${serverGameTime} seconds`,
      );

      this.timerStartTime = serverGameTime;
      this.timerComponent.setTimer(serverGameTime);
      this.onTimeChanged(serverGameTime);

      if (this.isGameStarted) {
        this.startTimer();
      }
    }

    if (gameEnded && gameEndData) {
      console.log('Game ended while disconnected, showing end game dialog');
      this.handleVersusGameOver(gameEndData);
    }
  }

  startPuzzle() {
    this.startTimer();
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    this.isGameStarted = true;
  }

  refreshPuzzle() {
    this.gameLogicService.refreshPuzzle();
  }

  private handleWin(condensedGrid: string[][]): void {
    this.condensedGrid = condensedGrid;
    this.stopTimer();
    this.renderConfetti();

    if (this.gameState.gameMode === 'versus') {
      this.announceWinAsync();
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

  private async announceWinAsync(debug?: boolean): Promise<void> {
    try {
      await this.webSocketService.announceWin(
        this.gameState.localPlayerId!,
        debug ? this.mockWin.grid : this.condensedGrid,
      );
    } catch (error) {
      console.error('Error announcing win:', error);
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
    this.condensedGrid = this.mockWin.grid; // Use mock grid for force win
    this.stopTimer();

    if (this.gameState.gameMode === 'versus') {
      this.announceWinAsync(true);
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

  finishedDaily() {
    return localStorage.getItem('finishedDaily') === 'true';
  }

  openDialog(data: any) {
    if (this.dialogCloseSubscription) {
      this.dialogCloseSubscription.unsubscribe();
      this.dialogCloseSubscription = null;
    }

    let dialogRef;
    if (this.gameState.gameMode === 'versus') {
      dialogRef = this.dialog.open(DialogPostGameMp, {
        data: data,
        minWidth: 380,
        disableClose: true,
      });
    } else {
      dialogRef = this.dialog.open(DialogPostGame, {
        data: data,
        minWidth: 380,
      });
    }

    this.dialogCloseSubscription = dialogRef
      .afterClosed()
      .subscribe((result) => {
        // This logic only runs when the user manually interacts with the
        // dialog (e.g., clicks "Quit" or "Back to Lobby"), not when a new game
        // is started via WebSockets.
        if (!result) {
          // User closed dialog without action (ie clicked outside) todo: remove this in favor of a close button
          if (this.gameState.gameMode === 'versus') {
            this.router.navigate(['/join/' + this.gameState.gameCode]);
          } else {
            this.router.navigate(['/']);
          }
          this.gameStateService.clearPendingWin();
        } else {
          if (result.event === 'confirm') {
            if (this.gameState.gameMode === 'versus')
              this.router.navigate(['/join/' + this.gameState.gameCode]);
            if (this.gameState.gameMode === 'daily')
              this.router.navigate(['/practice']);
            if (this.gameState.gameMode === 'practice') {
              this.gameStateService.updateGameState({
                gameSeed: this.getRandomPuzzleSeed(),
              });
              this.resetForNewGame();
              this.startAfterCountDown();
            }
          }
          if (result.event === 'quit') {
            this.gameStateService.clearPendingWin();
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
      minWidth: 380,
    });
  }

  getFlipInClass(i: number) {
    if (!this.isGameStarted) return 'notouch flip-in-hor-bottom-' + i;
    return '';
  }

  private removeTouchEventHandling() {
    if (this.touchMoveListener && this.gridContainer) {
      this.gridContainer.nativeElement.removeEventListener(
        'touchmove',
        this.touchMoveListener,
      );
    }
  }

  dragStarted(event: CdkDragStart) {
    const [i, j] = this.getCellCoordinates(event.source.dropContainer.id);
    if (i !== -1 && j !== -1) {
      this.gameLogicService.handleDragStartedFromGrid(i, j);
    }
  }

  generateGridCellIds() {
    const GRID_SIZE = 24; // Keep local constant for ID generation
    this.gridCellIds = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        this.gridCellIds.push(`cell-${i}-${j}`);
      }
    }
    // Set initial drag position after IDs are generated
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

  canEnter = (drag: CdkDrag, drop: CdkDropList) => {
    if (drop.id === 'letter-bank') return true;
    const [i, j] = this.getCellCoordinates(drop.id);
    return this.gameLogicService.canDropInCell(i, j);
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
