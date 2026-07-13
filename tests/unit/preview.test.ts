import { escapeHtml } from '../../src/webview/editor/localization';
import { getMermaidDiagramDescription, sanitizeMermaidSvg } from '../../src/webview/editor/preview';

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

const createTitleElement = (): Element =>
  ({
    attributes: [],
    tagName: 'title',
    textContent: '',
    remove(): void {},
    removeAttribute(): void {},
    setAttribute(): void {},
  }) as unknown as Element;

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

const createMockSvgElement = (options?: {
  blockedNodes?: Element[];
  attributeNodes?: MockSanitizableElement[];
  descNodes?: Element[];
  describedElements?: MockSanitizableElement[];
  extraMarkup?: () => string;
}): Element => {
  const attributes = new Map<string, string>();
  let titleText: string | undefined;

  const svgElement = {
    attributes: [] as MockAttribute[],
    firstChild: undefined,
    ownerDocument: {
      createElementNS(): Element {
        return createTitleElement();
      },
    },
    querySelectorAll(selector: string): Element[] {
      if (selector === 'script,foreignObject,iframe,object,embed') {
        return options?.blockedNodes ?? [];
      }
      if (selector === '*') {
        return (options?.attributeNodes ?? []) as unknown as Element[];
      }
      if (selector === 'desc,title') {
        return options?.descNodes ?? [];
      }
      if (selector === '[aria-describedby]') {
        return (options?.describedElements ?? []) as unknown as Element[];
      }
      return [];
    },
    setAttribute(name: string, value: string): void {
      attributes.set(name, value);
    },
    removeAttribute(name: string): void {
      attributes.delete(name);
    },
    insertBefore(node: Element): void {
      titleText = node.textContent ?? '';
    },
    get outerHTML(): string {
      const serializedAttributes = [...attributes.entries()]
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ');
      const startTag = serializedAttributes ? `<svg ${serializedAttributes}>` : '<svg>';
      const titleMarkup = titleText === undefined ? '' : `<title>${titleText}</title>`;
      const body = options?.extraMarkup?.() ?? '';
      return `${startTag}${titleMarkup}${body}</svg>`;
    },
  };

  return svgElement as unknown as Element;
};

const missingSvgParser = (): Element | undefined => {
  return;
};

describe('preview sanitization', () => {
  it('derives concise diagram descriptions from Mermaid source', () => {
    expect(getMermaidDiagramDescription('graph TD\nA[Start] --> B[End]')).to.equal(
      'graph TD: Start',
    );
    expect(
      getMermaidDiagramDescription('sequenceDiagram\nparticipant Alice\nAlice->>Bob: Hello'),
    ).to.equal('sequenceDiagram: Alice');
    expect(getMermaidDiagramDescription('classDiagram\nclass Animal')).to.equal(
      'classDiagram: Animal',
    );
    expect(getMermaidDiagramDescription('not a diagram')).to.equal(undefined);
    expect(getMermaidDiagramDescription('   \n')).to.equal(undefined);
  });

  it('escapes HTML content for safe error rendering', () => {
    expect(escapeHtml(`<script>alert('x')</script>&"`)).to.equal(
      '&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;&amp;&quot;',
    );
  });

  it('returns a user-visible error when SVG output is missing', () => {
    const result = sanitizeMermaidSvg('<not-svg/>', '', missingSvgParser);
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

    const svgElement = createMockSvgElement({
      blockedNodes: [blockedNode as unknown as Element],
      attributeNodes: [unsafeLink, safeLink],
      extraMarkup: () => {
        const blockedMarkup = blockedNode.removed ? '' : '<script>alert(1)</script>';
        return `${blockedMarkup}${unsafeLink.toHtml()}${safeLink.toHtml()}`;
      },
    });

    const result = sanitizeMermaidSvg('<svg/>', 'graph TD\nA[Start]', () => svgElement);

    expect(blockedNode.removed).to.equal(true);
    expect(result).to.not.include('<script>');
    expect(result).to.not.include('onclick="');
    expect(result).to.not.include('javascript:');
    expect(result).to.not.include('data:text/html');
    expect(result).to.include('class="unsafe-link"');
    expect(result).to.include('class="safe-link"');
    expect(result).to.include('href="https://example.com/diagram.svg"');
    expect(result).to.include('role="img"');
    expect(result).to.include('aria-label="Mermaid diagram: graph TD: Start"');
    expect(result).to.include('<title>Mermaid diagram: graph TD: Start</title>');
  });

  it('removes Mermaid descriptions and dangling aria-describedby attributes', () => {
    const descNode = {
      removed: false,
      remove(): void {
        this.removed = true;
      },
    } as Element & { removed: boolean };
    const describedNode = createSanitizableElement('g', {
      'aria-describedby': 'mermaid-desc',
    });
    const svgElement = createMockSvgElement({
      descNodes: [descNode],
      describedElements: [describedNode],
      attributeNodes: [describedNode],
      extraMarkup: () =>
        `${descNode.removed ? '' : '<desc>Old description</desc>'}${describedNode.toHtml()}`,
    });

    const result = sanitizeMermaidSvg('<svg/>', 'not a diagram', () => svgElement);

    expect(descNode.removed).to.equal(true);
    expect(result).to.not.include('<desc>');
    expect(result).to.not.include('aria-describedby=');
    expect(result).to.include('aria-label="Mermaid diagram"');
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
      firstChild: undefined,
      ownerDocument: {
        createElementNS(): Element {
          return createTitleElement();
        },
      },
      setAttribute(): void {},
      removeAttribute(): void {},
      insertBefore(): void {},
      querySelectorAll(selector: string): Element[] {
        if (selector === 'script,foreignObject,iframe,object,embed') {
          return [foreignObject as unknown as Element];
        }
        if (selector === '*') {
          return insertedLabel ? [insertedLabel as unknown as Element] : [];
        }
        if (selector === 'desc,title' || selector === '[aria-describedby]') {
          return [];
        }
        return [];
      },
      get outerHTML(): string {
        return `<svg>${insertedLabel ? '<text>Start</text>' : ''}</svg>`;
      },
    } as unknown as Element;

    const result = sanitizeMermaidSvg('<svg/>', 'graph TD\nA[Start]', () => svgElement);

    expect(insertedLabel).to.not.equal(undefined);
    expect(insertedLabel?.textContent).to.equal('Start');
    expect(result).to.include('<text>Start</text>');
  });
});
