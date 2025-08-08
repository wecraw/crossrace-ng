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
import { Player } from '../../interfaces/player';
import { Emojis } from '../../constants/emoji-list';

@Component({
  selector: 'player-card',
  imports: [CommonModule, FormsModule],
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
  @Output() onColorSelect: EventEmitter<string> = new EventEmitter<string>();
  @Output() onEmojiSelect: EventEmitter<string> = new EventEmitter<string>();

  editingEmoji: boolean = false;

  editingName: boolean = false;
  editingNameInput: string = '';

  selectedTab: number = 0;
  emojis = Emojis;

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

  editName() {
    this.editingName = true;
    this.editingNameInput = this.player.displayName;
  }

  editEmoji() {
    this.editingNameInput = this.player.displayName;
    this.focusNameInput();

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

  selectEmoji(emoji: string) {
    this.player.playerEmoji = emoji;
    this.onEmojiSelect.emit(emoji);
  }

  selectColor(color: string) {
    this.player.playerColor = color;
    this.onColorSelect.emit(color);
  }

  selectTab(tabIndex: number) {
    this.selectedTab = tabIndex;
  }

  ngAfterViewChecked(): void {
    this.focusNameInput();
  }
}
