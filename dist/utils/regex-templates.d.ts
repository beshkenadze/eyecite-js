/**
 * Utilities for processing regex templates
 * Based on Python's eyecite regex processing
 */
/**
 * Recursively substitute template variables in a pattern
 * Handles nested variable references like $reporter, $law_section, etc.
 */
export declare function recursiveSubstitute(pattern: string, variables: Record<string, string>, maxDepth?: number): string;
/**
 * Get regex variables with law-specific processing
 */
export declare function getLawRegexVariables(): Record<string, string>;
/**
 * Expand a law citation regex pattern with template substitution
 */
export declare function expandLawRegex(pattern: string, reporterName: string): string;
/**
 * Create a law citation extractor regex
 */
export declare function createLawCitationRegex(reporterName: string, patterns: string[]): string[];
//# sourceMappingURL=regex-templates.d.ts.map