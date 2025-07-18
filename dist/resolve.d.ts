import type { CitationBase, FullCitation, IdCitation, ReferenceCitation, ResourceType, ShortCaseCitation, SupraCitation } from './models';
import { Resource } from './models';
export type ResolvedFullCite = [FullCitation, ResourceType];
export type ResolvedFullCites = ResolvedFullCite[];
export type Resolutions = Map<ResourceType, CitationBase[]>;
/**
 * Default resolution function for full citations.
 * Creates a generic Resource object for the citation.
 */
export declare function resolveFullCitation(fullCitation: FullCitation): Resource;
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
export declare function resolveCitations(citations: CitationBase[], resolvers?: {
    resolveFullCitation?: (citation: FullCitation) => ResourceType;
    resolveShortcaseCitation?: (citation: ShortCaseCitation, resolved: ResolvedFullCites) => ResourceType | null;
    resolveSupraCitation?: (citation: SupraCitation, resolved: ResolvedFullCites) => ResourceType | null;
    resolveReferenceCitation?: (citation: ReferenceCitation, resolved: ResolvedFullCites) => ResourceType | null;
    resolveIdCitation?: (citation: IdCitation, lastResolution: ResourceType | null, resolutions: Resolutions) => ResourceType | null;
}): Resolutions;
//# sourceMappingURL=resolve.d.ts.map