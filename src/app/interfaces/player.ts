export interface Player {
  id: string;
  displayName: string;
  ready?: boolean;
  isHost?: boolean;
  inGame?: boolean;
  playerColor: string;
  playerEmoji: string;
}
