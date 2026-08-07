import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Diretiva de máscara BRL para inputs.
 * Uso: <input appCurrencyBrl formControlName="currentValue" />
 *
 * - Exibe o valor formatado como moeda BRL (ex: 185.954,00)
 * - O FormControl recebe sempre um number (ex: 185954.00)
 * - Aceita vírgula ou ponto como separador decimal
 */
@Directive({
  selector: '[appCurrencyBrl]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyBrlDirective),
      multi: true,
    },
  ],
})
export class CurrencyBrlDirective implements ControlValueAccessor {

  private onChange: (val: number | null) => void = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _val: number | null,
  ) => { /* noop */ };

  private onTouched: () => void = () => { /* noop */ };
  private internalValue: number | null = null;

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  // ── ControlValueAccessor ───────────────────────────────────────────────────

  writeValue(value: number | null): void {
    this.internalValue = value;
    this.el.nativeElement.value = value !== null && value !== undefined
      ? this.formatDisplay(value)
      : '';
  }

  registerOnChange(fn: (val: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  // ── Eventos ────────────────────────────────────────────────────────────────

  @HostListener('focus')
  onFocus(): void {
    // Ao focar, mostra o valor numérico puro para facilitar edição
    if (this.internalValue !== null && this.internalValue !== undefined) {
      // Mostra com vírgula como decimal para o usuário editar
      this.el.nativeElement.value = this.internalValue
        .toFixed(2)
        .replace('.', ',');
      this.el.nativeElement.select();
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
    const raw = this.el.nativeElement.value;
    const parsed = this.parseInput(raw);
    this.internalValue = parsed;
    this.onChange(parsed);
    // Exibe formatado após sair do campo
    this.el.nativeElement.value = parsed !== null
      ? this.formatDisplay(parsed)
      : '';
  }

  @HostListener('keypress', ['$event'])
  onKeypress(e: KeyboardEvent): void {
    // Permite: dígitos, vírgula, ponto, backspace, setas, delete, tab
    const allowed = /[0-9,.]/.test(e.key);
    if (!allowed && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
    // Impede segunda vírgula/ponto
    const current = this.el.nativeElement.value;
    if ((e.key === ',' || e.key === '.') && (current.includes(',') || current.includes('.'))) {
      e.preventDefault();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Converte string digitada para number */
  private parseInput(raw: string): number | null {
    if (!raw || raw.trim() === '') return null;
    // Remove pontos de milhar, converte vírgula para ponto
    const cleaned = raw.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    // Garante no máximo 2 casas decimais (trunca, não arredonda)
    return Math.trunc(num * 100) / 100;
  }

  /** Formata number para exibição em pt-BR sem símbolo R$ */
  private formatDisplay(val: number): string {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
