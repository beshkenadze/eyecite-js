export interface Groups {
    [key: string]: string | undefined;
}
export interface Span {
    start: number;
    end: number;
}
export declare abstract class CitationBase {
    token: Token;
    index: number;
    spanStart?: number;
    spanEnd?: number;
    fullSpanStart?: number;
    fullSpanEnd?: number;
    groups: Groups;
    metadata: Metadata;
    document?: Document;
    constructor(token: Token, index: number, metadata?: Partial<Metadata>, spanStart?: number, spanEnd?: number, fullSpanStart?: number, fullSpanEnd?: number);
    toString(): string;
    correctedCitation(): string;
    correctedCitationFull(): string;
    dump(): Record<string, any>;
    matchedText(): string;
    span(): Span;
    spanWithPincite(): Span;
    fullSpan(): Span;
    abstract hash(): string;
}
export declare class Metadata {
    parenthetical?: string;
    pinCite?: string;
    pinCiteSpanStart?: number;
    pinCiteSpanEnd?: number;
    year?: string;
    month?: string;
    day?: string;
    court?: string;
    plaintiff?: string;
    defendant?: string;
    extra?: string;
    antecedentGuess?: string;
    resolvedCaseNameShort?: string;
    resolvedCaseName?: string;
    publisher?: string;
    volume?: string;
    constructor(data?: Partial<Metadata>);
}
export declare abstract class Token {
    data: string;
    start: number;
    end: number;
    groups: Groups;
    constructor(data: string, start: number, end: number, groups?: Groups);
    toString(): string;
    merge(other: Token): Token | null;
    static fromMatch(match: RegExpExecArray, extra: Record<string, any>, offset?: number): Token;
}
export type TokenOrStr = Token | string;
export type Tokens = TokenOrStr[];
export interface Document {
    plainText: string;
    markupText?: string;
    citationTokens: Array<[number, Token]>;
    words: Tokens;
    cleanSteps?: Array<string | ((text: string) => string)>;
    emphasisTags: Array<[string, number, number]>;
    sourceText: string;
    plainToMarkup?: any;
    markupToPlain?: any;
}
export declare class Resource {
    citation: any;
    constructor(citation: any);
    toString(): string;
}
export type ResourceType = any;
//# sourceMappingURL=base.d.ts.map