import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'dialog',
  templateUrl: 'dialog-post-game.component.html',
  styleUrls: ['./dialog-post-game.component.scss'],
  imports: [
    MatButtonModule,
    MatProgressSpinnerModule,
    CommonModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogPostGame implements OnInit, OnDestroy {
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  isShareSupported: boolean = false;
  isCopied: boolean = false;
  countdownTime: string = '';
  averageTime: string = '';
  private countdownSubscription?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
      grid: string[][];
      time: string;
      singlePlayer?: boolean;
      daily?: boolean;
      shareLink?: string;
    },
    private cdr: ChangeDetectorRef,
  ) {}

  readonly dialogRef = inject(MatDialogRef<DialogPostGame>);

  grid!: number[][];

  ngOnInit() {
    this.isShareSupported = !!navigator.share && this.isMobile();

    // Slightly dangerous because the longest word could theoretically be 12 characters long
    // In practice, this never happens
    let gridSize = 10;
    this.grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));

    if (this.data.daily) {
      this.updateCountdown(); // Immediately calculate and display the countdown
      this.startCountdown();
    }
  }

  copyToClipboard() {
    const emojiGrid = this.generateCroppedEmojiGrid(this.data.grid);
    const introText = this.data.daily
      ? `I finished today's Crossrace in ${this.data.time}!`
      : `Can you beat my time on Crossrace? I finished in ${this.data.time}!`;

    const shareString = [introText, emojiGrid, this.data.shareLink]
      .filter(Boolean)
      .join('\n\n');

    if (navigator.share && this.isMobile()) {
      navigator.share({ text: shareString });
    } else {
      this.copiedTooltip.show();
      this.isCopied = true;
      setTimeout(() => {
        this.copiedTooltip.hide();
        this.isCopied = false;
        this.cdr.detectChanges();
      }, 1500);
      navigator.clipboard.writeText(shareString);
    }
  }

  private generateCroppedEmojiGrid(grid: string[][]): string {
    let minRow = Infinity,
      maxRow = -1,
      minCol = Infinity,
      maxCol = -1;
    let hasContent = false;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c]) {
          hasContent = true;
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
        }
      }
    }

    if (!hasContent) return '';

    const croppedGrid: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const croppedRow = grid[r].slice(minCol, maxCol + 1);
      croppedGrid.push(croppedRow);
    }

    // The only change is here: using '⬛️' for perfect alignment.
    return croppedGrid
      .map((row) => row.map((cell) => (cell ? '🟩' : '⬛️')).join(''))
      .join('\n');
  }

  // --- Other methods remain unchanged ---
  getAverageTime(): string {
    let times = localStorage.getItem('allTimes');
    if (times) {
      let timesArray: number[] = JSON.parse(times);
      if (timesArray.length === 0) this.averageTime = '0:00';
      const sum = timesArray.reduce((acc, num) => acc + num, 0);
      let averageSeconds = Math.round(sum / timesArray.length);
      const minutes = Math.floor(averageSeconds / 60);
      const seconds = averageSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return '0:00';
    }
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
  challenge() {
    this.copyToClipboard();
  }
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }
  ngOnDestroy() {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }
  startCountdown() {
    this.countdownSubscription = interval(1000).subscribe(() =>
      this.updateCountdown(),
    );
  }
  updateCountdown() {
    const now = new Date();
    const easternTime = this.getEasternTime(now);
    const nextMidnight = new Date(easternTime);
    nextMidnight.setHours(24, 0, 0, 0);
    const diff = nextMidnight.getTime() - easternTime.getTime();
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      this.countdownTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      this.cdr.detectChanges();
    } else {
      this.countdownTime = '00:00:00';
      if (this.countdownSubscription) {
        this.countdownSubscription.unsubscribe();
      }
    }
  }
  getEasternTime(date: Date): Date {
    const easternTimeString = date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
    });
    return new Date(easternTimeString);
  }
}
