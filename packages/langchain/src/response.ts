import type {
  ExtractResponse,
  SearchResult,
} from 'parallel-web/resources/top-level.mjs';

const TRUNCATED =
  '\n\n[Output truncated. The complete response is available in the tool artifact.]';

/**
 * Only model-facing text is reduced. Never mutate the SDK response, which is
 * retained as the artifact, or cut a source URL away from its displayed text.
 */
export function formatResponse(
  response: SearchResult | ExtractResponse,
  maxOutputChars: number
): string {
  const sections = response.results.map((result) => ({
    source: `Source: ${result.url}\n`,
    text: [
      result.title && `Title: ${result.title}`,
      result.publish_date && `Published: ${result.publish_date}`,
      result.excerpts.join('\n\n') ||
        ('full_content' in result && result.full_content) ||
        'No excerpts returned.',
    ]
      .filter(Boolean)
      .join('\n'),
  }));

  if ('errors' in response) {
    for (const error of response.errors) {
      sections.push({
        source: `Extraction failed: ${error.url}\n`,
        text: `${error.error_type}${error.http_status_code == null ? '' : ` (HTTP ${error.http_status_code})`}`,
      });
    }
  }
  for (const warning of response.warnings ?? []) {
    sections.push({ source: 'Warning: ', text: warning.message });
  }

  // Reserve the notice before appending sections so even pathological metadata
  // cannot exceed the cap. A source header must fit in full before any excerpt.
  const budget = maxOutputChars - TRUNCATED.length;
  let content = '';
  for (const section of sections) {
    const header = `${content ? '\n\n' : ''}${section.source}`;
    if (content.length + header.length > budget) {
      return content + TRUNCATED;
    }
    content += header;
    const remaining = budget - content.length;
    content += section.text.slice(0, remaining);
    if (section.text.length > remaining) {
      return content + TRUNCATED;
    }
  }
  return content || 'No results returned.';
}
