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
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

import { interval, Subscription } from 'rxjs';
import { Player } from '../interfaces/player';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';

@Component({
    selector: 'dialog',
    templateUrl: 'dialog-post-game-mp.component.html',
    styleUrls: ['./dialog-post-game-mp.component.scss'],
    imports: [CommonModule, MatTooltipModule, LeaderboardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('slideContent', [
            state('chessGrid', style({ transform: 'translateX(0%)' })),
            state('leaderboard', style({ transform: 'translateX(-150%)' })),
            transition('chessGrid <=> leaderboard', animate('300ms ease-in-out')),
        ]),
    ]
})
export class DialogPostGameMp implements OnInit, OnDestroy {
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  isShareSupported: boolean = false;
  isCopied: boolean = false;
  currentView: 'chessGrid' | 'leaderboard' = 'chessGrid';

  private autoScrollSubscription?: Subscription;
  ANIMATION_DURATION_MS = 5000;
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
      winnerEmoji: string;
      winnerColor: string;
      grid: string[][];
      time: string;
      singlePlayer?: boolean;
      daily?: boolean;
      shareLink?: string;
      players: Player[];
    },
    private cdr: ChangeDetectorRef,
  ) {}

  readonly dialogRef = inject(MatDialogRef<DialogPostGameMp>);

  grid!: number[][];

  ngOnInit() {
    // Slightly dangerous because the longest word could theoretically be 12 characters long
    // In practice, this never happens
    let gridSize = 10;
    this.grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));
    this.startAutoScroll();
  }

  startAutoScroll() {
    this.autoScrollSubscription = interval(
      this.ANIMATION_DURATION_MS,
    ).subscribe(() => {
      this.toggleView();
    });
  }

  private resetAutoScroll() {
    if (this.autoScrollSubscription) {
      this.autoScrollSubscription.unsubscribe();
    }
    this.autoScrollSubscription = interval(
      this.ANIMATION_DURATION_MS,
    ).subscribe(() => {
      this.toggleView();
    });
  }

  toggleView() {
    this.currentView =
      this.currentView === 'chessGrid' ? 'leaderboard' : 'chessGrid';
    this.cdr.detectChanges();
  }

  manualToggleView() {
    this.currentView =
      this.currentView === 'chessGrid' ? 'leaderboard' : 'chessGrid';
    this.cdr.detectChanges();
    if (this.autoScrollSubscription) {
      //stop the autoscroll behavior if the user manually scrolls
      this.autoScrollSubscription.unsubscribe();
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

  ngOnDestroy() {
    if (this.autoScrollSubscription) {
      this.autoScrollSubscription.unsubscribe();
    }
  }
}
