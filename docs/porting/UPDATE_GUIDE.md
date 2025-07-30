# Update Guide: Syncing TypeScript Port with Python eyecite

This guide provides step-by-step instructions for updating the TypeScript port when the original Python eyecite repository receives updates.

## Prerequisites

1. Have both repositories cloned:
   - Python: https://github.com/freelawproject/eyecite
   - TypeScript: Your eyecite-js repository

2. Tools needed:
   - Git for tracking changes
   - Python environment to test original functionality
   - Bun.sh for TypeScript development

## Update Process

### 1. Identify Changes

```bash
# In the Python eyecite repository
git fetch origin
git log --oneline HEAD..origin/main

# View detailed changes
git diff HEAD..origin/main
```

### 2. Categorize Changes

Review changes and categorize them:

- **Core Model Changes**: Changes to classes in `models.py`
- **Tokenizer Changes**: Updates to `tokenizers.py`
- **Regex Changes**: Modifications to `regexes.py`
- **Algorithm Changes**: Updates to `find.py`, `resolve.py`, `annotate.py`, `clean.py`
- **Test Changes**: New or modified tests
- **Dependency Updates**: Changes to `reporters_db`, `courts_db`, etc.

### 3. Update TypeScript Code

#### For Model Changes

1. **Check dataclass modifications**:
   ```python
   # Python change
   @dataclass
   class Citation:
       new_field: str = ""
   ```
   
   ```typescript
   // TypeScript update
   export class Citation {
     newField: string = ""
   }
   ```

2. **Update interfaces if needed**:
   ```typescript
   export interface CitationData {
     newField?: string
   }
   ```

#### For Tokenizer Changes

1. **New token types**:
   ```python
   # Python
   class NewToken(Token):
       pass
   ```
   
   ```typescript
   // TypeScript
   export class NewToken extends Token {}
   ```

2. **Extractor updates**:
   ```python
   # Python
   TokenExtractor(
       NEW_REGEX,
       NewToken.from_match,
       flags=re.I
   )
   ```
   
   ```typescript
   // TypeScript
   new BaseTokenExtractor(
     NEW_REGEX,
     NewToken,
     {},
     2, // re.I = 2
     []
   )
   ```

#### For Regex Changes

1. **Convert Python raw strings**:
   ```python
   # Python
   REGEX = r"""
       (?P<group>pattern)
   """
   ```
   
   ```typescript
   // TypeScript
   export const REGEX = `
       (?<group>pattern)
   `.replace(/\s+/g, ' ')
   ```

2. **Handle named groups**:
   - Replace `(?P<name>)` with `(?<name>)` or use numbered groups
   - Update token extraction logic if needed

#### For Algorithm Changes

1. **Method signatures**:
   ```python
   # Python
   def process(self, text: str, clean_steps: List[str] = None) -> List[Citation]:
   ```
   
   ```typescript
   // TypeScript
   process(text: string, cleanSteps?: string[]): Citation[]
   ```

2. **Python-specific constructs**:
   - List comprehensions → `filter()`, `map()`
   - Generator functions → Regular functions or async generators
   - `defaultdict` → `Map` with default value logic

### 4. Update Tests

1. **Convert Python tests**:
   ```python
   # Python
   def test_citation_extraction(self):
       text = "1 U.S. 1"
       citations = get_citations(text)
       self.assertEqual(len(citations), 1)
   ```
   
   ```typescript
   // TypeScript
   test('citation extraction', () => {
     const text = '1 U.S. 1'
     const citations = getCitations(text)
     expect(citations).toHaveLength(1)
   })
   ```

2. **Maintain test data compatibility**:
   - Keep the same test strings
   - Ensure expected results match

### 5. Handle Dependencies

#### reporters_db Updates

1. Check for new reporters or changes to existing ones
2. Update local data files or npm package
3. Ensure regex patterns are correctly converted

#### courts_db Updates

1. Update court mappings
2. Verify court detection logic

### 6. Validate Updates

1. **Run all tests**:
   ```bash
   bun test
   ```

2. **Type checking**:
   ```bash
   bun run typecheck
   ```

3. **Linting**:
   ```bash
   bun run check
   ```

4. **Compare outputs**:
   - Run the same text through both Python and TypeScript versions
   - Ensure citation extraction results match

## Common Pitfalls

### 1. Regex Differences

- JavaScript regex doesn't support all Python features
- Lookahead/lookbehind syntax may differ
- Unicode handling differences

### 2. Type Safety

- Python's dynamic typing vs TypeScript's static typing
- Need to handle `None` → `null`/`undefined` carefully
- Type narrowing for union types

### 3. Module System

- Python's module imports vs ES modules
- Circular dependency handling

### 4. Performance Considerations

- Python's `re.compile()` caching vs JavaScript RegExp
- Different string handling performance characteristics

## Regression Testing

Create a test suite that runs the same inputs through both versions:

```typescript
// regression.test.ts
import { getCitations as getCitationsTS } from '../src'
import { execSync } from 'child_process'

test('regression: basic citation', () => {
  const text = '1 U.S. 1'
  
  // Run Python version
  const pythonResult = JSON.parse(
    execSync(`python -c "
import json
from eyecite import get_citations
citations = get_citations('${text}')
print(json.dumps([c.corrected_citation() for c in citations]))
"`)
  )
  
  // Run TypeScript version
  const tsResult = getCitationsTS(text).map(c => c.correctedCitation())
  
  expect(tsResult).toEqual(pythonResult)
})
```

## Documentation Updates

1. Update CHANGELOG.md with ported changes
2. Note any deviations from Python behavior
3. Update API documentation if interfaces change

## Version Alignment

Consider using the same version numbers as the Python package with a TypeScript-specific suffix:

```json
{
  "version": "2.7.6-ts.1"
}
```

This indicates:
- Base version 2.7.6 (matching Python)
- TypeScript port revision 1