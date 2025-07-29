#!/usr/bin/env bun

import { expandLawRegex } from './src/utils/regex-templates';
import { LAWS } from './src/data/index';

// Test the actual pattern building
const cfrPatterns = LAWS['C.F.R.'];
const testTexts = [
  "29 C.F.R. § 778.113",
  "29 C.F.R. §§ 778.113"
];

console.log("=== C.F.R. Pattern Analysis ===\n");

if (cfrPatterns) {
  const lawData = cfrPatterns[0];
  console.log("Raw patterns from laws.json:");
  lawData.regexes.forEach((pattern, i) => {
    console.log(`  ${i + 1}: ${pattern}`);
  });

  console.log("\nCompiled patterns:");
  lawData.regexes.forEach((rawPattern, i) => {
    try {
      const expandedPattern = expandLawRegex(rawPattern, 'C.F.R.');
      const compiledRegex = new RegExp(expandedPattern, 'g');
      console.log(`  ${i + 1}: ${compiledRegex.source}`);
      
      // Test each pattern against both test texts
      testTexts.forEach((testText, j) => {
        const match = testText.match(compiledRegex);
        console.log(`    Test "${testText}": ${match ? 'MATCH' : 'NO MATCH'}`);
        if (match) {
          console.log(`      - Full match: "${match[0]}"`);
          if (match.groups) {
            console.log(`      - Groups:`, match.groups);
          }
        }
      });
      console.log();
    } catch (error) {
      console.log(`  ${i + 1}: ERROR - ${error.message}`);
    }
  });
}

console.log("=== Citation Extraction Test ===");

import { getCitations } from './src/index';

testTexts.forEach((testText) => {
  console.log(`\nTesting: "${testText}"`);
  const citations = getCitations(testText);
  console.log(`Found: ${citations?.length || 0} citations`);
  
  citations?.forEach((citation, i) => {
    console.log(`  ${i + 1}. "${citation.token.data}" (${citation.token.start}-${citation.token.end})`);
    if (citation.token.groups) {
      console.log(`     Groups:`, citation.token.groups);
    }
  });
});