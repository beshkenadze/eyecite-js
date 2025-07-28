---
name: Bug report
about: Create a report to help us improve eyecite-js
title: '[BUG] '
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

```typescript
// Example code that demonstrates the issue
import { getCitations } from '@beshkenadze/eyecite'

const text = 'Your citation text here'
const citations = getCitations(text)
// What happens vs what you expected
```

**Expected behavior**
A clear and concise description of what you expected to happen.

**Actual behavior**
What actually happened instead.

**Citation Examples**
Please provide the exact citation text that's causing issues:
- Input text: `"Your citation text here"`
- Expected citation type: (e.g., FullCaseCitation, FullLawCitation, etc.)
- Actual result: (what was parsed or not parsed)

**Environment (please complete the following information):**
 - OS: [e.g. macOS, Linux, Windows]
 - Node.js version: [e.g. 18.x, 20.x]
 - Bun version (if using Bun): [e.g. 1.0.0]
 - Package version: [e.g. 2.7.6-alpha.14]
 - TypeScript version: [e.g. 5.0.0]

**Additional context**
Add any other context about the problem here.

**Possible Solution**
If you have ideas on how to fix the issue, please share them here.