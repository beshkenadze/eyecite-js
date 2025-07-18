# Quick Reference: Python to TypeScript Conversions

## Types
```python
str → string
int/float → number
bool → boolean
None → null | undefined
dict → Record<K, V> | { [key: string]: V }
list → T[] | Array<T>
tuple → [T1, T2, ...]
set → Set<T>
Optional[T] → T | undefined
Union[A, B] → A | B
Any → any
Callable → (...args: any[]) => any
```

## Common Patterns

### Variable Names
```python
snake_case → camelCase
CONSTANT_NAME → CONSTANT_NAME
ClassName → ClassName
```

### String Operations
```python
f"{var} text" → `${var} text`
"text" + var → `text${var}`
r"regex" → 'regex' or /regex/
"""text""" → `text`
text.lower() → text.toLowerCase()
text.strip() → text.trim()
```

### Collections
```python
[x for x in list if x > 0] → list.filter(x => x > 0)
[x * 2 for x in list] → list.map(x => x * 2)
dict.get('key', default) → dict.key ?? default
'key' in dict → 'key' in dict || dict.hasOwnProperty('key')
len(list) → list.length
```

### Control Flow
```python
if x is None: → if (x === null || x === undefined)
if not x: → if (!x)
x if condition else y → condition ? x : y
for i, item in enumerate(list): → list.forEach((item, i) => ...)
```

### Functions
```python
def func(a, b=None): → function func(a: any, b?: any)
*args → ...args: any[]
**kwargs → options?: Record<string, any>
lambda x: x * 2 → (x: any) => x * 2
```

### Classes
```python
class A: → class A {
    def __init__(self): → constructor() {
    self.x = 1 → this.x = 1
    @property → get x() {
    @staticmethod → static method() {
    super().__init__() → super()
```

### Exceptions
```python
try/except → try/catch
raise Exception() → throw new Error()
finally → finally
```

### Regex Flags
```python
re.I → 'i' (ignoreCase)
re.M → 'm' (multiline)
re.S → 's' (dotAll)
re.compile(pattern) → new RegExp(pattern, flags)
match.group(1) → match[1]
match.groups() → match.groups || {}
```

### Imports
```python
from module import x → import { x } from './module'
import module → import * as module from './module'
from . import x → import { x } from './'
```

## eyecite-Specific

### Token Creation
```python
Token.from_match(m, extra) → Token.fromMatch(match, extra)
m.span() → [match.index, match.index + match[0].length]
m[1] → match[1]
```

### Citation Types
```python
FullCaseCitation → FullCaseCitation
IdCitation → IdCitation
short_name → shortName
cite_type → citeType
```

### Common Methods
```python
get_citations(text) → getCitations(text)
resolve_citations(cites) → resolveCitations(cites)
clean_text(text) → cleanText(text)
```

## Testing
```python
self.assertEqual(a, b) → expect(a).toBe(b)
self.assertTrue(x) → expect(x).toBe(true)
self.assertIn(a, b) → expect(b).toContain(a)
len(x) → x.length
```