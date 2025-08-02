// crossrace-ng/src/app/components/game-board/game-board.component.ts
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragEnter,
  CdkDragExit,
  CdkDragStart,
  CdkDropList,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameBoardComponent implements AfterViewInit, OnDestroy {
  @Input() grid: string[][][] = [];
  @Input() validLetterIndices: boolean[][] = [];
  @Input() allDropListIds: string[] = [];
  @Input() dragPosition: { x: number; y: number } = { x: 0, y: 0 };
  @Input() isDisabled: boolean = false;
  @Input() isCountingDown: boolean = false;

  @Output() dropped = new EventEmitter<CdkDragDrop<string[]>>();
  @Output() dragStarted = new EventEmitter<CdkDragStart>();

  @ViewChild('gridWrapper') gridWrapper!: ElementRef;
  @ViewChild('gridContainer') gridContainer!: ElementRef;

  private touchMoveListener!: (e: TouchEvent) => void;

  ngAfterViewInit(): void {
    this.setupTouchEventHandling();
  }

  ngOnDestroy(): void {
    this.removeTouchEventHandling();
  }

  private isEmpty(cell: string[] | undefined): boolean {
    return !cell || cell.length === 0;
  }

  private getCellCoordinates(id: string): [number, number] {
    const [_, i, j] = id.split('-').map(Number);
    return [i, j];
  }

  canEnter = (drag: CdkDrag, drop: CdkDropList): boolean => {
    const [i, j] = this.getCellCoordinates(drop.id);
    return this.isEmpty(this.grid[i]?.[j]);
  };

  entered(event: CdkDragEnter): void {
    const dropList = event.container.element.nativeElement;
    dropList.classList.add('drop-list-highlight');
  }

  exited(event: CdkDragExit): void {
    const dropList = event.container.element.nativeElement;
    dropList.classList.remove('drop-list-highlight');
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    const dropList = event.container.element.nativeElement;
    dropList.classList.remove('drop-list-highlight');
    this.dropped.emit(event);
  }

  onDragStarted(event: CdkDragStart): void {
    this.dragStarted.emit(event);
  }

  private setupTouchEventHandling(): void {
    if (!this.gridWrapper || !this.gridContainer) {
      setTimeout(() => this.setupTouchEventHandling(), 100);
      return;
    }
    const wrapper = this.gridWrapper.nativeElement;
    const container = this.gridContainer.nativeElement;

    this.touchMoveListener = (e: TouchEvent) => {
      const touch = e.touches[0];
      const wrapperRect = wrapper.getBoundingClientRect();

      if (
        touch.clientX < wrapperRect.left ||
        touch.clientX > wrapperRect.right ||
        touch.clientY < wrapperRect.top ||
        touch.clientY > wrapperRect.bottom
      ) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', this.touchMoveListener, {
      passive: false,
    });
  }

  private removeTouchEventHandling(): void {
    if (this.touchMoveListener && this.gridContainer) {
      this.gridContainer.nativeElement.removeEventListener(
        'touchmove',
        this.touchMoveListener,
      );
    }
  }
}
