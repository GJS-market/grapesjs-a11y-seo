import type { Component } from 'grapesjs';
import type { Severity, Violation } from '../types';
import type { EditorBridge } from './EditorBridge';

interface WithLayerView {
  viewLayer?: { el?: HTMLElement };
  getId?: () => string;
}

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Injects a small severity dot into each component's row in the GrapesJS Layer
 * Manager, so you can see which blocks are "dirty" without opening the audit
 * panel. Uses the component's `viewLayer.el` (the row DOM). Badges are
 * re-applied whenever layers re-render (`layer:component` / `layer:render`).
 */
export class LayerBadges {
  private worst = new Map<Component, Severity>();

  constructor(bridge: EditorBridge) {
    const reapply = () => this.render();
    bridge.on('layer:component', reapply);
    bridge.on('layer:render', reapply);
    bridge.on('layer:root', reapply);
  }

  /** Recompute the worst severity per component and repaint the badges. */
  update(violations: Violation[]): void {
    this.worst.clear();
    for (const v of violations) {
      const c = v.component;
      if (!c) continue;
      const prev = this.worst.get(c);
      if (prev == null || RANK[v.severity] < RANK[prev]) this.worst.set(c, v.severity);
    }
    this.render();
  }

  private render(): void {
    // Clear stale badges, then paint the current set.
    document.querySelectorAll('.gjs-as-layer-badge').forEach((n) => n.remove());
    for (const [component, severity] of this.worst) {
      const row = (component as unknown as WithLayerView).viewLayer?.el;
      if (!row) continue;
      const badge = document.createElement('span');
      badge.className = `gjs-as-layer-badge gjs-as-layer-badge-${severity}`;
      badge.title = severity;
      row.appendChild(badge);
    }
  }

  clear(): void {
    this.worst.clear();
    document.querySelectorAll('.gjs-as-layer-badge').forEach((n) => n.remove());
  }
}
