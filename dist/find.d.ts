import type { CitationBase, Document } from './models';
import { FullCaseCitation, ReferenceCitation, ResourceCitation } from './models';
import type { Tokenizer } from './tokenizers';
import { type Edition } from './models/reporters';
/**
 * Main function to extract citations from text
 */
export declare function getCitations(plainText?: string, removeAmbiguous?: boolean, tokenizer?: Tokenizer, markupText?: string, cleanSteps?: Array<string | ((text: string) => string)>): CitationBase[];
/**
 * Extract reference citations that follow a full citation
 */
export declare function extractReferenceCitations(citation: ResourceCitation, document: Document): ReferenceCitation[];
/**
 * Enhanced citation validation with comprehensive date checking.
 * Validates citations against reporter editions with improved date range validation.
 *
 * @param citation - The citation to validate
 * @param editions - Available reporter editions
 * @returns Validation result with warnings and recommendations
 */
export declare function validateCitationDates(citation: FullCaseCitation, editions: Edition[]): {
    isValid: boolean;
    warnings: string[];
    suspiciousDateReasons: string[];
    recommendedEdition?: Edition;
};
/**
 * Find reference citations from HTML markup emphasis tags
 */
export declare function findReferenceCitationsFromMarkup(document: Document, citations: FullCaseCitation[]): ReferenceCitation[];
//# sourceMappingURL=find.d.ts.map