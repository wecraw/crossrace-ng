import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Player } from './interfaces/player';

export interface GameState {
  gameCode: string | null;
  localPlayerId: string | null;
  players: Player[];
  isHost: boolean;
  isInGame: boolean;
  gameSeed: number | null;
  gameMode: 'versus' | 'daily' | 'practice' | null;
  lastWinnerId: string | null;
}

const initialState: GameState = {
  gameCode: null,
  localPlayerId: null,
  players: [],
  isHost: false,
  isInGame: false,
  gameSeed: null,
  gameMode: null,
  lastWinnerId: null,
};

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private readonly gameState = new BehaviorSubject<GameState>(initialState);

  getGameState(): Observable<GameState> {
    return this.gameState.asObservable();
  }

  updateGameState(updates: Partial<GameState>): void {
    const currentState = this.gameState.getValue();
    const newState = { ...currentState, ...updates };
    this.gameState.next(newState);
  }

  clearGameState(): void {
    console.log(
      'GameStateService: Clearing game state',
      this.gameState.getValue(),
    );
    this.gameState.next(initialState);
  }
}
