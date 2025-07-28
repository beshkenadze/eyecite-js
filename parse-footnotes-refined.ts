#!/usr/bin/env bun

import { getCitations } from './src'
import { 
  FullLawCitation, 
  FullCaseCitation, 
  DOLOpinionCitation,
  IdCitation,
  UnknownCitation
} from './src/models'

// Example footnotes
const footnotes = [
  { id: 200, text: 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009).' },
  { id: 201, text: '*Allen v. Bd. of Pub. Educ. for Bibb Cnty.*, 495 F.3d 1306 (11th Cir. 2007).' },
  { id: 202, text: '29 U.S.C. § 207(a)(1).' },
  { id: 203, text: 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).' },
  { id: 204, text: 'Id. § 778.114(a).' },
  { id: 205, text: 'See 29 C.F.R. § 778.114(a); Wage and Hour Division Rule on Fluctuating Workweek Method of Computing Overtime, 85 Fed. Reg. 34,970 (June 8, 2020), www.federalregister.gov/documents/2020/06/08/2020-10872/fluctuating-workweek-method-of-computing-overtime; 29 C.F.R. § 778.' }
]

// Track unique records to avoid duplicates
const statuteSet = new Set<string>()
const regulationSet = new Set<string>()
const citationList: any[] = []

footnotes.forEach(footnote => {
  console.log(`\n-- Processing footnote [^${footnote.id}]: ${footnote.text.substring(0, 50)}...`)
  
  const cits = getCitations(footnote.text)
  
  cits.forEach(citation => {
    // Skip Id and Unknown citations for statute/regulation tables
    if (citation instanceof IdCitation || citation instanceof UnknownCitation) {
      console.log(`  - Skipping ${citation.constructor.name}: "${citation.matchedText()}"`)
      
      // Still add to citations table
      citationList.push({
        footnoteId: footnote.id,
        type: citation.constructor.name,
        text: citation.matchedText()
      })
      return
    }
    
    // Always add to citations table
    const citationRecord: any = {
      footnoteId: footnote.id,
      type: citation.constructor.name,
      text: citation.matchedText()
    }
    
    if (citation instanceof FullLawCitation) {
      const reporter = citation.metadata.reporter || ''
      
      if (reporter === 'U.S.C.') {
        // Statute
        const title = citation.metadata.chapter || citation.metadata.title || ''
        const section = citation.metadata.section || ''
        const statuteKey = `${title}:${section}`
        
        if (!statuteSet.has(statuteKey)) {
          statuteSet.add(statuteKey)
          console.log(`  - Found statute: ${title} U.S.C. § ${section}`)
        }
        
        citationRecord.reporter = reporter
        citationRecord.volume = title
        citationRecord.section = section
        citationRecord.subsection = citation.metadata.pinCite
        
      } else if (reporter === 'C.F.R.') {
        // CFR Regulation
        const title = citation.metadata.chapter || citation.metadata.title || ''
        const section = citation.metadata.section || ''
        const regulationKey = `CFR:${title}:${section}`
        
        if (!regulationSet.has(regulationKey)) {
          regulationSet.add(regulationKey)
          console.log(`  - Found CFR regulation: ${title} C.F.R. § ${section}`)
        }
        
        citationRecord.reporter = reporter
        citationRecord.volume = title
        citationRecord.section = section
        citationRecord.subsection = citation.metadata.pinCite
        
      } else if (reporter === 'FR' || reporter === 'Fed. Reg.') {
        // Federal Register
        const volume = citation.groups?.volume || ''
        const page = citation.groups?.page || ''
        const regulationKey = `FR:${volume}:${page}`
        
        if (!regulationSet.has(regulationKey)) {
          regulationSet.add(regulationKey)
          console.log(`  - Found Federal Register: ${volume} Fed. Reg. ${page}`)
        }
        
        citationRecord.reporter = 'Fed. Reg.'
        citationRecord.volume = volume
        citationRecord.page = page
        citationRecord.year = citation.metadata.year?.toString()
      }
      
    } else if (citation instanceof FullCaseCitation) {
      console.log(`  - Found case: ${citation.metadata.plaintiff} v. ${citation.metadata.defendant}`)
      
      citationRecord.volume = citation.volume
      citationRecord.reporter = citation.reporter
      citationRecord.page = citation.page
      citationRecord.year = citation.metadata.year?.toString()
      
    } else if (citation instanceof DOLOpinionCitation) {
      console.log(`  - Found DOL Opinion: ${citation.subject} ${citation.year}-${citation.number}`)
      
      citationRecord.reporter = 'DOL Opinion Letter'
      citationRecord.volume = citation.subject
      citationRecord.year = citation.year?.toString()
      citationRecord.section = citation.number?.toString()
    }
    
    citationList.push(citationRecord)
  })
})

// Generate clean SQL INSERT statements
console.log('\n\n-- STATUTE INSERTS')
console.log('-- Only unique statutes')
Array.from(statuteSet).forEach(key => {
  const [title, section] = key.split(':')
  console.log(`INSERT INTO statute (title, section, updatedAt) VALUES ('${title}', '${section}', NOW());`)
})

console.log('\n-- REGULATION INSERTS')
console.log('-- Only unique regulations')
Array.from(regulationSet).forEach(key => {
  const [type, title, section] = key.split(':')
  if (type === 'CFR') {
    console.log(`INSERT INTO regulation (type, title, section, updatedAt) VALUES ('CFR', '${title}', '${section}', NOW());`)
  } else if (type === 'FR') {
    console.log(`INSERT INTO regulation (type, title, section, updatedAt) VALUES ('FR', '${title}', '${section}', NOW());`)
  }
})

console.log('\n-- CITATION INSERTS')
console.log('-- All citations with footnote references')
citationList.forEach(citation => {
  const values = [
    `'${citation.type}'`,
    `'${citation.text.replace(/'/g, "''")}'`, // Escape single quotes
    citation.volume ? `'${citation.volume}'` : 'NULL',
    citation.reporter ? `'${citation.reporter}'` : 'NULL',
    citation.page ? `'${citation.page}'` : 'NULL',
    citation.section ? `'${citation.section}'` : 'NULL',
    citation.subsection ? `'${citation.subsection}'` : 'NULL',
    citation.year ? `'${citation.year}'` : 'NULL'
  ]
  console.log(`INSERT INTO citation (type, text, volume, reporter, page, section, subsection, year, updatedAt) VALUES (${values.join(', ')}, NOW()); -- From footnote ${citation.footnoteId}`)
})

console.log('\n-- SUMMARY')
console.log(`-- Found ${statuteSet.size} unique statutes`)
console.log(`-- Found ${regulationSet.size} unique regulations`)
console.log(`-- Found ${citationList.length} total citations`)