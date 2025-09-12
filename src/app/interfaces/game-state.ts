import { Player } from './player';
import { PostGameData } from './api-responses';

export type GamePhase = 'LOBBY' | 'STARTING' | 'IN_GAME' | 'POST_GAME';

export interface GameDurations {
  interstitialMs: number;
  countdownMs: number;
  fadeMs: number;
}

export interface GameState {
  gameCode: string | null;
  localPlayerId: string | null;
  players: Player[];
  isInGame: boolean;
  debugForceWin?: boolean; // For testing purposes
  gameSeed: number | null;
  gameMode: 'versus' | 'daily' | 'practice' | null;

  // Back-compat / legacy client fields
  currentGameTime?: number; // Current game time for synchronization
  lastGameEndTimestamp?: Date | null; // Timestamp of the last game end for countdown to next game
  pendingWin: {
    playerId: string;
    condensedGrid: string[][];
    timestamp: number;
  } | null;

  // v2 timing model (authoritative server timestamps)
  protocolVersion?: number | null;
  roundId?: string | null;
  serverNow?: number | null; // ms epoch from server
  nextRoundStartAt?: number | null; // ms epoch absolute
  roundStartedAt?: number | null; // ms epoch absolute
  roundEndedAt?: number | null; // ms epoch absolute
  durations?: GameDurations | null;

  gamePhase: GamePhase | null;
  postGameData?: PostGameData | null;

  /**
   * @deprecated Legacy client-side barrier used to delay local countdowns.
   * Not used in protocol v2 (server-driven absolute timing).
   */
  startBarrierUntil?: number | null;
}
