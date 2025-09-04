import { Player } from './player';

// This is the base shape for all responses that use the callback/ack pattern.
export interface AckResponse {
  success: boolean;
  message?: string;
}

// New snapshot-based structures
export interface GameData {
  gameSeed: number;
  serverElapsedTimeSeconds: number;
}
export interface PostGameData {
  winner: string;
  winnerDisplayName: string;
  winnerEmoji: string;
  winnerColor: string;
  condensedGrid: string[][];
  time: string;
  lastGameEndTimestamp: Date;
}
export interface GameStateSnapshot {
  phase: 'LOBBY' | 'IN_GAME' | 'POST_GAME';
  gameCode: string;
  players: Player[];
  gameData?: GameData;
  postGameData?: PostGameData;
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

// The specific shape for the 'join' event's response (snapshot-based)
export interface JoinGameResponse extends AckResponse {
  playerId: string;
  gameCode: string;
  displayName: string;
  playerColor: string;
  playerEmoji: string;
  players: Player[];
  gameStateSnapshot: GameStateSnapshot;
}
