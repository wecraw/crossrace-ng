import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
  OnInit,
  AfterViewInit,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const grids = [
  [
    ['', '', '', '', '', '', ''],
    ['', '', '', 'B', '', '', ''],
    ['', '', '', 'R', '', '', ''],
    ['', 'D', 'A', 'I', 'L', '', ''],
    ['', '', '', 'G', '', '', ''],
    ['', 'J', 'E', 'T', '', '', ''],
    ['', '', '', '', '', '', ''],
  ],
  [
    ['', '', '', '', '', '', ''],
    ['', '', '', 'B', 'E', '', ''],
    ['', '', '', 'R', '', '', ''],
    ['', 'D', 'A', 'I', 'L', 'Y', ''],
    ['', '', '', 'G', '', '', ''],
    ['', '', '', 'T', 'O', '', ''],
    ['', '', '', '', '', '', ''],
  ],
  [
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', 'B', '', '', '', ''],
    ['', '', '', '', '', 'R', '', '', '', ''],
    ['', '', '', 'D', 'A', 'I', 'L', '', '', ''],
    ['', '', '', '', '', 'G', '', '', '', ''],
    ['', '', '', 'J', 'E', 'T', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
  ],
];

const descriptions = [
  'Race to use all 12 letters to form interconnected words!',
  "Words must be 3 letters or longer, 2 letter words don't count!",
  'If you need more space, just drag the canvas around!',
];

const descriptionsVersus = [
  'Race to use all 12 letters to form interconnected words. The first player to finish wins!',
  "Words must be 3 letters or longer, 2 letter words don't count!",
  'If you need more space, just drag the canvas around!',
];

@Component({
  selector: 'dialog',
  templateUrl: 'dialog-tutorial.component.html',
  styleUrls: ['./dialog-tutorial.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent,
    MatProgressSpinnerModule,
    CommonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogTutorial implements OnInit, AfterViewInit {
  isAnimationFinished: boolean = false;
  isAnimationStarted: boolean = false;
  showTouch: boolean = false;
  scene: number = 0;
  descriptions: string[] = descriptions;
  isAnimation2Started: boolean = false;
  showTouch2: boolean = false;
  isAnimation2Finished: boolean = false;
  timeouts: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
      mode: string;
      grid: string[][];
    },
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  readonly dialogRef = inject(MatDialogRef<DialogTutorial>);

  grid!: number[][];
  grids: string[][][] = grids;
  activeGrid: string[][] = this.grids[0];

  ngOnInit() {
    if (this.data.mode === 'versus') this.descriptions = descriptionsVersus;
    this.generateGrid();
  }

  generateGrid() {
    let gridSize = this.grids[this.scene].length;
    this.grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));
  }

  ngAfterViewInit() {
    this.ngZone.run(() => {
      this.startAnimation();
    });
  }

  startAnimation(offset?: boolean) {
    this.resetAnimation1();
    this.ngZone.run(() => {
      this.showTouch = true;
      const timeout1 = setTimeout(() => {
        this.isAnimationStarted = true;
        this.cdr.detectChanges(); // Manually trigger change detection
      }, 300);
      this.timeouts.push(timeout1);

      const timeout2 = setTimeout(() => {
        this.isAnimationFinished = true;
        this.cdr.detectChanges(); // Manually trigger change detection
      }, 1500);
      this.timeouts.push(timeout2);
    });
  }

  resetAnimation1() {
    this.isAnimationStarted = false;
    this.showTouch = false;
    this.isAnimationFinished = false;
  }

  resetAnimation2() {
    this.isAnimation2Started = false;
    this.showTouch2 = false;
    this.isAnimation2Finished = false;
  }

  startAnimation2() {
    this.resetAnimation1();
    this.resetAnimation2();

    this.ngZone.run(() => {
      this.showTouch2 = true;
      const timeout1 = setTimeout(() => {
        this.isAnimation2Started = true;
        this.cdr.detectChanges();
      }, 300);
      this.timeouts.push(timeout1);

      const timeout2 = setTimeout(() => {
        this.showTouch2 = false;
        this.startAnimation();
        this.cdr.detectChanges();
      }, 1400);
      this.timeouts.push(timeout2);
    });
  }

  close() {
    this.dialogRef.close();
  }

  quit() {
    this.dialogRef.close({ event: 'quit' });
  }

  confirm() {
    this.dialogRef.close({ event: 'confirm' });
  }

  checkBlueLetter(letter: string) {
    if (this.scene === 0 || this.scene === 2) {
      return (
        letter.length > 0 &&
        'DAIL'.includes(letter) &&
        !this.isAnimationFinished
      );
    } else if (this.scene === 1) {
      return letter.length > 0 && 'BETO'.includes(letter);
    } else {
      return false;
    }
  }

  clearAllTimeouts() {
    this.timeouts.forEach(clearTimeout);
    this.timeouts.length = 0;
  }

  updateScene() {
    this.clearAllTimeouts();
    this.resetAnimation1();
    this.resetAnimation2;
    if (this.scene === 2) {
      this.startAnimation2();
    } else {
      this.isAnimation2Started = false;
    }
    this.generateGrid();
    this.activeGrid = this.grids[this.scene];

    if (this.scene === 0) {
      this.startAnimation();
    }
  }

  back() {
    this.scene--;
    this.updateScene();
  }

  next() {
    this.scene++;
    this.updateScene();
  }
}
