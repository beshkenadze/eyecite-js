# Annotation System for eyecite-js

## Overview

The annotation system allows you to insert HTML markup around legal citations found in text. This is useful for:
- Highlighting citations in web applications
- Adding interactive features to citations (tooltips, links, etc.)
- Visually distinguishing different types of citations

## Features

### Basic Annotation
By default, citations are wrapped in `<span class="citation">` tags:

```typescript
import { annotateCitations } from '@beshkenadze/eyecite-js'

const text = 'See Lissner v. Test, 1 U.S. 1 (1982).'
const annotated = annotateCitations(text)
// Output: 'See Lissner v. Test, <span class="citation">1 U.S. 1</span> (1982).'
```

### HTML Support
The annotation system correctly handles existing HTML markup:

```typescript
const html = '<p>See <em>Lissner v. Test</em>, 1 U.S. 1 (1982).</p>'
const annotated = annotateCitations(html)
// Output: '<p>See <em>Lissner v. Test</em>, <span class="citation">1 U.S. 1</span> (1982).</p>'
```

### Script/Style Tag Handling
Citations inside `<script>`, `<style>`, and `<noscript>` tags are not annotated:

```typescript
const html = '<script>var x = "1 U.S. 1";</script> But 1 U.S. 1 here.'
const annotated = annotateCitations(html)
// Output: '<script>var x = "1 U.S. 1";</script> But <span class="citation">1 U.S. 1</span> here.'
```

### Custom Annotation Functions
You can provide custom annotation functions to control the markup:

```typescript
const annotated = annotateCitations(text, {
  annotateFunc: (citation, text) => {
    return `<mark class="legal-cite" data-type="${citation.constructor.name}">${text}</mark>`
  }
})
```

### Integration with Text Cleaning
Works seamlessly with the text cleaning functionality:

```typescript
import { cleanText, getCitations, annotateCitations } from '@beshkenadze/eyecite-js'

const messyText = 'See   1    U.S.    1'
const cleanedText = cleanText(messyText, ['all_whitespace'])
const citations = getCitations(cleanedText)
const annotated = annotateCitations(cleanedText, { citations })
```

## API Reference

### annotateCitations(text, options?)

Main function for annotating citations in text.

**Parameters:**
- `text` (string): The text containing citations to annotate
- `options` (AnnotationOptions): Optional configuration object

**Options:**
- `annotateFunc`: Custom function to generate annotation markup
  - Signature: `(citation: CitationBase, text: string) => string`
  - Default: Wraps in `<span class="citation">`
- `unbalancedTags`: Array of HTML tag names that may be unbalanced
- `citations`: Pre-extracted citations (if not provided, will extract automatically)
- `tokenizer`: Custom tokenizer for citation extraction

**Returns:** String with annotated citations

### annotateCitationsHtml(htmlText, options?)

Specifically handles HTML content, preserving structure while annotating citations.

### annotate(text, options?)

Auto-detects whether input is HTML and uses the appropriate annotation method.

## Implementation Details

1. **Plain Text Annotation**: Directly inserts markup at citation locations
2. **HTML Annotation**: 
   - Parses HTML structure
   - Extracts text content while preserving positions
   - Applies annotations only to text nodes
   - Skips content in script/style tags
   - Serializes back to HTML

3. **Position Tracking**: Maintains accurate text spans even after:
   - Text cleaning operations
   - HTML parsing and serialization
   - Multiple annotation passes

## Examples

See `/examples/annotation-demo.ts` for comprehensive examples of all features.