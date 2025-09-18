import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { WebSocketService } from '../../services/websocket/websocket.service';
import { GameStateService } from '../../services/game-state/game-state.service';
import { Dialog } from '../dialogs/dialog/dialog.component';
import { DialogTutorial } from '../dialogs/dialog-tutorial/dialog-tutorial.component';

@Component({
  selector: 'app-game-connector',
  standalone: true,
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

  async ngOnInit(): Promise<void> {
    this.gameStateService.clearGameState();

    const hasViewedTutorial = localStorage.getItem('hasViewedVersusTutorial');
    if (hasViewedTutorial !== 'true') {
      await this.showTutorial();
    }

    const gameCode = this.route.snapshot.paramMap.get('gameCode');
    const playerName = this.route.snapshot.queryParamMap.get('name');

    if (!playerName) {
      this.handleConnectionError('Player name is missing.');
      return;
    }

    if (gameCode) {
      this.joinExistingGame(gameCode.toUpperCase(), playerName);
    } else {
      this.createNewGame(playerName);
    }
  }

  private async showTutorial(): Promise<void> {
    const dialogRef = this.dialog.open(DialogTutorial, {
      data: { isVersus: true }, // Pass context in case tutorial differs for versus
      minWidth: 380,
      disableClose: true, // User must complete/close tutorial to proceed
    });
    await firstValueFrom(dialogRef.afterClosed());
    localStorage.setItem('hasViewedVersusTutorial', 'true');
  }

  private async createNewGame(playerName: string): Promise<void> {
    try {
      const response = await this.webSocketService.createGame(playerName);
      this.gameStateService.updateGameState({ gameCode: response.gameCode });

      // Navigate to the lobby, replacing the '/create' URL in history
      // so the user cannot navigate "back" to this connector component.
      this.router.navigate(['/lobby', response.gameCode], {
        replaceUrl: true,
      });
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private async joinExistingGame(
    gameCode: string,
    playerName: string,
  ): Promise<void> {
    try {
      // Verify the game exists and get its state
      await this.webSocketService.joinGame(gameCode, playerName);

      // Snapshot has already been applied by WebSocketService; inspect state
      this.gameStateService.updateGameState({ gameCode: gameCode });

      const current = this.gameStateService.getCurrentState();
      if (current.isInGame) {
        this.router.navigate(['/versus', gameCode], { replaceUrl: true });
      } else {
        this.router.navigate(['/lobby', gameCode], { replaceUrl: true });
      }
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
