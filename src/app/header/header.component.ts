import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, MatDialogModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  // Dialog
  readonly dialog = inject(MatDialog);

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }
}
