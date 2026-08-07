import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface ClientRow {
  name: string;
  revenue: string;
  lastPurchase: Date;
  status: 'Ativo' | 'Inativo' | 'Pendente';
}

@Component({
  selector: 'app-top-clients-table',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './top-clients-table.component.html',
  styleUrls: ['./top-clients-table.component.scss'],
})
export class TopClientsTableComponent {
  clients: ClientRow[] = [
    { name: 'Acme Corp', revenue: 'R$ 320k', lastPurchase: new Date('2026-07-15'), status: 'Ativo' },
    { name: 'Globex Inc', revenue: 'R$ 280k', lastPurchase: new Date('2026-07-20'), status: 'Ativo' },
    { name: 'Initech Ltd', revenue: 'R$ 210k', lastPurchase: new Date('2026-06-30'), status: 'Pendente' },
    { name: 'Umbrella Co', revenue: 'R$ 195k', lastPurchase: new Date('2026-07-01'), status: 'Ativo' },
    { name: 'Stark Ind', revenue: 'R$ 175k', lastPurchase: new Date('2026-05-22'), status: 'Inativo' },
    { name: 'Wayne Ent', revenue: 'R$ 160k', lastPurchase: new Date('2026-07-10'), status: 'Ativo' },
    { name: 'Oscorp', revenue: 'R$ 148k', lastPurchase: new Date('2026-07-18'), status: 'Ativo' },
    { name: 'Cyberdyne', revenue: 'R$ 130k', lastPurchase: new Date('2026-06-14'), status: 'Pendente' },
    { name: 'Soylent Corp', revenue: 'R$ 115k', lastPurchase: new Date('2026-07-22'), status: 'Ativo' },
    { name: 'Momcorp', revenue: 'R$ 98k', lastPurchase: new Date('2026-04-11'), status: 'Inativo' },
  ];

  statusClass(status: string): string {
    switch (status) {
      case 'Ativo': return 'badge--active';
      case 'Inativo': return 'badge--inactive';
      case 'Pendente': return 'badge--pending';
      default: return '';
    }
  }
}
