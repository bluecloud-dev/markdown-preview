import { renderMermaidDiagram } from './renderers/mermaid-renderer';
import { getString } from './localization';

type MermaidPreviewOptions = {
  panel: HTMLElement;
  body: HTMLDivElement;
  getSelectedMermaidSource: () => string | undefined;
  renderDelayMs: number;
};

export class MermaidPreviewController {
  private enabled = false;
  private renderSerial = 0;
  private renderTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: MermaidPreviewOptions) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  scheduleRender(): void {
    if (this.renderTimer) {
      return;
    }

    this.renderTimer = setTimeout(() => {
      this.renderTimer = undefined;
      this.renderSerial += 1;
      void this.render();
    }, this.options.renderDelayMs);
  }

  dispose(): void {
    if (!this.renderTimer) {
      return;
    }
    clearTimeout(this.renderTimer);
    this.renderTimer = undefined;
  }

  private async render(): Promise<void> {
    const source = this.options.getSelectedMermaidSource();
    if (!source) {
      this.options.panel.hidden = true;
      this.options.body.innerHTML = '';
      return;
    }

    this.options.panel.hidden = false;
    if (!this.enabled) {
      this.options.body.textContent = getString('mermaidDisabledMessage');
      return;
    }

    const serialAtStart = this.renderSerial;
    const renderId = `muninn-mermaid-${Date.now()}`;
    const result = await renderMermaidDiagram(source, renderId);
    if (serialAtStart !== this.renderSerial) {
      return;
    }

    if (!result.ok) {
      this.options.body.innerHTML = `<div class="muninn-mermaid-error">${escapeHtml(result.error)}</div>`;
      return;
    }

    this.options.body.innerHTML = sanitizeMermaidSvg(result.svg);
  }
}

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const parseSvgElement = (rawSvg: string): Element | undefined => {
  const documentParser = new DOMParser().parseFromString(rawSvg, 'image/svg+xml');
  return documentParser.querySelector('svg') ?? undefined;
};

const readNumericAttribute = (element: Element, attributeName: string): number | undefined => {
  const value = element.getAttribute(attributeName);
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
};

const convertForeignObjectLabel = (foreignObject: Element): void => {
  const labelText = foreignObject.textContent?.replaceAll(/\s+/g, ' ').trim();
  if (!labelText || !foreignObject.parentElement) {
    foreignObject.remove();
    return;
  }

  const ownerDocument =
    foreignObject.ownerDocument ?? (typeof document === 'undefined' ? undefined : document);
  const textNode = ownerDocument?.createElementNS?.('http://www.w3.org/2000/svg', 'text');
  if (!textNode) {
    foreignObject.remove();
    return;
  }

  const x = readNumericAttribute(foreignObject, 'x');
  const y = readNumericAttribute(foreignObject, 'y');
  const width = readNumericAttribute(foreignObject, 'width');
  const height = readNumericAttribute(foreignObject, 'height');
  const anchorX = (x ?? 0) + (width ?? 0) / 2;
  const anchorY = (y ?? 0) + (height ?? 0) / 2;

  textNode.textContent = labelText;
  textNode.setAttribute('class', 'muninn-mermaid-fallback-label');
  textNode.setAttribute('x', String(anchorX));
  textNode.setAttribute('y', String(anchorY));
  textNode.setAttribute('text-anchor', 'middle');
  textNode.setAttribute('dominant-baseline', 'middle');
  textNode.setAttribute('pointer-events', 'none');

  foreignObject.parentElement.insertBefore(textNode, foreignObject);
  foreignObject.remove();
};

export const sanitizeMermaidSvg = (
  rawSvg: string,
  parse: (source: string) => Element | undefined = parseSvgElement,
): string => {
  const svgElement = parse(rawSvg);
  if (!svgElement) {
    return `<div class="muninn-mermaid-error">${escapeHtml(getString('mermaidNoSvgOutput'))}</div>`;
  }

  for (const node of svgElement.querySelectorAll('script,foreignObject,iframe,object,embed')) {
    if ((node.tagName ?? '').toLowerCase() === 'foreignobject') {
      convertForeignObjectLabel(node);
      continue;
    }

    node.remove();
  }

  for (const element of svgElement.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (
        (name === 'href' || name === 'xlink:href') &&
        (value.startsWith('javascript:') || value.startsWith('data:text/html'))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return svgElement.outerHTML;
};
