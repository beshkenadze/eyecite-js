#!/usr/bin/env bun

// Test the section pattern in detail
const sectionPattern = /(?<section>(?:\d+(?:[\-.:]\d+){,3})|(?:\d+(?:\((?:[a-zA-Z]{1}|\d{1,2})\))+))/;

console.log("Section pattern:", sectionPattern.source);
console.log();

// Test the first alternative: \d+(?:[\-.:]\d+){,3}
const firstAlt = /\d+(?:[\-.:]\d+){,3}/;
console.log("First alternative pattern:", firstAlt.source);
console.log("Test '778.113':", firstAlt.test('778.113'));
console.log("Test '778':", firstAlt.test('778'));
console.log("Test '778.113.1':", firstAlt.test('778.113.1'));

// Let's break it down further
const justDigits = /\d+/;
const separator = /[\-.:]/;
const digitAfterSep = /[\-.:]\d+/;
const repeatSep = /(?:[\-.:]\d+){,3}/; // 0 to 3 times

console.log("\nBreaking down '778.113':");
console.log("Just digits '778':", justDigits.test('778'));
console.log("Separator '.':", separator.test('.'));
console.log("Digit after sep '.113':", digitAfterSep.test('.113'));
console.log("Repeat sep pattern '{,3}' on '778.113':", repeatSep.test('778.113'));

// Test the full construction
const manualPattern = /\d+(?:[\-.:]\d+)*/; // 0 or more repetitions
console.log("\nManual pattern with * (0 or more):", manualPattern.source);
console.log("Test '778.113':", manualPattern.test('778.113'));

// Let's check what's in the actual REGEXES.law.section
import { REGEXES } from './src/data/index';
console.log("\nREGEXES.law.section:", REGEXES.law.section);