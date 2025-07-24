#!/usr/bin/env bun

import { getCitations } from './src'

const testCitations = [
  '[206] 29 C.F.R. § 778.113(a).',
  '[207] Id. § 778.114(a)(5).',
  '[209] Id.; see also Hunter v. Sprint Corp., 453 F. Supp. 2d 44, 58-59 (D.D.C. 2006).',
  '[210] 29 C.F.R. § 778.114(a).'
]

console.log('CITATION PARSING RESULTS')
console.log('=' .repeat(50))

testCitations.forEach((text, index) => {
  console.log(`\n[${index + 1}] INPUT: ${text}`)
  console.log('-'.repeat(40))
  
  const citations = getCitations(text)
  
  if (citations.length === 0) {
    console.log('No citations found')
  } else {
    console.log(`Found ${citations.length} citation(s):`)
    citations.forEach((citation, citIndex) => {
      console.log(`\nCitation ${citIndex + 1}:`)
      console.log(JSON.stringify(citation, null, 2))
    })
  }
  
  console.log('\n' + '='.repeat(50))
})