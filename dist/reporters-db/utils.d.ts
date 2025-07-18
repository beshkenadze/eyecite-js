/**
 * Utilities for processing reporter variables and patterns
 */
/**
 * Process variables in regex patterns
 * Replace template variables with their values
 */
export declare function processVariables(pattern: string, variables: Record<string, string>): string;
/**
 * Recursively substitute variables in patterns
 * Handles nested variable references
 */
export declare function recursiveSubstitute(pattern: string, variables: Record<string, string>, maxDepth?: number): string;
/**
 * Build regex pattern for reporter citations
 */
export declare function buildReporterRegex(reporters: string[], pageVar?: string, volumeVar?: string): string;
/**
 * Normalize reporter string for comparison
 */
export declare function normalizeReporter(reporter: string): string;
//# sourceMappingURL=utils.d.ts.map