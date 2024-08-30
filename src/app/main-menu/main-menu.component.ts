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

import { ActivatedRoute, Router } from '@angular/router';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { DialogPostGame } from '../dialog-post-game/dialog-post-game.component';
import { GameSeedService } from '../game-seed.service';

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
  isChallenge: boolean = false;
  gameSeed?: number;
  isDaily: boolean = false;
  isResuming: boolean = false;
  finishedDaily: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private gameSeedService: GameSeedService
  ) {}

  ngOnInit(): void {
    this.initializeGrid();
    this.extractRouteInfo();

    if (this.isDaily) {
      let storageSeed = localStorage.getItem('dailySeed');
      let dailySeed = this.gameSeedService.getDailySeed();
      if (storageSeed && +storageSeed === dailySeed) {
        let finishedDaily = localStorage.getItem('finishedDaily');
        if (finishedDaily === 'true') {
          this.isDaily = false;
          let finalTime = localStorage.getItem('finalTime');
          let finalGrid = localStorage.getItem('finalGrid');
          if (finalTime && finalGrid) {
            this.openPostGameDialog({
              time: localStorage.getItem('finalTime'),
              grid: JSON.parse(finalGrid),
              winnerDisplayName: 'You',
              daily: true,
              singlePlayer: true,
              shareLink: window.location.origin + '/daily',
            });
          }

          //TODO SHOW POST GAME DIALOG HERE
        } else {
          this.isResuming = true;
        }
      }
    }
  }

  private extractRouteInfo() {
    if (this.router.url.split('/')[1] === 'daily') this.isDaily = true;
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

  daily() {
    let storageSeed = localStorage.getItem('dailySeed');
    let dailySeed = this.gameSeedService.getDailySeed();
    if (storageSeed === null) {
      localStorage.setItem('dailySeed', '' + dailySeed);
      localStorage.setItem('dailyCurrentTime', '0');
      localStorage.setItem('finishedDaily', 'false');
    } else {
      if (+storageSeed !== dailySeed) {
        localStorage.setItem('finishedDaily', 'false');
        localStorage.setItem('dailyCurrentTime', '0');
        localStorage.setItem('dailySeed', '' + dailySeed);
      }
    }
    this.router.navigate(['/solo/daily']);
  }

  dailyLobby() {
    this.router.navigate(['/daily']);
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

  openPostGameDialog(data: any) {
    const dialogRef = this.dialog.open(DialogPostGame, {
      data: data,
      minWidth: 370,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.event === 'confirm') {
          this.router.navigate(['/solo']);
        }
      } else {
        //closed modal by clicking outside
        this.router.navigate(['/']);
      }
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
