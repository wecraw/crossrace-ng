import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GameState, GameStateService } from '../game-state.service';

@Component({
  selector: 'app-versus',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './versus-menu.component.html',
  styleUrl: './versus-menu.component.scss',
})
export class VersusMenuComponent implements OnInit {
  joinGameForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private gameStateService: GameStateService
  ) {}

  ngOnInit(): void {
    this.joinGameForm = this.fb.group({
      gameCode: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.maxLength(4),
          Validators.pattern('^[A-Za-z]{4}$'),
        ],
      ],
    });
  }

  joinGame() {
    if (this.joinGameForm.valid) {
      const gameCode = this.joinGameForm.get('gameCode')?.value;
      this.router.navigate(['/join', gameCode]);
    } else {
      console.log('Form is invalid');
    }
  }

  createGame() {
    this.gameStateService.setGameState({
      isCreating: true,
    });
    this.router.navigate(['/lobby']);
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    this.joinGameForm.patchValue({ gameCode: input.value });
  }
}
