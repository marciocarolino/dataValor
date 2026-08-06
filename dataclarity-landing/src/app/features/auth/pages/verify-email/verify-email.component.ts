import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const API_URL = 'http://localhost:3001/api/v1';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly status = signal<'loading' | 'success' | 'error'>('loading');
  readonly message = signal<string>('Verificando seu e-mail...');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.message.set('Token de verificação ausente ou inválido.');
      return;
    }

    this.http
      .get<{ message: string }>(`${API_URL}/auth/verify-email`, {
        params: { token },
      })
      .subscribe({
        next: (res) => {
          this.status.set('success');
          this.message.set(res.message);
        },
        error: (err: { error?: { message?: string } }) => {
          this.status.set('error');
          this.message.set(
            err.error?.message ??
              'Não foi possível verificar o e-mail. O link pode ter expirado.',
          );
        },
      });
  }
}
