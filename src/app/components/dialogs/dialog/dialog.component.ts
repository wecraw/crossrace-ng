import {
  Component,
  inject,
  ChangeDetectionStrategy,
  Inject,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'dialog',
  templateUrl: 'dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  imports: [MatButtonModule, MatProgressSpinnerModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog implements OnInit {
  public dialogLetters: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      dialogText: string;
      showSpinner?: boolean;
      showConfirm?: boolean;
      confirmText?: string;
      showCancel?: boolean;
      cancelText?: string;
      isConfirmation?: boolean;
    },
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.data.dialogText) {
      this.dialogLetters = [...this.data.dialogText.toUpperCase()];
    }
  }

  readonly dialogRef = inject(MatDialogRef<Dialog>);

  close() {
    this.dialogRef.close();
  }

  confirm() {
    if (this.data.isConfirmation) {
      this.dialogRef.close(true);
    } else {
      this.dialogRef.close({ event: 'confirm', data: this.data.dialogText });
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
