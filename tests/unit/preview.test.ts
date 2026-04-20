import { escapeHtml, sanitizeMermaidSvg } from '../../src/webview/editor/preview';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type MockAttribute = {
  name: string;
  value: string;
};

type MockSanitizableElement = {
  attributes: MockAttribute[];
  removeAttribute: (name: string) => void;
  toHtml: () => string;
};

const createSanitizableElement = (
  tagName: string,
  attributes: Record<string, string>,
): MockSanitizableElement => {
  const serializedAttributes = Object.entries(attributes).map(([name, value]) => ({
    name,
    value,
  }));
  const removedAttributes = new Set<string>();

  return {
    attributes: serializedAttributes,
    removeAttribute(name: string): void {
      removedAttributes.add(name);
    },
    toHtml(): string {
      const remainingAttributes = serializedAttributes
        .filter((attribute) => !removedAttributes.has(attribute.name))
        .map((attribute) => `${attribute.name}="${attribute.value}"`)
        .join(' ');
      if (!remainingAttributes) {
        return `<${tagName}></${tagName}>`;
      }
      return `<${tagName} ${remainingAttributes}></${tagName}>`;
    },
  };
};

const missingSvgParser = (): Element | undefined => {
  return;
};

describe('preview sanitization', () => {
  it('escapes HTML content for safe error rendering', () => {
    expect(escapeHtml(`<script>alert('x')</script>&"`)).to.equal(
      '&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;&amp;&quot;',
    );
  });

  it('returns a user-visible error when SVG output is missing', () => {
    const result = sanitizeMermaidSvg('<not-svg/>', missingSvgParser);
    expect(result).to.equal(
      '<div class="muninn-mermaid-error">Mermaid rendered no SVG output.</div>',
    );
  });

  it('removes script-like nodes and dangerous SVG attributes', () => {
    const blockedNode = {
      removed: false,
      remove(): void {
        this.removed = true;
      },
    };

    const unsafeLink = createSanitizableElement('a', {
      class: 'unsafe-link',
      onclick: 'alert(1)',
      href: 'javascript:alert(1)',
      'xlink:href': 'data:text/html;base64,PHNjcmlwdA==',
    });
    const safeLink = createSanitizableElement('a', {
      class: 'safe-link',
      href: 'https://example.com/diagram.svg',
    });

    const svgElement = {
      querySelectorAll(selector: string): Element[] {
        if (selector === 'script,foreignObject,iframe,object,embed') {
          return [blockedNode as unknown as Element];
        }
        if (selector === '*') {
          return [unsafeLink as unknown as Element, safeLink as unknown as Element];
        }
        return [];
      },
      get outerHTML(): string {
        const blockedMarkup = blockedNode.removed ? '' : '<script>alert(1)</script>';
        return `<svg>${blockedMarkup}${unsafeLink.toHtml()}${safeLink.toHtml()}</svg>`;
      },
    } as unknown as Element;

    const result = sanitizeMermaidSvg('<svg/>', () => svgElement);

    expect(blockedNode.removed).to.equal(true);
    expect(result).to.not.include('<script>');
    expect(result).to.not.include('onclick="');
    expect(result).to.not.include('javascript:');
    expect(result).to.not.include('data:text/html');
    expect(result).to.include('class="unsafe-link"');
    expect(result).to.include('class="safe-link"');
    expect(result).to.include('href="https://example.com/diagram.svg"');
  });

  it('converts foreignObject labels into svg text fallback nodes', () => {
    const textAttributes: MockAttribute[] = [];
    const textNode = {
      attributes: textAttributes,
      textContent: '',
      setAttribute(name: string, value: string): void {
        const existing = textAttributes.find((attribute) => attribute.name === name);
        if (existing) {
          existing.value = value;
          return;
        }
        textAttributes.push({ name, value });
      },
      removeAttribute(): void {},
    };

    let insertedLabel: typeof textNode | undefined;
    const foreignObject = {
      tagName: 'foreignObject',
      textContent: ' Start ',
      attributes: [] as MockAttribute[],
      ownerDocument: {
        createElementNS(): typeof textNode {
          return textNode;
        },
      },
      parentElement: {
        insertBefore(node: typeof textNode): void {
          insertedLabel = node;
        },
      },
      getAttribute(attributeName: string): string | undefined {
        if (attributeName === 'x') {
          return '10';
        }
        if (attributeName === 'y') {
          return '20';
        }
        if (attributeName === 'width') {
          return '40';
        }
        if (attributeName === 'height') {
          return '16';
        }
        return undefined;
      },
      remove(): void {},
      removeAttribute(): void {},
    };

    const svgElement = {
      querySelectorAll(selector: string): Element[] {
        if (selector === 'script,foreignObject,iframe,object,embed') {
          return [foreignObject as unknown as Element];
        }
        if (selector === '*') {
          return insertedLabel ? [insertedLabel as unknown as Element] : [];
        }
        return [];
      },
      get outerHTML(): string {
        return `<svg>${insertedLabel ? '<text>Start</text>' : ''}</svg>`;
      },
    } as unknown as Element;

    const result = sanitizeMermaidSvg('<svg/>', () => svgElement);

    expect(insertedLabel).to.not.equal(undefined);
    expect(insertedLabel?.textContent).to.equal('Start');
    expect(result).to.include('<text>Start</text>');
  });
});
