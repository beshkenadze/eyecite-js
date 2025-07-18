export declare const REPORTERS_THAT_NEED_PAGE_CORRECTION: Set<string>;
export declare const DISALLOWED_NAMES: string[];
/**
 * Strip punctuation from a string
 * Adapted from nltk Penn Treebank tokenizer
 */
export declare function stripPunct(text: string): string;
/**
 * Check if HTML is balanced
 */
export declare function isBalancedHtml(text: string): boolean;
/**
 * Wrap HTML tags with before and after strings
 */
export declare function wrapHtmlTags(text: string, before: string, after: string): string;
/**
 * Hash a dictionary in a deterministic way
 */
export declare function hashSha256(dictionary: Record<string, any>): bigint;
/**
 * Validate that a name is valid for citation purposes
 */
export declare function isValidName(name: string): boolean;
/**
 * Try to balance style tags in HTML
 */
export declare function maybeBalanceStyleTags(start: number, end: number, plainText: string, tolerance?: number): [number, number, string];
/**
 * Create placeholder HTML to identify annotation locations
 */
export declare function placeholderMarkup(html: string): string;
/**
 * Dump citations for debugging
 */
export declare function dumpCitations(citations: any[], text: string, contextChars?: number): string;
//# sourceMappingURL=utils.d.ts.map