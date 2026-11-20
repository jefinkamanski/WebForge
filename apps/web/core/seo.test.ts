import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './seo';

describe('serializeJsonLd', () => {
  it('escapes "<" so content can never close the script tag', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });

    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
