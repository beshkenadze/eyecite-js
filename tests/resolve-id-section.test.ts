import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { FullLawCitation, IdCitation } from '../src/models'
import { resolveCitationsWithIdSubstitution } from '../src/resolve'

describe('Id Citation Resolution with Section Substitution', () => {
  test('should resolve Id. § citations with section substitution', () => {
    // Test case matching the example:
    // [206]: 29 C.F.R. § 778.113(a)
    // [207]: Id. § 778.114(a)(5)
    // [208]: Id.
    const text = '29 C.F.R. § 778.113(a). Id. § 778.114(a)(5). Id.'
    const citations = getCitations(text)

    expect(citations).toHaveLength(3)
    
    // First should be FullLawCitation
    expect(citations[0]).toBeInstanceOf(FullLawCitation)
    const lawCite = citations[0] as FullLawCitation
    expect(lawCite.volume).toBe('29')
    expect(lawCite.reporter).toBe('C.F.R.')
    expect(lawCite.section).toBe('778.113')
    
    // Second should be IdCitation with section reference
    expect(citations[1]).toBeInstanceOf(IdCitation)
    const idWithSection = citations[1] as IdCitation
    expect(idWithSection.metadata.pinCite).toBe('§ 778.114(a)(5)')
    
    // Third should be plain IdCitation
    expect(citations[2]).toBeInstanceOf(IdCitation)
    const plainId = citations[2] as IdCitation
    expect(plainId.metadata.pinCite).toBeUndefined()

    // Now resolve the citations
    const resolutions = resolveCitationsWithIdSubstitution(citations)
    
    // Should have 2 resources: original and substituted
    expect(resolutions.size).toBe(2)
    
    const resources = Array.from(resolutions.keys())
    const firstResource = resources[0]
    const secondResource = resources[1]
    
    // First resource should have the original law citation
    const firstCitations = resolutions.get(firstResource)
    expect(firstCitations).toHaveLength(1)
    expect(firstCitations![0]).toBe(citations[0])
    
    // Second resource should have both Id citations
    // The first Id creates a new resource with substituted section
    // The second Id refers to that same resource
    const secondCitations = resolutions.get(secondResource)
    expect(secondCitations).toHaveLength(2)
    expect(secondCitations![0]).toBe(citations[1])
    expect(secondCitations![1]).toBe(citations[2])
    
    // Verify the substituted section
    const substitutedCitation = secondResource.citation as FullLawCitation
    expect(substitutedCitation.section).toBe('778.114(a)(5)')
  })

  test('should handle Id. without antecedent', () => {
    const text = 'Id. at 25.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    expect(citations[0]).toBeInstanceOf(IdCitation)
    
    const resolutions = resolveCitationsWithIdSubstitution(citations)
    
    // Should not resolve without antecedent
    expect(resolutions.size).toBe(0)
  })

  test('should handle multiple Id. citations in sequence', () => {
    const text = '29 C.F.R. § 778.113(a). Id. § 778.114(a). Id. § 778.115. Id.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(4)
    
    const resolutions = resolveCitationsWithIdSubstitution(citations)
    
    // Should have 3 resources: original law citation + 2 different section substitutions
    expect(resolutions.size).toBe(3)
  })

  test('should handle Id. after case citation', () => {
    const text = 'Smith v. Jones, 123 F.3d 456 (2d Cir. 2000). Id. at 458.'
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    
    const resolutions = resolveCitationsWithIdSubstitution(citations)
    
    // Both should resolve to same resource (no section substitution)
    expect(resolutions.size).toBe(1)
    
    const resource = Array.from(resolutions.keys())[0]
    const resolvedCitations = resolutions.get(resource)
    expect(resolvedCitations).toHaveLength(2)
  })

  test('should track last non-Id citation through Id. chains', () => {
    const text = '29 C.F.R. § 778.113. Id. Id. at (a). Smith v. Jones, 123 F.3d 456. Id. at 458.'
    const citations = getCitations(text)
    
    const resolutions = resolveCitationsWithIdSubstitution(citations)
    
    // First group: law citation + 2 Id citations
    // Second group: case citation + 1 Id citation  
    const resourceArray = Array.from(resolutions.keys())
    expect(resourceArray.length).toBeGreaterThanOrEqual(2)
  })

  test('should handle complex citation patterns', () => {
    const text = `
      See 29 C.F.R. § 778.113(a) (the "statutory method"). 
      Id. § 778.114(a)(5).
      Compare id., with 42 U.S.C. § 2000e.
      Id. § 2000e-2(a).
    `
    const citations = getCitations(text)
    
    // Should find: 1 CFR citation, 2 Id citations, 1 USC citation, 1 Id citation
    expect(citations.length).toBeGreaterThanOrEqual(4)
    
    const resolutions = resolveCitationsWithIdSubstitution(citations)
    
    // Should create separate resources for different section substitutions
    expect(resolutions.size).toBeGreaterThanOrEqual(3)
  })
})