# Migration Guide

## Migrating to v2.7.6-alpha.23

### Breaking Changes

The `getCitations()` function now uses an options object instead of individual parameters. While the old signature is still supported for backward compatibility, it is deprecated and will be removed in a future major version.

### Before (Deprecated)

```typescript
// Old way with individual parameters
const citations = getCitations(
  text,                    // text
  false,                   // removeAmbiguous
  customTokenizer,         // tokenizer
  '<p>Some HTML</p>',     // markupText
  ['strip_html'],         // cleanSteps
  'parent-only'           // overlapHandling
)

// Having to pass undefined for unused parameters
const citations = getCitations(text, false, undefined, '', undefined, 'parent-only')
```

### After (Recommended)

```typescript
// New way with options object
const citations = getCitations(text, {
  removeAmbiguous: false,
  tokenizer: customTokenizer,
  markupText: '<p>Some HTML</p>',
  cleanSteps: ['strip_html'],
  overlapHandling: 'parent-only'
})

// Much cleaner when you only need specific options
const citations = getCitations(text, { overlapHandling: 'parent-only' })
```

### TypeScript Types

The new types are available:

```typescript
import { getCitations, GetCitationsOptions, OverlapHandling } from '@beshkenadze/eyecite'

// Define your options with type safety
const options: GetCitationsOptions = {
  overlapHandling: 'parent-only',
  removeAmbiguous: true
}

const citations = getCitations(text, options)
```

### New Overlap Handling Feature

The `overlapHandling` option helps manage overlapping citations in multi-section references:

```typescript
const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'

// Get all citations (default)
const all = getCitations(text)
// Returns: 3 citations (full reference + 2 nested section numbers)

// Get only parent citations
const parentOnly = getCitations(text, { overlapHandling: 'parent-only' })
// Returns: 1 citation (just the full reference)

// Get only nested citations
const childrenOnly = getCitations(text, { overlapHandling: 'children-only' })
// Returns: 2 citations (just the individual section numbers)
```

### Migration Steps

1. **Update your imports** (if using TypeScript):
   ```typescript
   import { getCitations, GetCitationsOptions } from '@beshkenadze/eyecite'
   ```

2. **Convert function calls**:
   ```typescript
   // Old
   getCitations(text, true, myTokenizer)
   
   // New
   getCitations(text, { 
     removeAmbiguous: true, 
     tokenizer: myTokenizer 
   })
   ```

3. **Use the new overlap handling**:
   ```typescript
   // Prevent overlapping citations in your annotation logic
   const citations = getCitations(text, { overlapHandling: 'parent-only' })
   ```

### Backward Compatibility

The old signature is still supported through function overloading:

```typescript
// This still works but is deprecated
const citations = getCitations(text, false, undefined, '', undefined, 'parent-only')
```

We recommend updating to the new API as soon as possible, as the legacy signature will be removed in version 3.0.0.

### Need Help?

If you encounter any issues during migration, please:
- Check the [API documentation](README.md#-api-documentation)
- File an issue on [GitHub](https://github.com/beshkenadze/eyecite-js/issues)