import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

/**
 * PRUEBA DEL COMPONENTE RAÍZ
 * -----------------------------------------------------------------------------
 * Comprueba que la aplicación arranca sin errores.
 *
 * Se le proporciona un enrutador vacío (`provideRouter([])`) porque la plantilla
 * de `App` contiene un `<router-outlet>` y sin enrutador fallaría.
 *
 * Ejecutar con:  npm test
 */
describe('App (componente raíz)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('debería crearse correctamente', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
