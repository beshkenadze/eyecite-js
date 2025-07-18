# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

eyecite-js is a TypeScript library for extracting legal citations from text strings. It's a complete port of the Python eyecite library, used to process legal documents for CourtListener and Harvard's Caselaw Access Project. The library recognizes various types of citations including full case citations, references, short cases, statutory citations, law journals, supra, and id. citations.

## Development Environment

### Package Manager and Runtime
**IMPORTANT**: This project uses **Bun** as both the package manager and runtime. Always use `bun` commands, not `npm` or `yarn`.

### Development Commands

#### Setup and Installation
```bash
# Install dependencies
bun install

# Install with frozen lockfile (CI/production)
bun install --frozen-lockfile
```

#### Building
```bash
# Build the project
bun run build

# Clean build artifacts
bun run clean
```

#### Testing and Quality
```bash
# Run tests
bun test

# Run linter
bun run lint

# Run type checking
bun run typecheck
```

#### Versioning and Publishing
```bash
# Version bump (uses bun internally via npm scripts)
bun run version

# Publish to npm
bun run publish
```

## Architecture Overview

### Core Components

1. **Citation Extraction Pipeline**:
   - `tokenizers/`: Converts text to tokens using regex patterns
     - `DefaultTokenizer`: Main tokenizer with reporter database integration
     - `CustomTokenizer`: For custom citation patterns
   - `find.ts`: Main entry point via `getCitations()` - extracts citations from tokens
   - `models/`: Defines citation types and token classes

2. **Token System**:
   - All token classes must implement `static fromMatch()` method
   - `CitationToken`, `IdToken`, `SupraToken`, `SectionToken`, etc.
   - Base `Token` class provides fallback `fromMatch()` implementation

3. **Post-Processing**:
   - `resolve.ts`: Groups citations by common references
   - `annotate.ts`: Inserts markup around citations in original text
   - `clean.ts`: Pre-processes text (removes HTML, normalizes whitespace)

### Key Design Patterns

1. **Token-Based Processing**: Text is tokenized into specific token types before citation extraction
2. **Static Factory Methods**: Token classes use `fromMatch()` static methods for creation
3. **Span Tracking**: Citations track position in source text via `span()` method
4. **Flexible Resolution**: Custom resolution functions can link citations to external databases

## Important Implementation Notes

1. **Token Creation**: Every token class must implement `static fromMatch(match: RegExpExecArray, extra: Record<string, unknown>, offset = 0)` method
2. **Bun Runtime**: Use `bun` for all package management and script execution
3. **Linting**: Project uses Biome v2 for linting and formatting
4. **TypeScript**: Strict TypeScript configuration with comprehensive type checking

## Testing Approach

- Test suite uses Bun's built-in test runner
- Tests organized by functionality: find.test.ts, annotate.test.ts, etc.
- Real-world citation examples in test cases
- Mock factories for creating test citations

## CI/CD Pipeline

- GitHub Actions workflow runs on push/PR to main/develop
- Tests run on Node.js 18.x, 20.x, 22.x
- Linting with Biome v2
- Type checking with TypeScript
- Automated build artifact generation

## Version Management

- Semantic versioning in package.json
- Use `bun run version` for version bumps
- Automated deployment to npm registry
- Git tags for releases (vX.Y.Z format)