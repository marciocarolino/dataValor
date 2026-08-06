import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  message: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const API_URL = 'http://localhost:3001/api/v1';
const ACCESS_TOKEN_KEY = 'dc_access_token';
const REFRESH_TOKEN_KEY = 'dc_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${API_URL}/auth/login`, payload).pipe(
      tap((tokens) => this.storeTokens(tokens)),
      catchError(this.handleError),
    );
  }

  register(payload: RegisterPayload): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${API_URL}/auth/register`, payload)
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    if (error.status === 401 || error.status === 403) {
      const msg: string =
        error.error?.message ?? 'E-mail ou senha inválidos.';
      return throwError(() => new Error(msg));
    }
    if (error.status === 0) {
      return throwError(() => new Error('Não foi possível conectar ao servidor. Verifique sua conexão.'));
    }
    const message = error.error?.message ?? error.message ?? 'Ocorreu um erro inesperado.';
    return throwError(() => new Error(message));
  };
}
