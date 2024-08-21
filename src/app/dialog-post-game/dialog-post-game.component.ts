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

import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'dialog',
  templateUrl: 'dialog-post-game.component.html',
  styleUrls: ['./dialog-post-game.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent,
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
    private cdr: ChangeDetectorRef
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
      navigator.userAgent
    );
  }

  copyToClipboard() {
    const shareString = this.data.daily
      ? `I finished today's Crossrace in ` +
        this.data.time +
        `!\n${this.data.shareLink}`
      : `Can you beat my time on Crossrace? I finished in ` +
        this.data.time +
        `!\n${this.data.shareLink}`;

    if (navigator.share && this.isMobile()) {
      navigator.share({
        text: shareString,
      });
    } else {
      this.copiedTooltip.show();
      this.isCopied = true;
      setTimeout(() => {
        this.copiedTooltip.hide();
        this.isCopied = false;
        this.cdr.detectChanges();
      }, 1500);
      if (this.data.shareLink) {
        navigator.clipboard.writeText(this.data.shareLink);
      } else {
        navigator.clipboard.writeText(shareString);
      }
    }
  }

  ngOnDestroy() {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  startCountdown() {
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.updateCountdown();
    });
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

      this.countdownTime = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
