import { describe, expect, it } from 'vitest';
import { MAX_OUTPUT_BYTES, normalizeOutput } from '../output.js';
import { fetchPayload, searchPayload } from './helpers.js';

describe('bounded citation-preserving tool output', () => {
  it('keeps public search citations while removing upstream metadata', () => {
    const result = normalizeOutput(
      searchPayload({
        session_id: 'private-session',
        warnings: ['not public'],
        usage: [{ name: 'sku_search', count: 1 }],
      }),
      'web_search'
    );

    expect(result).toEqual({
      request_id: 'search_test',
      results: [
        {
          url: 'https://example.com/result',
          title: 'Example result',
          publish_date: '2026-08-25',
          excerpts: ['A useful public-web excerpt.'],
        },
      ],
      truncated: false,
    });
    expect(result).not.toHaveProperty('session_id');
    expect(result).not.toHaveProperty('usage');
  });

  it('never includes full webpage content in fetch results', () => {
    const result = normalizeOutput(fetchPayload(), 'web_fetch');

    expect(result.results[0]).not.toHaveProperty('full_content');
    expect(result.request_id).toBe('extract_test');
  });

  it('preserves bounded, public fetch errors', () => {
    const result = normalizeOutput(
      fetchPayload({
        errors: [
          {
            url: 'https://example.com/missing',
            error_type: 'not_found',
            content: 'internal details that should not leak',
          },
        ],
      }),
      'web_fetch'
    );

    expect(result.errors).toEqual([
      { url: 'https://example.com/missing', error_type: 'not_found' },
    ]);
  });

  it('keeps oversized multibyte error details inside the hard output budget', () => {
    const result = normalizeOutput(
      fetchPayload({
        errors: Array.from({ length: 3 }, () => ({
          url: '🌍'.repeat(2_048),
          error_type: 'not_found',
        })),
      }),
      'web_fetch'
    );

    expect(
      new TextEncoder().encode(JSON.stringify(result)).byteLength
    ).toBeLessThanOrEqual(MAX_OUTPUT_BYTES);
    expect(result.truncated).toBe(true);
    expect(result.results[0]?.url).toBe('https://example.com/article');
  });

  it('keeps at most five results while preserving their citation URLs', () => {
    const results = Array.from({ length: 8 }, (_, index) => ({
      url: `https://example.com/source-${index}`,
      title: `Source ${index}`,
      excerpts: ['A useful excerpt'],
    }));

    const result = normalizeOutput(searchPayload({ results }), 'web_search');

    expect(result.results).toHaveLength(5);
    expect(result.results.map((source) => source.url)).toEqual(
      results.slice(0, 5).map((source) => source.url)
    );
    expect(result.truncated).toBe(true);
  });

  it('measures actual UTF-8 bytes and preserves complete multibyte characters', () => {
    const result = normalizeOutput(
      searchPayload({
        results: [
          {
            url: 'https://example.com/long',
            title: 'A long multilingual page',
            excerpts: ['🌍'.repeat(10_000)],
          },
        ],
      }),
      'web_search'
    );

    expect(
      new TextEncoder().encode(JSON.stringify(result)).byteLength
    ).toBeLessThanOrEqual(MAX_OUTPUT_BYTES);
    expect(result.truncated).toBe(true);
    expect(result.results[0]?.url).toBe('https://example.com/long');
    expect(result.results[0]?.excerpts[0]).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it('skips malformed or non-public-protocol upstream citations', () => {
    const result = normalizeOutput(
      searchPayload({
        results: [
          { url: 'javascript:alert(1)', excerpts: ['unsafe'] },
          { url: 'not a URL', excerpts: ['invalid'] },
          { url: 'https://example.com/safe', excerpts: ['safe'] },
        ],
      }),
      'web_search'
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.url).toBe('https://example.com/safe');
    expect(result.truncated).toBe(true);
  });

  it('limits title, publication-date, and request-identifier lengths', () => {
    const result = normalizeOutput(
      searchPayload({
        search_id: 'x'.repeat(200),
        results: [
          {
            url: 'https://example.com/',
            title: 'x'.repeat(500),
            publish_date: 'x'.repeat(100),
            excerpts: [],
          },
        ],
      }),
      'web_search'
    );

    expect(result.request_id).toHaveLength(100);
    expect(result.results[0]?.title).toHaveLength(200);
    expect(result.results[0]?.publish_date).toHaveLength(32);
  });

  it.each([null, {}, { search_id: 'missing-results' }, { results: [] }])(
    'rejects malformed upstream result %j',
    (payload) => {
      expect(() => normalizeOutput(payload, 'web_search')).toThrow(
        'unexpected response'
      );
    }
  );

  it('marks invalid excerpt entries as truncated without returning them', () => {
    const result = normalizeOutput(
      searchPayload({
        results: [
          { url: 'https://example.com/', excerpts: ['safe', 42, null] },
        ],
      }),
      'web_search'
    );

    expect(result.results[0]?.excerpts).toEqual(['safe']);
    expect(result.truncated).toBe(true);
  });
});
