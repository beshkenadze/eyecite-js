# eyecite-js

<div align="center">

[![npm version](https://badge.fury.io/js/@beshkenadze%2Feyecite.svg)](https://badge.fury.io/js/@beshkenadze%2Feyecite)
[![CI](https://github.com/beshkenadze/eyecite-js/actions/workflows/ci.yml/badge.svg)](https://github.com/beshkenadze/eyecite-js/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-BSD%202--Clause-orange.svg)](https://opensource.org/licenses/BSD-2-Clause)
[![Tests](https://img.shields.io/badge/tests-354%20passing-brightgreen)](https://github.com/beshkenadze/eyecite-js/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![GitHub issues](https://img.shields.io/github/issues/beshkenadze/eyecite-js)](https://github.com/beshkenadze/eyecite-js/issues)
[![GitHub stars](https://img.shields.io/github/stars/beshkenadze/eyecite-js)](https://github.com/beshkenadze/eyecite-js/stargazers)

<h3>A TypeScript/JavaScript library for extracting legal citations from text</h3>

<p>
  <a href="#-installation">Installation</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="https://github.com/beshkenadze/eyecite-js/issues/new?assignees=&labels=bug&template=bug_report.md&title=%5BBUG%5D+">Report Bug</a> •
  <a href="https://github.com/beshkenadze/eyecite-js/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=%5BFEATURE%5D+">Request Feature</a>
</p>

</div>

## 📋 Table of Contents

<details>
<summary>Click to expand</summary>

- [About The Project](#about-the-project)
- [Built With](#built-with)
- [Installation](#-installation)
- [What's New](#-whats-new-in-v276-alpha23)
  - [Package Managers](#package-managers)
  - [Registries](#registries)
- [Quick Start](#-quick-start)
- [Features](#-features)
  - [Citation Types](#citation-types)
  - [Multiple Section Support](#multiple-section-support)
  - [Text Cleaning](#text-cleaning)
  - [Citation Annotation](#citation-annotation)
  - [Overlap Handling](#overlap-handling)
  - [Citation Resolution](#citation-resolution)
- [API Documentation](#-api-documentation)
- [TypeScript Support](#-typescript-support)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Testing](#-testing)
- [License](#-license)
- [Contact](#-contact)
- [Acknowledgments](#-acknowledgments)

</details>

## About The Project

eyecite-js is a TypeScript/JavaScript port of the Python [eyecite](https://github.com/freelawproject/eyecite) library for extracting legal citations from text strings. It recognizes a wide variety of citations commonly found in legal documents, making it an essential tool for legal tech applications.

### Current Status (v2.7.6-alpha.23)

- ✅ **Complete Feature Parity**: Full parity with Python eyecite v2.7.6
- ✅ **Production Ready**: 354 passing tests, comprehensive citation coverage
- ✅ **Enhanced Features**: 
  - Overlap handling for multi-section citations
  - Clean options-based API
  - Id. citation resolution with section substitution
  - DOL Opinion support
- ✅ **Modern API**: Refactored `getCitations()` with options object for better developer experience

See our [ROADMAP.md](ROADMAP.md) for detailed feature parity status and development plans.

### Key Features

- 🚀 **Complete Port**: Full implementation of the Python eyecite library functionality
- 📦 **TypeScript Support**: Written in TypeScript with complete type definitions
- 🌐 **JavaScript Compatible**: Works in both Node.js and browser environments
- 🔧 **Extensible**: Support for custom tokenizers and citation patterns
- 🎯 **Battle-tested**: Based on the proven Python library used by CourtListener and Harvard's Caselaw Access Project
- ✨ **JavaScript Enhancements**: Additional features like DOL Opinion citations not in Python version

### Built With

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)

## 📦 Installation

## 🆕 What's New in v2.7.6-alpha.23

### 🎯 Cleaner API with Options Object
```typescript
// Before (awkward)
getCitations(text, false, undefined, '', undefined, 'parent-only')

// After (clean)
getCitations(text, { overlapHandling: 'parent-only' })
```

### 🔄 Overlap Handling for Multi-Section Citations
Control how overlapping citations are returned:
- `'all'` (default): Returns all citations including nested ones
- `'parent-only'`: Returns only encompassing citations
- `'children-only'`: Returns only nested citations

### 🐛 Major Bug Fixes
- Fixed multi-section law citations returning incorrect spans
- Fixed overlapping citation annotation issues
- Improved citation filtering logic

See the [CHANGELOG](CHANGELOG.md) for a complete list of changes.

### Package Managers

**Bun** (recommended):
```bash
bun add @beshkenadze/eyecite
```

**npm**:
```bash
npm install @beshkenadze/eyecite
```

**pnpm**:
```bash
pnpm add @beshkenadze/eyecite
```

**Yarn**:
```bash
yarn add @beshkenadze/eyecite
```

### Registries

**npm Registry** (default):
```bash
# Latest stable version
npm install @beshkenadze/eyecite

# Alpha version
npm install @beshkenadze/eyecite@alpha

# Beta version  
npm install @beshkenadze/eyecite@beta
```

**GitHub Packages**:
```bash
# Configure registry (one-time setup)
npm config set @beshkenadze:registry https://npm.pkg.github.com

# Install from GitHub Packages
npm install @beshkenadze/eyecite

# Or install directly
npm install @beshkenadze/eyecite --registry=https://npm.pkg.github.com
```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 🚀 Quick Start

### Basic Usage
```typescript
import { getCitations } from '@beshkenadze/eyecite'

const text = `
  Mass. Gen. Laws ch. 1, § 2 (West 1999) (barring ...).
  Foo v. Bar, 1 U.S. 2, 3-4 (1999) (overruling ...).
  Id. at 3.
  Foo, supra, at 5.
`

const citations = getCitations(text)
console.log(citations)
```

### Using Options (New in v2.7.6-alpha.23)
```typescript
// Handle overlapping citations in multi-section references
const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115'

// Get only the parent citation (avoids overlaps)
const citations = getCitations(text, { 
  overlapHandling: 'parent-only',
  removeAmbiguous: true 
})
```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## ✨ Features

eyecite-js recognizes the following citation types:

- **Full case citations**: `Bush v. Gore, 531 U.S. 98, 99-100 (2000)`
- **Short form citations**: `531 U.S., at 99`
- **Id. citations**: `Id., at 101` (with advanced section substitution)
- **Supra citations**: `Bush, supra, at 100`
- **Law citations**: `29 C.F.R. §§ 778.113, 778.114` (with multiple section support)
- **Journal citations**: `1 Minn. L. Rev. 1`
- **DOL Opinion Letters**: `DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009)`

### Citation Types

Each citation type is represented by a specific class:

- **FullCaseCitation**: Complete case citations with volume, reporter, page
- **ShortCaseCitation**: Abbreviated case citations
- **FullLawCitation**: Statutory and regulatory citations
- **FullJournalCitation**: Law journal citations
- **IdCitation**: "Id." citations referring to previous citations
- **IdLawCitation**: "Id. § 123" citations with section references
- **SupraCitation**: "Supra" citations referring to previous citations
- **ReferenceCitation**: Reference citations using case names
- **DOLOpinionCitation**: Department of Labor Opinion Letters

### Multiple Section Support

eyecite-js properly handles multiple sections indicated by `§§`:

```typescript
const text = 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).'
const citations = getCitations(text)
// Returns 2 separate FullLawCitation objects
```

### Text Cleaning

Built-in text cleaning utilities help prepare text for citation extraction:

```typescript
import { cleanText } from '@beshkenadze/eyecite'

const dirtyText = '<p>foo   1  U.S.  1   </p>'
const cleanedText = cleanText(dirtyText, ['html', 'inline_whitespace'])
const citations = getCitations(cleanedText)
```

### Citation Annotation

Add markup around citations in text:

```typescript
import { annotateCitations } from '@beshkenadze/eyecite'

const text = 'bob lissner v. test 1 U.S. 12, 347-348 (4th Cir. 1982)'
const citations = getCitations(text)
const annotated = annotateCitations(
  text, 
  citations.map(c => [c.span(), '<a href="#">', '</a>'])
)
// Returns: 'bob lissner v. test <a href="#">1 U.S. 12</a>, 347-348 (4th Cir. 1982)'
```

### Overlap Handling

Handle overlapping citations in multi-section references:

```typescript
const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'

// Default: returns all citations including overlapping ones
const all = getCitations(text)

// Option 1: Get only parent citations (no nested ones)
const parentOnly = getCitations(text, { overlapHandling: 'parent-only' })

// Option 2: Get only nested citations (no parent)
const childrenOnly = getCitations(text, { overlapHandling: 'children-only' })
```

### Citation Resolution

Resolve citations to their common references with advanced Id. support:

```typescript
import { resolveCitationsWithIdSubstitution } from '@beshkenadze/eyecite'

const text = 'first: 29 C.F.R. § 778.113. second: Id. § 778.114. third: Id.'
const citations = getCitations(text)
const resolved = resolveCitationsWithIdSubstitution(citations)
// Properly resolves Id. citations with section substitution
```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 📚 API Documentation

### `getCitations(text, options?)`

Extract citations from text.

**Parameters:**
- `text`: The text to parse
- `options`: Optional configuration object
  - `removeAmbiguous`: Remove ambiguous citations (default: false)
  - `tokenizer`: Custom tokenizer instance
  - `markupText`: Original markup text for enhanced extraction
  - `cleanSteps`: Text cleaning steps to apply
  - `overlapHandling`: How to handle overlapping citations (default: 'all')
    - `'all'`: Returns all citations including overlapping ones
    - `'parent-only'`: Returns only encompassing citations, excluding nested ones
    - `'children-only'`: Returns only nested citations, excluding parent citations

**Returns:** Array of citation objects

**Example with overlap handling:**
```typescript
const text = 'See 29 C.F.R. §§ 778.113, 778.114, 778.115 for details.'

// Get all citations (default behavior)
const allCitations = getCitations(text)
// Returns 3 citations: the full multi-section citation and two nested ones

// Get only the parent citation
const parentOnly = getCitations(text, { overlapHandling: 'parent-only' })
// Returns 1 citation: "29 C.F.R. §§ 778.113, 778.114, 778.115"

// Get only the nested citations
const childrenOnly = getCitations(text, { overlapHandling: 'children-only' })
// Returns 2 citations: "778.114" and "778.115"
```

### Citation Objects

Each citation object contains:
- `span()`: Text span [start, end] in source text
- `fullSpan()`: Full span including context
- `groups`: Parsed citation components
- `metadata`: Additional citation metadata
- `year`: Citation year (if available)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 💻 TypeScript Support

eyecite-js is written in TypeScript and includes complete type definitions:

```typescript
import { 
  getCitations, 
  FullCaseCitation, 
  FullLawCitation,
  GetCitationsOptions,
  OverlapHandling 
} from '@beshkenadze/eyecite'

// Use typed options
const options: GetCitationsOptions = {
  overlapHandling: 'parent-only',
  removeAmbiguous: true
}

const citations = getCitations(text, options)

// Type-safe citation handling
citations.forEach(citation => {
  if (citation instanceof FullCaseCitation) {
    console.log(`Case: ${citation.groups.volume} ${citation.groups.reporter} ${citation.groups.page}`)
  } else if (citation instanceof FullLawCitation) {
    console.log(`Law: ${citation.groups.reporter} ${citation.groups.section}`)
  }
})
```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 🗺️ Roadmap

- [x] Core Python library port (95% complete)
- [x] TypeScript support with full type safety
- [x] Multiple section parsing (C.F.R. §§)
- [x] Id. citation resolution with section substitution
- [x] DOL Opinion Letter support
- [ ] Performance optimizations (WebAssembly tokenizer)
- [ ] Complete test infrastructure parity
- [ ] Additional citation formats (patents, international)

See our detailed [ROADMAP.md](ROADMAP.md) for the complete development plan and [open issues](https://github.com/beshkenadze/eyecite-js/issues) for specific features.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to:
- Run tests: `bun test`
- Run linter: `bun run lint`
- Run type check: `bun run typecheck`

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test find.test.ts

# Run tests in watch mode
bun test --watch
```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 📄 License

Distributed under the BSD 2-Clause License. See [LICENSE](LICENSE) for more information.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 📧 Contact

Aleksandr Beshkenadze - [@beshkenadze](https://github.com/beshkenadze)

Project Link: [https://github.com/beshkenadze/eyecite-js](https://github.com/beshkenadze/eyecite-js)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

## 🙏 Acknowledgments

- [Free Law Project](https://github.com/freelawproject) - Original Python [eyecite](https://github.com/freelawproject/eyecite) library
- [reporters-db](https://github.com/freelawproject/reporters-db) - Database of court reporters
- [courts-db](https://github.com/freelawproject/courts-db) - Database of court information
- All contributors who have helped make this project better

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

<div align="center">
Made with ❤️ for the legal tech community
</div>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/beshkenadze/eyecite-js.svg?style=for-the-badge
[contributors-url]: https://github.com/beshkenadze/eyecite-js/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/beshkenadze/eyecite-js.svg?style=for-the-badge
[forks-url]: https://github.com/beshkenadze/eyecite-js/network/members
[stars-shield]: https://img.shields.io/github/stars/beshkenadze/eyecite-js.svg?style=for-the-badge
[stars-url]: https://github.com/beshkenadze/eyecite-js/stargazers
[issues-shield]: https://img.shields.io/github/issues/beshkenadze/eyecite-js.svg?style=for-the-badge
[issues-url]: https://github.com/beshkenadze/eyecite-js/issues
[license-shield]: https://img.shields.io/github/license/beshkenadze/eyecite-js.svg?style=for-the-badge
[license-url]: https://github.com/beshkenadze/eyecite-js/blob/master/LICENSE.txt