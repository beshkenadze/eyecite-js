import type {
  CitationBase,
  IdCitation,
  ReferenceCitation,
  ResourceType,
  ShortCaseCitation,
  SupraCitation,
} from './models'
import {
  FullCaseCitation,
  type FullCitation,
  FullJournalCitation,
  FullLawCitation,
  IdCitation as IdCitationClass,
  ReferenceCitation as ReferenceCitationClass,
  Resource,
  ShortCaseCitation as ShortCaseCitationClass,
  SupraCitation as SupraCitationClass,
} from './models'
import { stripPunct } from './utils'

// Type aliases
export type ResolvedFullCite = [FullCitation, ResourceType]
export type ResolvedFullCites = ResolvedFullCite[]
export type Resolutions = Map<ResourceType, CitationBase[]>

// Skip id. citations that imply a page length longer than this
const MAX_OPINION_PAGE_COUNT = 150

/**
 * Default resolution function for full citations.
 * Creates a generic Resource object for the citation.
 */
export function resolveFullCitation(fullCitation: FullCitation): Resource {
  return new Resource(fullCitation)
}

/**
 * Filter citations by matching antecedent text
 */
function filterByMatchingAntecedent(
  resolvedFullCites: ResolvedFullCites,
  antecedentGuess: string,
): ResourceType | null {
  const matches: ResourceType[] = []
  const ag = stripPunct(antecedentGuess)

  for (const [fullCitation, resource] of resolvedFullCites) {
    if (!(fullCitation instanceof FullCaseCitation)) {
      continue
    }

    if (
      (fullCitation.metadata.defendant && ag && fullCitation.metadata.defendant.includes(ag)) ||
      (fullCitation.metadata.plaintiff && ag && fullCitation.metadata.plaintiff.includes(ag))
    ) {
      matches.push(resource)
    }
  }

  // Remove duplicates and only accept if one candidate remains
  const uniqueMatches = Array.from(new Set(matches))
  return uniqueMatches.length === 1 ? uniqueMatches[0] : null
}

/**
 * Filter reference citations by matching plaintiff/defendant names
 */
function filterByMatchingPlaintiffOrDefendantOrResolvedNames(
  resolvedFullCites: ResolvedFullCites,
  referenceCitation: ReferenceCitation,
): ResourceType | null {
  const matches: ResourceType[] = []

  // Get reference values from the citation
  const referenceValues = new Set<string>()
  const nameFields = [
    'plaintiff',
    'defendant',
    'resolvedCaseNameShort',
    'resolvedCaseName',
  ] as const

  for (const key of nameFields) {
    const value = referenceCitation.metadata[key]
    if (value) {
      referenceValues.add(value)
    }
  }

  // Check each full citation for matching values
  for (const [citation, resource] of resolvedFullCites) {
    const fullCiteValues = new Set<string>()

    // Collect non-null values from citation metadata
    for (const value of Object.values(citation.metadata)) {
      if (value && typeof value === 'string') {
        fullCiteValues.add(value)
      }
    }

    // Check for intersection
    const hasMatch = Array.from(referenceValues).some((refValue) =>
      Array.from(fullCiteValues).includes(refValue),
    )

    if (hasMatch) {
      matches.push(resource)
    }
  }

  const uniqueMatches = Array.from(new Set(matches))
  return uniqueMatches.length === 1 ? uniqueMatches[0] : null
}

/**
 * Check if an id citation has an invalid pin cite for the given full citation
 */
function hasInvalidPinCite(fullCite: FullCitation, idCite: IdCitation): boolean {
  // If full cite has a known missing page, this pin cite can't be correct
  if (fullCite instanceof FullCaseCitation && fullCite.groups.page === null) {
    return true
  }

  // If no pin cite, we're fine
  if (!idCite.metadata.pinCite) {
    return false
  }

  // If full cite has no page (such as a statute), we don't know what to
  // check, so assume we're fine
  const page = fullCite.groups.page
  if (!page || !/^\d+$/.test(page)) {
    return false
  }

  // Parse full cite page
  const pageNum = parseInt(page)

  // Parse short cite pin
  const match = idCite.metadata.pinCite.match(/^(?:at )?(\d+)/)
  if (!match) {
    // If pin cite doesn't start with a digit, assume it is invalid
    return true
  }
  const pinCite = parseInt(match[1])

  // Check page range
  return pinCite < pageNum || pinCite > pageNum + MAX_OPINION_PAGE_COUNT
}

