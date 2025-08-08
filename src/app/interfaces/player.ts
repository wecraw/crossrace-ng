export interface Player {
  id: string;
  connectionId?: string;
  displayName: string;
  inGame?: boolean;
  playerColor: string;
  playerEmoji: string;
  winCount: number;
  disconnected?: boolean;
  ready?: boolean;
}
