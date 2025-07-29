#!/usr/bin/env bun

import { LAWS, REGEXES } from './src/data/index';

// Check the C.F.R. patterns
console.log("C.F.R. patterns from laws.json:");
const cfrPatterns = LAWS['C.F.R.'];
if (cfrPatterns) {
  cfrPatterns.forEach((pattern, i) => {
    console.log(`Pattern ${i + 1}:`, pattern.regexes);
  });
}

// Check the regex substitutions
console.log("\nRegex substitutions:");
console.log("$reporter:", REGEXES.reporter);
console.log("$law_section:", REGEXES.law_section);
console.log("$section_marker_multiple:", REGEXES.section_marker_multiple);

// Test the actual regex compilation
const testText = "29 C.F.R. § 778.113";
console.log(`\nTesting against: "${testText}"`);

if (cfrPatterns) {
  cfrPatterns[0].regexes.forEach((rawPattern, i) => {
    // Manual substitution like the library does
    let compiledPattern = rawPattern
      .replace(/\$reporter/g, REGEXES.reporter)
      .replace(/\$law_section/g, REGEXES.law_section)
      .replace(/\$section_marker_multiple/g, REGEXES.section_marker_multiple)
      .replace(/\$law_section_multiple/g, REGEXES.law_section_multiple);
    
    console.log(`\nPattern ${i + 1} (raw):`, rawPattern);
    console.log(`Pattern ${i + 1} (compiled):`, compiledPattern);
    
    try {
      const regex = new RegExp(compiledPattern, 'g');
      const matches = testText.match(regex);
      console.log(`Pattern ${i + 1} matches:`, matches);
      
      if (matches) {
        const execResult = regex.exec(testText);
        console.log(`Pattern ${i + 1} groups:`, execResult?.groups);
      }
    } catch (e) {
      console.log(`Pattern ${i + 1} error:`, e.message);
    }
  });
}