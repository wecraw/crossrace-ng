import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DialogTutorial } from '../dialog-tutorial/dialog-tutorial.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Location } from '@angular/common';
import { GameStateService } from '../game-state.service';
import { WebSocketService } from '../websocket.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, MatDialogModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  // Dialog
  readonly dialog = inject(MatDialog);
  private router = inject(Router);
  private location = inject(Location);
  private gameStateService = inject(GameStateService);
  private webSocketService = inject(WebSocketService);
  private gameState: any;

  ngOnInit() {
    this.gameStateService.getGameState().subscribe((gameState) => {
      this.gameState = gameState;
    });
  }

  openTutorialDialog(data: any) {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: data,
      minWidth: 370,
    });
  }

  navigateToPractice() {
    this.webSocketService.clearAndDisconnect();
    if (this.gameState.gameMode === 'practice') {
      this.location.replaceState('/practice'); //route is replaced in game component, but this.router.url still registers as practice, so need to replace again then reload
      window.location.reload();
    } else {
      this.gameStateService.updateGameState({ gameMode: 'practice' });
      this.router.navigate(['/practice']);
    }
  }

  navigateToDaily() {
    this.webSocketService.clearAndDisconnect();
    if (this.location.path() !== '/daily') {
      this.gameStateService.updateGameState({ gameMode: 'daily' });
      this.router.navigate(['/daily']);
    }
  }

  navigateToVersus() {
    this.webSocketService.clearAndDisconnect();
    this.router.navigate(['/versus-menu']);
  }
}
