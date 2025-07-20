import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../services/game-state/game-state.service';

export const gameJoinGuard: CanActivateFn = (route, state) => {
  const gameStateService = inject(GameStateService);
  const router = inject(Router);

  // Get the game code the user is trying to access from the URL.
  const targetGameCode = route.paramMap.get('gameCode');

  // Get the game code currently stored in our application's state.
  const currentGameState = gameStateService.getCurrentState();
  const activeGameCode = currentGameState.gameCode;
  const localPlayerId = currentGameState.localPlayerId;

  // If the user has a player ID and is trying to access the game they are
  // already a part of, let them through. This handles page reloads.
  if (localPlayerId && targetGameCode && targetGameCode === activeGameCode) {
    return true;
  }

  // If the user is trying to access a lobby directly without being part of it,
  // we redirect them to the proper join flow. The GameConnectorComponent
  // will handle the handshake with the server and then navigate them back
  // to the lobby upon success.
  if (targetGameCode) {
    // We use router.parseUrl to create a UrlTree, which is the preferred
    // way to handle redirects within a guard.
    return router.parseUrl(`/join/${targetGameCode}`);
  }

  // If for some reason there's no game code in the URL, something is wrong.
  // Send them to the main menu as a fallback.
  return router.parseUrl('/versus-menu');
};
