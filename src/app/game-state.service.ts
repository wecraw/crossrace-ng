import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter, Observable } from 'rxjs';

export interface GameState {
  gameCode: string | null;
  gameSeed: number | null;
  isInGame: boolean;
  isHost: boolean;
  players: any[]; // Replace 'any' with a proper Player interface if you have one
  localPlayerId: string | null;
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
    localPlayerId: null,
    gameSeed: null,
  };

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.navigationCount++;
      });
  }

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
      gameSeed: null,
      isInGame: false,
      isHost: false,
      players: [],
      localPlayerId: null,
    };
    this.gameStateSubject.next(this.gameState);
  }

  private navigationCount = 0;

  isFirstNavigation(): boolean {
    return this.navigationCount === 1;
  }
}
