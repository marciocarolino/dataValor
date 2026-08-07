import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { HelpTopic } from '../models/help.model';

@Injectable({ providedIn: 'root' })
export class HelpService {
  private readonly http = inject(HttpClient);

  /** Cache em memória: topicId → HelpTopic */
  private readonly cache = new Map<string, HelpTopic>();

  // ── Signals de estado ──────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentTopic = signal<HelpTopic | null>(null);

  /**
   * Carrega o JSON de um tópico de `assets/help/{jsonFile}`.
   * Usa cache em memória para evitar requisições duplicadas.
   * Para adicionar um novo tópico, basta criar o arquivo JSON em assets/help/
   * e registrar no HELP_MENU_ITEMS — sem alterar nenhum componente.
   */
  loadTopic(jsonFile: string): Observable<HelpTopic> {
    const cacheKey = jsonFile;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      this.currentTopic.set(cached);
      return of(cached);
    }

    this.loading.set(true);
    this.error.set(null);

    const obs = this.http
      .get<HelpTopic>(`help/${jsonFile}`)
      .pipe(
        catchError(() => {
          this.error.set(`Conteúdo "${jsonFile}" ainda não disponível.`);
          this.loading.set(false);
          return of(null as unknown as HelpTopic);
        }),
      );

    obs.subscribe({
      next: (topic) => {
        if (topic) {
          this.cache.set(cacheKey, topic);
          this.currentTopic.set(topic);
        }
        this.loading.set(false);
      },
    });

    return obs;
  }

  clearTopic(): void {
    this.currentTopic.set(null);
  }

  clearError(): void {
    this.error.set(null);
  }
}
