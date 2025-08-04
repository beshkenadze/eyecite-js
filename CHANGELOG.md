# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflows for CI/CD
- Automated version management with tag-based releases
- Support for alpha, beta, and rc prerelease tags

## [2.7.6-alpha.24] - 2025-08-04

### Added
- Exported `LawCitationToken`, `JournalCitationToken`, `DOLOpinionToken`, and `PlaceholderCitationToken` from main index
- These token types are now properly accessible for TypeScript users

### Fixed
- Fixed missing TypeScript exports for specialized token types
- Users can now properly type-check law citation tokens and access `lawType` property

## [2.7.6-alpha.23] - 2025-08-01

### Added
- New `GetCitationsOptions` interface for cleaner API usage
- New `overlapHandling` option in `getCitations()` with three modes:
  - `'all'` (default): Returns all citations including overlapping ones
  - `'parent-only'`: Returns only the encompassing citations, excluding nested ones
  - `'children-only'`: Returns only the nested citations, excluding parent citations
- Comprehensive test suite for overlap handling options
- Function overloading for backward compatibility

### Fixed
- Users can now avoid overlapping citations when using `getCitations()` directly
- Manual annotation of multi-section citations now works correctly with `'parent-only'` option

### Changed
- **IMPROVED**: `getCitations()` now accepts an options object as the second parameter (legacy signature still supported)
  - Before: `getCitations(text, false, undefined, '', undefined, 'parent-only')`
  - After: `getCitations(text, { overlapHandling: 'parent-only' })`
- Exported `OverlapHandling` type and `GetCitationsOptions` interface from main index

### Deprecated
- The legacy signature with individual parameters is deprecated but still functional

## [2.7.6-alpha.22] - 2025-08-01

### Fixed
- Overlapping citation annotation now properly handles nested citations
- Multi-section law citations (e.g., "29 C.F.R. §§ 778.113, 778.114, 778.115") are now annotated with proper HTML nesting
- Fixed malformed HTML output when annotating citations with overlapping spans

### Added
- Tree-based citation structure for handling overlapping spans
- Bottom-up annotation processing to ensure proper nesting
- Comprehensive test suite for overlapping citation annotation

### Changed
- Rewrote `applyAnnotations` function to process citations from innermost to outermost
- Enhanced annotation logic to preserve all citation information while maintaining valid HTML structure

## [2.7.6-alpha.21] - 2025-08-01

### Fixed
- Multi-section law citations (e.g., "29 C.F.R. §§ 778.113, 778.114, 778.115") now correctly return separate citations for each section
- Fixed span position calculation for multi-section citations - each citation now has accurate start/end positions
- Fixed overlap detection logic to allow multi-section citations from the same law source

### Added
- New test suite for multi-section law citation handling
- `areMultiSectionLawCitations` helper function to properly identify related law citations

### Changed
- Enhanced `extractFromTokenizedSections` to calculate accurate span positions for each section
- Updated `filterCitations` to preserve multi-section law citations even when they have overlapping spans

## [2.7.6-alpha.3] - 2024-07-18

### Added
- Support for multiple law citations with §§ pattern
- Comprehensive test coverage for CFR multiple sections
- Fixed PDF text cleaning for proper citation extraction

### Fixed
- CFR citations now correctly parse multiple sections (e.g., "29 C.F.R. §§ 778.113, 778.114")
- Underscores in PDF text are now replaced with spaces instead of removed
- All existing tests continue to pass

## [2.7.6-alpha.2] - 2024-01-14

### Fixed
- Added TypeScript declaration files (.d.ts) to the package
- Fixed missing `types` field in package.json
- Generated proper type definitions for all exports

## [2.7.6-alpha.1] - 2024-01-14

### Fixed
- Updated README.md to reflect all implemented features
- Fixed import statements in documentation to use correct package name
- Improved testing documentation with Bun-specific commands

### Changed
- Clarified that law citations, journal citations, and HTML annotation are fully implemented
- Updated repository URLs to point to correct GitHub repository
- Enhanced API documentation with new citation types and utility functions

### Note
- This is an alpha prerelease with documentation updates while maintaining version parity with Python eyecite 2.7.6

## [2.7.6] - 2024-01-14

### Added
- Initial TypeScript port of eyecite Python library
- Complete feature parity with Python version 2.7.6
- Support for all citation types:
  - Full case citations
  - Short case citations
  - Supra citations
  - Id citations
  - Law citations (statutes)
  - Journal citations
  - Reference citations
- HTML annotation support
- Custom tokenizer extensions
- Advanced citation filtering and disambiguation
- Date range validation
- Comprehensive test suite with 151 tests

### Changed
- Ported from Python to TypeScript with modern ES modules
- Uses Bun for package management and testing
- Improved performance with optimized regex patterns

### Technical Details
- Full support for reporters-db and courts-db data
- Parallel citation detection with metadata sharing
- Nested parenthetical handling
- HTML markup preservation during annotation
- Year range support (e.g., "1982-83")
- Compatible with Node.js 18+