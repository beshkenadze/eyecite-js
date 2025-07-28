#!/usr/bin/env bun

import { getCitations } from './src'
import { 
  FullLawCitation, 
  FullCaseCitation, 
  DOLOpinionCitation 
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

// Parse citations and generate SQL
interface StatuteRecord {
  title: string
  section: string
  subsection?: string
  sectionTitle?: string
  statuteText?: string
  sourceUrl?: string
}

interface RegulationRecord {
  type: 'CFR' | 'FR'
  title: string
  part?: string
  section: string
  subpart?: string
  sectionTitle?: string
  regulationText?: string
  effectiveDate?: Date
  sourceUrl?: string
  ecfrUrl?: string
}

interface CitationRecord {
  type: string
  text: string
  volume?: string
  reporter?: string
  page?: string
  section?: string
  subsection?: string
  year?: string
}

// Process each footnote
const statutes: StatuteRecord[] = []
const regulations: RegulationRecord[] = []
const citations: CitationRecord[] = []

footnotes.forEach(footnote => {
  const cits = getCitations(footnote.text)
  
  cits.forEach(citation => {
    // Always add to citations table
    const citationRecord: CitationRecord = {
      type: citation.constructor.name,
      text: citation.matchedText()
    }
    
    if (citation instanceof FullLawCitation) {
      // Handle statutory and regulatory citations
      const reporter = citation.metadata.reporter || ''
      
      if (reporter === 'U.S.C.') {
        // Statute - add to statute table
        const statute: StatuteRecord = {
          title: citation.metadata.chapter || citation.metadata.title || '',
          section: citation.metadata.section || '',
          subsection: citation.metadata.pinCite
        }
        statutes.push(statute)
        
        // Also add details to citation record
        citationRecord.reporter = reporter
        citationRecord.volume = citation.metadata.chapter || citation.metadata.title
        citationRecord.section = citation.metadata.section
        citationRecord.subsection = citation.metadata.pinCite
      } else if (reporter === 'C.F.R.') {
        // CFR Regulation
        const regulation: RegulationRecord = {
          type: 'CFR',
          title: citation.metadata.chapter || citation.metadata.title || '',
          section: citation.metadata.section || '',
          subpart: citation.metadata.pinCite
        }
        regulations.push(regulation)
        
        // Also add details to citation record
        citationRecord.reporter = reporter
        citationRecord.volume = citation.metadata.chapter || citation.metadata.title
        citationRecord.section = citation.metadata.section
        citationRecord.subsection = citation.metadata.pinCite
      } else if (reporter === 'FR' || reporter === 'Fed. Reg.') {
        // Federal Register
        const regulation: RegulationRecord = {
          type: 'FR',
          title: citation.metadata.volume || '',
          section: citation.metadata.page || ''
        }
        
        // Extract year from metadata
        if (citation.metadata.year) {
          regulation.effectiveDate = new Date(citation.metadata.year, 0, 1)
          citationRecord.year = citation.metadata.year.toString()
        }
        
        regulations.push(regulation)
        
        // Also add details to citation record
        citationRecord.reporter = 'Fed. Reg.'
        citationRecord.volume = citation.metadata.volume
        citationRecord.page = citation.metadata.page
      }
    } else if (citation instanceof FullCaseCitation) {
      // Case citation - only goes in citations table
      citationRecord.volume = citation.metadata.volume || citation.volume
      citationRecord.reporter = citation.reporter
      citationRecord.page = citation.metadata.page || citation.page
      citationRecord.year = citation.metadata.year?.toString()
    } else if (citation instanceof DOLOpinionCitation) {
      // DOL Opinion - only goes in citations table
      citationRecord.reporter = 'DOL Opinion Letter'
      citationRecord.volume = citation.subject
      citationRecord.year = citation.year?.toString()
      citationRecord.section = citation.number?.toString()
    }
    
    citations.push(citationRecord)
  })
})

// Generate SQL INSERT statements
console.log('-- Statute Inserts')
statutes.forEach(statute => {
  const values = [
    `'${statute.title}'`,
    `'${statute.section}'`,
    statute.subsection ? `'${statute.subsection}'` : 'NULL',
    statute.sectionTitle ? `'${statute.sectionTitle}'` : 'NULL',
    statute.statuteText ? `'${statute.statuteText}'` : 'NULL',
    statute.sourceUrl ? `'${statute.sourceUrl}'` : 'NULL'
  ]
  console.log(`INSERT INTO statute (title, section, subsection, sectionTitle, statuteText, sourceUrl) VALUES (${values.join(', ')});`)
})

console.log('\n-- Regulation Inserts')
regulations.forEach(regulation => {
  const values = [
    `'${regulation.type}'`,
    `'${regulation.title}'`,
    regulation.part ? `'${regulation.part}'` : 'NULL',
    `'${regulation.section}'`,
    regulation.subpart ? `'${regulation.subpart}'` : 'NULL',
    regulation.sectionTitle ? `'${regulation.sectionTitle}'` : 'NULL',
    regulation.regulationText ? `'${regulation.regulationText}'` : 'NULL',
    regulation.effectiveDate ? `'${regulation.effectiveDate.toISOString()}'` : 'NULL',
    regulation.sourceUrl ? `'${regulation.sourceUrl}'` : 'NULL',
    regulation.ecfrUrl ? `'${regulation.ecfrUrl}'` : 'NULL'
  ]
  console.log(`INSERT INTO regulation (type, title, part, section, subpart, sectionTitle, regulationText, effectiveDate, sourceUrl, ecfrUrl) VALUES (${values.join(', ')});`)
})

console.log('\n-- Citation Inserts')
citations.forEach(citation => {
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
  console.log(`INSERT INTO citation (type, text, volume, reporter, page, section, subsection, year) VALUES (${values.join(', ')});`)
})

console.log('\n-- Summary')
console.log(`Found ${statutes.length} statutes`)
console.log(`Found ${regulations.length} regulations`)
console.log(`Found ${citations.length} total citations`)