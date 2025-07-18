# Markup Support Status for Reference Citations

## Overview

This document summarizes the current status of markup/HTML support for reference citation extraction in the TypeScript port of eyecite, specifically regarding the `test_reference_extraction_from_markup` test that was ported from Python.

## What Has Been Implemented

### ✅ Core Infrastructure
- **`getCitations` function**: Supports `markupText` parameter
- **HTML cleaning**: `cleanText` function with "html" and "all_whitespace" cleaning steps
- **ReferenceCitation class**: Fully implemented with proper filtering and metadata support
- **Case name extraction from HTML**: `findCaseNameInHtml` function exists and is functional
- **Basic HTML parsing**: Uses `htmlparser2` for HTML structure analysis

### ✅ Test Infrastructure
- **Ported test cases**: Two comprehensive test cases added to `/Users/akira/Projects/eyecite/eyecite-js/tests/find.test.ts`:
  1. `should extract references from markup text` - Tests basic markup-based reference extraction
  2. `should filter out ReferenceCitation that overlap other citations` - Tests overlap filtering with HTML markup

## What Is Missing

### ❌ Markup-Based Reference Extraction
The key missing piece is the `findReferenceCitationsFromMarkup` function. Currently in `/Users/akira/Projects/eyecite/eyecite-js/src/find.ts`, there's a TODO comment:

```typescript
if (document.markupText) {
  // TODO: Implement markup-based reference citation extraction
  // referenceCitations.push(...findReferenceCitationsFromMarkup(document, [citation]))
}
```

### Required Implementation Steps

1. **Create `findReferenceCitationsFromMarkup` function**:
   - Should extract case names from HTML tags (like `<i>`, `<em>`)
   - Should handle case names split across multiple HTML tags
   - Should generate reference citation patterns based on extracted case names
   - Should integrate with existing `extractPincitedReferenceCitations` logic

2. **HTML emphasis tag processing**:
   - Parse `<i>`, `<em>`, and similar emphasis tags
   - Extract case names that might be split across tag boundaries
   - Handle cases where plaintiff and defendant are in separate tags

3. **Integration with existing pipeline**:
   - Ensure markup-based references don't conflict with plain text extraction
   - Maintain proper span tracking for annotation purposes
   - Apply existing filtering logic to prevent overlaps

## Test Cases Details

### Test 1: Basic Markup Reference Extraction
**Input**: HTML with `<i>` tags containing case names like "Bae", "Halper"
**Expected**: Should find 5 reference citations in order: ["Bae", "Halper", "Bae", "Bae", "Halper"]
**Current Status**: Skipped - would fail without markup extraction implementation

### Test 2: Overlap Filtering with Markup
**Input**: HTML with various citation patterns that should NOT produce reference citations when they overlap with supra citations or full case citations
**Expected**: No reference citations should be found due to overlaps
**Current Status**: Skipped - depends on markup extraction implementation

## Python Reference Implementation

The Python implementation in `/Users/akira/Projects/eyecite/tests/test_FindTest.py` (line 1228) provides the expected behavior:

```python
citations = get_citations(
    markup_text=markup_text, clean_steps=["html", "all_whitespace"]
)
references = [c for c in citations if isinstance(c, ReferenceCitation)]
```

## Next Steps

To complete markup support for reference citations:

1. **Implement `findReferenceCitationsFromMarkup`** in `/Users/akira/Projects/eyecite/eyecite-js/src/find.ts`
2. **Add HTML emphasis tag extraction** to the document processing pipeline
3. **Update the TODO** in `extractReferenceCitations` function
4. **Enable the skipped tests** and verify they pass
5. **Add additional test cases** for edge cases like:
   - Case names split across multiple HTML tags
   - Mixed HTML and plain text patterns
   - Complex nested HTML structures

## Current Workaround

Until markup-based reference extraction is implemented, users should:
1. Clean HTML markup using `cleanText(markupText, ['html', 'all_whitespace'])`
2. Use the cleaned plain text for citation extraction
3. Note that some references found in HTML structure may be missed

## Files Modified

- `/Users/akira/Projects/eyecite/eyecite-js/tests/find.test.ts`: Added two comprehensive test cases for markup-based reference extraction (currently skipped)