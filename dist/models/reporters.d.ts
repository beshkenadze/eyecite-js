export interface ReporterInterface {
    shortName: string;
    name: string;
    citeType: string;
    source: 'reporters' | 'laws' | 'journals';
    isScotus: boolean;
}
export declare class Reporter implements ReporterInterface {
    shortName: string;
    name: string;
    citeType: string;
    source: 'reporters' | 'laws' | 'journals';
    isScotus: boolean;
    constructor(citeType: string, name: string, shortName: string, editionName: string, start?: string, end?: string, isScotus?: boolean, mlzJurisdiction?: string[]);
}
export interface Edition {
    reporter: Reporter;
    reporterFound?: string;
    shortName?: string;
    start?: Date | null;
    end?: Date | null;
}
/**
 * Validates if a given year falls within the publication range of a reporter edition.
 * Handles edge cases including ongoing publications, future dates, and invalid years.
 *
 * @param edition - The reporter edition with optional start and end dates
 * @param year - The year to validate (should be a 4-digit year)
 * @returns true if the year is valid for this edition, false otherwise
 */
export declare function includesYear(edition: Edition, year: number): boolean;
/**
 * Validates a year range string (e.g., "1982-83", "2005-06") and returns the start and end years.
 *
 * @param yearRange - The year range string to parse
 * @returns Object with startYear, endYear, and isValid properties
 */
export declare function parseYearRange(yearRange: string): {
    startYear: number | null;
    endYear: number | null;
    isValid: boolean;
};
/**
 * Validates if a year range is valid for a given reporter edition.
 *
 * @param edition - The reporter edition
 * @param yearRange - The year range string
 * @returns true if the year range is valid for this edition
 */
export declare function includesYearRange(edition: Edition, yearRange: string): boolean;
/**
 * Validates month and day information in a date string.
 *
 * @param dateStr - Date string that may contain month and day information
 * @returns Object with validation results and warnings
 */
export declare function validateDateComponents(dateStr: string): {
    isValid: boolean;
    warnings: string[];
    month?: number;
    day?: number;
    year?: number;
};
/**
 * Clears the date validation cache. Useful for testing or memory management.
 */
export declare function clearDateValidationCache(): void;
/**
 * Creates a reporter instance with the given parameters.
 */
export declare function createReporter(shortName: string, name: string, citeType: string, source: 'reporters' | 'laws' | 'journals'): Reporter;
export declare function createEdition(reporter: Reporter, shortName: string, start: Date | null, end: Date | null): Edition;
//# sourceMappingURL=reporters.d.ts.map