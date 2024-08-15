import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
  OnInit,
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogPostGame implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      winnerDisplayName: string;
      grid: string[][];
    },
    private cdr: ChangeDetectorRef
  ) {}

  readonly dialogRef = inject(MatDialogRef<DialogPostGame>);

  grid!: number[][];

  ngOnInit() {
    this.grid = Array(12)
      .fill(0)
      .map(() => Array(12).fill(0));

    console.log(this.data.grid);
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
