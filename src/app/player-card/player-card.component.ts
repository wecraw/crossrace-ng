import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

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
  imports: [CommonModule, FormsModule, PickerComponent],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.scss',
})
export class PlayerCardComponent implements AfterViewChecked {
  @ViewChild('nameInput') nameInputElement!: ElementRef;
  @ViewChild('emojiMartContainer') emojiMartContainer!: ElementRef;
  clickOutsideEnabled: boolean = false;

  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (
      this.clickOutsideEnabled &&
      this.editingEmoji &&
      this.emojiMartContainer &&
      !this.emojiMartContainer.nativeElement.contains(event.target)
    ) {
      this.editingEmoji = false;
      this.clickOutsideEnabled = false;
    }
  }

  @Input() player!: Player;
  @Input() playerIndex: number = 0;
  @Input() allowEdit: boolean = false;

  @Output() onNameEdit: EventEmitter<string> = new EventEmitter<string>();
  @Output() onReadyUp: EventEmitter<void> = new EventEmitter<void>();

  editingName: boolean = false;
  editingNameInput: string = '';

  selectedTab: number = 0;

  emoji: string = '🕋';

  orderedCategories: any[] = [
    'search',
    'people',
    'nature',
    'foods',
    'activity',
    'places',
    'objects',
    'symbols',
    'flags',
  ];
  colorGrid: string[] = [
    '#e6194b',
    '#3cb44b',
    '#ffe119',
    '#4363d8',
    '#f58231',
    '#911eb4',
    '#46f0f0',
    '#f032e6',
    '#bcf60c',
    '#fabebe',
    '#008080',
    '#e6beff',
    '#9a6324',
    '#fffac8',
    '#800000',
    '#aaffc3',
    '#808000',
    '#ffd8b1',
    '#000075',
    '#808080',
    '#ffffff',
    '#000000',
    '#00FF7F',
    '#8B008B',
    '#DAA520',
  ];
  selectedColor: string = '#FF4500';

  pastelRainbowColors = [
    '#F94144',
    '#43AA8B',
    '#277DA1',
    '#F8961E',
    '#ff006e',
    '#264653',
  ];
  editingEmoji: boolean = false;

  getBackgroundColor(index: number): { 'background-color': string } {
    const colorIndex = index % this.pastelRainbowColors.length;
    return { 'background-color': this.pastelRainbowColors[colorIndex] };
  }

  editName() {
    this.editingName = true;
    this.editingNameInput = this.player.displayName;
  }

  editEmoji() {
    if (!this.editingEmoji) {
      this.editingEmoji = true;
      this.clickOutsideEnabled = false;
      setTimeout(() => {
        this.clickOutsideEnabled = true;
      }, 100);
    } else {
      this.editingEmoji = false;
      this.clickOutsideEnabled = false;
    }
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

  submitEmoji(event: any) {
    this.editingEmoji = false;
    this.clickOutsideEnabled = false;
    this.emoji = event.emoji.native;
    console.log(event);
  }

  readyUp() {
    this.onReadyUp.emit();
    this.player.ready = true;
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  selectTab(tabIndex: number) {
    this.selectedTab = tabIndex;
  }
}
