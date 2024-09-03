import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Player {
  id: string;
  displayName: string;
  ready?: boolean;
  isHost?: boolean;
  inGame?: boolean;
}

@Component({
  selector: 'player-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.scss',
})
export class PlayerCardComponent implements AfterViewChecked {
  @ViewChild('nameInput') nameInputElement!: ElementRef;

  @Input() player!: Player;
  @Input() playerIndex: number = 0;
  @Input() allowEdit: boolean = false;

  @Output() onNameEdit: EventEmitter<string> = new EventEmitter<string>();
  @Output() onReadyUp: EventEmitter<void> = new EventEmitter<void>();

  editingName: boolean = false;
  editingNameInput: string = '';

  pastelRainbowColors = [
    '#F94144',
    '#43AA8B',
    '#277DA1',
    '#F8961E',
    '#ff006e',
    '#264653',
  ];

  getBackgroundColor(index: number): { 'background-color': string } {
    const colorIndex = index % this.pastelRainbowColors.length;
    return { 'background-color': this.pastelRainbowColors[colorIndex] };
  }

  editName() {
    this.editingName = true;
    this.editingNameInput = this.player.displayName;
  }

  ngAfterViewChecked(): void {
    if (this.allowEdit) this.focusNameInput();
  }

  private focusNameInput() {
    if (this.nameInputElement && this.editingName) {
      this.nameInputElement.nativeElement.focus();
    }
  }

  submitName() {
    this.editingName = false;
    let trimmedName = this.editingNameInput.trim();
    if (trimmedName === '') return;
    this.player.displayName = trimmedName;
    this.onNameEdit.emit(trimmedName);
  }

  readyUp() {
    this.onReadyUp.emit();
    this.player.ready = true;
  }
}
