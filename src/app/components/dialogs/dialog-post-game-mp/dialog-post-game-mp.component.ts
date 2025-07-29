// crossrace-ng\src\app\components\dialogs\dialog-post-game-mp\dialog-post-game-mp.component.ts
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
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

import { Player } from '../../../interfaces/player';
import { LeaderboardComponent } from '../../leaderboard/leaderboard.component';

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
  ],
})
export class DialogPostGameMp implements OnInit {
  @ViewChild('copiedTooltip') copiedTooltip!: MatTooltip;

  isShareSupported: boolean = false;
  isCopied: boolean = false;
  currentView: 'chessGrid' | 'leaderboard' = 'chessGrid';

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
    const gridSize = 10;
    this.grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));
  }

  toggleView() {
    this.currentView =
      this.currentView === 'chessGrid' ? 'leaderboard' : 'chessGrid';
    this.cdr.detectChanges();
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
}
