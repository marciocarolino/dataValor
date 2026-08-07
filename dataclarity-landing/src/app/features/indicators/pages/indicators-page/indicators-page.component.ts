import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../dashboard/components/sidebar/sidebar.component';
import { TopBarComponent } from '../../../dashboard/components/top-bar/top-bar.component';
import { IndicatorChartComponent } from '../../components/indicator-chart/indicator-chart.component';
import { CurrencyBrlDirective } from '../../../../shared/directives/currency-brl.directive';
import { IndicatorService, CreateMeasurementPayload } from '../../../../core/services/indicator.service';
import {
  INDICATOR_CATEGORY_LABELS,
  INDICATOR_STATUS_LABELS,
  INDICATOR_CHART_TYPE_LABELS,
  INDICATOR_PERIOD_LABELS,
  type Indicator,
  type IndicatorCategory,
  type IndicatorStatus,
  type IndicatorChartType,
  type IndicatorPeriod,
  type IndicatorQueryParams,
  type CreateIndicatorPayload,
} from '../../../../core/models/indicator.model';

@Component({
  selector: 'app-indicators-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, TopBarComponent, IndicatorChartComponent, CurrencyBrlDirective],
  templateUrl: './indicators-page.component.html',
  styleUrls: ['./indicators-page.component.scss'],
})
export class IndicatorsPageComponent implements OnInit, OnDestroy {
  private readonly svc = inject(IndicatorService);
  private readonly fb = inject(FormBuilder);

  // ── Labels para template ───────────────────────────────────────────────────
  readonly categoryLabels = INDICATOR_CATEGORY_LABELS;
  readonly statusLabels = INDICATOR_STATUS_LABELS;
  readonly chartTypeLabels = INDICATOR_CHART_TYPE_LABELS;
  readonly periodLabels = INDICATOR_PERIOD_LABELS;

  readonly categories: IndicatorCategory[] = [
    'FINANCIAL', 'COMMERCIAL', 'OPERATIONAL', 'MARKETING', 'CUSTOMER', 'CUSTOM',
  ];
  readonly periods: IndicatorPeriod[] = [
    'PREVIOUS_MONTH', 'PREVIOUS_QUARTER', 'PREVIOUS_SEMESTER', 'PREVIOUS_YEAR', 'CUSTOM',
  ];
  readonly statuses: IndicatorStatus[] = ['SUCCESS', 'WARNING', 'DANGER', 'NEUTRAL'];
  readonly chartTypes: IndicatorChartType[] = [
    'LINE', 'BAR', 'AREA', 'DONUT', 'PIE', 'GAUGE', 'NUMBER',
  ];

  // ── Estado dos filtros ─────────────────────────────────────────────────────
  readonly searchName = signal('');
  readonly filterCategory = signal<IndicatorCategory | ''>('');
  readonly filterStatus = signal<IndicatorStatus | ''>('');
  readonly filterActive = signal<'' | 'true' | 'false'>('');
  readonly currentPage = signal(1);
  readonly sortBy = signal<IndicatorQueryParams['sortBy']>('createdAt');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // ── Estado do Service ──────────────────────────────────────────────────────
  readonly loading = this.svc.loading;
  readonly error = this.svc.error;
  readonly indicators = this.svc.indicators;
  readonly pagination = this.svc.pagination;
  readonly summary = this.svc.summary;

  // ── Modal ──────────────────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  // ── Modal Visualizar Gráfico ───────────────────────────────────────────────
  readonly showChartModal = signal(false);
  readonly chartIndicator = signal<Indicator | null>(null);

  // ── Modal Detalhes (somente leitura) ──────────────────────────────────────
  readonly showDetailsModal = signal(false);
  readonly detailsIndicator = signal<Indicator | null>(null);

  // ── Confirmação de exclusão ────────────────────────────────────────────────
  readonly confirmDeleteId = signal<string | null>(null);
  readonly deleting = signal(false);

