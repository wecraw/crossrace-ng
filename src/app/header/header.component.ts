import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WebSocketService } from '../websocket.service';

@Component({
    selector: 'app-header',
    imports: [RouterModule, MatDialogModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  // Dialog
  readonly dialog = inject(MatDialog);
  private router = inject(Router);
  private webSocketService = inject(WebSocketService);

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  navigateToPractice() {
    this.webSocketService.clearAndDisconnect();
    if (this.router.url === '/practice') {
      window.location.reload();
    } else {
      this.router.navigate(['/practice']);
    }
  }

  navigateToDaily() {
    this.webSocketService.clearAndDisconnect();
    if (this.router.url === '/daily') {
      window.location.reload();
    } else {
      this.router.navigate(['/daily']);
    }
  }

  navigateToVersus() {
    this.webSocketService.clearAndDisconnect();
    this.router.navigate(['/versus-menu']);
  }
}
