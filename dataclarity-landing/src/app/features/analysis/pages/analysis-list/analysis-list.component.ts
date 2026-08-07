import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../dashboard/components/sidebar/sidebar.component';
import { TopBarComponent } from '../../../dashboard/components/top-bar/top-bar.component';
import { AnalysisService } from '../../../../core/services/analysis.service';
import {
  ANALYSIS_CATEGORY_LABELS,
  ANALYSIS_CHART_TYPE_LABELS,
  ANALYSIS_AGGREGATION_LABELS,
  ANALYSIS_CHART_TYPE_ICONS,
  type Analysis,
  type AnalysisCategory,
  type AnalysisChartType,
  type AnalysisAggregation,
  type AnalysisQueryParams,
  type CreateAnalysisPayload,
} from '../../../../core/models/analysis.model';

@Component({
  selector: 'app-analysis-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, TopBarComponent],
  templateUrl: './analysis-list.component.html',
  styleUrls: ['./analysis-list.component.scss'],
})
export class AnalysisListComponent implements OnInit, OnDestroy {
  readonly svc = inject(AnalysisService);
  private readonly fb = inject(FormBuilder);

  // ── Labels ─────────────────────────────────────────────────────────────────
  readonly categoryLabels = ANALYSIS_CATEGORY_LABELS;
  readonly chartTypeLabels = ANALYSIS_CHART_TYPE_LABELS;
  readonly aggregationLabels = ANALYSIS_AGGREGATION_LABELS;
  readonly chartTypeIcons = ANALYSIS_CHART_TYPE_ICONS;

  readonly categories: AnalysisCategory[] = [
    'FINANCIAL', 'COMMERCIAL', 'CUSTOMER', 'MARKETING', 'OPERATIONAL', 'CUSTOM',
  ];
  readonly chartTypes: AnalysisChartType[] = [
    'LINE', 'BAR', 'AREA', 'PIE', 'DONUT', 'TABLE', 'KPI',
  ];
  readonly aggregations: AnalysisAggregation[] = [
    'SUM', 'COUNT', 'AVG', 'MAX', 'MIN', 'DISTINCT',
  ];

  // ── Signals de filtros ─────────────────────────────────────────────────────
  readonly searchName = signal('');
  readonly filterCategory = signal<AnalysisCategory | ''>('');
  readonly filterChartType = signal<AnalysisChartType | ''>('');
  readonly filterFavorite = signal(false);
  readonly currentPage = signal(1);
  readonly sortBy = signal<AnalysisQueryParams['sortBy']>('createdAt');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // ── Estado do Service via Signals ─────────────────────────────────────────
  readonly loading = this.svc.loading;
  readonly error = this.svc.error;
  readonly analyses = this.svc.analyses;
  readonly pagination = this.svc.pagination;
  readonly summary = this.svc.summary;
  readonly snackbar = this.svc.snackbar;
  readonly executing = this.svc.executing;
  readonly executeResult = this.svc.executeResult;

  // ── Modal Form ─────────────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly modalMode = signal<'create' | 'edit'>('create');
  readonly editingId = signal<string | null>(null);
  readonly saving = this.svc.saving;
  readonly saveError = signal<string | null>(null);

  // ── Modal Execute ──────────────────────────────────────────────────────────
  readonly showExecuteModal = signal(false);
  readonly executingAnalysisName = signal('');

  // ── Confirm Delete ─────────────────────────────────────────────────────────
  readonly confirmDeleteId = this.svc.showConfirmDelete;
  readonly deleting = this.svc.deleting;

  // ── Paginação ──────────────────────────────────────────────────────────────
  readonly totalPages = computed(() => this.pagination()?.totalPages ?? 0);
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  // ── Formulário ─────────────────────────────────────────────────────────────
  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    description: ['', Validators.maxLength(500)],
    chartType: ['BAR', Validators.required],
    category: ['FINANCIAL', Validators.required],
    dataset: ['', Validators.maxLength(100)],
    metric: ['', Validators.maxLength(100)],
    aggregation: ['SUM', Validators.required],
    groupBy: ['', Validators.maxLength(100)],
    dateField: ['', Validators.maxLength(100)],
    startDate: [''],
    endDate: [''],
    filters: [''],
    isFavorite: [false],
    isPublic: [false],
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const params: AnalysisQueryParams = {
        page: this.currentPage(),
        limit: 12,
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      };
      const name = this.searchName();
      if (name) params.name = name;
      const cat = this.filterCategory();
      if (cat) params.category = cat;
      const ct = this.filterChartType();
      if (ct) params.chartType = ct;
      if (this.filterFavorite()) params.isFavorite = true;
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

