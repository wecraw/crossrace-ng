import { Component, inject } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { LoadingService } from '../../services/loading/loading.service';

@Component({
  selector: 'app-loading',
  imports: [],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
  animations: [
    trigger('fade', [
      // State when the element is not in the DOM
      state('void', style({ opacity: 0 })),
      // State when the element is in the DOM
      state('*', style({ opacity: 1 })),
      // Transition for both entering and leaving
      transition('void <=> *', [animate('250ms ease-in-out')]),
    ]),
  ],
  host: {
    '[@fade]': '',
  },
})
export class LoadingComponent {
  private readonly loadingService = inject(LoadingService);
  public readonly message = this.loadingService.loadingMessage;
  public readonly inGame = this.loadingService.isInGame;
  // This component is purely presentational.
  // Its existence in the DOM is controlled by the parent (AppComponent).
}
