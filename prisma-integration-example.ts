#!/usr/bin/env bun

// Practical example of using eyecite-js with Prisma to parse and store legal citations

import { getCitations } from './src'
import { 
  FullLawCitation, 
  FullCaseCitation, 
  DOLOpinionCitation,
  IdCitation,
  UnknownCitation
} from './src/models'

// In your actual code:
// import { PrismaClient } from '@prisma/client'
// const prisma = new PrismaClient()

/**
 * Process a single footnote and persist to database
 */
async function processFootnote(
  pageId: string, 
  refNumber: string, 
  text: string,
  // prisma: PrismaClient // Uncomment in actual implementation
) {
  console.log(`\nProcessing footnote [${refNumber}]: ${text.substring(0, 50)}...`)
  
  // Step 1: Create the PageReference
  const pageReference = {
    id: 'mock-page-ref-id', // In real code: await prisma.pageReference.create(...)
    pageId,
    refNumber,
    content: text
  }
  console.log(`✓ Created PageReference for footnote ${refNumber}`)
  
  // Step 2: Parse citations using eyecite-js
  const citations = getCitations(text)
  console.log(`✓ Found ${citations.length} citations`)
  
  let position = 0
  
  for (const citation of citations) {
    // Skip less useful citations
    if (citation instanceof IdCitation || citation instanceof UnknownCitation) {
      console.log(`  - Skipping ${citation.constructor.name}: "${citation.matchedText()}"`)
      continue
    }
    
    const citationType = citation.constructor.name
    const matchedText = citation.matchedText()
    
    // Step 3: Create/upsert Citation record
    const citationRecord = {
      id: 'mock-citation-id', // In real code: await prisma.citation.upsert(...)
      type: citationType,
      text: matchedText,
      normalizedText: matchedText.replace(/\s+/g, ' ').trim()
    }
    console.log(`  ✓ Created Citation: ${citationType} - "${matchedText}"`)
    
    // Step 4: Process based on citation type
    if (citation instanceof FullCaseCitation) {
      // Handle case citations
      const caseName = `${citation.metadata.plaintiff || ''} v. ${citation.metadata.defendant || ''}`.trim()
      const caseData = {
        name: caseName,
        originalText: matchedText,
        citation: `${citation.volume} ${citation.reporter} ${citation.page}`,
        court: citation.metadata.court || null,
        dateFiled: citation.metadata.year ? new Date(citation.metadata.year, 0, 1) : null
      }
      
      // In real code:
      // const caseRecord = await prisma.case.upsert({
      //   where: { name_citation: { name: caseName, citation: caseData.citation } },
      //   update: {},
      //   create: caseData
      // })
      
      // await prisma.caseReference.create({
      //   data: {
      //     originalText: matchedText,
      //     caseId: caseRecord.id,
      //     pageReferenceId: pageReference.id,
      //     position: position++
      //   }
      // })
      
      console.log(`    → Linked to Case: ${caseName}`)
      
    } else if (citation instanceof FullLawCitation) {
      const reporter = citation.metadata.reporter || ''
      
      if (reporter === 'U.S.C.') {
        // Handle U.S.C. statutes
        const statuteData = {
          title: citation.metadata.chapter || citation.metadata.title || '',
          section: citation.metadata.section || '',
          subsection: citation.metadata.pinCite || null
        }
        
        // In real code:
        // const statute = await prisma.statute.upsert({
        //   where: { title_section: { title: statuteData.title, section: statuteData.section } },
        //   update: {},
        //   create: statuteData
        // })
        
        // await prisma.citationReference.create({
        //   data: {
        //     originalText: matchedText,
        //     citationId: citationRecord.id,
        //     statuteId: statute.id,
        //     pageReferenceId: pageReference.id,
        //     position: position++
        //   }
        // })
        
        console.log(`    → Linked to Statute: ${statuteData.title} U.S.C. § ${statuteData.section}`)
        
      } else if (reporter === 'C.F.R.') {
        // Handle C.F.R. regulations
        const title = citation.metadata.chapter || citation.metadata.title || ''
        const section = citation.metadata.section || ''
        const citationText = `${title} C.F.R. § ${section}`
        
        const regulationData = {
          type: 'CFR' as const,
          citation: citationText,
          title: title,
          section: section,
          subsection: citation.metadata.pinCite || null
        }
        
        // In real code:
        // const regulation = await prisma.regulation.upsert({
        //   where: { citation: citationText },
        //   update: {},
        //   create: regulationData
        // })
        
        console.log(`    → Linked to CFR Regulation: ${citationText}`)
        
      } else if (reporter === 'FR' || reporter === 'Fed. Reg.') {
        // Handle Federal Register
        const volume = citation.groups?.volume || ''
        const page = citation.groups?.page || ''
        const citationText = `${volume} Fed. Reg. ${page}`
        
        const regulationData = {
          type: 'FR' as const,
          citation: citationText,
          frVolume: volume,
          frPage: page,
          frDate: citation.metadata.year ? new Date(citation.metadata.year, 0, 1) : null
        }
        
        console.log(`    → Linked to Federal Register: ${citationText}`)
      }
      
    } else if (citation instanceof DOLOpinionCitation) {
      // Handle DOL Opinion Letters
      const opinionData = {
        agency: 'DOL',
        letterNumber: `${citation.subject} ${citation.year}-${citation.number}`,
        issueDate: citation.date ? new Date(citation.date) : null
      }
      
      // In real code:
      // const opinionLetter = await prisma.opinionLetter.upsert({
      //   where: { agency_letterNumber: { agency: 'DOL', letterNumber: opinionData.letterNumber } },
      //   update: {},
      //   create: opinionData
      // })
      
      console.log(`    → Linked to Opinion Letter: ${opinionData.letterNumber}`)
    }
  }
  
  // Step 5: Update relationships
  // In real code, you'd connect citations to pageReference:
  // await prisma.pageReference.update({
  //   where: { id: pageReference.id },
  //   data: {
  //     citations: { connect: citationIds },
  //     cases: { connect: caseIds },
  //     regulations: { connect: regulationIds },
  //     statutes: { connect: statuteIds },
  //     opinionLetters: { connect: opinionLetterIds }
  //   }
  // })
  
  return pageReference
}

// Example usage
async function main() {
  const pageId = 'example-page-id'
  
  // Example footnotes
  const footnotes = [
    { refNumber: '200', text: 'DOL Opinion Letter FLSA 2009-19 (Jan. 16, 2009).' },
    { refNumber: '201', text: '*Allen v. Bd. of Pub. Educ. for Bibb Cnty.*, 495 F.3d 1306 (11th Cir. 2007).' },
    { refNumber: '202', text: '29 U.S.C. § 207(a)(1).' },
    { refNumber: '203', text: 'See 29 C.F.R. §§ 778.113 (the "statutory method"), 778.114 (the FWW method).' },
  ]
  
  console.log('Starting footnote processing...')
  console.log('=' .repeat(80))
  
  for (const footnote of footnotes) {
    await processFootnote(pageId, footnote.refNumber, footnote.text)
  }
  
  console.log('\n' + '=' .repeat(80))
  console.log('Processing complete!')
}

// Run the example
main().catch(console.error)