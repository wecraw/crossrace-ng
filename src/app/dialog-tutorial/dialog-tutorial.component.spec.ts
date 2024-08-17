import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogTutorialComponent } from './dialog-tutorial.component';

describe('DialogTutorialComponent', () => {
  let component: DialogTutorialComponent;
  let fixture: ComponentFixture<DialogTutorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogTutorialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogTutorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
