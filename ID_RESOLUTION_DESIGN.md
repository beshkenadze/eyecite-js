# Id. Citation Resolution Design

## Overview

This document outlines the technical design for implementing Id. citation resolution in eyecite-js. Id. citations are shorthand references that refer to the immediately preceding citation, with variations like "Id. § 123" that reference different sections of the same source.

## Requirements

1. **Plain Id. Citations**: "Id." refers to exactly the same citation as the previous one
2. **Id. with Section**: "Id. § 123" refers to the same source but a different section
3. **Id. with Pin Cite**: "Id. at 25" refers to the same source but a different page
4. **Context Tracking**: Must maintain citation context across the document
5. **Law Citation Support**: Support Id. references to statutes (e.g., "Id. § 456" referring to a previous U.S.C. citation)

## Architecture

### New Classes

#### 1. IdLawCitation
A new citation class to handle "Id. § 123" patterns that reference law citations.

```typescript
// In src/models/citations.ts
export class IdLawCitation extends CitationBase {
  section?: string
  
  constructor(
    token: Token,
    index: number,
    metadata?: Partial<Metadata>,
    spanStart?: number,
    spanEnd?: number,
    fullSpanStart?: number,
    fullSpanEnd?: number,
  ) {
    super(token, index, metadata, spanStart, spanEnd, fullSpanStart, fullSpanEnd)
    this.section = token.groups?.section
  }
  
  hash(): string {
    // Always unique for proper resolution tracking
    return `unique-${Date.now()}-${Math.random()}`
  }
  
  formatted(): string {
    const parts = ['id.']
    if (this.section) {
      parts.push(` § ${this.section}`)
    }
    if (this.metadata.pinCite) {
      parts.push(`, ${this.metadata.pinCite}`)
    }
    return parts.join('')
  }
}
```

### Modified Classes/Files

#### 1. src/tokenizers/extractors.ts
Update to create a new extractor for Id. law citations:

```typescript
// Add new regex for Id. law citations
const ID_LAW_REGEX = spaceBoundariesRe('(id\\.[,;:]?)\\s*§\\s*(?<section>\\d+(?:[\\-.:]\\d+)*)')

// In createSpecialExtractors():
new BaseTokenExtractor(ID_LAW_REGEX, IdLawToken, {}, 2), // re.I = 2
```

#### 2. src/models/tokens.ts
Add new token type:

```typescript
export class IdLawToken extends Token {
  static fromMatch(match: RegExpExecArray, _extra: Record<string, unknown>, offset = 0): IdLawToken {
    const matchText = match[0]
    const start = (match.index || 0) + offset
    const end = start + matchText.length
    const groups = match.groups || {}
    
    return new IdLawToken(matchText, start, end, groups)
  }
}
```

#### 3. src/find.ts
Update citation extraction logic:

```typescript
// In getCitations(), add new case:
else if (token instanceof IdLawToken) {
  citation = extractIdLawCitation(document, i)
}

// Add new extraction function:
function extractIdLawCitation(document: Document, index: number): IdLawCitation {
  const token = document.words[index] as IdLawToken
  let spanEnd = token.end
  let pinCite: string | undefined
  let parenthetical: string | undefined
  
  // Extract pin cite and parenthetical similar to regular Id citations
  // ... (pin cite extraction logic)
  
  return new IdLawCitation(
    token,
    index,
    {
      pinCite,
      parenthetical,
    },
    undefined,
    spanEnd,
    token.start,
    spanEnd,
  )
}
```

#### 4. src/resolve.ts
Enhance the resolution algorithm to handle law citation references:

```typescript
// Update resolveIdCitation function:
function resolveIdCitation(
  idCitation: IdCitation | IdLawCitation,
  lastResolution: ResourceType | null,
  resolutions: Resolutions,
): ResourceType | null {
  // If last resolution failed, id. cite should also fail
  if (!lastResolution) {
    return null
  }

  // Get the citations for the last resolution
  const citations = resolutions.get(lastResolution)
  if (!citations || citations.length === 0) {
    return null
  }

  const fullCite = citations[0] as FullCitation
  
  // Special handling for IdLawCitation
  if (idCitation instanceof IdLawCitation && idCitation.section) {
    // If the Id. citation has a section, it references a different section
    // of the same law. We should NOT return the same resource but rather
    // indicate this is a different section reference
    
    // For law citations, check if the previous citation was a law citation
    if (fullCite instanceof FullLawCitation) {
      // This is a valid Id. law citation reference
      // Store the section reference in the Id citation's metadata
      idCitation.metadata.resolvedReporter = fullCite.reporter
      idCitation.metadata.resolvedVolume = fullCite.volume
      idCitation.metadata.resolvedSection = idCitation.section
      
      // Return the same resource as it's the same law, just different section
      return lastResolution
    } else {
      // Invalid: Id. § X can only reference law citations
      return null
    }
  }
  
  // For regular Id. citations, check pin cite validity
  if (hasInvalidPinCite(fullCite, idCitation)) {
    return null
  }

  return lastResolution
}

// In resolveCitations(), update the id citation handling:
else if (citation instanceof IdCitationClass || citation instanceof IdLawCitation) {
  resolution = idResolver(citation, lastResolution, resolutions)
}
```

