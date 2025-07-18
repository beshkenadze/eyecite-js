#!/usr/bin/env bun

import { annotateCitations, getCitations, cleanText } from '../src'

// Example 1: Basic annotation
console.log('=== Example 1: Basic Annotation ===')
const text1 = 'See Lissner v. Test, 1 U.S. 1 (1982) for more details.'
const annotated1 = annotateCitations(text1)
console.log('Original:', text1)
console.log('Annotated:', annotated1)
console.log()

// Example 2: Multiple citations
console.log('=== Example 2: Multiple Citations ===')
const text2 = 'Compare 1 U.S. 1 with 2 F.3d 2 and 3 Cal. App. 3d 3.'
const annotated2 = annotateCitations(text2)
console.log('Original:', text2)
console.log('Annotated:', annotated2)
console.log()

// Example 3: HTML content
console.log('=== Example 3: HTML Content ===')
const html = '<p>See <em>Lissner v. Test</em>, 1 U.S. 1 (1982).</p>'
const annotatedHtml = annotateCitations(html)
console.log('Original:', html)
console.log('Annotated:', annotatedHtml)
console.log()

// Example 4: Script tag (should not annotate inside)
console.log('=== Example 4: Script Tag Handling ===')
const htmlWithScript = '<script>var x = "1 U.S. 1";</script> But 1 U.S. 1 here.'
const annotatedScript = annotateCitations(htmlWithScript)
console.log('Original:', htmlWithScript)
console.log('Annotated:', annotatedScript)
// Verify script content is preserved
const scriptMatch = annotatedScript.match(/<script>(.*?)<\/script>/)
console.log('Script preserved:', scriptMatch ? scriptMatch[1] : 'Script tag missing!')
console.log()

// Example 5: Custom annotation function
console.log('=== Example 5: Custom Annotation ===')
const text5 = 'See 1 U.S. 1 and 2 F.3d 2.'
const customAnnotated = annotateCitations(text5, {
  annotateFunc: (citation, text) => `<mark class="legal-cite" data-type="${citation.constructor.name}">${text}</mark>`
})
console.log('Original:', text5)
console.log('Custom:', customAnnotated)
console.log()

// Example 6: With cleaned text
console.log('=== Example 6: Cleaned Text ===')
const messyText = 'See   1    U.S.    1   (too many spaces)'
const cleanedText = cleanText(messyText, ['all_whitespace'])
const citations = getCitations(cleanedText)
const annotatedClean = annotateCitations(cleanedText, { citations })
console.log('Original:', messyText)
console.log('Cleaned:', cleanedText)
console.log('Annotated:', annotatedClean)
console.log()

// Example 7: Extract citations info
console.log('=== Example 7: Citation Metadata ===')
const text7 = 'Lissner v. Test, 1 U.S. 1, 5-7 (1982)'
const citations7 = getCitations(text7)
const annotated7 = annotateCitations(text7, {
  annotateFunc: (citation, text) => {
    const metadata = citation.metadata
    let title = `Citation: ${text}`
    if (metadata.plaintiff) title += `\nPlaintiff: ${metadata.plaintiff}`
    if (metadata.defendant) title += `\nDefendant: ${metadata.defendant}`
    if (metadata.year) title += `\nYear: ${metadata.year}`
    if (metadata.pinCite) title += `\nPin cite: ${metadata.pinCite}`
    return `<span class="citation" title="${title.replace(/"/g, '&quot;')}">${text}</span>`
  }
})
console.log('Original:', text7)
console.log('With metadata:', annotated7)
console.log('Citation details:', citations7[0].metadata)