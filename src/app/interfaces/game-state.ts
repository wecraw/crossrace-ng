import { Player } from './player';

export interface GameState {
  gameCode: string | null;
  localPlayerId: string | null;
  players: Player[];
  isHost: boolean;
  isInGame: boolean;
  debugForceWin?: boolean; // For testing purposes
  gameSeed: number | null;
  gameMode: 'versus' | 'daily' | 'practice' | null;
  // Add win state for handling disconnected wins
  currentGameTime?: number; // Current game time for synchronization
  pendingWin: {
    playerId: string;
    condensedGrid: string[][];
    timestamp: number;
  } | null;
}
