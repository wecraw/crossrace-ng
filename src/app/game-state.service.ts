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

const PLAYER_ID_STORAGE_KEY = 'crossrace_player_id';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private readonly gameState: BehaviorSubject<GameState>;

  constructor() {
    // On service initialization, create the initial state by trying
    // to load the player ID from local storage.
    const savedPlayerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    const hydratedState = { ...initialState, localPlayerId: savedPlayerId };
    this.gameState = new BehaviorSubject<GameState>(hydratedState);
  }

  getGameState(): Observable<GameState> {
    return this.gameState.asObservable();
  }

  // A helper to get the current state value synchronously when needed.
  getCurrentState(): GameState {
    return this.gameState.getValue();
  }

  updateGameState(updates: Partial<GameState>): void {
    const currentState = this.gameState.getValue();
    const newState = { ...currentState, ...updates };

    // If the localPlayerId is being updated, persist it.
    if ('localPlayerId' in updates && updates.localPlayerId) {
      localStorage.setItem(PLAYER_ID_STORAGE_KEY, updates.localPlayerId);
    }

    this.gameState.next(newState);
  }

  clearGameState(): void {
    console.log(
      'GameStateService: Clearing game state',
      this.gameState.getValue(),
    );
    // Keep the localPlayerId when clearing state, as the user is still the same person.
    // The server will handle whether this player can rejoin a game.
    const localPlayerId = this.getCurrentState().localPlayerId;
    this.gameState.next({ ...initialState, localPlayerId });
  }
}
