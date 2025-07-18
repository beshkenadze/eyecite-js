# Complex Pattern Conversions: Python to TypeScript

This document covers the most challenging patterns encountered when porting eyecite from Python to TypeScript.

## 1. Token Extraction and Regex Groups

### Problem
Python's regex groups and match object handling differs from JavaScript.

### Python Pattern
```python
def from_match(cls, m, extra, offset=0):
    start, end = m.span(1)
    return cls(m[1], start + offset, end + offset, groups=m.groupdict(), **extra)
```

### TypeScript Solution
```typescript
static fromMatch(match: RegExpExecArray, extra: Record<string, any>, offset = 0): Token {
  // Handle capture groups carefully
  const captureIndex = match.length > 1 && match[1] !== undefined ? 1 : 0
  const matchText = match[captureIndex]
  
  // Calculate position for captured group
  let start = (match.index || 0) + offset
  if (captureIndex > 0 && match[0]) {
    const captureOffset = match[0].indexOf(match[captureIndex])
    if (captureOffset > 0) {
      start += captureOffset
    }
  }
  
  const end = start + matchText.length
  return new this(matchText, start, end, groups, extra)
}
```

## 2. Dynamic Class Construction

### Problem
Python uses `**kwargs` and dynamic attribute assignment. TypeScript needs explicit typing.

### Python Pattern
```python
class CitationToken(Token):
    def __init__(self, *args, **kwargs):
        self.exact_editions = kwargs.pop('exact_editions', [])
        super().__init__(*args, **kwargs)
```

### TypeScript Solution
```typescript
export class CitationToken extends Token {
  exactEditions: Edition[] = []
  
  constructor(
    data: string,
    start: number,
    end: number,
    groups = {},
    extra: any = {},
  ) {
    super(data, start, end, groups)
    this.exactEditions = extra.exactEditions || []
  }
}
```

## 3. Python Dataclass with Post-Init

### Problem
Python's `__post_init__` modifies frozen dataclasses. TypeScript needs different approach.

### Python Pattern
```python
@dataclass(frozen=True)
class Reporter:
    cite_type: str
    is_scotus: bool = False
    
    def __post_init__(self):
        if "supreme" in self.name.lower():
            object.__setattr__(self, 'is_scotus', True)
```

### TypeScript Solution
```typescript
export interface Reporter {
  citeType: string
  isScotus: boolean
}

export function createReporter(name: string, citeType: string): Reporter {
  const isScotus = citeType === 'federal' && name.toLowerCase().includes('supreme')
  return { name, citeType, isScotus }
}
```

## 4. Complex Regex with Named Groups

### Problem
JavaScript doesn't support Python's `(?P<name>)` syntax.

### Python Pattern
```python
STOP_WORD_REGEX = r"""
    (?P<stop_word>
        v\.?|
        in\ re|
        see
    )
"""
```

### TypeScript Solution
```typescript
// Option 1: Use modern JS named groups
export const STOP_WORD_REGEX = '(?<stop_word>v\\.?|in re|see)'

// Option 2: Use indexed groups and track manually
export const STOP_WORD_REGEX = '(v\\.?|in re|see)'
// Then access as match[1] instead of match.groups.stop_word
```

## 5. Generator Functions and Yield

### Problem
Python generators with yield need different handling in TypeScript.

### Python Pattern
```python
def extract_tokens(self, text):
    for extractor in self.extractors:
        for match in extractor.get_matches(text):
            yield extractor.get_token(match)
```

### TypeScript Solution
```typescript
// Option 1: Generator function
*extractTokens(text: string): Generator<Token> {
  for (const extractor of this.extractors) {
    for (const match of extractor.getMatches(text)) {
      yield extractor.getToken(match)
    }
  }
}

// Option 2: Return array
extractTokens(text: string): Token[] {
  const tokens: Token[] = []
  for (const extractor of this.extractors) {
    for (const match of extractor.getMatches(text)) {
      tokens.push(extractor.getToken(match))
    }
  }
  return tokens
}
```

## 6. Property Decorators and Lazy Loading

### Problem
Python's `@property` decorator for lazy loading needs TypeScript getter.

