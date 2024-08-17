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
    ['', 'D', 'A', 'I', 'L', '', ''],
    ['', '', '', 'G', '', '', ''],
    ['', '', '', 'T', 'O', '', ''],
    ['', '', '', '', '', '', ''],
  ],
  [
    ['', '', '', '', '', '', ''],
    ['', '', '', 'B', '', '', ''],
    ['', '', '', 'R', '', '', ''],
    ['', 'D', 'A', 'I', 'L', 'Y', ''],
    ['', '', '', 'G', '', '', ''],
    ['', 'J', 'E', 'T', '', '', ''],
    ['', '', '', '', '', '', ''],
  ],
];

const descriptions = [
  'Race to use all 12 letters to form interconnected words!',
  "Words must be three letters or longer, two letter words don't count!",
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
  @ViewChild('nextButton') nextButton!: ElementRef<HTMLButtonElement>;

  isAnimationFinished: boolean = false;
  isAnimationStarted: boolean = false;
  showTouch: boolean = false;
  scene: number = 0;
  descriptions: string[] = descriptions;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
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
    //
    let gridSize = 7;
    this.grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));
  }

  ngAfterViewInit() {
    this.ngZone.run(() => {
      setTimeout(() => {
        this.startAnimation();
      }, 500);
    });
    setTimeout(() => {
      this.nextButton.nativeElement.focus();
    });
  }

  startAnimation() {
    this.ngZone.run(() => {
      this.showTouch = true;
      setTimeout(() => {
        this.isAnimationStarted = true;
        this.cdr.detectChanges(); // Manually trigger change detection
      }, 500);

      setTimeout(() => {
        this.isAnimationFinished = true;
        this.cdr.detectChanges(); // Manually trigger change detection
      }, 1700);
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
    if (this.scene === 0) {
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

  updateScene() {
    this.activeGrid = this.grids[this.scene];

    if (this.scene === 0) {
      this.isAnimationStarted = false;
      this.isAnimationFinished = false;
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
