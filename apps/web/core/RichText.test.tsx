import type { ImageAsset, PostDoc } from '@webforge/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RichText } from './RichText';

const render = (content: PostDoc<ImageAsset>['content']) =>
  renderToStaticMarkup(<RichText doc={{ type: 'doc', content }} />);

describe('RichText', () => {
  it('renders text as text, never as HTML', () => {
    const html = render([
      { type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }] },
    ]);

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
  });

  it('keeps bold and italic inside the link, and marks external links', () => {
    const html = render([
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'site',
            marks: [
              { type: 'link', attrs: { href: 'https://exemplo.com' } },
              { type: 'bold' },
              { type: 'italic' },
            ],
          },
        ],
      },
    ]);

    expect(html).toMatch(
      /<a href="https:\/\/exemplo.com"[^>]*rel="noopener noreferrer"[^>]*><em><strong>site<\/strong><\/em><\/a>/,
    );
  });

  it('renders headings, lists and quotes, and skips empty paragraphs', () => {
    const html = render([
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Título' }] },
      { type: 'paragraph' },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'um' }] }],
          },
        ],
      },
      {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'citação' }] }],
      },
    ]);

    expect(html).toMatch(
      /^<div[^>]*><h2[^>]*>Título<\/h2><ol[^>]*><li[^>]*><p>um<\/p><\/li><\/ol><blockquote[^>]*><p>citação<\/p><\/blockquote><\/div>$/,
    );
  });
});
