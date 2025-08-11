import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../services/game-state/game-state.service';

/**
 * A route guard that protects the /versus/:gameCode route.
 * 1. If the user is already in the correct game session, it allows access.
 * 2. If the user is not in a game session (e.g., direct URL access),
 *    it redirects them to the join flow.
 */
export const inGameGuard: CanActivateFn = (route, state) => {
  const gameStateService = inject(GameStateService);
  const router = inject(Router);

  const currentState = gameStateService.getCurrentState();
  const targetGameCode = route.paramMap.get('gameCode');

  if (!targetGameCode) {
    // Should not happen if route is configured correctly.
    console.error('inGameGuard: No gameCode found in route. Redirecting.');
    return router.parseUrl('/versus-menu');
  }

  // CASE 1: The player is in an active game, and the URL matches their game.
  // This is the standard case for navigating from the lobby to the game.
  if (
    currentState.isInGame &&
    currentState.gameCode === targetGameCode.toUpperCase()
  ) {
    return true;
  }

  // CASE 2: The player is not in an active game session.
  // This indicates a direct navigation via URL. Redirect to the join flow.
  // The GameConnectorComponent at /join/:gameCode will handle server handshake.
  console.log(
    'inGameGuard: Not in game state. Redirecting to join flow for',
    targetGameCode,
  );
  return router.parseUrl(`/join/${targetGameCode}`);
};
