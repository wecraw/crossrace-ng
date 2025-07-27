import { Component, inject, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GameSeedService } from '../../services/game-seed/game-seed.service';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';
import { DialogPostGame } from '../dialogs/dialog-post-game/dialog-post-game.component';
import { Dialog } from '../dialogs/dialog/dialog.component';
import { MenuLayoutComponent } from '../menu-layout/menu-layout.component';

@Component({
  selector: 'app-game',
  imports: [MatDialogModule, MenuLayoutComponent],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.scss'],
})
export class MainMenuComponent implements OnInit {
  // Dependencies are now much cleaner
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private gameSeedService = inject(GameSeedService);
  readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    // Check if we were navigated here due to disconnection
    if (this.route.snapshot.data['disconnected']) {
      this.openDisconnectedDialog();
    }
  }

  /**
   * Opens a dialog to inform the user they were disconnected
   */
  openDisconnectedDialog(): void {
    this.dialog.open(Dialog, {
      data: {
        dialogText: 'Disconnected',
        showSpinner: false,
        showConfirm: true,
        confirmText: 'Ok',
      },
      minWidth: 370,
    });
  }

  /**
   * Sets up the daily game seed and navigates to the daily game.
   */
  daily(): void {
    const storageSeed = localStorage.getItem('dailySeed');
    const dailySeed = this.gameSeedService.getDailySeed();
    if (storageSeed === null) {
      localStorage.setItem('dailySeed', '' + dailySeed);
      localStorage.setItem('dailyCurrentTime', '0');
      localStorage.setItem('finishedDaily', 'false');
    } else {
      if (+storageSeed !== dailySeed) {
        localStorage.setItem('finishedDaily', 'false');
        localStorage.setItem('dailyCurrentTime', '0');
        localStorage.setItem('dailySeed', '' + dailySeed);
      }
    }
    this.router.navigate(['/daily']);
  }

  /**
   * Navigates to the dedicated versus menu component.
   */
  navigateToVersusMenu(): void {
    this.router.navigate(['/versus-menu']);
  }

  /**
   * Navigates to the practice mode.
   */
  practice(): void {
    this.router.navigate(['/practice']);
  }

  // Dialog-related methods can remain if they are used for general purposes like tutorials.
  closeDialog(): void {
    this.dialog.closeAll();
  }

  openTutorialDialog(data: any): void {
    this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  openPostGameDialog(data: any): void {
    const dialogRef = this.dialog.open(DialogPostGame, {
      data: data,
      minWidth: 370,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.event === 'confirm') {
        this.router.navigate(['/practice']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