  // ── Formulário reativo ─────────────────────────────────────────────────────
  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
    category: ['FINANCIAL', Validators.required],
    formula: ['', Validators.maxLength(300)],
    unit: ['', Validators.maxLength(30)],
    goalValue: [null],
    minimumGoalValue: [null],
    maximumGoalValue: [null],
    desiredDirection: ['HIGHER_IS_BETTER'],
    // currentValue e previousValue são capturados aqui apenas para criar medições iniciais
    // O backend calcula esses campos a partir das medições — não são enviados no payload do indicador
    currentValue: [null],
    previousValue: [null],
    previousPeriod: [null],
    color: ['', Validators.maxLength(30)],
    icon: ['', Validators.maxLength(60)],
    chartType: ['NUMBER', Validators.required],
    startDate: [null],
    endDate: [null],
    isActive: [true],
    showOnDashboard: [false],
  });

  // ── Signal dos valores do formulário (para computed reativo) ────────────────
  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.value as Record<string, unknown>,
  });

  // ── Computed: variação automática baseada nos valores do formulário ─────────
  readonly autoVariation = computed<number | null>(() => {
    const vals = this.formValues();
    const cur = vals['currentValue'] as number | null;
    const prev = vals['previousValue'] as number | null;
    if (cur == null || prev == null || prev === 0) return null;
    const v = ((cur - prev) / Math.abs(prev)) * 100;
    return Math.round(v * 100) / 100;
  });

  // ── Computed para total pages ──────────────────────────────────────────────
  readonly totalPages = computed(() => this.pagination()?.totalPages ?? 0);
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 0) return [];
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Re-carrega a lista sempre que os filtros mudarem
    // Debounce de 300ms para evitar múltiplas chamadas rápidas (ex: HMR, digitação)
    effect(() => {
      const params: IndicatorQueryParams = {
        page: this.currentPage(),
        limit: 10,
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      };
      const name = this.searchName();
      if (name) params.name = name;
      const cat = this.filterCategory();
      if (cat) params.category = cat;
      const st = this.filterStatus();
      if (st) params.status = st;
      const active = this.filterActive();
      if (active !== '') params.isActive = active === 'true';

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.svc.loadList(params), 300);
    });
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  ngOnInit(): void {
    this.svc.loadSummary();
  }

  // ── Ações de filtro ────────────────────────────────────────────────────────
  onSearch(value: string): void {
    this.searchName.set(value);
    this.currentPage.set(1);
  }

  onCategoryFilter(value: string): void {
    this.filterCategory.set(value as IndicatorCategory | '');
    this.currentPage.set(1);
  }

  onStatusFilter(value: string): void {
    this.filterStatus.set(value as IndicatorStatus | '');
    this.currentPage.set(1);
  }

  onActiveFilter(value: string): void {
    this.filterActive.set(value as '' | 'true' | 'false');
    this.currentPage.set(1);
  }

  onSort(field: IndicatorQueryParams['sortBy']): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('desc');
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  openCreate(): void {
    this.form.reset({
      name: '', description: '', category: 'FINANCIAL', formula: '', unit: '',
      goalValue: null, minimumGoalValue: null, maximumGoalValue: null,
      desiredDirection: 'HIGHER_IS_BETTER',
      currentValue: null, previousValue: null,
      previousPeriod: null, color: '', icon: '', chartType: 'NUMBER',
      startDate: null, endDate: null,
      isActive: true, showOnDashboard: false,
    });
    this.editingId.set(null);
    this.modalMode.set('create');
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(indicator: Indicator): void {
    // Normaliza o ícone ao carregar (converte "Arrow Right" → "arrow_right")
    const rawIcon = indicator.icon ?? '';
    const normalizedIcon = rawIcon.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    this.form.patchValue({
      name: indicator.name,
      description: indicator.description ?? '',
      category: indicator.category,
      formula: indicator.formula ?? '',
      unit: indicator.unit ?? '',
      goalValue: indicator.goalValue,
      // currentValue e previousValue: preenchidos para exibir os valores atuais na edição
      // Se alterados e salvos, criarão novas medições no backend
      currentValue: indicator.currentValue,
      previousValue: indicator.previousValue,
      previousPeriod: indicator.previousPeriod ?? null,
      color: indicator.color ?? '',
      icon: normalizedIcon,
      chartType: indicator.chartType,
      // Converte ISO string para formato date (YYYY-MM-DD) para o input[type=date]
      startDate: indicator.startDate ? indicator.startDate.substring(0, 10) : null,
      endDate: indicator.endDate ? indicator.endDate.substring(0, 10) : null,
      isActive: indicator.isActive,
      showOnDashboard: indicator.showOnDashboard,
    });
    this.editingId.set(indicator.id);
    this.modalMode.set('edit');
    this.saveError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.saveError.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value as Record<string, unknown>;
    const rawStartDate = raw['startDate'] as string | null;
    const rawEndDate = raw['endDate'] as string | null;

    const payload: CreateIndicatorPayload = {
      name: raw['name'] as string,
      description: (raw['description'] as string) || undefined,
      category: raw['category'] as IndicatorCategory,
      formula: (raw['formula'] as string) || undefined,
      unit: (raw['unit'] as string) || undefined,
      goalValue: (raw['goalValue'] as number) ?? undefined,
      minimumGoalValue: (raw['minimumGoalValue'] as number) ?? undefined,
      maximumGoalValue: (raw['maximumGoalValue'] as number) ?? undefined,
      desiredDirection: (raw['desiredDirection'] as
        | 'HIGHER_IS_BETTER'
        | 'LOWER_IS_BETTER'
        | 'RANGE_IS_BETTER') ?? undefined,
      previousPeriod: (raw['previousPeriod'] as IndicatorPeriod) || undefined,
      // currentValue / previousValue / variation / status:
      // são calculados no backend e NÃO devem ser enviados no POST (ValidationPipe)
      color: (raw['color'] as string) || null,
      icon: (raw['icon'] as string) || null,
      chartType: raw['chartType'] as IndicatorChartType,
      startDate: rawStartDate ? `${rawStartDate}T00:00:00.000Z` : null,
      endDate: rawEndDate ? `${rawEndDate}T00:00:00.000Z` : null,
      isActive: raw['isActive'] as boolean,
      showOnDashboard: raw['showOnDashboard'] as boolean,
    };

    this.saving.set(true);
    this.saveError.set(null);

    const currentValue = raw['currentValue'] as number | null;
    const previousValue = raw['previousValue'] as number | null;

    const id = this.editingId();
    const obs = id
      ? this.svc.update(id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: (indicator) => {
        const indicatorId = (indicator as { id: string }).id;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const toISO = (d: Date) => d.toISOString().substring(0, 10) + 'T00:00:00.000Z';

        // Cria medições iniciais em sequência — previousValue primeiro (data anterior),
        // depois currentValue (data atual), para o backend calcular a variação corretamente
        const measurementChain = (): void => {
          this.saving.set(false);
          this.closeModal();
          this.svc.loadList({ page: this.currentPage(), limit: 10 });
          this.svc.loadSummary();
        };

        if (currentValue != null && currentValue !== 0) {
          const measurements: CreateMeasurementPayload[] = [];

          // Valor anterior: cria com data de ontem se diferente do current
          if (previousValue != null && previousValue !== currentValue) {
            measurements.push({ value: previousValue, referenceDate: toISO(yesterday) });
          }
          // Valor atual: data de hoje
          measurements.push({ value: currentValue, referenceDate: toISO(today) });

          // Dispara em sequência (previous → current) para garantir ordem correta
          const runNext = (index: number): void => {
            if (index >= measurements.length) {
              measurementChain();
              return;
            }
            this.svc.createMeasurement(indicatorId, measurements[index]).subscribe({
              next: () => runNext(index + 1),
              // Ignora conflito 409 (medição para essa data já existe) e continua
              error: () => runNext(index + 1),
            });
          };
          runNext(0);
        } else {
          measurementChain();
        }
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  openDetails(ind: Indicator): void {
    this.detailsIndicator.set(ind);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.detailsIndicator.set(null);
  }

  editFromDetails(): void {
    const ind = this.detailsIndicator();
    if (!ind) return;
    this.showDetailsModal.set(false);
    this.detailsIndicator.set(null);
    setTimeout(() => this.openEdit(ind), 50);
  }

  openChart(ind: Indicator): void {
    this.chartIndicator.set(ind);
    this.showChartModal.set(true);
  }

  closeChartModal(): void {
    this.showChartModal.set(false);
    this.chartIndicator.set(null);
  }

  editFromChart(): void {
    const ind = this.chartIndicator();
    if (!ind) return;
    this.showChartModal.set(false);
    this.chartIndicator.set(null);
    // Pequeno delay para garantir que o modal do gráfico fechou antes de abrir o edit
    setTimeout(() => this.openEdit(ind), 50);
  }

  requestDelete(id: string): void {
    this.confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.deleting.set(true);
    this.svc.delete(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDeleteId.set(null);
        this.svc.loadList({ page: this.currentPage(), limit: 10 });
        this.svc.loadSummary();
      },
      error: (err: Error) => {
        this.deleting.set(false);
        this.svc.error.set(err.message);
        this.confirmDeleteId.set(null);
      },
    });
  }

  // ── Helpers de template ────────────────────────────────────────────────────
  statusClass(status: IndicatorStatus): string {
    const map: Record<IndicatorStatus, string> = {
      SUCCESS: 'badge--success',
      WARNING: 'badge--warning',
      DANGER: 'badge--danger',
      NEUTRAL: 'badge--neutral',
    };
    return map[status] ?? '';
  }

  formatNumber(val: number | null): string {
    if (val === null || val === undefined) return '–';
    // Mostra até 2 casas decimais — exibe centavos quando presentes
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /** Sincroniza o input color nativo quando o usuário digita o hex no campo de texto */
  syncColorPicker(hexValue: string): void {
    // Só sincroniza se for um hex válido (ex: #4c6ef5)
    if (/^#[0-9a-fA-F]{6}$/.test(hexValue)) {
      this.form.get('color')?.setValue(hexValue);
    }
  }

  /** Atualiza o FormControl quando o usuário escolhe uma cor no picker nativo */
  onColorPickerChange(hexValue: string): void {
    this.form.get('color')?.setValue(hexValue);
  }

  /** Converte "Arrow Right" → "arrow_right" automaticamente ao digitar */
  formatIconName(input: HTMLInputElement): void {
    const raw = input.value;
    // Converte para snake_case: lowercase + espaços → underscores + sem caracteres especiais
    const formatted = raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    // Atualiza o DOM e o FormControl (emitEvent: true para atualizar o preview no template)
    input.value = formatted;
    this.form.get('icon')?.setValue(formatted);
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  /**
   * Calcula quantos dias faltam até a data informada (formato YYYY-MM-DD ou ISO).
   * Retorna null se a data for inválida, negativo se já passou.
   */
  daysRemaining(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    if (isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / 86_400_000);
  }

  /** Formata uma string ISO de data para dd/mm/aaaa */
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '–';
    return d.toLocaleDateString('pt-BR');
  }
}
