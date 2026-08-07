import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type {
  Indicator,
  IndicatorSummary,
  PaginatedIndicators,
  IndicatorQueryParams,
  CreateIndicatorPayload,
  UpdateIndicatorPayload,
  IndicatorCategory,
} from '../models/indicator.model';

const API_URL = 'http://localhost:3001/api/v1';

/** Converte campos Decimal (podem chegar como string do pg driver) para number */
function parseDecimal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? null : n;
}

function normalizeIcon(icon: unknown): string | null {
  if (!icon || typeof icon !== 'string') return null;
  const normalized = icon.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return normalized || null;
}

function parseIndicator(raw: Record<string, unknown>): Indicator {
  return {
    ...(raw as unknown as Indicator),
    currentValue: parseDecimal(raw['currentValue']),
    previousValue: parseDecimal(raw['previousValue']),
    goalValue: parseDecimal(raw['goalValue']),
    variation: parseDecimal(raw['variation']),
    // Normaliza ícone ao receber da API — corrige valores com espaços/maiúsculas
    icon: normalizeIcon(raw['icon']),
  };
}

@Injectable({ providedIn: 'root' })
export class IndicatorService {
  private readonly http = inject(HttpClient);

  // ── Signals de estado ──────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dashboardIndicators = signal<Indicator[]>([]);
  readonly summary = signal<IndicatorSummary | null>(null);
  readonly paginatedList = signal<PaginatedIndicators | null>(null);
  readonly selectedIndicator = signal<Indicator | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly indicators = computed(() => this.paginatedList()?.items ?? []);
  readonly pagination = computed(() => this.paginatedList()?.pagination ?? null);

  // ── Métodos HTTP (Observable — camada de comunicação) ──────────────────────

  getAll(params?: IndicatorQueryParams): Observable<PaginatedIndicators> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http
      .get<PaginatedIndicators>(`${API_URL}/indicators`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Indicator> {
    return this.http
      .get<Indicator>(`${API_URL}/indicators/${id}`)
      .pipe(catchError(this.handleError));
  }

  create(payload: CreateIndicatorPayload): Observable<Indicator> {
    return this.http
      .post<Indicator>(`${API_URL}/indicators`, payload)
      .pipe(catchError(this.handleError));
  }

  update(id: string, payload: UpdateIndicatorPayload): Observable<Indicator> {
    return this.http
      .patch<Indicator>(`${API_URL}/indicators/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<Indicator> {
    return this.http
      .delete<Indicator>(`${API_URL}/indicators/${id}`)
      .pipe(catchError(this.handleError));
  }

  getDashboardIndicators(): Observable<Indicator[]> {
    return this.http
      .get<Indicator[]>(`${API_URL}/indicators/dashboard`)
      .pipe(catchError(this.handleError));
  }

  getByCategory(category: IndicatorCategory): Observable<Indicator[]> {
    return this.http
      .get<Indicator[]>(`${API_URL}/indicators/category/${category}`)
      .pipe(catchError(this.handleError));
  }

  getSummary(): Observable<IndicatorSummary> {
    return this.http
      .get<IndicatorSummary>(`${API_URL}/indicators/summary`)
      .pipe(catchError(this.handleError));
  }

  // ── Métodos de estado com Signal ───────────────────────────────────────────

  loadDashboardIndicators(): void {
    this.loading.set(true);
    this.error.set(null);
    this.getDashboardIndicators().subscribe({
      next: (data) => {
        this.dashboardIndicators.set(data.map(d => parseIndicator(d as unknown as Record<string, unknown>)));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  loadSummary(): void {
    this.getSummary().subscribe({
      next: (data) => this.summary.set(data),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  loadList(params?: IndicatorQueryParams): void {
    this.loading.set(true);
    this.error.set(null);
    this.getAll(params).subscribe({
      next: (data) => {
        this.paginatedList.set({
          ...data,
          items: data.items.map(d => parseIndicator(d as unknown as Record<string, unknown>)),
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  loadById(id: string): void {
    this.loading.set(true);
    this.getById(id).subscribe({
      next: (data) => {
        this.selectedIndicator.set(parseIndicator(data as unknown as Record<string, unknown>));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  clearSelected(): void {
    this.selectedIndicator.set(null);
  }

  clearError(): void {
    this.error.set(null);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    if (error.status === 0) {
      return throwError(
        () => new Error('Não foi possível conectar ao servidor.'),
      );
    }
    if (error.status === 401) {
      return throwError(() => new Error('Não autorizado. Faça login novamente.'));
    }
    if (error.status === 404) {
      return throwError(() => new Error('Indicador não encontrado.'));
    }
    const msg =
      (error.error as { message?: string })?.message ??
      error.message ??
      'Ocorreu um erro inesperado.';
    return throwError(() => new Error(msg));
  };
}
