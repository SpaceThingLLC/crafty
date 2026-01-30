import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Render markdown to sanitized HTML.
 * Works in both SSR and browser contexts.
 */
export function renderMarkdown(text: string): string {
	if (!text) return '';
	const raw = marked.parse(text, { async: false }) as string;
	return DOMPurify.sanitize(raw);
}
