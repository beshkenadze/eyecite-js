import { createLawCitationRegex } from './src/utils/regex-templates.js'

// Test C.F.R. pattern expansion with both single and multiple section patterns
const reporterName = 'C.F.R.'
const patterns = [
  "(?P<chapter>\\d+) $reporter,? $section_marker_multiple $law_section_multiple",
  "(?P<chapter>\\d+) $reporter,? § $law_section"
]

console.log('Original patterns:')
patterns.forEach((p, i) => console.log(`  ${i + 1}: ${p}`))

const expandedPatterns = createLawCitationRegex(reporterName, patterns)
console.log('\nExpanded patterns:')
expandedPatterns.forEach((p, i) => console.log(`  ${i + 1}: ${p}`))

// Test if the patterns match our test cases
const testTexts = [
  '29 C.F.R. § 778.113',
  '29 C.F.R. §§ 778.113, 778.114',
  'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).'
]

for (let i = 0; i < expandedPatterns.length; i++) {
  const pattern = expandedPatterns[i]
  console.log(`\nTesting pattern ${i + 1}:`)
  console.log(pattern)
  const regex = new RegExp(pattern, 'g')
  
  for (const text of testTexts) {
    const matches = [...text.matchAll(regex)]
    console.log(`  Text: "${text}"`)
    console.log(`  Matches: ${matches.length}`)
    for (const match of matches) {
      console.log(`    Match:`, match[0])
      console.log(`    Groups:`, match.groups)
    }
  }
}