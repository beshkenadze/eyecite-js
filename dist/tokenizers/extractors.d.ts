import { type Edition } from '../models';
import { BaseTokenExtractor } from './base';
export declare const NOMINATIVE_REPORTER_NAMES: Set<string>;
export declare function tokenIsFromNominativeReporter(token: any): boolean;
export declare function createSpecialExtractors(): BaseTokenExtractor[];
export declare function createCitationExtractor(regex: string, exactEditions: Edition[], variationEditions: Edition[], strings: string[], short?: boolean): BaseTokenExtractor;
export declare function createLawCitationExtractor(regex: string, reporter: string, lawType: string, strings: string[]): BaseTokenExtractor;
export declare function createJournalCitationExtractor(regex: string, journal: string, journalName: string, strings: string[]): BaseTokenExtractor;
//# sourceMappingURL=extractors.d.ts.map