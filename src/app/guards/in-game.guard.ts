import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../services/game-state/game-state.service';

/**
 * A route guard that prevents direct access to the game route.
 * It ensures the application is in a valid "in-game" state before allowing navigation.
 */
export const inGameGuard: CanActivateFn = (route, state) => {
  const gameStateService = inject(GameStateService);
  const router = inject(Router);

  const currentState = gameStateService.getCurrentState();

  // A valid "in-game" state requires a gameSeed and the isInGame flag.
  if (currentState.isInGame && currentState.gameSeed) {
    return true; // State is valid, allow access.
  }

  // If the state is not valid, redirect the user.
  console.log('inGameGuard: Invalid state. Redirecting to versus menu.');
  return router.parseUrl('/versus-menu');
};
