#!/usr/bin/env bun

import { getCitations } from './src/index';

const testText = '29 C.F.R. §§ 778.113, 778.114';

console.log(`Testing: "${testText}"`);
const citations = getCitations(testText);
console.log(`Found: ${citations?.length || 0} citations`);

citations?.forEach((citation, i) => {
  console.log(`\n${i + 1}. "${citation.token.data}" (${citation.token.start}-${citation.token.end})`);
  if (citation.token.groups) {
    console.log(`   Groups:`, citation.token.groups);
  }
  if (citation.metadata) {
    console.log(`   Section: ${citation.metadata.section}`);
    console.log(`   Reporter: ${citation.metadata.reporter}`);
    console.log(`   Chapter: ${citation.metadata.chapter}`);
  }
});