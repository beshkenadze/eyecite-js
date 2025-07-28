#!/usr/bin/env bun

import { getCitations } from './src'
import { 
  FullLawCitation, 
  FullCaseCitation, 
  DOLOpinionCitation,
  IdCitation,
  UnknownCitation,
  ShortCaseCitation,
  SupraCitation
} from './src/models'

// Example: Prisma client import (uncomment when using actual Prisma)
// import { PrismaClient } from '@prisma/client'
// const prisma = new PrismaClient()

// Example footnotes with their reference numbers
const footnotes = [
  { refNumber: '200', text: 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009).' },
  { refNumber: '201', text: '*Allen v. Bd. of Pub. Educ. for Bibb Cnty.*, 495 F.3d 1306 (11th Cir. 2007).' },
  { refNumber: '202', text: '29 U.S.C. § 207(a)(1).' },
  { refNumber: '203', text: 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).' },
  { refNumber: '204', text: 'Id. § 778.114(a).' },
  { refNumber: '205', text: 'See 29 C.F.R. § 778.114(a); Wage and Hour Division Rule on Fluctuating Workweek Method of Computing Overtime, 85 Fed. Reg. 34,970 (June 8, 2020), www.federalregister.gov/documents/2020/06/08/2020-10872/fluctuating-workweek-method-of-computing-overtime; 29 C.F.R. § 778.' }
]

interface ParsedFootnote {
  refNumber: string
  text: string
  citations: ParsedCitation[]
  caseReferences: ParsedCaseReference[]
  citationReferences: ParsedCitationReference[]
}

interface ParsedCitation {
  type: string
  text: string
  normalizedText?: string
}

interface ParsedCaseReference {
  originalText: string
  caseName?: string
  citation?: string
  court?: string
  year?: number
  position: number
}

interface ParsedCitationReference {
  originalText: string
  type: 'statute' | 'regulation' | 'opinionLetter' | 'other'
  details: {
    // For statutes (U.S.C.)
    title?: string
    section?: string
    subsection?: string
    
    // For regulations (C.F.R., Fed. Reg.)
    regulationType?: 'CFR' | 'FR'
    cfr?: {
      title: string
      part?: string
      section: string
      subsection?: string
    }
    fr?: {
      volume: string
      page: string
      date?: Date
      documentNumber?: string
    }
    
    // For opinion letters
    agency?: string
    letterNumber?: string
    issueDate?: Date
  }
  position: number
}

function parseFootnote(refNumber: string, text: string): ParsedFootnote {
  const result: ParsedFootnote = {
    refNumber,
    text,
    citations: [],
    caseReferences: [],
    citationReferences: []
  }
  
  const cits = getCitations(text)
  let position = 0
  
  cits.forEach(citation => {
    const matchedText = citation.matchedText()
    const citationType = citation.constructor.name
    
    // Add to citations (all types)
    result.citations.push({
      type: citationType,
      text: matchedText,
      normalizedText: matchedText.replace(/\s+/g, ' ').trim()
    })
    
    if (citation instanceof FullCaseCitation) {
      // Parse case references
      const caseRef: ParsedCaseReference = {
        originalText: matchedText,
        caseName: `${citation.metadata.plaintiff || ''} v. ${citation.metadata.defendant || ''}`.trim(),
        citation: `${citation.volume} ${citation.reporter} ${citation.page}`,
        court: citation.metadata.court,
        year: citation.metadata.year,
        position: position++
      }
      result.caseReferences.push(caseRef)
      
    } else if (citation instanceof FullLawCitation) {
      const reporter = citation.metadata.reporter || ''
      
      if (reporter === 'U.S.C.') {
        // Statute
        const citRef: ParsedCitationReference = {
          originalText: matchedText,
          type: 'statute',
          details: {
            title: citation.metadata.chapter || citation.metadata.title || '',
            section: citation.metadata.section || '',
            subsection: citation.metadata.pinCite
          },
          position: position++
        }
        result.citationReferences.push(citRef)
        
      } else if (reporter === 'C.F.R.') {
        // CFR Regulation
        const citRef: ParsedCitationReference = {
          originalText: matchedText,
          type: 'regulation',
          details: {
            regulationType: 'CFR',
            cfr: {
              title: citation.metadata.chapter || citation.metadata.title || '',
              section: citation.metadata.section || '',
              subsection: citation.metadata.pinCite
            }
          },
          position: position++
        }
        result.citationReferences.push(citRef)
        
      } else if (reporter === 'FR' || reporter === 'Fed. Reg.') {
        // Federal Register
        const citRef: ParsedCitationReference = {
          originalText: matchedText,
          type: 'regulation',
          details: {
            regulationType: 'FR',
            fr: {
              volume: citation.groups?.volume || '',
              page: citation.groups?.page || '',
              date: citation.metadata.year ? new Date(citation.metadata.year, 0, 1) : undefined
            }
          },
          position: position++
        }
        result.citationReferences.push(citRef)
      }
      
    } else if (citation instanceof DOLOpinionCitation) {
      // Opinion Letter
      const citRef: ParsedCitationReference = {
        originalText: matchedText,
        type: 'opinionLetter',
        details: {
          agency: 'DOL',
          letterNumber: `${citation.subject} ${citation.year}-${citation.number}`,
          issueDate: citation.date ? new Date(citation.date) : undefined
        },
        position: position++
      }
      result.citationReferences.push(citRef)
      
    } else if (citation instanceof IdCitation || citation instanceof SupraCitation) {
      // These need context from previous citations to resolve
      const citRef: ParsedCitationReference = {
        originalText: matchedText,
        type: 'other',
        details: {},
        position: position++
      }
      result.citationReferences.push(citRef)
    }
  })
  
  return result
}

