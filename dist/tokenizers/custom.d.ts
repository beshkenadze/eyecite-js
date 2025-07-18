import type { TokenExtractor, Token } from './base';
import { Tokenizer } from './base';
/**
 * CustomTokenizer extends the base Tokenizer with enhanced extensibility features
 * for dynamically creating and modifying citation extractors.
 */
export declare class CustomTokenizer extends Tokenizer {
    constructor(extractors?: TokenExtractor[]);
    /**
     * Create a simple citation extractor for a reporter
     * @param reporterPattern The reporter pattern (e.g., "U.S." or "F.2d")
     * @param citeType The citation type
     * @param reporterName Human-readable name of the reporter
     * @param options Additional options for the extractor
     */
    addSimpleCitationPattern(reporterPattern: string, citeType?: string, reporterName?: string, options?: {
        yearPageFormat?: boolean;
        hyphenFormat?: boolean;
        caseSensitive?: boolean;
        editionStr?: string;
    }): TokenExtractor;
    /**
     * Create a custom extractor with a specific regex pattern and token constructor
     * @param regex The regex pattern
     * @param tokenConstructor Constructor function for the token
     * @param extra Extra data to pass to the token constructor
     * @param options Additional options
     */
    addCustomExtractor(regex: string, tokenConstructor: typeof Token, extra?: Record<string, any>, options?: {
        flags?: number;
        strings?: string[];
    }): TokenExtractor;
    /**
     * Modify all reporter patterns to accept alternative punctuation
     * @param originalChar Character to replace (e.g., '.')
     * @param replacement Replacement pattern (e.g., '[.,]')
     */
    modifyReporterPunctuation(originalChar: string, replacement: string): void;
    /**
     * Create a batch of extractors for multiple reporter variations
     * @param reporters Array of reporter configurations
     */
    addMultipleReporters(reporters: Array<{
        pattern: string;
        name?: string;
        citeType?: string;
        options?: Parameters<CustomTokenizer['addSimpleCitationPattern']>[3];
    }>): TokenExtractor[];
    /**
     * Clone this tokenizer with all its extractors
     */
    clone(): CustomTokenizer;
    /**
     * Create a filtered version of this tokenizer that only includes extractors
     * matching certain criteria
     * @param predicate Function that returns true for extractors to include
     */
    createFilteredTokenizer(predicate: (extractor: TokenExtractor) => boolean): CustomTokenizer;
    /**
     * Get statistics about the extractors in this tokenizer
     */
    getExtractorStats(): {
        total: number;
        withStrings: number;
        withoutStrings: number;
        byTokenType: Record<string, number>;
    };
}
/**
 * Utility functions for creating custom regex patterns
 */
export declare class RegexPatternBuilder {
    /**
     * Create a pattern that matches alternative punctuation
     * @param base Base pattern
     * @param charMap Map of characters to their alternatives
     */
    static withAlternativePunctuation(base: string, charMap: Record<string, string>): string;
    /**
     * Create a flexible reporter pattern that accepts various separators
     * @param reporterParts Array of reporter parts (e.g., ['U', 'S'])
     * @param separators Allowed separators (e.g., '[.,]')
     */
    static flexibleReporter(reporterParts: string[], separators?: string): string;
    /**
     * Create a pattern for optional elements
     * @param pattern Pattern to make optional
     * @param greedy Whether to use greedy matching
     */
    static optional(pattern: string, greedy?: boolean): string;
    /**
     * Create a pattern for year ranges
     * @param allowPartialYears Whether to allow 2-digit years
     */
    static yearPattern(allowPartialYears?: boolean): string;
    /**
     * Create a volume pattern with optional leading zeros
     */
    static volumePattern(): string;
    /**
     * Create a page pattern with various formats
     * @param allowRanges Whether to allow page ranges
     * @param allowRoman Whether to allow Roman numerals
     */
    static pagePattern(allowRanges?: boolean, allowRoman?: boolean): string;
}
//# sourceMappingURL=custom.d.ts.map