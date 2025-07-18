import type { TokenExtractor } from './base';
import { Tokenizer } from './base';
export declare class DefaultTokenizer extends Tokenizer {
    constructor();
}
export declare const defaultTokenizer: DefaultTokenizer;
export declare function createDefaultTokenizer(): DefaultTokenizer;
export declare class AhocorasickTokenizer extends Tokenizer {
    private unfilteredExtractors;
    private caseSensitiveStrings;
    private caseInsensitiveStrings;
    constructor(extractors?: TokenExtractor[]);
    /**
     * Rebuild the string mapping after extractors have been modified
     */
    private rebuildStringMaps;
    /**
     * Override addExtractor to rebuild string maps
     */
    addExtractor(extractor: TokenExtractor): void;
    /**
     * Override addExtractors to rebuild string maps
     */
    addExtractors(extractors: TokenExtractor[]): void;
    /**
     * Override removeExtractor to rebuild string maps
     */
    removeExtractor(extractor: TokenExtractor): boolean;
    /**
     * Override removeExtractors to rebuild string maps
     */
    removeExtractors(predicate: (extractor: TokenExtractor) => boolean): number;
    /**
     * Override setExtractors to rebuild string maps
     */
    setExtractors(extractors: TokenExtractor[]): void;
    /**
     * Override clearExtractors to rebuild string maps
     */
    clearExtractors(): void;
    /**
     * Override modifyExtractorPatterns to rebuild string maps
     */
    modifyExtractorPatterns(modifier: (regex: string, extractor: TokenExtractor) => string, filter?: (extractor: TokenExtractor) => boolean): void;
    getExtractors(text: string): TokenExtractor[];
}
//# sourceMappingURL=default.d.ts.map