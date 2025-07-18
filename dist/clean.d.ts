type CleaningStep = string | ((text: string) => string);
/**
 * Apply a list of cleaning functions to text in sequence
 *
 * @param text The text to clean
 * @param steps Array of cleaning function names or custom functions
 * @returns The cleaned text
 */
export declare function cleanText(text: string, steps: Iterable<CleaningStep>): string;
/**
 * Extract visible text from HTML markup
 *
 * @param htmlContent The HTML string
 * @returns Only the visible text content
 */
export declare function html(htmlContent: string): string;
/**
 * Collapse multiple spaces or tabs into one space
 *
 * @param text The input string
 * @returns Text with collapsed spaces and tabs
 */
export declare function inlineWhitespace(text: string): string;
/**
 * Collapse all whitespace characters into one space
 *
 * @param text The input string
 * @returns Text with collapsed whitespace
 */
export declare function allWhitespace(text: string): string;
/**
 * Remove underscores (common in PDF extractions)
 *
 * @param text The input string
 * @returns Text without consecutive underscores
 */
export declare function underscores(text: string): string;
/**
 * Remove XML declaration tag
 *
 * @param text The input string
 * @returns Text without XML opening tag
 */
export declare function xml(text: string): string;
/**
 * Lookup table for cleaning functions
 */
export declare const cleanersLookup: Record<string, (text: string) => string>;
export {};
//# sourceMappingURL=clean.d.ts.map