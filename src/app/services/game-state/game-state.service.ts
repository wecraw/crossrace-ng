import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState } from '../../interfaces/game-state';
import { GameStateSnapshot } from '../../interfaces/api-responses';

const initialState: GameState = {
  gameCode: null,
  localPlayerId: null,
  players: [],
  isInGame: false,
  gameSeed: null,
  gameMode: null,
  pendingWin: null,
  lastGameEndTimestamp: null,
  gamePhase: null,
  postGameData: null,
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

  // Add methods to handle pending win state
  setPendingWin(playerId: string, condensedGrid: string[][]): void {
    this.updateGameState({
      pendingWin: {
        playerId,
        condensedGrid,
        timestamp: Date.now(),
      },
    });
  }

  clearPendingWin(): void {
    this.updateGameState({ pendingWin: null });
  }

  hasPendingWin(): boolean {
    const pendingWin = this.getCurrentState().pendingWin;
    if (!pendingWin) return false;
    // Clear pending wins older than 5 minutes to prevent stale data
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (Date.now() - pendingWin.timestamp > FIVE_MINUTES) {
      this.clearPendingWin();
      return false;
    }
    return true;
  }

  public applyAuthoritativeSnapshot(snapshot: GameStateSnapshot): void {
    if (!snapshot) return;
    this.updateGameState({
      gameCode: snapshot.gameCode,
      players: snapshot.players,
      gamePhase: snapshot.phase,
      isInGame: snapshot.phase === 'IN_GAME',
      gameSeed: snapshot.gameData?.gameSeed ?? null,
      currentGameTime: snapshot.gameData?.serverElapsedTimeSeconds ?? 0,
      lastGameEndTimestamp: snapshot.postGameData?.lastGameEndTimestamp ?? null,
      gameMode: 'versus',
      postGameData: snapshot.postGameData ?? null,
    });
  }
}
