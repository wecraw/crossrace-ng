import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  navigateToSolo() {
    if (this.router.url === '/solo') {
      this.location.replaceState('/solo'); //route is replaced in game component, but this.router.url still registers as solo, so need to replace again then reload
      window.location.reload();
    } else {
      this.router.navigate(['/solo']);
    }
  }

  navigateToDaily() {
    if (this.location.path() !== '/daily') {
      this.router.navigate(['/daily']);
    }
  }
}
