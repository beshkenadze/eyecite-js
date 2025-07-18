# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflows for CI/CD
- Automated version management with tag-based releases
- Support for alpha, beta, and rc prerelease tags

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