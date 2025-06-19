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
}

// The specific shape for the 'join' event's response
export interface JoinGameResponse extends AckResponse {
  type: 'selfJoined';
  playerId: string;
  gameCode: string;
  displayName: string;
  playerColor: string;
  playerEmoji: string;
}
