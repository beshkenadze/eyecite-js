# Multiple Section Parsing Design for eyecite-js

## Overview

This document outlines the design for enhanced multiple section parsing in eyecite-js to handle complex section lists in legal citations. The goal is to properly parse patterns like:

- "29 C.F.R. §§ 778.113, 778.114"
- "29 C.F.R. §§ 778.113 (the 'statutory method'), 778.114 (the FWW method)"
- "29 U.S.C. §§ 201-219, 251-262"
- "42 U.S.C. §§ 1983, 1985(3), 1988"

## Current State Analysis

### Existing Implementation
The current implementation in `find.ts` already provides basic support for multiple sections:

```typescript
function extractMultipleLawCitations(document: Document, index: number): FullLawCitation[]
```

**Current Capabilities:**
- Detects `§§` pattern in context text
- Creates multiple `FullLawCitation` objects for each section
- Handles basic comma-separated sections with simple parentheticals
- Uses regex pattern: `/,\s*(\d+(?:\.\d+)*)\s*(?:\(([^)]+)\))?/g`

**Current Limitations:**
- Limited regex pattern only handles simple numeric sections
- Cannot parse section ranges (e.g., "201-219")
- Cannot handle complex subsection references (e.g., "1985(3)")
- Cannot parse mixed patterns in single citation
- Does not handle multiple parenthetical types

## Design Decision: Multiple Citations Approach

### Preferred Approach: Multiple Individual Citations

**Decision:** Continue with the current approach of creating multiple individual `FullLawCitation` objects rather than a single citation with multiple sections.

**Rationale:**
1. **Consistency**: Maintains compatibility with existing resolution and annotation systems
2. **Flexibility**: Each section can have independent metadata (parentheticals, pin cites)
3. **Simplicity**: Easier to handle in downstream processing
4. **Database Compatibility**: Most legal databases treat multiple sections as separate references
5. **Existing Architecture**: Current citation models are designed for single-section citations

### Alternative Rejected: Single Citation with Section Array

A single citation with multiple sections was considered:

```typescript
interface MultipleSectionCitation {
  sections: Array<{
    section: string
    parenthetical?: string
    pinCite?: string
  }>
}
```

**Rejected Because:**
- Would require extensive changes to existing citation model
- Complex for resolution system to handle
- Annotation would be more difficult
- Breaks established patterns in legal citation processing

## Data Structure Changes

### Enhanced FullLawCitation

No changes needed to `FullLawCitation` class - continue using multiple instances.

### Enhanced Section Parsing Metadata

Add support for section relationship metadata:

```typescript
interface SectionMetadata extends Metadata {
  // Existing fields remain unchanged
  sectionGroupId?: string    // Links related sections from same §§ pattern
  sectionIndex?: number      // Order within the section group
  sectionRange?: {           // For range patterns like "201-219"
    start: string
    end: string
    isRange: boolean
  }
}
```

## Algorithm Design

### Enhanced Section List Parser

```typescript
interface SectionMatch {
  section: string
  parenthetical?: string
  pinCite?: string
  startOffset: number
  endOffset: number
}

class MultipleSectionParser {
  /**
   * Parse comma-separated section list with complex patterns
   */
  parseMultipleSections(
    baseToken: LawCitationToken,
    afterTokenText: string,
    baseOffset: number
  ): SectionMatch[] {
    const sections: SectionMatch[] = []
    
    // Enhanced regex patterns for different section types
    const patterns = [
      this.getRangePattern(),        // "201-219"
      this.getSubsectionPattern(),   // "1985(3)"
      this.getDecimalPattern(),      // "778.113"
      this.getBasicPattern()         // "1983"
    ]
    
    // Use progressive parsing approach
    return this.parseWithMultiplePatterns(afterTokenText, patterns, baseOffset)
  }
  
  private getRangePattern(): RegExp {
    // Matches: ", 201-219" or ", 251-262"
    return /,\s*(\d+(?:\.\d+)*)-(\d+(?:\.\d+)*)\s*(?:\(([^)]+)\))?/g
  }
  
  private getSubsectionPattern(): RegExp {
    // Matches: ", 1985(3)" or ", 1985(3)(a)"
    return /,\s*(\d+(?:\([^)]+\))+)\s*(?:\(([^)]+)\))?/g
  }
  
  private getDecimalPattern(): RegExp {
    // Matches: ", 778.113" or ", 778.114"
    return /,\s*(\d+(?:\.\d+)+)\s*(?:\(([^)]+)\))?/g
  }
  
  private getBasicPattern(): RegExp {
    // Matches: ", 1983" or ", 1988"
    return /,\s*(\d+)\s*(?:\(([^)]+)\))?/g
  }
}
```

### Progressive Pattern Matching

