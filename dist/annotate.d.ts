import type { CitationBase } from './models';
export interface AnnotationOptions {
    annotateFunc?: (citation: CitationBase, text: string) => string;
    unbalancedTags?: string[];
    citations?: CitationBase[];
    tokenizer?: any;
}
/**
 * Annotate citations in text with HTML markup
 *
 * @param plainText The plain text containing citations
 * @param options Annotation options
 * @returns Text with citations wrapped in HTML markup
 */
export declare function annotateCitations(plainText: string, options?: AnnotationOptions): string;
/**
 * Annotate citations while preserving HTML structure
 *
 * @param htmlText HTML text containing citations
 * @param options Annotation options
 * @returns HTML text with citations wrapped in markup
 */
export declare function annotateCitationsHtml(htmlText: string, options?: AnnotationOptions): string;
/**
 * Main entry point for annotating citations
 * Detects if input is HTML and uses appropriate method
 */
export declare function annotate(text: string, options?: AnnotationOptions): string;
//# sourceMappingURL=annotate.d.ts.map