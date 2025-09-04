import { Player } from './player';
import { PostGameData } from './api-responses';

export interface GameState {
  gameCode: string | null;
  localPlayerId: string | null;
  players: Player[];
  isInGame: boolean;
  debugForceWin?: boolean; // For testing purposes
  gameSeed: number | null;
  gameMode: 'versus' | 'daily' | 'practice' | null;

  // Add win state for handling disconnected wins
  currentGameTime?: number; // Current game time for synchronization
  lastGameEndTimestamp?: Date | null; // Timestamp of the last game end for countdown to next game
  pendingWin: {
    playerId: string;
    condensedGrid: string[][];
    timestamp: number;
  } | null;

  gamePhase: 'LOBBY' | 'IN_GAME' | 'POST_GAME' | null;
  postGameData?: PostGameData | null;

  /**
   * A client-side barrier (ms epoch) set when transitioning to IN_GAME to ensure
   * the “Game starting!” interstitial finishes before the in-game countdown begins.
   * Cleared by GameComponent after it’s honored.
   */
  startBarrierUntil?: number | null;
}
