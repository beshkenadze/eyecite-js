import { Token } from './base';
import type { Edition } from './reporters';
export declare class CitationToken extends Token {
    exactEditions: Edition[];
    variationEditions: Edition[];
    short: boolean;
    constructor(data: string, start: number, end: number, groups?: {}, extra?: any);
    merge(other: Token): Token | null;
}
export declare class SectionToken extends Token {
}
export declare class SupraToken extends Token {
}
export declare class IdToken extends Token {
}
export declare class ParagraphToken extends Token {
}
export declare class StopWordToken extends Token {
    static fromMatch(match: RegExpExecArray, extra: Record<string, any>, offset?: number): Token;
}
export declare class PlaceholderCitationToken extends Token {
}
export declare class CaseReferenceToken extends Token {
}
export declare class LawCitationToken extends Token {
    reporter: string;
    lawType: string;
    constructor(data: string, start: number, end: number, groups?: {}, extra?: any);
    static fromMatch(match: RegExpExecArray, extra: Record<string, any>, offset?: number): Token;
}
export declare class JournalCitationToken extends Token {
    journal: string;
    journalName: string;
    constructor(data: string, start: number, end: number, groups?: {}, extra?: any);
    static fromMatch(match: RegExpExecArray, extra: Record<string, any>, offset?: number): Token;
}
//# sourceMappingURL=tokens.d.ts.map