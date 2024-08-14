import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
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
  templateUrl: 'dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
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
export class Dialog {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      dialogText: string;
      showSpinner: boolean;
      showConfirm: boolean;
      confirmText?: string;
    },
    private cdr: ChangeDetectorRef
  ) {}

  readonly dialogRef = inject(MatDialogRef<Dialog>);

  close() {
    this.dialogRef.close();
  }
}
