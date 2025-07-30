# Tax Court Citations Implementation Notes

## Summary

This document describes the implementation of Tax Court citation tests in TypeScript, ported from the Python `test_find_tc_citations` test method.

## Test Results

### ✅ Working Citations

The following Tax Court citation formats are correctly parsed by the current TypeScript implementation:

1. **Standard Tax Court** - `1 T.C. 1`
   - Uses standard volume-reporter-page format
   - Reporter: "T.C." (Reports of the United States Tax Court)

2. **Board of Tax Appeals** - `1 B.T.A. 1`
   - Uses standard volume-reporter-page format
   - Reporter: "B.T.A." (Reports of the United States Board of Tax Appeals)

3. **Tax Court No.** - `1 T.C. No. 233`
   - Uses standard volume-reporter-page format
   - Reporter: "T.C. No." (Tax Court Opinions - neutral citation)

### ❌ Not Yet Supported

The following Tax Court citation formats require special handling not yet implemented in TypeScript:

1. **T.C. Memo.** - `T.C. Memo. 2019-233`
   - Uses atypical format: reporter year-page (no volume)
   - Reporter: "T.C. Memo." (Tax Court Memorandum Opinions)
   - Requires `$full_cite_year_page` regex pattern support

2. **T.C. Summary Opinion** - `T.C. Summary Opinion 2019-233`
   - Uses atypical format: reporter year-page (no volume)
   - Reporter: "T.C. Summary Opinion" (Tax Court Summary Opinions)
   - Requires `$full_cite_year_page` regex pattern support

## Implementation Requirements

To fully support the atypical Tax Court formats, the TypeScript implementation would need:

1. **Parse special regex patterns** from the `regexes` field in reporters.json
2. **Template variable support** to replace patterns like `$full_cite_year_page`
3. **Additional extractors** for non-standard citation formats

The `$full_cite_year_page` pattern would translate to something like:
```regex
(?<reporter>T\.C\. Memo\.)\s+(?<volume>\d{4})-(?<page>\d+)
```

Where the year (e.g., 2019) acts as the volume and is followed by a hyphen and page number.

## Data Sources

All Tax Court reporters are already present in `src/data/reporters.json`:
- T.C. (specialty, standard format)
- B.T.A. (specialty, standard format)
- T.C. No. (neutral, standard format)
- T.C. Memo. (neutral, special regex: `$full_cite_year_page`)
- T.C. Summary Opinion (neutral, special regex: `$full_cite_year_page`)

## Test Location

The Tax Court citation tests are located in:
`/Users/akira/Projects/eyecite/eyecite-js/tests/find.test.ts`

Look for the `describe('Tax Court Citations', ...)` block starting around line 1420.