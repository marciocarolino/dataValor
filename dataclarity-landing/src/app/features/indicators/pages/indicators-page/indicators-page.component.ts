import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../dashboard/components/sidebar/sidebar.component';
import { TopBarComponent } from '../../../dashboard/components/top-bar/top-bar.component';
import { IndicatorService } from '../../../../core/services/indicator.service';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, TopBarComponent],
  templateUrl: './indicators-page.component.html',
  styleUrls: ['./indicators-page.component.scss'],
})
export class IndicatorsPageComponent implements OnInit {
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
    currentValue: [null],
    previousValue: [null],
    previousPeriod: [null],
    variation: [null],
    status: ['NEUTRAL', Validators.required],
    color: ['', Validators.maxLength(30)],
    icon: ['', Validators.maxLength(60)],
    chartType: ['NUMBER', Validators.required],
    isActive: [true],
    showOnDashboard: [false],
  });

  // ── Computed para total pages ──────────────────────────────────────────────
  readonly totalPages = computed(() => this.pagination()?.totalPages ?? 0);
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 0) return [];
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  constructor() {
    // Re-carrega a lista sempre que os filtros mudarem
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
      this.svc.loadList(params);
    });
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
      goalValue: null, currentValue: null, previousValue: null, previousPeriod: null, variation: null,
      status: 'NEUTRAL', color: '', icon: '', chartType: 'NUMBER',
      isActive: true, showOnDashboard: false,
    });
    this.editingId.set(null);
    this.modalMode.set('create');
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(indicator: Indicator): void {
    this.form.patchValue({
      name: indicator.name,
      description: indicator.description ?? '',
      category: indicator.category,
      formula: indicator.formula ?? '',
      unit: indicator.unit ?? '',
      goalValue: indicator.goalValue,
      currentValue: indicator.currentValue,
      previousValue: indicator.previousValue,
      previousPeriod: indicator.previousPeriod ?? null,
      variation: indicator.variation,
      status: indicator.status,
      color: indicator.color ?? '',
      icon: indicator.icon ?? '',
      chartType: indicator.chartType,
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
    const payload: CreateIndicatorPayload = {
      name: raw['name'] as string,
      description: raw['description'] as string || undefined,
      category: raw['category'] as IndicatorCategory,
      formula: raw['formula'] as string || undefined,
      unit: raw['unit'] as string || undefined,
      goalValue: raw['goalValue'] as number ?? undefined,
      currentValue: raw['currentValue'] as number ?? undefined,
      previousValue: raw['previousValue'] as number ?? undefined,
      previousPeriod: (raw['previousPeriod'] as IndicatorPeriod) || undefined,
      variation: raw['variation'] as number ?? undefined,
      status: raw['status'] as IndicatorStatus,
      color: raw['color'] as string || undefined,
      icon: raw['icon'] as string || undefined,
      chartType: raw['chartType'] as IndicatorChartType,
      isActive: raw['isActive'] as boolean,
      showOnDashboard: raw['showOnDashboard'] as boolean,
    };

    this.saving.set(true);
    this.saveError.set(null);

    const id = this.editingId();
    const obs = id
      ? this.svc.update(id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.svc.loadList({ page: this.currentPage(), limit: 10 });
        this.svc.loadSummary();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
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
    return val.toLocaleString('pt-BR');
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
