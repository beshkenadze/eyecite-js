# Nominative Reporter Overlaps

This document explains how the TypeScript implementation handles cases where party names in legal citations might be confused with reporter abbreviations.

## Overview

Legal citations often contain party names that look like reporter abbreviations. For example:
- "A." as a party name vs "A." as Atlantic Reporter
- "So." as abbreviation in party name vs "So." as Southern Reporter
- State abbreviations like "Mass." or "Cal." that could be confused with reporters

The parser must correctly distinguish between:
1. Actual reporter abbreviations (e.g., "U.S.", "F.2d", "A.3d")
2. Party names that happen to look like reporters
3. Short forms where antecedent names might look like reporters

## Implementation Details

### Key Components

1. **Tokenizer**: The tokenizer identifies potential reporter patterns in the text but doesn't make final decisions about whether they're actually reporters or party names.

2. **Citation Extraction**: During citation extraction, the parser looks for the reporter pattern and extracts the surrounding context.

3. **Case Name Extraction**: The `findCaseName` function in `helpers.ts` attempts to extract plaintiff and defendant names from the text preceding the citation.

### Current Behavior

The TypeScript implementation handles nominative reporter overlaps with the following behavior:

1. **"In re" Cases**: Correctly identifies citations like "In re Cooke, 93 Wn. App. 526"
   - Extracts "Cooke" as the defendant
   - Does not mistake "Wn. App." for a party name

2. **Spaced Reporters**: Handles variations like "U. S." (with spaces) correctly
   - "Shapiro v. Thompson, 394 U. S. 618" correctly identifies "U. S." as the reporter

3. **Short Forms**: Properly identifies short form citations
   - "Gilmer, 500 U.S. at 25" is recognized as a short citation with "Gilmer" as the antecedent

4. **Abbreviated Party Names**: Has limitations with party names that look like reporters
   - "A. v. B., 123 U.S. 456" - may not extract "A." as plaintiff due to reporter confusion
   - "Smith So. v. Jones, 123 F.2d 456" - may only extract defendant

### Limitations

The current implementation has some limitations compared to the Python version:

1. **Pin Cite Extraction**: Citations like "93 Wn. App. 526, 529" may not extract "529" as a pin cite if it appears to be a parallel citation.

2. **Party Name Extraction**: When party names strongly resemble reporter abbreviations, they may not be extracted as plaintiff names:
   - Single letters with periods (A., B., etc.)
   - Common abbreviations that match reporter patterns

3. **Complex Corporate Names**: Names with multiple abbreviations like "A.B.C. Corp." may only partially extract.

## Test Cases

The test suite includes comprehensive coverage of nominative reporter overlap scenarios:

```typescript
// Basic "In re" case
'In re Cooke, 93 Wn. App. 526, 529'

// Spaced reporter variations
'Shapiro v. Thompson, 394 U. S. 618'

// State names that could be reporters
'Connecticut v. Holmes, 221 A.3d 407'

// Complex reporter formats
'Kern v Taney, 11 Pa. D. & C.5th 558'

// Year-first formats
'Ellenburg v. Chase, 2004 MT 66'

// Short forms
'Gilmer, 500 U.S. at 25;'

// Edge cases with abbreviated party names
'A. v. B., 123 U.S. 456'
'Mass. Electric v. Cal. Power, 123 F.2d 456'
```

## Future Improvements

To better handle nominative reporter overlaps, future improvements could include:

1. **Enhanced Context Analysis**: Use more context to determine if an abbreviation is likely a party name or reporter.

2. **Party Name Dictionary**: Maintain a list of common party name patterns that should not be treated as reporters.

3. **Improved Pin Cite Detection**: Better distinguish between parallel citations and pin cites in comma-separated lists.

4. **Machine Learning**: Use ML models trained on legal texts to better identify party names vs reporters based on context.