#!/usr/bin/env bun

import { getCitations } from './src/index';

const testText = "29 C.F.R. §§ 778.113 (the \"statutory method\"), 778.114 (the FWW method).";

console.log("Testing C.F.R. §§ pattern...");
console.log("Input text:", testText);

const citations = getCitations(testText);
console.log("\nFound citations:", citations?.length || 0);

citations?.forEach((citation, index) => {
  console.log(`\nCitation ${index + 1}:`);
  console.log(`  - Text: "${citation.token.data}"`);
  console.log(`  - Span: [${citation.token.start}, ${citation.token.end}]`);
  if (citation.token.groups) {
    console.log(`  - Groups:`, citation.token.groups);
  }
  if (citation.metadata) {
    console.log(`  - Metadata:`, citation.metadata);
  }
});

console.log("\nExpected: Should find at least one law citation matching the C.F.R. pattern");