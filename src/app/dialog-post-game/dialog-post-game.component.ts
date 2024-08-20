import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ViewChild,
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
export class DialogPostGame implements OnInit {
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  isShareSupported: boolean = false;
  isCopied: boolean = false;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
      grid: string[][];
      time: string;
      singlePlayer?: boolean;
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
    if (!this.data.shareLink) return;
    const shareString =
      `Can you beat my time on Crossrace? I finished in ` +
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
      navigator.clipboard.writeText(this.data.shareLink);
    }

    // this.isCopied = true;
    // setTimeout(() => {
    //   this.isCopied = false;
    //   this.cdr.detectChanges();
    // }, 2500);
  }
}
