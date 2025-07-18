import { CitationBase, type Document, type Metadata, type Token } from './base';
import { type Edition } from './reporters';
export declare const REPORTERS_THAT_NEED_PAGE_CORRECTION: Set<string>;
export declare abstract class ResourceCitation extends CitationBase {
    exactEditions: Edition[];
    variationEditions: Edition[];
    allEditions: Edition[];
    editionGuess?: Edition;
    year?: number;
    constructor(token: Token, index: number, exactEditions?: Edition[], variationEditions?: Edition[], metadata?: Partial<Metadata>);
    hash(): string;
    addMetadata(document: Document): void;
    dump(): Record<string, any>;
    correctedReporter(): string;
    correctedCitation(): string;
    correctedPage(): string | undefined;
    guessEdition(): void;
}
export declare abstract class FullCitation extends ResourceCitation {
}
export declare class FullLawCitation extends FullCitation {
    correctedCitationFull(): string;
}
export declare class FullJournalCitation extends FullCitation {
    get reporter(): string;
    get volume(): string;
    get page(): string;
    correctedReporter(): string;
    correctedCitationFull(): string;
}
export declare class CaseCitation extends ResourceCitation {
    get volume(): string;
    get reporter(): string;
    get page(): string;
    hash(): string;
    guessCourt(): void;
}
export declare class FullCaseCitation extends CaseCitation {
    isParallelCitation(preceding: CaseCitation): void;
    addMetadata(document: Document): void;
    correctedCitationFull(): string;
}
export declare class ShortCaseCitation extends CaseCitation {
    short: boolean;
    correctedCitationFull(): string;
}
export declare class SupraCitation extends CitationBase {
    hash(): string;
    formatted(): string;
}
export declare class IdCitation extends CitationBase {
    hash(): string;
    formatted(): string;
}
export declare class ReferenceCitation extends CitationBase {
    static nameFields: string[];
    hash(): string;
}
export declare class UnknownCitation extends CitationBase {
    hash(): string;
}
//# sourceMappingURL=citations.d.ts.map