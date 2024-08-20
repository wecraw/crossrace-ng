import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Location } from '@angular/common';

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
  private router = inject(Router);
  private location = inject(Location);

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  navigateToSolo() {
    console.log(this.router.url);
    if (this.router.url === '/solo') {
      window.location.reload();
    } else {
      this.router.navigate(['/solo']);
    }
  }
}
