/**
 * TypeScript implementation of reporters-db
 * Using actual data from Free Law Project
 */
export interface Edition {
    name?: string;
    start?: string | null;
    end?: string | null;
}
export interface Reporter {
    name: string;
    cite_type: 'federal' | 'state' | 'specialty' | 'neutral' | 'scotus_early';
    editions: Record<string, Edition>;
    variations?: Record<string, string>;
    mlz_jurisdiction?: string[];
    publisher?: string;
    examples?: string[];
}
export interface Court {
    id: string;
    name: string;
    citation_string: string;
    regex?: string;
    dates?: Array<{
        start?: string;
        end?: string | null;
    }>;
    system?: string;
    level?: string;
    type?: string;
}
export declare const REPORTERS: Record<string, Reporter[]>;
export declare const COURTS: Court[];
export declare const STATE_ABBREVIATIONS: Record<string, string>;
export declare const CASE_NAME_ABBREVIATIONS: Record<string, string[]>;
export declare const LAWS: Record<string, any>;
export declare const JOURNALS: Record<string, any>;
export declare const RAW_REGEX_VARIABLES: Record<string, string>;
export declare const VARIATIONS_ONLY: Record<string, string>;
export declare const EDITIONS: Record<string, Reporter>;
export declare const ALL_REPORTERS: Set<string>;
//# sourceMappingURL=index.d.ts.map