// Parse all footnotes
console.log('Parsing footnotes...\n')
const parsedFootnotes = footnotes.map(fn => parseFootnote(fn.refNumber, fn.text))

// Display results and generate example Prisma operations
parsedFootnotes.forEach(pf => {
  console.log(`\n[${pf.refNumber}] ${pf.text}`)
  console.log('=' .repeat(80))
  
  // Show what would be created in database
  console.log('\n// Prisma operations for this footnote:')
  console.log('// 1. Create PageReference')
  console.log(`const pageRef${pf.refNumber} = await prisma.pageReference.create({
  data: {
    pageId: pageId, // From current page
    refNumber: '${pf.refNumber}',
    content: '${pf.text.replace(/'/g, "\\'")}',
  }
})`)
  
  // Citations
  if (pf.citations.length > 0) {
    console.log('\n// 2. Create/Connect Citations')
    pf.citations.forEach((cit, i) => {
      console.log(`const citation${pf.refNumber}_${i} = await prisma.citation.upsert({
  where: { text: '${cit.text.replace(/'/g, "\\'")}' },
  update: {},
  create: {
    type: '${cit.type}',
    text: '${cit.text.replace(/'/g, "\\'")}',
    normalizedText: '${cit.normalizedText?.replace(/'/g, "\\'")}'
  }
})`)
    })
  }
  
  // Case References
  if (pf.caseReferences.length > 0) {
    console.log('\n// 3. Create Case References')
    pf.caseReferences.forEach((ref, i) => {
      console.log(`// First, find or create the case`)
      console.log(`const case${pf.refNumber}_${i} = await prisma.case.upsert({
  where: { 
    name_citation: {
      name: '${ref.caseName?.replace(/'/g, "\\'")}',
      citation: '${ref.citation?.replace(/'/g, "\\'")}'
    }
  },
  update: {},
  create: {
    name: '${ref.caseName?.replace(/'/g, "\\'")}',
    originalText: '${ref.originalText.replace(/'/g, "\\'")}',
    citation: '${ref.citation?.replace(/'/g, "\\'")}',
    court: ${ref.court ? `'${ref.court}'` : 'null'},
    dateFiled: ${ref.year ? `new Date(${ref.year}, 0, 1)` : 'null'}
  }
})`)
      
      console.log(`// Then create the reference`)
      console.log(`await prisma.caseReference.create({
  data: {
    originalText: '${ref.originalText.replace(/'/g, "\\'")}',
    caseId: case${pf.refNumber}_${i}.id,
    pageReferenceId: pageRef${pf.refNumber}.id,
    position: ${ref.position}
  }
})`)
    })
  }
  
  // Citation References (Statutes, Regulations, Opinion Letters)
  if (pf.citationReferences.length > 0) {
    console.log('\n// 4. Create Citation References')
    pf.citationReferences.forEach((ref, i) => {
      if (ref.type === 'statute' && ref.details.title && ref.details.section) {
        console.log(`// Create/find statute`)
        console.log(`const statute${pf.refNumber}_${i} = await prisma.statute.upsert({
  where: {
    title_section: {
      title: '${ref.details.title}',
      section: '${ref.details.section}'
    }
  },
  update: {},
  create: {
    title: '${ref.details.title}',
    section: '${ref.details.section}',
    subsection: ${ref.details.subsection ? `'${ref.details.subsection}'` : 'null'}
  }
})`)
        
      } else if (ref.type === 'regulation' && ref.details.regulationType === 'CFR') {
        console.log(`// Create/find CFR regulation`)
        const citation = `${ref.details.cfr?.title} C.F.R. § ${ref.details.cfr?.section}`
        console.log(`const regulation${pf.refNumber}_${i} = await prisma.regulation.upsert({
  where: { citation: '${citation}' },
  update: {},
  create: {
    type: 'CFR',
    citation: '${citation}',
    title: '${ref.details.cfr?.title}',
    section: '${ref.details.cfr?.section}',
    subsection: ${ref.details.cfr?.subsection ? `'${ref.details.cfr.subsection}'` : 'null'}
  }
})`)
        
      } else if (ref.type === 'regulation' && ref.details.regulationType === 'FR') {
        console.log(`// Create/find Federal Register entry`)
        const citation = `${ref.details.fr?.volume} Fed. Reg. ${ref.details.fr?.page}`
        console.log(`const regulation${pf.refNumber}_${i} = await prisma.regulation.upsert({
  where: { citation: '${citation}' },
  update: {},
  create: {
    type: 'FR',
    citation: '${citation}',
    frVolume: '${ref.details.fr?.volume}',
    frPage: '${ref.details.fr?.page}',
    frDate: ${ref.details.fr?.date ? `new Date('${ref.details.fr.date.toISOString()}')` : 'null'}
  }
})`)
        
      } else if (ref.type === 'opinionLetter') {
        console.log(`// Create/find opinion letter`)
        console.log(`const opinionLetter${pf.refNumber}_${i} = await prisma.opinionLetter.upsert({
  where: {
    agency_letterNumber: {
      agency: '${ref.details.agency}',
      letterNumber: '${ref.details.letterNumber}'
    }
  },
  update: {},
  create: {
    agency: '${ref.details.agency}',
    letterNumber: '${ref.details.letterNumber}',
    issueDate: ${ref.details.issueDate ? `new Date('${ref.details.issueDate.toISOString()}')` : 'null'}
  }
})`)
      }
      
      console.log(`// Create citation reference`)
      console.log(`await prisma.citationReference.create({
  data: {
    originalText: '${ref.originalText.replace(/'/g, "\\'")}',
    citationId: citation${pf.refNumber}_${pf.citations.findIndex(c => c.text === ref.originalText)}.id,
    ${ref.type === 'statute' ? `statuteId: statute${pf.refNumber}_${i}.id,` : ''}
    ${ref.type === 'regulation' ? `regulationId: regulation${pf.refNumber}_${i}.id,` : ''}
    ${ref.type === 'opinionLetter' ? `opinionLetterId: opinionLetter${pf.refNumber}_${i}.id,` : ''}
    pageReferenceId: pageRef${pf.refNumber}.id,
    position: ${ref.position}
  }
})`)
    })
  }
})

console.log('\n\n// SUMMARY')
console.log('// ========')
console.log(`// Total footnotes processed: ${parsedFootnotes.length}`)
console.log(`// Total citations found: ${parsedFootnotes.reduce((sum, pf) => sum + pf.citations.length, 0)}`)
console.log(`// Total case references: ${parsedFootnotes.reduce((sum, pf) => sum + pf.caseReferences.length, 0)}`)
console.log(`// Total citation references: ${parsedFootnotes.reduce((sum, pf) => sum + pf.citationReferences.length, 0)}`)