#!/usr/bin/env bun

import { getCitations } from './src/index';

const testText = "29 C.F.R. §§ 778.113 (the \"statutory method\"), 778.114 (the FWW method).";

console.log("Testing C.F.R. §§ pattern...");
console.log("Input text:", testText);

const citations = getCitations(testText);
console.log("\nFound citations:", citations?.length || 0);

citations?.forEach((citation, index) => {
  console.log(`\nCitation ${index + 1}:`);
  console.log("Full citation object:", JSON.stringify(citation, null, 2));
});

console.log("\nExpected: Should find law citations matching the C.F.R. pattern");