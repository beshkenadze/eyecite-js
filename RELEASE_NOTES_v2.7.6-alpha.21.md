# Release Notes - v2.7.6-alpha.21

## 🐛 Bug Fixes

### Multi-Section Law Citations Fixed
- **Issue**: Multi-section law citations (e.g., "29 C.F.R. §§ 778.113, 778.114, 778.115") were only returning one citation instead of separate citations for each section
- **Root Causes**:
  1. Incorrect span position calculation that created out-of-bounds positions
  2. Overlap detection logic was filtering out legitimate multi-section citations
- **Solution**: 
  - Fixed span calculation to find actual text positions for each section
  - Added special handling for multi-section law citations in the filtering logic

## ✨ New Features

### Enhanced Multi-Section Support
- Added `areMultiSectionLawCitations` helper function to properly identify related law citations
- Multi-section citations from the same law source are now preserved even when they have overlapping spans
- Each section in a multi-section citation now has accurate start/end positions

### New Test Coverage
- Added comprehensive test suite for multi-section law citation handling
- Tests cover C.F.R., U.S.C., and other law citation formats
- Tests include edge cases with parentheticals and section ranges

## 📊 Test Results
- **All 343 tests passing** ✅
- No regressions in existing functionality
- New tests added for multi-section law citations

## 🔧 Technical Details

### Files Modified
- `src/find.ts`: Enhanced `extractFromTokenizedSections` for accurate span calculation
- `src/helpers.ts`: Added `areMultiSectionLawCitations` and updated `filterCitations`
- `tests/multi-section-law.test.ts`: New comprehensive test suite

### Example
```typescript
const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'
const citations = getCitations(text)
// Returns 3 citations:
// 1. span [4, 42] - "29 C.F.R. §§ 778.113, 778.114, 778.115"
// 2. span [26, 33] - "778.114"
// 3. span [35, 42] - "778.115"
```

## 📦 Installation
```bash
npm install @beshkenadze/eyecite@2.7.6-alpha.21
```

## 🚀 Next Steps
This release fixes a critical issue with multi-section law citations. The library now correctly parses and returns separate citations for each section mentioned in a multi-section reference.