import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersusMenuComponent } from './versus-menu.component';

describe('VersusMenuComponent', () => {
  let component: VersusMenuComponent;
  let fixture: ComponentFixture<VersusMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersusMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VersusMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