```typescript
parseWithMultiplePatterns(
  text: string, 
  patterns: RegExp[], 
  baseOffset: number
): SectionMatch[] {
  const sections: SectionMatch[] = []
  const processedRanges: Array<[number, number]> = []
  
  // Apply each pattern in order of complexity
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    
    while ((match = pattern.exec(text)) !== null) {
      const matchStart = match.index
      const matchEnd = matchStart + match[0].length
      
      // Check if this range was already processed by a previous pattern
      if (this.overlapsProcessedRange(matchStart, matchEnd, processedRanges)) {
        continue
      }
      
      // Extract section data based on pattern type
      const sectionData = this.extractSectionData(match, pattern)
      if (sectionData) {
        sections.push({
          ...sectionData,
          startOffset: baseOffset + matchStart,
          endOffset: baseOffset + matchEnd
        })
        
        processedRanges.push([matchStart, matchEnd])
      }
    }
    
    // Reset regex lastIndex for next iteration
    pattern.lastIndex = 0
  }
  
  return sections.sort((a, b) => a.startOffset - b.startOffset)
}
```

## Regex Pattern Specifications

### Pattern Hierarchy (in order of precedence)

#### 1. Section Range Pattern
```typescript
const SECTION_RANGE_PATTERN = /,\s*(\d+(?:\.\d+)*)-(\d+(?:\.\d+)*)\s*(?:\(([^)]+)\))?/g
```
**Matches:**
- `, 201-219`
- `, 251-262`  
- `, 778.217-778.219`

**Groups:**
- Group 1: Start section number
- Group 2: End section number  
- Group 3: Optional parenthetical

#### 2. Complex Subsection Pattern
```typescript
const COMPLEX_SUBSECTION_PATTERN = /,\s*(\d+(?:\([^)]+\))+)\s*(?:\(([^)]+)\))?/g
```
**Matches:**
- `, 1985(3)`
- `, 1985(3)(a)`

**Groups:**
- Group 1: Section with subsection parts
- Group 2: Optional descriptive parenthetical

#### 3. Decimal Section Pattern
```typescript
const DECIMAL_SECTION_PATTERN = /,\s*(\d+(?:\.\d+)+)\s*(?:\(([^)]+)\))?/g
```
**Matches:**
- `, 778.113`
- `, 778.114 (the FWW method)`

**Groups:**
- Group 1: Decimal section number
- Group 2: Optional parenthetical

#### 4. Basic Section Pattern
```typescript
const BASIC_SECTION_PATTERN = /,\s*(\d+)\s*(?:\(([^)]+)\))?/g
```
**Matches:**
- `, 1983`
- `, 1988`

**Groups:**
- Group 1: Basic section number
- Group 2: Optional parenthetical

### Parenthetical Distinction

The parser needs to distinguish between:

1. **Subsection Parentheticals**: `1985(3)` - part of the section reference
2. **Descriptive Parentheticals**: `(the FWW method)` - explanatory text

**Strategy:** 
- Subsection parentheticals contain only alphanumeric characters and are adjacent to numbers
- Descriptive parentheticals contain spaces, articles, or quotes

```typescript
function classifyParenthetical(text: string): 'subsection' | 'descriptive' {
  // Subsection: only alphanumeric, no spaces
  if (/^[a-zA-Z0-9]+$/.test(text)) {
    return 'subsection'
  }
  
  // Descriptive: contains spaces, articles, quotes, etc.
  return 'descriptive'
}
```

## Enhanced Extraction Algorithm

### Main Extraction Flow

```typescript
function extractMultipleLawCitations(
  document: Document, 
  index: number
): FullLawCitation[] {
  const token = document.words[index] as LawCitationToken
  const sourceText = document.sourceText || ''
  
  // Check for §§ pattern
  if (!this.hasMultipleSectionMarker(token, sourceText)) {
    return [extractLawCitation(document, index)]
  }
  
  // Extract base citation
  const baseCitation = extractLawCitation(document, index)
  const citations: FullLawCitation[] = [baseCitation]
  
  // Parse additional sections
  const parser = new MultipleSectionParser()
  const afterToken = sourceText.substring(
    token.end, 
    Math.min(sourceText.length, token.end + 500)
  )
  
  const additionalSections = parser.parseMultipleSections(
    token, 
    afterToken, 
    token.end
  )
  
  // Create citations for additional sections
  const sectionGroupId = this.generateSectionGroupId()
  
  additionalSections.forEach((sectionData, index) => {
    const additionalCitation = this.createSectionCitation(
      baseCitation,
      sectionData,
      sectionGroupId,
      index + 1 // Base citation is index 0
    )
    citations.push(additionalCitation)
  })
  
  return citations
}
```

### Citation Creation for Additional Sections