## Resolution Algorithm

### Enhanced Context Tracking

The resolution algorithm maintains a "resolution context" that tracks:

1. **Last Resolved Citation**: The most recently resolved citation of any type
2. **Last Resolved Resource**: The resource (document/case/statute) that was resolved
3. **Citation Type Compatibility**: Ensures Id. law citations only resolve to law citations

### Resolution Process

```typescript
interface ResolutionContext {
  lastCitation: CitationBase | null
  lastResource: ResourceType | null
  lastCitationType: 'case' | 'law' | 'journal' | null
}

function resolveIdCitation(
  idCitation: IdCitation | IdLawCitation,
  context: ResolutionContext,
): ResourceType | null {
  // 1. Check if there's a previous citation
  if (!context.lastResource) {
    return null
  }
  
  // 2. Type compatibility check for IdLawCitation
  if (idCitation instanceof IdLawCitation) {
    if (context.lastCitationType !== 'law') {
      return null // Id. § X can only reference law citations
    }
  }
  
  // 3. Pin cite validation for case citations
  if (context.lastCitationType === 'case' && idCitation instanceof IdCitation) {
    if (hasInvalidPinCite(context.lastCitation as FullCaseCitation, idCitation)) {
      return null
    }
  }
  
  // 4. Copy metadata from the resolved citation
  if (idCitation instanceof IdLawCitation && context.lastCitation instanceof FullLawCitation) {
    idCitation.metadata.resolvedReporter = context.lastCitation.reporter
    idCitation.metadata.resolvedVolume = context.lastCitation.volume
    idCitation.metadata.resolvedTitle = context.lastCitation.metadata.title
  }
  
  return context.lastResource
}
```

## API Usage Examples

### Basic Id. Citation
```typescript
const text = "See 42 U.S.C. § 1983. Id. provides a cause of action."
const citations = getCitations(text)
const resolved = resolveCitations(citations)
// citations[1] (Id.) resolves to the same resource as citations[0] (42 U.S.C. § 1983)
```

### Id. with Different Section
```typescript
const text = "See 42 U.S.C. § 1983. Id. § 1985 addresses conspiracies."
const citations = getCitations(text)
const resolved = resolveCitations(citations)
// citations[1] (Id. § 1985) resolves to the same U.S.C. title but different section
```

### Id. with Pin Cite
```typescript
const text = "Smith v. Jones, 123 F.3d 456, 459 (2d Cir. 2020). Id. at 461."
const citations = getCitations(text)
const resolved = resolveCitations(citations)
// citations[1] (Id. at 461) resolves to the same case but different page
```

### Invalid Id. Reference
```typescript
const text = "Smith v. Jones, 123 F.3d 456 (2d Cir. 2020). Id. § 123."
const citations = getCitations(text)
const resolved = resolveCitations(citations)
// citations[1] (Id. § 123) fails to resolve - can't use § with case citations
```

## Data Flow

1. **Tokenization**: 
   - IdToken captures "Id." patterns
   - IdLawToken captures "Id. § X" patterns

2. **Extraction**:
   - extractIdCitation handles regular Id. citations with pin cites
   - extractIdLawCitation handles Id. with section references

3. **Resolution**:
   - Track citation type in resolution context
   - Validate type compatibility (Id. § only for laws)
   - Copy relevant metadata to resolved Id. citations

4. **Output**:
   - Id. citations maintain reference to their antecedent
   - Metadata includes resolved citation details
   - Formatting preserves the Id. notation

## Testing Strategy

1. **Unit Tests**:
   - Test IdLawCitation class creation and formatting
   - Test IdLawToken extraction patterns
   - Test resolution type compatibility

2. **Integration Tests**:
   - Test full pipeline with mixed citation types
   - Test invalid Id. references (type mismatches)
   - Test multiple Id. citations in sequence
   - Test Id. citations with various pin cite formats

3. **Edge Cases**:
   - Id. at beginning of document (no antecedent)
   - Id. after unresolved citation
   - Multiple Id. citations referencing same source
   - Id. with complex section numbers (e.g., "Id. § 123.45(a)(2)")

## Implementation Notes

1. **Backward Compatibility**: The design extends existing classes without breaking changes
2. **Performance**: Resolution remains O(n) as we process citations sequentially
3. **Extensibility**: The pattern can be extended for other Id. variations (e.g., "Id. ¶ 123" for regulations)
4. **Error Handling**: Invalid Id. references return null rather than throwing errors

## Future Enhancements

1. **Id. with Subsections**: Support "Id. § 123(a)(2)" patterns
2. **Id. for Regulations**: Support "Id. ¶ 123" for C.F.R. citations
3. **Contextual Id.**: Support "Id. ch. 5" for chapter references
4. **Cross-Reference Validation**: Validate that referenced sections exist in the statute