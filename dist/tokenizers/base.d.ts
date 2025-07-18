import type { Token, Tokens } from '../models';
export interface TokenExtractor {
    regex: string;
    tokenConstructor: typeof Token;
    extra: Record<string, any>;
    flags?: number;
    strings?: string[];
    compiledRegex?: RegExp;
    getMatches(text: string): RegExpExecArray[];
    getToken(match: RegExpExecArray, offset?: number): Token;
}
export declare class BaseTokenExtractor implements TokenExtractor {
    regex: string;
    tokenConstructor: typeof Token;
    extra: Record<string, any>;
    flags: number;
    strings: string[];
    private _compiledRegex?;
    constructor(regex: string, tokenConstructor: typeof Token, extra?: Record<string, any>, flags?: number, strings?: string[]);
    get compiledRegex(): RegExp;
    getMatches(text: string): RegExpExecArray[];
    getToken(match: RegExpExecArray, offset?: number): Token;
}
export declare abstract class Tokenizer {
    extractors: TokenExtractor[];
    constructor(extractors?: TokenExtractor[]);
    /**
     * Add a new extractor to the tokenizer
     * @param extractor The extractor to add
     */
    addExtractor(extractor: TokenExtractor): void;
    /**
     * Add multiple extractors to the tokenizer
     * @param extractors Array of extractors to add
     */
    addExtractors(extractors: TokenExtractor[]): void;
    /**
     * Remove an extractor from the tokenizer
     * @param extractor The extractor to remove
     * @returns true if the extractor was removed, false if not found
     */
    removeExtractor(extractor: TokenExtractor): boolean;
    /**
     * Remove extractors based on a filter function
     * @param predicate Function that returns true for extractors to remove
     * @returns number of extractors removed
     */
    removeExtractors(predicate: (extractor: TokenExtractor) => boolean): number;
    /**
     * Clear all extractors
     */
    clearExtractors(): void;
    /**
     * Get a copy of all extractors
     */
    getExtractorsCopy(): TokenExtractor[];
    /**
     * Replace all extractors with new ones
     * @param extractors New extractors to use
     */
    setExtractors(extractors: TokenExtractor[]): void;
    /**
     * Modify regex patterns in existing extractors
     * @param modifier Function that takes the current regex and returns a new one
     * @param filter Optional filter to only modify specific extractors
     */
    modifyExtractorPatterns(modifier: (regex: string, extractor: TokenExtractor) => string, filter?: (extractor: TokenExtractor) => boolean): void;
    /**
     * Find extractors by regex pattern
     * @param pattern Regular expression or string to match against extractor regex
     * @returns Array of matching extractors
     */
    findExtractorsByPattern(pattern: string | RegExp): TokenExtractor[];
    /**
     * Find extractors by strings they match
     * @param searchString String to look for in extractor strings
     * @returns Array of matching extractors
     */
    findExtractorsByString(searchString: string): TokenExtractor[];
    tokenize(text: string): [Tokens, Array<[number, Token]>];
    getExtractors(text: string): TokenExtractor[];
    extractTokens(text: string): Generator<Token>;
    static appendText(tokens: Tokens, text: string): void;
}
//# sourceMappingURL=base.d.ts.map