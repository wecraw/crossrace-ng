import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WebSocketService } from '../websocket.service';
import { LoadingService } from '../loading.service';
import { Dialog } from '../dialog/dialog.component';
import { GameStateService } from '../game-state.service';

@Component({
  selector: 'app-game-connector',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  // This component's template is intentionally blank. It uses the global
  // loading service to show feedback, and its sole purpose is to process
  // and redirect.
  template: ``,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class GameConnectorComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private webSocketService = inject(WebSocketService);
  private loadingService = inject(LoadingService);
  private dialog = inject(MatDialog);
  private gameStateService = inject(GameStateService);

  ngOnInit(): void {
    this.gameStateService.clearGameState();

    const gameCode = this.route.snapshot.paramMap.get('gameCode');
    if (gameCode) {
      this.joinExistingGame(gameCode.toUpperCase());
    } else {
      this.createNewGame();
    }
  }

  private async createNewGame(): Promise<void> {
    this.loadingService.show({ message: 'Creating game...' });
    try {
      const response = await this.webSocketService.createGame();
      this.webSocketService.setCurrentGame(response.gameCode);

      this.gameStateService.updateGameState({ gameCode: response.gameCode });

      // Navigate to the lobby, replacing the '/versus/create' URL in history
      // so the user cannot navigate "back" to this connector component.
      this.router.navigate(['/lobby', response.gameCode], { replaceUrl: true });
    } catch (error) {
      this.handleConnectionError(error);
    } finally {
      this.loadingService.hide();
    }
  }

  private async joinExistingGame(gameCode: string): Promise<void> {
    this.loadingService.show({ message: 'Joining game...' });
    try {
      // The websocket service will verify the game exists.
      await this.webSocketService.joinGame(gameCode);
      this.webSocketService.setCurrentGame(gameCode);
      this.gameStateService.updateGameState({ gameCode: gameCode });

      this.router.navigate(['/lobby', gameCode], { replaceUrl: true });
    } catch (error) {
      this.handleConnectionError(error);
    } finally {
      this.loadingService.hide();
    }
  }

  private handleConnectionError(error: any): void {
    const dialogRef = this.dialog.open(Dialog, {
      data: {
        dialogText:
          typeof error === 'string'
            ? error
            : 'Could not connect to the game. Please check the code or try again.',
        showSpinner: false,
        showConfirm: true,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      // On error, always send the user back to the versus menu to try again.
      this.router.navigate(['/versus-menu']);
    });
  }
}
