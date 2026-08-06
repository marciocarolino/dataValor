import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-verify-email-sent',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './verify-email-sent.component.html',
  styleUrl: './verify-email-sent.component.scss',
})
export class VerifyEmailSentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly email = signal<string | null>(null);

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    this.email.set(emailParam);
  }
}