### Python Pattern
```python
@property
def compiled_regex(self):
    if not hasattr(self, '_compiled_regex'):
        self._compiled_regex = re.compile(self.regex, self.flags)
    return self._compiled_regex
```

### TypeScript Solution
```typescript
private _compiledRegex?: RegExp

get compiledRegex(): RegExp {
  if (!this._compiledRegex) {
    // Convert Python flags to JS flags
    let jsFlags = 'g'
    if (this.flags & 2) jsFlags += 'i'  // re.I = 2
    if (this.flags & 8) jsFlags += 'm'  // re.M = 8
    this._compiledRegex = new RegExp(this.regex, jsFlags)
  }
  return this._compiledRegex
}
```

## 7. Dynamic String Construction for Regexes

### Problem
Python regex strings with re.VERBOSE need manual whitespace handling.

### Python Pattern
```python
PIN_CITE_REGEX = r"""
    (?P<pin_cite>
        ,?\ ?(?:at\ )?  # optional comma, space, "at"
        \d+             # page number
    )
"""
```

### TypeScript Solution
```typescript
export const PIN_CITE_REGEX = `
    (?<pin_cite>
        ,?\\ ?(?:at\\ )?  # optional comma, space, "at"
        \\d+              # page number
    )
`.replace(/\s+/g, ' ')  // Collapse whitespace
```

## 8. Type-Safe Token Type Checking

### Problem
Python's `isinstance()` needs TypeScript type guards.

### Python Pattern
```python
if isinstance(token, CitationToken):
    process_citation(token)
```

### TypeScript Solution
```typescript
// Use instanceof
if (token instanceof CitationToken) {
  processCitation(token)
}

// Or create type guard
function isCitationToken(token: Token): token is CitationToken {
  return token instanceof CitationToken
}
```

## 9. Default Dictionary Pattern

### Problem
Python's `defaultdict` needs manual implementation.

### Python Pattern
```python
from collections import defaultdict
editions_by_regex = defaultdict(lambda: {
    "editions": [],
    "variations": []
})
```

### TypeScript Solution
```typescript
const editionsByRegex = new Map<string, {
  editions: Edition[]
  variations: Edition[]
}>()

// Helper to get or create
function getOrCreate(key: string) {
  if (!editionsByRegex.has(key)) {
    editionsByRegex.set(key, {
      editions: [],
      variations: []
    })
  }
  return editionsByRegex.get(key)!
}
```

## 10. String-Based Tokenizer Optimization

### Problem
Python's pyahocorasick for string matching needs alternative.

### Python Pattern
```python
import ahocorasick

def make_ahocorasick_filter(items):
    text_filter = ahocorasick.Automaton()
    for string, extractor in items:
        text_filter.add_word(string, extractor)
    text_filter.make_automaton()
    return text_filter
```

### TypeScript Solution
```typescript
// Simple Map-based approach
class StringMatcher {
  private caseSensitive = new Map<string, TokenExtractor[]>()
  private caseInsensitive = new Map<string, TokenExtractor[]>()
  
  addExtractor(str: string, extractor: TokenExtractor, ignoreCase: boolean) {
    const map = ignoreCase ? this.caseInsensitive : this.caseSensitive
    const key = ignoreCase ? str.toLowerCase() : str
    
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(extractor)
  }
  
  getMatches(text: string): Set<TokenExtractor> {
    const matches = new Set<TokenExtractor>()
    
    // Check case-sensitive
    for (const [str, extractors] of this.caseSensitive) {
      if (text.includes(str)) {
        extractors.forEach(e => matches.add(e))
      }
    }
    
    // Check case-insensitive
    const lowerText = text.toLowerCase()
    for (const [str, extractors] of this.caseInsensitive) {
      if (lowerText.includes(str)) {
        extractors.forEach(e => matches.add(e))
      }
    }
    
    return matches
  }
}
```

## Key Principles

1. **Explicit over Implicit**: TypeScript requires explicit type definitions
2. **Compile-Time Safety**: Use TypeScript's type system to catch errors early
3. **Performance Trade-offs**: Some Python optimizations may not translate directly
4. **API Compatibility**: Keep the same public interface despite implementation differences
5. **Test Coverage**: Ensure behavior matches Python version through comprehensive testing