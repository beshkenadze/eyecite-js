#!/usr/bin/env bun

import { getCitations } from './src/index';

const testTexts = [
  "29 C.F.R. § 778.113",  // Single section with §
  "29 C.F.R. §§ 778.113", // Single section with §§ (this should also work with the fixed pattern)
];

testTexts.forEach((testText, i) => {
  console.log(`\nTest ${i + 1}: "${testText}"`);
  
  const citations = getCitations(testText);
  console.log(`Found citations: ${citations?.length || 0}`);

  citations?.forEach((citation, index) => {
    console.log(`  Citation ${index + 1}:`);
    console.log(`    - Matched text: "${citation.token.data}"`);
    console.log(`    - Chapter: ${citation.token.groups.chapter}`);
    console.log(`    - Section: ${citation.token.groups.section}`);
  });
});