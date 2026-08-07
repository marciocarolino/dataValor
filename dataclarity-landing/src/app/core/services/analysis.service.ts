import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type {
  Analysis,
  AnalysisSummary,
  AnalysisExecuteResult,
  PaginatedAnalysis,
  AnalysisQueryParams,
  CreateAnalysisPayload,
  UpdateAnalysisPayload,
  AnalysisCategory,
} from '../models/analysis.model';

const API_URL = 'http://localhost:3001/api/v1';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);

  // ── Signals de estado ──────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly snackbar = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  readonly paginatedList = signal<PaginatedAnalysis | null>(null);
  readonly selectedAnalysis = signal<Analysis | null>(null);
  readonly summary = signal<AnalysisSummary | null>(null);
  readonly executeResult = signal<AnalysisExecuteResult | null>(null);
  readonly executing = signal(false);
  readonly showConfirmDelete = signal<string | null>(null);
  readonly deleting = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly analyses = computed(() => this.paginatedList()?.items ?? []);
  readonly pagination = computed(() => this.paginatedList()?.pagination ?? null);

  // ── Métodos HTTP ───────────────────────────────────────────────────────────

  getAll(params?: AnalysisQueryParams): Observable<PaginatedAnalysis> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http
      .get<PaginatedAnalysis>(`${API_URL}/analysis`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Analysis> {
    return this.http
      .get<Analysis>(`${API_URL}/analysis/${id}`)
      .pipe(catchError(this.handleError));
  }

  create(payload: CreateAnalysisPayload): Observable<Analysis> {
    return this.http
      .post<Analysis>(`${API_URL}/analysis`, payload)
      .pipe(catchError(this.handleError));
  }

  update(id: string, payload: UpdateAnalysisPayload): Observable<Analysis> {
    return this.http
      .patch<Analysis>(`${API_URL}/analysis/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<Analysis> {
    return this.http
      .delete<Analysis>(`${API_URL}/analysis/${id}`)
      .pipe(catchError(this.handleError));
  }

  execute(id: string): Observable<AnalysisExecuteResult> {
    return this.http
      .post<AnalysisExecuteResult>(`${API_URL}/analysis/${id}/execute`, {})
      .pipe(catchError(this.handleError));
  }

  getFavorites(): Observable<Analysis[]> {
    return this.http
      .get<Analysis[]>(`${API_URL}/analysis/favorites`)
      .pipe(catchError(this.handleError));
  }

  getPublic(): Observable<Analysis[]> {
    return this.http
      .get<Analysis[]>(`${API_URL}/analysis/public`)
      .pipe(catchError(this.handleError));
  }

  getSummary(): Observable<AnalysisSummary> {
    return this.http
      .get<AnalysisSummary>(`${API_URL}/analysis/summary`)
      .pipe(catchError(this.handleError));
  }

  getByCategory(category: AnalysisCategory): Observable<Analysis[]> {
    return this.http
      .get<Analysis[]>(`${API_URL}/analysis/category/${category}`)
      .pipe(catchError(this.handleError));
  }

  toggleFavorite(id: string): Observable<{ id: string; name: string; isFavorite: boolean }> {
    return this.http
      .post<{ id: string; name: string; isFavorite: boolean }>(
        `${API_URL}/analysis/${id}/favorite`,
        {},
      )
      .pipe(catchError(this.handleError));
  }

  // ── Métodos com Signal ─────────────────────────────────────────────────────

  loadList(params?: AnalysisQueryParams): void {
    this.loading.set(true);
    this.error.set(null);
    this.getAll(params).subscribe({
      next: (data) => {
        this.paginatedList.set(data);
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

  loadById(id: string): void {
    this.loading.set(true);
    this.getById(id).subscribe({
      next: (data) => {
        this.selectedAnalysis.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  runExecute(id: string): void {
    this.executing.set(true);
    this.executeResult.set(null);
    this.execute(id).subscribe({
      next: (data) => {
        this.executeResult.set(data);
        this.executing.set(false);
        this.showSnackbar('Análise executada com sucesso!', 'success');
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.executing.set(false);
        this.showSnackbar(err.message, 'error');
      },
    });
  }

  runToggleFavorite(id: string): void {
    this.toggleFavorite(id).subscribe({
      next: (res) => {
        // Atualiza o item na lista local
        const current = this.paginatedList();
        if (current) {
          this.paginatedList.set({
            ...current,
            items: current.items.map((a) =>
              a.id === id ? { ...a, isFavorite: res.isFavorite } : a,
            ),
          });
        }
        this.showSnackbar(
          res.isFavorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.',
          'info',
        );
      },
      error: (err: Error) => this.showSnackbar(err.message, 'error'),
    });
  }

  showSnackbar(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackbar.set({ message, type });
    setTimeout(() => this.snackbar.set(null), 3500);
  }

  clearSelected(): void {
    this.selectedAnalysis.set(null);
  }

  clearError(): void {
    this.error.set(null);
  }

  clearExecuteResult(): void {
    this.executeResult.set(null);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    if (error.status === 0)
      return throwError(() => new Error('Não foi possível conectar ao servidor.'));
    if (error.status === 401)
      return throwError(() => new Error('Não autorizado. Faça login novamente.'));
    if (error.status === 404)
      return throwError(() => new Error('Análise não encontrada.'));
    const msg =
      (error.error as { message?: string })?.message ??
      error.message ??
      'Ocorreu um erro inesperado.';
    return throwError(() => new Error(msg));
  };
}
