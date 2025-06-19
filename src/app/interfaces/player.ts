export interface Player {
  id: string;
  connectionId?: string;
  displayName: string;
  ready?: boolean;
  isHost?: boolean;
  inGame?: boolean;
  playerColor: string;
  playerEmoji: string;
  winCount: number;
}