  // ── Filtros ────────────────────────────────────────────────────────────────
  onSearch(v: string): void { this.searchName.set(v); this.currentPage.set(1); }
  onCategoryFilter(v: string): void { this.filterCategory.set(v as AnalysisCategory | ''); this.currentPage.set(1); }
  onChartTypeFilter(v: string): void { this.filterChartType.set(v as AnalysisChartType | ''); this.currentPage.set(1); }
  toggleFavoriteFilter(): void { this.filterFavorite.set(!this.filterFavorite()); this.currentPage.set(1); }
  goToPage(p: number): void { this.currentPage.set(p); }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  openCreate(): void {
    this.form.reset({
      name: '', description: '', chartType: 'BAR', category: 'FINANCIAL',
      dataset: '', metric: '', aggregation: 'SUM', groupBy: '', dateField: '',
      startDate: '', endDate: '', filters: '', isFavorite: false, isPublic: false,
    });
    this.editingId.set(null);
    this.modalMode.set('create');
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(a: Analysis): void {
    this.form.patchValue({
      name: a.name, description: a.description ?? '',
      chartType: a.chartType, category: a.category,
      dataset: a.dataset ?? '', metric: a.metric ?? '',
      aggregation: a.aggregation, groupBy: a.groupBy ?? '',
      dateField: a.dateField ?? '',
      startDate: a.startDate ? a.startDate.substring(0, 10) : '',
      endDate: a.endDate ? a.endDate.substring(0, 10) : '',
      filters: a.filters ? JSON.stringify(a.filters) : '',
      isFavorite: a.isFavorite, isPublic: a.isPublic,
    });
    this.editingId.set(a.id);
    this.modalMode.set('edit');
    this.saveError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.saveError.set(null); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value as Record<string, unknown>;
    const payload: CreateAnalysisPayload = {
      name: raw['name'] as string,
      description: raw['description'] as string || undefined,
      chartType: raw['chartType'] as AnalysisChartType,
      category: raw['category'] as AnalysisCategory,
      dataset: raw['dataset'] as string || undefined,
      metric: raw['metric'] as string || undefined,
      aggregation: raw['aggregation'] as AnalysisAggregation,
      groupBy: raw['groupBy'] as string || undefined,
      dateField: raw['dateField'] as string || undefined,
      startDate: raw['startDate'] as string || undefined,
      endDate: raw['endDate'] as string || undefined,
      filters: raw['filters'] as string || undefined,
      isFavorite: raw['isFavorite'] as boolean,
      isPublic: raw['isPublic'] as boolean,
    };

    this.svc.saving.set(true);
    this.saveError.set(null);
    const id = this.editingId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.svc.saving.set(false);
        this.closeModal();
        this.svc.loadList({ page: this.currentPage(), limit: 12 });
        this.svc.loadSummary();
        this.svc.showSnackbar(
          id ? 'Análise atualizada!' : 'Análise criada!',
          'success',
        );
      },
      error: (err: Error) => {
        this.svc.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  requestDelete(id: string): void { this.svc.showConfirmDelete.set(id); }
  cancelDelete(): void { this.svc.showConfirmDelete.set(null); }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.svc.deleting.set(true);
    this.svc.delete(id).subscribe({
      next: () => {
        this.svc.deleting.set(false);
        this.svc.showConfirmDelete.set(null);
        this.svc.loadList({ page: this.currentPage(), limit: 12 });
        this.svc.loadSummary();
        this.svc.showSnackbar('Análise excluída.', 'info');
      },
      error: (err: Error) => {
        this.svc.deleting.set(false);
        this.svc.showConfirmDelete.set(null);
        this.svc.showSnackbar(err.message, 'error');
      },
    });
  }

  openExecute(a: Analysis): void {
    this.executingAnalysisName.set(a.name);
    this.svc.clearExecuteResult();
    this.showExecuteModal.set(true);
    this.svc.runExecute(a.id);
  }

  closeExecuteModal(): void {
    this.showExecuteModal.set(false);
    this.svc.clearExecuteResult();
  }

  onToggleFavorite(a: Analysis): void {
    this.svc.runToggleFavorite(a.id);
  }

  isFieldInvalid(f: string): boolean {
    const ctrl = this.form.get(f);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  formatDate(d: string | null): string {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  getResultKeys(row: Record<string, unknown>): string[] {
    return Object.keys(row);
  }
}
