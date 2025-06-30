import { Component } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';

@Component({
  selector: 'app-loading',
  standalone: true,
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
      transition('void <=> *', [animate('200ms ease-in-out')]),
    ]),
  ],
})
export class LoadingComponent {
  // This component is purely presentational.
  // Its existence in the DOM is controlled by the parent (AppComponent).
}
