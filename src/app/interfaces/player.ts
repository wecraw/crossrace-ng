export interface Player {
  id: string;
  connectionId?: string;
  displayName: string;
  inGame?: boolean;
  colorId: number;
  avatarId: number;
  winCount: number;
  disconnected?: boolean;
  ready?: boolean;
}
