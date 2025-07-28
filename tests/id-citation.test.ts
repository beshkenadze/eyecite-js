import { describe, expect, test } from 'bun:test'
import { getCitations } from '../src/find'
import { IdCitation, FullCaseCitation } from '../src/models'

describe('IdCitation extraction', () => {
  test('extracts Id citation with semicolon', () => {
    const text = "Id.; see also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58-59 (D.D.C. 2006)."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(2)
    
    // First citation should be IdCitation
    const idCitation = citations[0]
    expect(idCitation).toBeInstanceOf(IdCitation)
    expect(idCitation.matchedText()).toBe('Id.;')
    expect(idCitation.span()).toEqual({ start: 0, end: 4 })
    
    // Second citation should be FullCaseCitation
    const caseCitation = citations[1]
    expect(caseCitation).toBeInstanceOf(FullCaseCitation)
    expect(caseCitation.matchedText()).toBe('453 F. Supp. 2d 44')
  })
  
  test('extracts simple Id citation', () => {
    const text = "Id."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    expect(citation).toBeInstanceOf(IdCitation)
    expect(citation.matchedText()).toBe('Id.')
    expect(citation.span()).toEqual({ start: 0, end: 3 })
  })
  
  test('extracts Id citation with colon', () => {
    const text = "Id.: the court held that..."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    expect(citation).toBeInstanceOf(IdCitation)
    expect(citation.matchedText()).toBe('Id.:')
    expect(citation.span()).toEqual({ start: 0, end: 4 })
  })
  
  test('extracts Id citation with comma and pin cite', () => {
    const text = "Id., at 25."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    expect(citation).toBeInstanceOf(IdCitation)
    expect(citation.matchedText()).toBe('Id.,')
    expect(citation.metadata.pinCite).toBe('at 25')
    // The span includes the pin cite
    expect(citation.span()).toEqual({ start: 0, end: 10 })
  })
  
  test('extracts ibid citation', () => {
    const text = "Ibid."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    expect(citation).toBeInstanceOf(IdCitation)
    expect(citation.matchedText()).toBe('Ibid.')
    expect(citation.span()).toEqual({ start: 0, end: 5 })
  })
  
  test('does not extract Id in middle of word', () => {
    const text = "Consider the identification process."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(0)
  })
  
  test('extracts Id citation with pin cite', () => {
    const text = "Id. at 123."
    const citations = getCitations(text)
    
    expect(citations).toHaveLength(1)
    const citation = citations[0]
    expect(citation).toBeInstanceOf(IdCitation)
    expect(citation.matchedText()).toBe('Id.')
    expect(citation.metadata.pinCite).toBe('at 123')
    // The span should include the pin cite
    expect(citation.span().end).toBeGreaterThan(3)
  })
})