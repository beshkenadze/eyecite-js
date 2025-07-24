/**
 * Simple function to wrap legal citations with <a> tags using eyecite-js
 * Skips IdCitation, UnknownCitation, and other less useful citation types
 */
import { getCitations } from '@beshkenadze/eyecite';
import { 
  FullCaseCitation, 
  FullLawCitation, 
  FullJournalCitation,
  ShortCaseCitation,
  DOLOpinionCitation
} from '@beshkenadze/eyecite/models';

export function wrapCitations(text: string): {
  original: string;
  wrapped: string;
} {
  // Get all citations from the text
  const citations = getCitations(text);

  // Filter to only include useful citation types
  const usefulCitations = citations.filter((citation) => {
    return (
      citation instanceof FullCaseCitation ||
      citation instanceof FullLawCitation ||
      citation instanceof FullJournalCitation ||
      citation instanceof ShortCaseCitation ||
      citation instanceof DOLOpinionCitation
    );
  });

  // Start with the original text
  let wrapped = text;

  // Replace each citation with wrapped version
  usefulCitations.forEach((citation) => {
    const matchedText = citation.matchedText();
    const type = citation.constructor.name;
    wrapped = wrapped.replaceAll(matchedText, `<a data-citation-type="${type}">${matchedText}</a>`);
  });

  return {
    original: text,
    wrapped: wrapped,
  };
}

// Alternative: Using a skip list approach
export function wrapCitationsWithSkipList(text: string): {
  original: string;
  wrapped: string;
} {
  // Citation types to skip
  const skipTypes = ['IdCitation', 'UnknownCitation', 'SupraCitation', 'ReferenceCitation'];
  
  // Get all citations from the text
  const citations = getCitations(text);

  // Filter out unwanted citation types
  const usefulCitations = citations.filter((citation) => {
    return !skipTypes.includes(citation.constructor.name);
  });

  // Start with the original text
  let wrapped = text;

  // Replace each citation with wrapped version
  usefulCitations.forEach((citation) => {
    const matchedText = citation.matchedText();
    const type = citation.constructor.name;
    wrapped = wrapped.replaceAll(matchedText, `<a data-citation-type="${type}">${matchedText}</a>`);
  });

  return {
    original: text,
    wrapped: wrapped,
  };
}