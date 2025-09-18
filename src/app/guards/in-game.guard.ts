import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { GameStateService } from '../services/game-state/game-state.service';

/**
 * Protects /versus/:gameCode. Allows entry when the user is truly in the target
 * session and either:
 *  - the round is already IN_GAME, or
 *  - we're within the pre-start barrier window (server-driven interstitial), or
 *  - we're rejoining an in-progress round (server elapsed > 0).
 * Otherwise, redirect to the join flow.
 */
export const inGameGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const gameStateService = inject(GameStateService);
  const router = inject(Router);

  const currentState = gameStateService.getCurrentState();
  const targetGameCode = route.paramMap.get('gameCode');

  if (!targetGameCode) {
    console.error('inGameGuard: No gameCode found in route. Redirecting.');
    return router.parseUrl('/versus-menu');
  }

  const target = targetGameCode.toUpperCase();
  const inSameSession = currentState.gameCode?.toUpperCase() === target;

  // If we’re in the correct session and already marked IN_GAME, allow.
  if (inSameSession && currentState.isInGame) {
    return true;
  }

  // Gracefully allow navigation during the pre-start barrier window that we set
  // right before showing the “Game starting!” interstitial.
  const barrierUntil = currentState.startBarrierUntil ?? null;
  const withinBarrierWindow =
    !!barrierUntil && Date.now() <= barrierUntil + 1000; // small tolerance

  // Rejoin mid-game case: server-reported elapsed time present.
  const rejoiningMidGame = (currentState.currentGameTime ?? 0) > 0;

  if (inSameSession && (withinBarrierWindow || rejoiningMidGame)) {
    return true;
  }

  // Otherwise, send the user through the join flow (will handle handshake).
  console.log(
    'inGameGuard: Not in game state. Redirecting to join flow for',
    targetGameCode,
  );
  return router.parseUrl(`/join/${targetGameCode}`);
};
