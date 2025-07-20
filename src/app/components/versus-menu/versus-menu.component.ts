import { Component, OnInit, inject } from '@angular/core';

import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// Import the shared layout component
import { MenuLayoutComponent } from '../menu-layout/menu-layout.component';

@Component({
  selector: 'app-versus-menu',
  imports: [ReactiveFormsModule, MenuLayoutComponent],
  templateUrl: './versus-menu.component.html',
  styleUrls: ['./versus-menu.component.scss'],
})
export class VersusMenuComponent implements OnInit {
  joinGameForm!: FormGroup;

  private router = inject(Router);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    // Initialize the form for joining a game
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

  /**
   * Navigates to the game connector to create a new game.
   */
  createGame(): void {
    this.router.navigate(['/create']);
  }

  /**
   * Validates the form and navigates to the game connector to join a game.
   */
  joinGame(): void {
    if (this.joinGameForm.valid) {
      const gameCode = this.joinGameForm.get('gameCode')?.value;
      this.router.navigate(['/join', gameCode]);
    } else {
      console.log('Form is invalid');
      this.joinGameForm.markAllAsTouched();
    }
  }

  /**
   * Sanitizes the input for the game code field.
   * @param event The input event from the text field.
   */
  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    this.joinGameForm.patchValue({ gameCode: input.value });
  }
}
