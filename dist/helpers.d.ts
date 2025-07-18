import type { CaseCitation, CitationBase, Document, Tokens } from './models';
import { FullCaseCitation, FullJournalCitation, FullLawCitation } from './models';
/**
 * Extract pin cite from tokens following an index
 */
export declare function extractPinCite(words: Tokens, index: number, prefix?: string): [string | undefined, number | undefined, string | undefined];
/**
 * Match regex against tokens starting from an index
 */
export declare function matchOnTokens(words: Tokens, startIndex: number, regex: string, options?: {
    prefix?: string;
    stringsOnly?: boolean;
    forward?: boolean;
}): RegExpMatchArray | null;
/**
 * Clear the filtering cache
 */
export declare function clearFilteringCache(): void;
/**
 * Filter citations to remove overlaps and duplicates with sophisticated disambiguation logic
 */
export declare function filterCitations(citations: CitationBase[]): CitationBase[];
/**
 * Remove ambiguous citations by checking if edition_guess is set
 * This matches the Python implementation which simply filters citations
 * where edition_guess is not set after guessEdition() has been called
 */
export declare function disambiguateReporters(citations: CitationBase[]): CitationBase[];
/**
 * Check if a name is valid (longer than 2 characters)
 */
export declare function isValidName(name: string): boolean;
/**
 * Find case name in plain text
 */
export declare function findCaseName(citation: CaseCitation, document: Document, short?: boolean): void;
/**
 * Get emphasis tags at a given position in plain text
 * @param document The document with emphasis tags
 * @param position Character position to find tags at
 * @returns List of tuples containing [tag_text, start_pos, end_pos], or empty array if no matching tags found
 */
export declare function findHtmlTagsAtPosition(document: Document, position: number): Array<[string, number, number]>;
/**
 * Convert emphasis tags to plain text and location
 * @param document The document to process
 * @param results The emphasis tags
 * @returns [text, start, end] The text of the plain text and the location it starts and ends
 */
export declare function convertHtmlToPlainTextAndLoc(document: Document, results: Array<[string, number, number]>): [string, number, number];
/**
 * Find case name in HTML
 */
export declare function findCaseNameInHtml(citation: CaseCitation, document: Document, short?: boolean): void;
/**
 * Strip stop words from text
 */
export declare function stripStopWords(text: string): string;
/**
 * Get year from string
 */
export declare function getYear(word: string): number | null;
/**
 * Add post citation metadata
 */
export declare function addPostCitation(citation: CaseCitation, words: Tokens): void;
/**
 * Get court by parenthetical string
 */
export declare function getCourtByParen(parenString: string): string | null;
/**
 * Add pre citation metadata
 */
export declare function addPreCitation(citation: FullCaseCitation, document: Document): void;
/**
 * Add law citation metadata
 */
export declare function addLawMetadata(citation: FullLawCitation, words: Tokens): void;
/**
 * Add journal citation metadata
 */
export declare function addJournalMetadata(citation: FullJournalCitation, words: Tokens): void;
//# sourceMappingURL=helpers.d.ts.map