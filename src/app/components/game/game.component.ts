// crossrace-ng/src/app/components/game/game.component.ts
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

import { WebSocketService } from '../../services/websocket/websocket.service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import * as confetti from 'canvas-confetti';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStateService } from '../../services/game-state/game-state.service';
import { GameState } from '../../interfaces/game-state';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';
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
import { GameResolverData } from '../../resolvers/game.resolver';

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
  timerStartTime: number = 0; // Used for setting time on reconnect/resume
  bankLettersVisible = false;

  constructor(
    private renderer2: Renderer2,
    private elementRef: ElementRef,
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private loadingService: LoadingService,
    public gameLogicService: GameLogicService,
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
      // Versus mode: game seed is received via websocket.
      this.startAfterCountDown();
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

    if (this.gameState.gameMode === 'versus') {
      this.gameStateService.clearPendingWin();
    }

    this.gameStateService.updateGameState({
      isInGame: false,
    });
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

  startAfterCountDown() {
    this.resetTimer();
    this.isCountingDown = true;
    this.waitingForRestart = false;

    if (
      this.gameState.gameSeed === null &&
      this.gameState.gameMode !== 'versus'
    ) {
      console.error('Cannot start puzzle, game seed is null!');
      return;
    }

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
          this.gameStateService.updateGameState({
            gameSeed: message.gameSeed,
          });
          await this.startNewRound();
        }
        break;

      case 'playerList':
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
          await this.syncGameState(
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

  private async startNewRound(): Promise<void> {
    if (this.dialogCloseSubscription) {
      this.dialogCloseSubscription.unsubscribe();
      this.dialogCloseSubscription = null;
    }
    this.closeDialog();
    this.gameStateService.updateGameState({ isInGame: true });

    await this.loadingService.showAndHide({
      message: 'Game starting!',
      duration: LOBBY_GAME_START_COUNTDOWN_DURATION,
    });

    this.resetForNewGame();
    this.startAfterCountDown();
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

  private syncTimer(serverTime: number): void {
    if (serverTime === undefined) return;

    // This is the total duration of animations from game creation to gameplay start.
    const totalOffsetMs =
      LOBBY_GAME_START_COUNTDOWN_DURATION +
      COUNTDOWN_START_DELAY +
      COUNTDOWN_INITIAL_VALUE * COUNTDOWN_INTERVAL +
      COUNTDOWN_FADEOUT_DELAY;
    const animationOffsetS = totalOffsetMs / 1000;

    // The gameplay time is the raw server time minus the animation delays.
    const gameplayTime = Math.max(0, serverTime - animationOffsetS);
    console.log(
      `Syncing timer. Server time: ${serverTime}s, Gameplay time: ${gameplayTime}s`,
    );

    // Set the start time for the timer component and start it.
    this.timerStartTime = gameplayTime;
    this.onTimeChanged(gameplayTime); // Update display immediately
    this.startTimer();
  }

  private async syncGameState(
    serverTime: number,
    gameEnded: boolean,
    gameEndData: any,
  ): Promise<void> {
    console.log(
      'Syncing game state on connection:',
      serverTime,
      gameEnded,
      gameEndData,
    );

    // Stop all animations if we're syncing.
    this.isCountingDown = false;

    if (this.isGameOver && !gameEnded) {
      console.log('Reconnected to an active game from post-game screen.');
      await this.startNewRound(); // This will handle its own animations
      this.syncTimer(serverTime); // Sync time after starting the new round process
      return;
    }

    if (gameEnded && gameEndData) {
      console.log('Game ended while disconnected, showing end game dialog');
      this.handleVersusGameOver(gameEndData);
      return;
    }

    this.isGameStarted = !gameEnded;
    if (this.isGameStarted) {
      this.syncTimer(serverTime);
    }
  }

  startPuzzle() {
    this.isGameStarted = true;
    this.allDropListIds = ['letter-bank', ...this.gridCellIds];
    // This is called at the end of animations, so we simply start the timer.
    // For a fresh game, `timerStartTime` is 0.
    // For a resumed game, `timerStartTime` was set by the resolver.
    this.startTimer();
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
    this.condensedGrid = this.mockWin.grid;
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
        if (!result) {
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
