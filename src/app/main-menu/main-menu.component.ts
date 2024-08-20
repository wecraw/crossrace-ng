import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TimerComponent } from '../timer/timer.component';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WebSocketService } from '../websocket.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { GameState, GameStateService } from '../game-state.service';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';

interface ValidatedWord {
  word: string;
  isValid: boolean;
  startI: number;
  startJ: number;
  direction: 'horizontal' | 'vertical';
}

const DRAG_POSITION_INIT = { x: -22, y: -25 };

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
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss'],
})
export class MainMenuComponent implements OnInit {
  grid: string[][] = [];

  // Grid DOM settings
  GRID_SIZE: number = 12;

  // Dialog
  readonly dialog = inject(MatDialog);

  // Game State
  gameState!: GameState;
  isChallenge: boolean = false;
  gameSeed?: number;

  constructor(
    private gameStateService: GameStateService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeGrid();

    this.gameStateService.getGameState().subscribe((state) => {
      this.gameState = state;
    });

    this.extractRouteInfo();
  }

  private extractRouteInfo() {
    if (this.router.url.split('/')[1] === 'challenge') this.isChallenge = true;
    // Get the seed from the current route
    this.route.paramMap.subscribe((params) => {
      const seedParam = params.get('gameSeed');

      if (seedParam) {
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

  // DOM Helpers=========================================================

  versus() {
    this.router.navigate(['/versus-menu']);
  }

  challenge() {
    this.router.navigate(['/solo/' + this.gameSeed]);
  }

  solo() {
    this.router.navigate(['/solo']);
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  getFlipInClass(i: number) {
    return 'notouch flip-in-hor-bottom-' + i;
  }

  initializeGrid() {
    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));
  }
}
