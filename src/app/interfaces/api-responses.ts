import { Player } from './player';

export interface AckResponse {
  success: boolean;
  message?: string;
}

/** Back-compat game data (legacy timer) */
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

export type SnapshotPhase = 'LOBBY' | 'STARTING' | 'IN_GAME' | 'POST_GAME';

export interface GameDurations {
  interstitialMs: number;
  countdownMs: number;
  fadeMs: number;
}

/** Server-authoritative snapshot (protocol v2) */
export interface GameStateSnapshot {
  protocolVersion: number; // e.g., 2
  serverNow: number; // ms epoch (same clock as *At fields)
  durations: GameDurations;

  phase: SnapshotPhase;
  gameCode: string;
  players: Player[];

  // Round identity & absolute timestamps (ms epoch)
  roundId: string | null;
  nextRoundStartAt?: number | null; // present in STARTING
  roundStartedAt?: number | null; // present in IN_GAME
  roundEndedAt?: number | null; // present in POST_GAME

  // Back-compat payloads (kept during rollout)
  gameData?: GameData;
  postGameData?: PostGameData;
}

/** 'create' ack payload (fields optionalized for flexibility with rollout) */
export interface CreateGameResponse extends AckResponse {
  type?: 'gameCreated';
  gameCode: string;
  playerId: string;
  displayName?: string;
  playerColor?: string;
  playerEmoji?: string;
  players: Player[];
}

/** 'join' ack payload (snapshot-based) */
export interface JoinGameResponse extends AckResponse {
  playerId: string;
  gameCode: string;
  displayName: string;
  playerColor: string;
  playerEmoji: string;
  players: Player[];
  gameStateSnapshot: GameStateSnapshot;
}