/**
 * Resolve short case citations by matching reporter and volume
 */
function resolveShortcaseCitation(
  shortCitation: ShortCaseCitation,
  resolvedFullCites: ResolvedFullCites,
): ResourceType | null {
  const candidates: ResolvedFullCites = []

  for (const [fullCitation, resource] of resolvedFullCites) {
    if (
      fullCitation instanceof FullCaseCitation &&
      shortCitation.correctedReporter() === fullCitation.correctedReporter() &&
      shortCitation.groups.volume === fullCitation.groups.volume
    ) {
      candidates.push([fullCitation, resource])
    }
  }

  // Remove duplicates and only accept if one candidate remains
  const uniqueResources = new Set(candidates.map(([_, resource]) => resource))
  if (uniqueResources.size === 1) {
    return candidates[0][1]
  }

  // Otherwise, if there is an antecedent guess, try to refine further
  if (shortCitation.metadata.antecedentGuess) {
    return filterByMatchingAntecedent(candidates, shortCitation.metadata.antecedentGuess)
  }

  return null
}

/**
 * Resolve supra citations by matching antecedent text
 */
function resolveSupraCitation(
  supraCitation: SupraCitation,
  resolvedFullCites: ResolvedFullCites,
): ResourceType | null {
  // If no guess, can't do anything
  if (!supraCitation.metadata.antecedentGuess) {
    return null
  }

  return filterByMatchingAntecedent(resolvedFullCites, supraCitation.metadata.antecedentGuess)
}

/**
 * Resolve reference citations by matching names
 */
function resolveReferenceCitation(
  referenceCitation: ReferenceCitation,
  resolvedFullCites: ResolvedFullCites,
): ResourceType | null {
  if (
    !referenceCitation.metadata.defendant &&
    !referenceCitation.metadata.plaintiff &&
    !referenceCitation.metadata.resolvedCaseNameShort &&
    !referenceCitation.metadata.resolvedCaseName
  ) {
    return null
  }

  return filterByMatchingPlaintiffOrDefendantOrResolvedNames(resolvedFullCites, referenceCitation)
}

/**
 * Resolve id citations to the previously resolved citation
 */
function resolveIdCitation(
  idCitation: IdCitation,
  lastResolution: ResourceType | null,
  resolutions: Resolutions,
): ResourceType | null {
  // If last resolution failed, id. cite should also fail
  if (!lastResolution) {
    return null
  }

  // Filter out citations based on pin cite
  const citations = resolutions.get(lastResolution)
  if (!citations || citations.length === 0) {
    return null
  }

  const fullCite = citations[0] as FullCitation
  if (hasInvalidPinCite(fullCite, idCitation)) {
    return null
  }

  return lastResolution
}

/**
 * Enhanced Id. citation resolution that handles section substitution
 * 
 * This resolver tracks the last non-Id citation and properly handles:
 * - "Id. § 123" by substituting the section into the antecedent
 * - Plain "Id." by referring to the last resolution
 * - Resolution chains where Id. refers to another Id.
 */
