import { Player } from './player';

// This is the base shape for all responses that use the callback/ack pattern.
export interface AckResponse {
  success: boolean;
  message?: string;
}

// The specific shape for the 'create' event's response
export interface CreateGameResponse extends AckResponse {
  type: 'gameCreated';
  gameCode: string;
  playerId: string;
  displayName: string;
  playerColor: string;
  playerEmoji: string;
  players: Player[];
}

// The specific shape for the 'join' event's response
export interface JoinGameResponse extends AckResponse {
  playerId: string;
  gameCode: string;
  displayName: string;
  playerColor: string;
  playerEmoji: string;
  players: Player[];
  gameSeed: number;
  // Properties for handling games that ended while disconnected
  gameEnded?: boolean;
  gameEndData?: {
    winner: Player;
    players: any[];
    condensedGrid: string[][];
    time: string;
  };
  // Properties for timer synchronization
  gameState?: string;
  currentGameTime?: number;
  isGameActive?: boolean;
  lastGameEndTimestamp?: Date;
}
