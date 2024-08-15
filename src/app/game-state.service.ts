import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GameState {
  gameCode: string | null;
  isInGame: boolean;
  isHost: boolean;
  players: any[]; // Replace 'any' with a proper Player interface if you have one
}

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private gameState: GameState = {
    gameCode: null,
    isInGame: false,
    isHost: false,
    players: [],
  };

  private gameStateSubject = new BehaviorSubject<GameState>(this.gameState);

  setGameState(state: Partial<GameState>) {
    this.gameState = { ...this.gameState, ...state };
    this.gameStateSubject.next(this.gameState);
  }

  getGameState(): Observable<GameState> {
    return this.gameStateSubject.asObservable();
  }

  clearGameState() {
    this.gameState = {
      gameCode: null,
      isInGame: false,
      isHost: false,
      players: [],
    };
    this.gameStateSubject.next(this.gameState);
  }
}
