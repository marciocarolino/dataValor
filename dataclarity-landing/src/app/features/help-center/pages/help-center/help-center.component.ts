import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../dashboard/components/sidebar/sidebar.component';
import { TopBarComponent } from '../../../dashboard/components/top-bar/top-bar.component';
import { HelpService } from '../../../../core/services/help.service';
import {
  HELP_MENU_ITEMS,
  type HelpMenuItem,
  type HelpSection,
} from '../../../../core/models/help.model';

@Component({
  selector: 'app-help-center',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopBarComponent],
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.scss'],
})
export class HelpCenterComponent implements OnInit {
  private readonly helpService = inject(HelpService);

  readonly loading = this.helpService.loading;
  readonly error = this.helpService.error;
  readonly currentTopic = this.helpService.currentTopic;

  readonly menuItems = HELP_MENU_ITEMS;
  readonly activeMenuId = signal<string>('indicators');
  readonly searchQuery = signal('');
  readonly expandedSections = signal<Set<string>>(new Set());

  /** Seções filtradas pela busca */
  readonly filteredSections = computed(() => {
    const topic = this.currentTopic();
    if (!topic) return [];
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return topic.sections;
    return topic.sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.tips?.some((t) => t.toLowerCase().includes(q)) ||
        s.items?.some(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q),
        ),
    );
  });

  ngOnInit(): void {
    this.selectTopic('indicators');
  }

  selectTopic(id: string): void {
    const item = this.menuItems.find((m) => m.id === id);
    if (!item) return;

    this.activeMenuId.set(id);
    this.searchQuery.set('');

    if (!item.available) {
      this.helpService.clearTopic();
      return;
    }

    this.helpService.loadTopic(item.jsonFile);
  }

  toggleSection(id: string): void {
    const current = new Set(this.expandedSections());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedSections.set(current);
  }

  isSectionExpanded(id: string): boolean {
    return this.expandedSections().has(id);
  }

  expandAll(): void {
    const topic = this.currentTopic();
    if (!topic) return;
    this.expandedSections.set(new Set(topic.sections.map((s) => s.id)));
  }

  collapseAll(): void {
    this.expandedSections.set(new Set());
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    // Auto-expande todas as seções quando há busca ativa
    if (value.trim()) {
      const topic = this.currentTopic();
      if (topic) {
        this.expandedSections.set(new Set(topic.sections.map((s) => s.id)));
      }
    }
  }

  getActiveMenuItem(): HelpMenuItem | undefined {
    return this.menuItems.find((m) => m.id === this.activeMenuId());
  }

  trackSection(_: number, section: HelpSection): string {
    return section.id;
  }

  formatContent(content: string): string[] {
    return content.split('\n\n').filter((p) => p.trim().length > 0);
  }
}
