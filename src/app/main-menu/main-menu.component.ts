import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ActivatedRoute, Router } from '@angular/router';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { DialogPostGame } from '../dialog-post-game/dialog-post-game.component';
import { DialogPostGameMp } from '../dialog-post-game-mp/dialog-post-game-mp.component';

import { GameSeedService } from '../game-seed.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MOCK_WIN } from '../mock/mock-winner';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule],
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
  isVersus: boolean = false;
  isResuming: boolean = false;
  finishedDaily: boolean = false;
  joinGameForm!: FormGroup;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private gameSeedService: GameSeedService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.joinGameForm = this.fb.group({
      gameCode: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(4),
          Validators.pattern('^[A-Za-z]{4}$'),
        ],
      ],
    });

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
    if (this.router.url.split('/')[1] === 'versus-menu') this.isVersus = true;
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

  challenge() {
    this.router.navigate(['/endless/' + this.gameSeed]);
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
    this.router.navigate(['/endless/daily']);
  }

  navigateToDaily() {
    this.router.navigate(['/daily']);
  }

  navigateToVersusMenu() {
    this.router.navigate(['/versus-menu']);
  }

  endless() {
    this.router.navigate(['/endless']);
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
          this.router.navigate(['/endless']);
        }
      } else {
        //closed modal by clicking outside
        this.router.navigate(['/']);
      }
    });
  }

  createGame() {
    this.router.navigate(['/join']);
  }

  getFlipInClass(i: number) {
    return 'notouch flip-in-hor-bottom-' + i;
  }

  initializeGrid() {
    this.grid = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    this.joinGameForm.patchValue({ gameCode: input.value });
  }

  joinGame() {
    if (this.joinGameForm.valid) {
      const gameCode = this.joinGameForm.get('gameCode')?.value;
      this.router.navigate(['/join', gameCode]);
    } else {
      console.log('Form is invalid');
    }
  }
}