```typescript
private createSectionCitation(
  baseCitation: FullLawCitation,
  sectionData: SectionMatch,
  groupId: string,
  sectionIndex: number
): FullLawCitation {
  // Create new token for this section
  const sectionToken = new LawCitationToken(
    sectionData.section,
    sectionData.startOffset,
    sectionData.endOffset,
    {
      ...baseCitation.token.groups,
      section: sectionData.section
    },
    {
      reporter: baseCitation.token.reporter,
      lawType: baseCitation.token.lawType
    }
  )
  
  // Create new citation
  const sectionCitation = new FullLawCitation(
    sectionToken,
    baseCitation.index,
    baseCitation.exactEditions,
    baseCitation.variationEditions
  )
  
  // Copy base metadata
  sectionCitation.metadata = {
    ...baseCitation.metadata,
    section: sectionData.section,
    sectionGroupId: groupId,
    sectionIndex: sectionIndex
  }
  
  // Add section-specific metadata
  if (sectionData.parenthetical) {
    sectionCitation.metadata.parenthetical = sectionData.parenthetical
  }
  
  if (sectionData.pinCite) {
    sectionCitation.metadata.pinCite = sectionData.pinCite
  }
  
  // Handle range sections
  if (this.isRangeSection(sectionData.section)) {
    const [start, end] = sectionData.section.split('-')
    sectionCitation.metadata.sectionRange = {
      start,
      end,
      isRange: true
    }
  }
  
  return sectionCitation
}
```

## Integration with Existing Citation Types

### Token Creation

Maintain compatibility with existing `LawCitationToken`:

```typescript
// No changes needed to LawCitationToken
// Continue creating separate tokens for each section
```

### Citation Resolution

The resolver should understand section groups:

```typescript
// In resolve.ts - group related sections
function groupSectionCitations(citations: Citation[]): Citation[][] {
  const groups = new Map<string, Citation[]>()
  
  for (const citation of citations) {
    if (citation instanceof FullLawCitation && citation.metadata.sectionGroupId) {
      const groupId = citation.metadata.sectionGroupId
      if (!groups.has(groupId)) {
        groups.set(groupId, [])
      }
      groups.get(groupId)!.push(citation)
    }
  }
  
  return Array.from(groups.values())
}
```

### Annotation System

The annotation system should handle multiple sections as separate spans but maintain visual grouping:

```typescript
// Each section gets its own annotation span
// The annotation system already handles multiple citations naturally
```

## Testing Strategy

### Test Cases to Implement

#### Basic Multiple Sections
```typescript
test('CFR multiple sections with parentheticals', () => {
  assertCitations(
    '29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method)',
    [
      {
        type: FullLawCitation,
        section: '778.113',
        parenthetical: 'the "statutory method"',
        sectionGroupId: expect.any(String),
        sectionIndex: 0
      },
      {
        type: FullLawCitation, 
        section: '778.114',
        parenthetical: 'the FWW method',
        sectionGroupId: expect.any(String),
        sectionIndex: 1
      }
    ]
  )
})
```

#### Range Sections
```typescript
test('USC multiple sections with ranges', () => {
  assertCitations(
    '29 U.S.C. §§ 201-219, 251-262',
    [
      {
        type: FullLawCitation,
        section: '201-219',
        sectionRange: { start: '201', end: '219', isRange: true }
      },
      {
        type: FullLawCitation,
        section: '251-262', 
        sectionRange: { start: '251', end: '262', isRange: true }
      }
    ]
  )
})
```

#### Complex Subsections
```typescript
test('USC multiple sections with complex subsections', () => {
  assertCitations(
    '42 U.S.C. §§ 1983, 1985(3), 1988',
    [
      {
        type: FullLawCitation,
        section: '1983'
      },
      {
        type: FullLawCitation,
        section: '1985(3)'
      },
      {
        type: FullLawCitation,
        section: '1988'
      }
    ]
  )
})
```

### Edge Cases
- Mixed section types in one citation
- Nested parentheticals
- Multiple §§ patterns in one paragraph
- Malformed section lists
- Very long section lists

## Performance Considerations

### Optimization Strategies

1. **Regex Compilation**: Pre-compile all section patterns
2. **Range Processing**: Limit search range after base token (max 500 characters)
3. **Pattern Ordering**: Apply more specific patterns first to avoid conflicts
4. **Early Termination**: Stop processing when no more sections found

### Memory Management

- Reuse base citation metadata objects where possible
- Generate section group IDs efficiently
- Clean up temporary parsing objects

## Implementation Phases

### Phase 1: Enhanced Pattern Recognition
- Implement new regex patterns
- Update `MultipleSectionParser` class
- Add basic test coverage

### Phase 2: Advanced Section Handling  
- Add range section support
- Implement complex subsection parsing
- Handle parenthetical classification

### Phase 3: Integration & Testing
- Integrate with existing extraction flow
- Comprehensive test suite
- Performance optimization

### Phase 4: Documentation & Examples
- Update API documentation
- Add usage examples
- Migration guide for users

## Backward Compatibility

### Existing API Preservation
- All existing citation extraction APIs remain unchanged
- Existing simple multiple section cases continue to work
- New functionality is additive, not breaking

### Migration Path
- No migration needed for existing code
- New features are opt-in through enhanced parsing
- Existing test suite continues to pass

## Conclusion

This design provides a robust, extensible solution for parsing complex multiple section patterns while maintaining full backward compatibility. The approach builds on the existing architecture and provides clear paths for future enhancements.

The key benefits:
- **Comprehensive Pattern Support**: Handles all identified complex patterns
- **Maintainable Architecture**: Builds on existing structures
- **Performance Optimized**: Efficient parsing algorithms
- **Fully Tested**: Comprehensive test coverage for edge cases
- **Future-Proof**: Extensible for new pattern types