export function resolveIdCitationWithSectionSubstitution(
  idCitation: IdCitation,
  lastNonIdCitation: CitationBase | null,
  lastResolution: ResourceType | null,
  resolutions: Resolutions,
): ResourceType | null {
  // No antecedent available
  if (!lastNonIdCitation || !lastResolution) {
    return null
  }

  // Find the base citation to use as a template
  // This should be the last non-Id citation, not from the last resolution
  let fullCite: FullCitation | null = null
  
  if (lastNonIdCitation instanceof FullCaseCitation || 
      lastNonIdCitation instanceof FullLawCitation || 
      lastNonIdCitation instanceof FullJournalCitation) {
    fullCite = lastNonIdCitation as FullCitation
  } else {
    // If the last non-Id wasn't a full citation, get it from the resolution
    const citations = resolutions.get(lastResolution)
    if (!citations || citations.length === 0) {
      return null
    }
    fullCite = citations[0] as FullCitation
  }

  // Check if the Id. citation has a section reference
  const idPinCite = idCitation.metadata.pinCite
  if (idPinCite && idPinCite.startsWith('§')) {
    // This is an "Id. § XXX" pattern - we need to substitute the section
    if (fullCite instanceof FullLawCitation) {
      // Extract the section number from the Id. citation
      const sectionMatch = idPinCite.match(/§\s*([\d.]+(?:\([a-zA-Z0-9]+\))*(?:\(\d+\))*)/)
      if (sectionMatch) {
        // Create a deep copy of the full citation with the new section
        const substitutedCitation = new FullLawCitation(
          fullCite.token,
          fullCite.index,
          fullCite.exactEditions,
          fullCite.variationEditions,
          { ...fullCite.metadata },
        )
        
        // Copy all the groups and update the section
        substitutedCitation.groups = { ...fullCite.groups, section: sectionMatch[1] }
        
        // Copy span information
        substitutedCitation.spanStart = fullCite.spanStart
        substitutedCitation.spanEnd = fullCite.spanEnd
        substitutedCitation.fullSpanStart = fullCite.fullSpanStart
        substitutedCitation.fullSpanEnd = fullCite.fullSpanEnd
        
        // Create a new resource for this substituted citation
        const newResource = new Resource(substitutedCitation)
        return newResource
      }
    }
  }

  // For regular Id. citations without section substitution
  if (hasInvalidPinCite(fullCite, idCitation)) {
    return null
  }

  return lastResolution
}

/**
 * Resolve a list of citations to their associated resources
 *
 * This function assumes that the given list of citations is ordered in the
 * order that they were extracted from the text (i.e., assumes that supra
 * citations and id citations can only refer to previous references).
 *
 * @param citations List of citations to resolve
 * @param resolvers Optional custom resolution functions
 * @returns Map of resources to their associated citations
 */
export function resolveCitations(
  citations: CitationBase[],
  resolvers: {
    resolveFullCitation?: (citation: FullCitation) => ResourceType
    resolveShortcaseCitation?: (
      citation: ShortCaseCitation,
      resolved: ResolvedFullCites,
    ) => ResourceType | null
    resolveSupraCitation?: (
      citation: SupraCitation,
      resolved: ResolvedFullCites,
    ) => ResourceType | null
    resolveReferenceCitation?: (
      citation: ReferenceCitation,
      resolved: ResolvedFullCites,
    ) => ResourceType | null
    resolveIdCitation?: (
      citation: IdCitation,
      lastResolution: ResourceType | null,
      resolutions: Resolutions,
    ) => ResourceType | null
  } = {},
): Resolutions {
  // Use provided resolvers or defaults
  const {
    resolveFullCitation: fullResolver = resolveFullCitation,
    resolveShortcaseCitation: shortResolver = resolveShortcaseCitation,
    resolveSupraCitation: supraResolver = resolveSupraCitation,
    resolveReferenceCitation: referenceResolver = resolveReferenceCitation,
    resolveIdCitation: idResolver = resolveIdCitation,
  } = resolvers

  // Dict of all citation resolutions
  const resolutions: Resolutions = new Map()

  // Dict mapping full citations to their resolved resources
  const resolvedFullCites: ResolvedFullCites = []

  // The resource of the most recently resolved citation, if any
  let lastResolution: ResourceType | null = null

  // Iterate over each citation and attempt to resolve it to a resource
  for (const citation of citations) {
    let resolution: ResourceType | null = null

    // If the citation is a full citation, try to resolve it
    if (
      citation instanceof FullCaseCitation ||
      citation instanceof FullLawCitation ||
      citation instanceof FullJournalCitation
    ) {
      resolution = fullResolver(citation as FullCitation)
      resolvedFullCites.push([citation as FullCitation, resolution])
    }
    // If the citation is a short case citation, try to resolve it
    else if (citation instanceof ShortCaseCitationClass) {
      resolution = shortResolver(citation, resolvedFullCites)
    }
    // If the citation is a supra citation, try to resolve it
    else if (citation instanceof SupraCitationClass) {
      resolution = supraResolver(citation, resolvedFullCites)
    }
    // If the citation is a reference citation, try to resolve it
    else if (citation instanceof ReferenceCitationClass) {
      resolution = referenceResolver(citation, resolvedFullCites)
    }
    // If the citation is an id citation, try to resolve it
    else if (citation instanceof IdCitationClass) {
      resolution = idResolver(citation, lastResolution, resolutions)
    }
    // If the citation is to an unknown document, ignore for now
    else {
      resolution = null
    }

    lastResolution = resolution
    if (resolution) {
      // Record the citation in the appropriate list
      if (!resolutions.has(resolution)) {
        resolutions.set(resolution, [])
      }
      resolutions.get(resolution)?.push(citation)
    }
  }

  return resolutions
}

