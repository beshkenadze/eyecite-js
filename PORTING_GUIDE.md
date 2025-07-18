# Python to TypeScript Porting Guide for eyecite

This guide documents the patterns and conventions used when porting eyecite from Python to TypeScript. Use this guide when updating the TypeScript port to match changes in the original Python codebase.

## General Principles

1. **Maintain API Compatibility**: Keep the same class names, method names, and general structure as the Python code
2. **Use TypeScript Features**: Leverage TypeScript's type system for better type safety
3. **Follow JavaScript/TypeScript Conventions**: Use camelCase for variables/functions, PascalCase for classes
4. **Use Modern JavaScript**: Use ES modules, arrow functions, destructuring, etc.

## Type Conversions

### Basic Types
- `str` → `string`
- `int` / `float` → `number`
- `bool` → `boolean`
- `None` → `null` or `undefined`
- `dict` → `Record<string, T>` or interface
- `list` → `Array<T>` or `T[]`
- `tuple` → `[T1, T2, ...]` or readonly tuple
- `set` → `Set<T>`
- `Any` → `any` (use sparingly)

### Optional Types
- `Optional[T]` → `T | undefined` or `T?` in interfaces
- `Union[T1, T2]` → `T1 | T2`

## Class Conversions

### Python Dataclasses
Python:
```python
@dataclass(eq=True, frozen=True)
class Reporter:
    short_name: str
    name: str
    cite_type: str
    source: str
    is_scotus: bool = False
```

TypeScript:
```typescript
export interface Reporter {
  shortName: string
  name: string
  citeType: string
  source: 'reporters' | 'laws' | 'journals'
  isScotus: boolean
}

export function createReporter(
  shortName: string,
  name: string,
  citeType: string,
  source: 'reporters' | 'laws' | 'journals',
): Reporter {
  const isScotus = (citeType === 'federal' && name.toLowerCase().includes('supreme')) ||
    citeType.toLowerCase().includes('scotus')
  
  return { shortName, name, citeType, source, isScotus }
}
```

### Abstract Base Classes
Python:
```python
class CitationBase:
    def __init__(self, token, index):
        self.token = token
        self.index = index
    
    @abstractmethod
    def hash(self) -> str:
        pass
```

TypeScript:
```typescript
export abstract class CitationBase {
  token: Token
  index: number

  constructor(token: Token, index: number) {
    this.token = token
    this.index = index
  }

  abstract hash(): string
}
```

## Property Conversions

### Python Properties
Python:
```python
@property
def compiled_regex(self):
    if not hasattr(self, "_compiled_regex"):
        self._compiled_regex = re.compile(self.regex, flags=self.flags)
    return self._compiled_regex
```

TypeScript:
```typescript
private _compiledRegex?: RegExp

get compiledRegex(): RegExp {
  if (!this._compiledRegex) {
    let jsFlags = 'g'
    if (this.flags & 2) jsFlags += 'i'
    this._compiledRegex = new RegExp(this.regex, jsFlags)
  }
  return this._compiledRegex
}
```

## Method Conversions

### Static Methods
Python:
```python
@staticmethod
def from_match(m, extra, offset=0):
    return Token(m[1], m.start() + offset, m.end() + offset)
```

TypeScript:
```typescript
static fromMatch(match: RegExpExecArray, extra: Record<string, any>, offset = 0): Token {
  const [start, end] = [match.index! + offset, match.index! + match[0].length + offset]
  return new Token(match[1] || match[0], start, end)
}
```

## Regular Expression Conversions

### Python re Module Flags
- `re.I` (2) → `'i'` flag
- `re.M` (8) → `'m'` flag  
- `re.S` (16) → `'s'` flag
- `re.VERBOSE` → Remove whitespace and comments manually

### Regex Patterns
Python:
```python
MONTH_REGEX = r"""
    (?P<month>
        January|Jan\.|
        February|Feb\.
    )
"""
```

TypeScript:
```typescript
export const MONTH_REGEX = `
    (?P<month>
        January|Jan\\.|
        February|Feb\\.
    )
`.replace(/\s+/g, ' ')
```

Note: JavaScript doesn't support named capture groups with `(?P<name>)` syntax. Use `(?<name>)` instead or handle groups by index.

## Import/Export Conversions

Python:
```python
from eyecite.models import Token, CitationBase
from typing import Optional, List
```

TypeScript:
```typescript
import { Token, CitationBase } from './models'
import type { Token as TokenType } from './models'  // for type-only imports
```

## Common Patterns

### Dictionary/Object Creation
Python:
```python
groups = m.groupdict()
metadata = {"year": year, "court": court}
```

TypeScript:
```typescript
const groups: Groups = {}
if (match.groups) {
  Object.assign(groups, match.groups)
}
const metadata = { year, court }
```

### List Comprehensions
Python:
```python
editions = [e for e in editions if e.includes_year(year)]
```

TypeScript:
```typescript
const editions = editions.filter(e => includesYear(e, year))
```

### String Formatting
Python:
```python
f"{plaintiff} v. {defendant}, {citation}"
```

TypeScript:
```typescript
`${plaintiff} v. ${defendant}, ${citation}`
```

### Exception Handling
Python:
```python
try:
    result = process()
except ValueError:
    return None
```

TypeScript:
```typescript
try {
  const result = process()
} catch (error) {
  return null
}
```

## Specific eyecite Patterns

### Token Merging
Both Python and TypeScript versions implement token merging similarly, but TypeScript uses strict equality for type checking:

```typescript
if (this.constructor === other.constructor) {
  // merge logic
}
```

### Hash Functions
Python uses `hashlib.sha256` → TypeScript uses Node.js `crypto.createHash('sha256')`

### Unique Object Identity
Python: `id(self)` → TypeScript: `` `unique-${Date.now()}-${Math.random()}` ``

## File Structure

```
eyecite-js/
├── src/
│   ├── models/
│   │   ├── base.ts       # Base classes and interfaces
│   │   ├── citations.ts  # All citation types
│   │   ├── reporters.ts  # Reporter/Edition types
│   │   ├── tokens.ts     # Token classes
│   │   └── index.ts      # Barrel export
│   ├── tokenizers/
│   │   ├── base.ts       # Base tokenizer
│   │   └── index.ts      # Tokenizer implementations
│   ├── regexes.ts        # All regex patterns
│   └── index.ts          # Main entry point
```

## Testing Considerations

1. Use Bun's built-in test runner
2. Test file naming: `*.test.ts`
3. Import test utilities: `import { describe, expect, test } from 'bun:test'`

## Dependencies

Map Python dependencies to TypeScript equivalents:
- `reporters_db` → Local JSON data or separate npm package
- `courts_db` → Local JSON data or separate npm package
- `pyahocorasick` → Native JS implementation or alternative
- `hyperscan` → WebAssembly port or alternative
- `lxml` → `htmlparser2` or `cheerio`
- `diff-match-patch` → `diff-match-patch` npm package

## Notes on Incomplete Features

When porting incomplete features, add TODO comments:
```typescript
// TODO: Implement when porting helpers module
// Python: add_law_metadata(self, document.words)
```

## Maintaining Compatibility

1. Keep the same public API surface
2. Document any necessary deviations
3. Add tests to ensure behavior matches Python version
4. Use the same test cases from Python when possible