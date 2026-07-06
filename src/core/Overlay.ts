import type { Editor } from 'grapesjs';
import type { Severity } from '../types';

interface OverlayBox {
  top: number;
  left: number;
  width: number;
  height: number;
  severity: Severity;
  label?: string;
}

/**
 * A `position:fixed`, `pointer-events:none` layer appended to the top document
 * (never the iframe) that draws highlight boxes over canvas elements. Zoom- and
 * scroll-aware: rects are mapped through the canvas frame position and zoom
 * factor, mirroring `grapesjs-devtools`' CanvasOverlay.
 */
export class Overlay {
  private layer: HTMLElement | null = null;
  /** Separate layer for persistent markers (highlight-all, tab order) so the
   *  transient hover highlight can be cleared without wiping them. */
  private persistent: HTMLElement | null = null;

  constructor(private readonly editor: Editor) {}

  private makeLayer(cls: string): HTMLElement {
    const layer = document.createElement('div');
    layer.className = cls;
    Object.assign(layer.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9998',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(layer);
    return layer;
  }

  private ensure(): HTMLElement {
    if (!this.layer) this.layer = this.makeLayer('gjs-as-overlay-layer');
    return this.layer;
  }

  private ensurePersistent(): HTMLElement {
    if (!this.persistent) this.persistent = this.makeLayer('gjs-as-overlay-layer gjs-as-overlay-persistent');
    return this.persistent;
  }

  /** Public rect mapper (used by the focus-order visualizer). */
  rectOf(el: HTMLElement): { top: number; left: number; width: number; height: number } | null {
    return this.boxOf(el);
  }

  /** Map a canvas element's rect to top-document coordinates. */
  private boxOf(el: HTMLElement): Omit<OverlayBox, 'severity' | 'label'> | null {
    const frame = this.editor.Canvas.getFrameEl();
    if (!frame) return null;
    const fr = frame.getBoundingClientRect();
    // GrapesJS reports zoom as a percentage (0..100).
    const zoom = (this.editor.Canvas.getZoom() || 100) / 100;
    const r = el.getBoundingClientRect();
    return {
      top: fr.top + r.top * zoom,
      left: fr.left + r.left * zoom,
      width: r.width * zoom,
      height: r.height * zoom,
    };
  }

  /** Highlight a single element. */
  highlight(el: HTMLElement, severity: Severity = 'error', label?: string): void {
    const box = this.boxOf(el);
    if (!box) return;
    this.draw([{ ...box, severity, label }]);
  }

  /** Draw an explicit set of boxes, replacing any previous ones. */
  draw(boxes: OverlayBox[]): void {
    const layer = this.ensure();
    layer.textContent = '';
    for (const b of boxes) {
      const box = document.createElement('div');
      box.className = 'gjs-as-overlay-box';
      box.dataset.severity = b.severity;
      Object.assign(box.style, {
        position: 'absolute',
        top: `${b.top}px`,
        left: `${b.left}px`,
        width: `${b.width}px`,
        height: `${b.height}px`,
      } satisfies Partial<CSSStyleDeclaration>);
      if (b.label) {
        const tag = document.createElement('span');
        tag.className = 'gjs-as-overlay-label';
        tag.textContent = b.label;
        box.appendChild(tag);
      }
      layer.appendChild(box);
    }
  }

  /** Clear the transient (hover) boxes but keep the layer. */
  clear(): void {
    if (this.layer) this.layer.textContent = '';
  }

  /** Draw persistent boxes for a set of elements (highlight-all). */
  drawPersistent(items: Array<{ el: HTMLElement; severity: Severity }>): void {
    const layer = this.ensurePersistent();
    layer.textContent = '';
    for (const { el, severity } of items) {
      const box = this.boxOf(el);
      if (!box) continue;
      const div = document.createElement('div');
      div.className = 'gjs-as-overlay-box gjs-as-overlay-persistent-box';
      div.dataset.severity = severity;
      Object.assign(div.style, {
        position: 'absolute',
        top: `${box.top}px`,
        left: `${box.left}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      } satisfies Partial<CSSStyleDeclaration>);
      layer.appendChild(div);
    }
  }

  /** Draw a numbered, arrow-connected focus sequence (tab-order visualizer). */
  drawSequence(els: HTMLElement[]): void {
    const layer = this.ensurePersistent();
    layer.textContent = '';
    let prev: { x: number; y: number } | null = null;
    els.forEach((el, i) => {
      const box = this.boxOf(el);
      if (!box) return;
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (prev) layer.appendChild(arrow(prev.x, prev.y, x, y));
      const dot = document.createElement('div');
      dot.className = 'gjs-as-focus-dot';
      dot.textContent = String(i + 1);
      Object.assign(dot.style, { position: 'absolute', top: `${y - 11}px`, left: `${x - 11}px` } satisfies Partial<CSSStyleDeclaration>);
      layer.appendChild(dot);
      prev = { x, y };
    });
  }

  /** Clear the persistent layer. */
  clearPersistent(): void {
    if (this.persistent) this.persistent.textContent = '';
  }

  /** Remove all layers entirely. */
  destroy(): void {
    this.layer?.remove();
    this.persistent?.remove();
    this.layer = null;
    this.persistent = null;
  }
}

/** A thin rotated line acting as a connector between two focus points. */
function arrow(x1: number, y1: number, x2: number, y2: number): HTMLElement {
  const line = document.createElement('div');
  line.className = 'gjs-as-focus-line';
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  Object.assign(line.style, {
    position: 'absolute',
    top: `${y1}px`,
    left: `${x1}px`,
    width: `${len}px`,
    height: '0',
    transform: `rotate(${angle}deg)`,
    transformOrigin: '0 0',
  } satisfies Partial<CSSStyleDeclaration>);
  return line;
}
