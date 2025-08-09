// crossrace-ng/src/app/components/game-connector/game-connector.component.ts
import { Component, OnInit, inject } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { LoadingService } from '../../services/loading/loading.service';
import { Dialog } from '../dialogs/dialog/dialog.component';
import { GameStateService } from '../../services/game-state/game-state.service';

@Component({
  selector: 'app-game-connector',
  imports: [MatDialogModule],
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
    try {
      const response = await this.webSocketService.createGame();

      this.gameStateService.updateGameState({ gameCode: response.gameCode });

      // Navigate to the lobby, replacing the '/versus/create' URL in history
      // so the user cannot navigate "back" to this connector component.
      this.router.navigate(['/lobby', response.gameCode], { replaceUrl: true });
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private async joinExistingGame(gameCode: string): Promise<void> {
    try {
      // Verify the game exists
      await this.webSocketService.joinGame(gameCode);
      this.gameStateService.updateGameState({ gameCode: gameCode });

      this.router.navigate(['/lobby', gameCode], { replaceUrl: true });
    } catch (error) {
      this.handleConnectionError(error);
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
      // On error, send the user back to the versus menu
      this.router.navigate(['/versus-menu']);
    });
  }
}