/**
 * Enhanced citation resolution with section substitution for Id. citations
 * 
 * This function resolves citations while properly handling Id. citations that
 * reference sections (e.g., "Id. § 778.114(a)(5)"). It tracks the last non-Id
 * citation to use as the antecedent for section substitution.
 * 
 * @param citations List of citations to resolve
 * @param resolvers Optional custom resolution functions
 * @returns Map of resources to their associated citations
 */
export function resolveCitationsWithIdSubstitution(
  citations: CitationBase[],
  resolvers: {
    resolveFullCitation?: (citation: FullCitation) => ResourceType
    resolveShortcaseCitation?: (
      citation: ShortCaseCitation,
      resolved: ResolvedFullCites,
    ) => ResourceType | null
    resolveSupraCitation?: (
      citation: SupraCitation,
      resolved: ResolvedFullCites,
    ) => ResourceType | null
    resolveReferenceCitation?: (
      citation: ReferenceCitation,
      resolved: ResolvedFullCites,
    ) => ResourceType | null
    resolveIdCitation?: (
      citation: IdCitation,
      lastNonIdCitation: CitationBase | null,
      lastResolution: ResourceType | null,
      resolutions: Resolutions,
    ) => ResourceType | null
  } = {},
): Resolutions {
  // Use provided resolvers or defaults
  const {
    resolveFullCitation: fullResolver = resolveFullCitation,
    resolveShortcaseCitation: shortResolver = resolveShortcaseCitation,
    resolveSupraCitation: supraResolver = resolveSupraCitation,
    resolveReferenceCitation: referenceResolver = resolveReferenceCitation,
    resolveIdCitation: idResolver = resolveIdCitationWithSectionSubstitution,
  } = resolvers

  // Dict of all citation resolutions
  const resolutions: Resolutions = new Map()

  // Dict mapping full citations to their resolved resources
  const resolvedFullCites: ResolvedFullCites = []

  // The resource of the most recently resolved citation, if any
  let lastResolution: ResourceType | null = null

  // The last non-Id citation encountered
  let lastNonIdCitation: CitationBase | null = null

  // Iterate over each citation and attempt to resolve it to a resource
  for (const citation of citations) {
    let resolution: ResourceType | null = null

    // Track non-Id citations
    if (!(citation instanceof IdCitationClass)) {
      lastNonIdCitation = citation
    }

    // If the citation is a full citation, try to resolve it
    if (
      citation instanceof FullCaseCitation ||
      citation instanceof FullLawCitation ||
      citation instanceof FullJournalCitation
    ) {
      resolution = fullResolver(citation as FullCitation)
      resolvedFullCites.push([citation as FullCitation, resolution])
    }
    // If the citation is a short case citation, try to resolve it
    else if (citation instanceof ShortCaseCitationClass) {
      resolution = shortResolver(citation, resolvedFullCites)
    }
    // If the citation is a supra citation, try to resolve it
    else if (citation instanceof SupraCitationClass) {
      resolution = supraResolver(citation, resolvedFullCites)
    }
    // If the citation is a reference citation, try to resolve it
    else if (citation instanceof ReferenceCitationClass) {
      resolution = referenceResolver(citation, resolvedFullCites)
    }
    // If the citation is an id citation, try to resolve it
    else if (citation instanceof IdCitationClass) {
      resolution = idResolver(citation, lastNonIdCitation, lastResolution, resolutions)
    }
    // If the citation is to an unknown document, ignore for now
    else {
      resolution = null
    }

    lastResolution = resolution
    if (resolution) {
      // Record the citation in the appropriate list
      if (!resolutions.has(resolution)) {
        resolutions.set(resolution, [])
      }
      resolutions.get(resolution)?.push(citation)
    }
  }

  return resolutions
}
