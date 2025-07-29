#!/usr/bin/env bun

// Test the compiled pattern manually
const pattern2 = /(?<chapter>\d+) (?<reporter>C\.F\.R\.),? ((§§?)|([Ss]((ec)(tion)?)?s?\.?)) (?<section>(?:\d+(?:[\-.:]\d+){,3})|(?:\d+(?:\((?:[a-zA-Z]{1}|\d{1,2})\))+))(?:\s+et\s+seq\.)?(?:\s*\((?:(?<publisher>[A-Z][a-zA-Z&.\s]+(?:Supp\.)?)\s+)?(?<year>1\d{3}|20\d{2})(?:-\d{2})?\))?/g;

const testTexts = [
  "29 C.F.R. § 778.113",
  "29 C.F.R. §§ 778.113"
];

console.log("Manual regex test:");
console.log("Pattern:", pattern2.source);
console.log();

testTexts.forEach((text) => {
  pattern2.lastIndex = 0; // Reset regex
  const match = pattern2.exec(text);
  console.log(`Test: "${text}"`);
  console.log(`Match:`, match ? `"${match[0]}"` : 'NO MATCH');
  if (match && match.groups) {
    console.log(`Groups:`, match.groups);
  }
  console.log();
});

// Let's also test the simpler section regex part
console.log("Testing section regex part only:");
const sectionPattern = /(?<section>(?:\d+(?:[\-.:]\d+){,3})|(?:\d+(?:\((?:[a-zA-Z]{1}|\d{1,2})\))+))/;
console.log("Section pattern:", sectionPattern.source);
console.log("Test '778.113':", sectionPattern.test('778.113'));

// And the section marker part
console.log("\nTesting section marker part only:");
const sectionMarker = /((§§?)|([Ss]((ec)(tion)?)?s?\.?))/;
console.log("Section marker pattern:", sectionMarker.source);
console.log("Test '§':", sectionMarker.test('§'));
console.log("Test '§§':", sectionMarker.test('§§'));

// Test a simpler version step by step
console.log("\nStep by step test:");
const step1 = /(?<chapter>\d+)/;
const step2 = /(?<reporter>C\.F\.R\.)/;
const step3 = /((§§?)|([Ss]((ec)(tion)?)?s?\.?))/;
const step4 = /(?<section>(?:\d+(?:[\-.:]\d+){,3})|(?:\d+(?:\((?:[a-zA-Z]{1}|\d{1,2})\))+))/;

const testText = "29 C.F.R. § 778.113";
console.log(`Testing against: "${testText}"`);
console.log("Chapter '29':", step1.test('29'));
console.log("Reporter 'C.F.R.':", step2.test('C.F.R.'));
console.log("Section marker '§':", step3.test('§'));
console.log("Section '778.113':", step4.test('778.113'));