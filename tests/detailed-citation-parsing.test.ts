import { describe, test } from 'bun:test'
import { getCitations } from '../src/find'
import type { CitationBase } from '../src/models'

interface CitationTestCase {
  text: string
  category: string
  expectedType?: string
}

const testCases: CitationTestCase[] = [
  // C.F.R. Citations
  { text: '40 C.F.R. § 261.4 (2023)', category: 'C.F.R.', expectedType: 'FullLawCitation' },
  { text: '21 C.F.R. § 314.50 (2023)', category: 'C.F.R.', expectedType: 'FullLawCitation' },
  { text: '29 C.F.R. § 1910.1200 (2023)', category: 'C.F.R.', expectedType: 'FullLawCitation' },
  { text: '45 C.F.R. §§ 160.101-160.104 (2023)', category: 'C.F.R.', expectedType: 'FullLawCitation' },

  // U.S.C. Citations
  { text: '42 U.S.C. § 1983 (2018)', category: 'U.S.C.', expectedType: 'FullLawCitation' },
  { text: '18 U.S.C. § 1001 (2018)', category: 'U.S.C.', expectedType: 'FullLawCitation' },
  { text: '26 U.S.C. § 501(c)(3) (2018)', category: 'U.S.C.', expectedType: 'FullLawCitation' },
  { text: '15 U.S.C. §§ 78a-78pp (2018)', category: 'U.S.C.', expectedType: 'FullLawCitation' },

  // Other Law Citations
  { text: 'Cal. Penal Code § 187 (West 2023)', category: 'State Law', expectedType: 'FullLawCitation' },
  { text: 'N.Y. Gen. Bus. Law § 349 (McKinney 2023)', category: 'State Law', expectedType: 'FullLawCitation' },
  { text: 'Tex. Bus. & Com. Code Ann. §§ 17.41-17.63 (West 2023)', category: 'State Law', expectedType: 'FullLawCitation' },
  { text: 'Pub. L. No. 116-136, 134 Stat. 281 (2020)', category: 'Public Law', expectedType: 'FullLawCitation' },
  { text: 'Pub. L. No. 111-148, 124 Stat. 119 (2010)', category: 'Public Law', expectedType: 'FullLawCitation' },
  { text: 'Restatement (Second) of Contracts § 90 (1981)', category: 'Restatement', expectedType: 'FullLawCitation' },
  { text: 'Restatement (Third) of Torts §§ 1-8 (2010)', category: 'Restatement', expectedType: 'FullLawCitation' },

  // Case Citations
  { text: 'Brown v. Board of Education, 347 U.S. 483 (1954)', category: 'Case', expectedType: 'FullCaseCitation' },
  { text: 'Miranda v. Arizona, 384 U.S. 436 (1966)', category: 'Case', expectedType: 'FullCaseCitation' },
  { text: 'Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803)', category: 'Case', expectedType: 'FullCaseCitation' },

  // Journal Citations
  { text: 'Charles A. Reich, The New Property, 73 Yale L.J. 733 (1964)', category: 'Journal', expectedType: 'FullJournalCitation' },
  { text: 'Oliver Wendell Holmes, Jr., The Path of the Law, 10 Harv. L. Rev. 457 (1897)', category: 'Journal', expectedType: 'FullJournalCitation' },
  { text: 'Cass R. Sunstein, Interpreting Statutes in the Regulatory State, 103 Harv. L. Rev. 405 (1989)', category: 'Journal', expectedType: 'FullJournalCitation' },
]

interface TestResult {
  text: string
  category: string
  success: boolean
  citationType?: string
  metadata: Record<string, any>
  error?: string
}

function extractMetadata(citation: CitationBase): Record<string, any> {
  const metadata: Record<string, any> = {}
  
  // Common metadata
  metadata.span = citation.span()
  metadata.text = citation.text
  
  // Type-specific metadata
  if ('volume' in citation) metadata.volume = citation.volume
  if ('reporter' in citation) metadata.reporter = citation.reporter
  if ('page' in citation) metadata.page = citation.page
  if ('pinCite' in citation) metadata.pinCite = citation.pinCite
  if ('year' in citation) metadata.year = citation.year
  if ('plaintiff' in citation) metadata.plaintiff = citation.plaintiff
  if ('defendant' in citation) metadata.defendant = citation.defendant
  if ('court' in citation) metadata.court = citation.court
  if ('title' in citation) metadata.title = citation.title
  if ('section' in citation) metadata.section = citation.section
  if ('author' in citation) metadata.author = citation.author
  if ('journal' in citation) metadata.journal = citation.journal
  if ('publisher' in citation) metadata.publisher = citation.publisher
  
  return metadata
}

function runDetailedTest(testCase: CitationTestCase): TestResult {
  const result: TestResult = {
    text: testCase.text,
    category: testCase.category,
    success: false,
    metadata: {}
  }
  
  try {
    const citations = getCitations(testCase.text)
    
    if (citations.length === 0) {
      result.error = 'No citations found'
      return result
    }
    
    if (citations.length > 1) {
      result.error = `Multiple citations found (${citations.length})`
    }
    
    const citation = citations[0]
    result.citationType = citation.constructor.name
    result.metadata = extractMetadata(citation)
    result.success = true
    
    // Check if type matches expected
    if (testCase.expectedType && result.citationType !== testCase.expectedType) {
      result.error = `Expected ${testCase.expectedType}, got ${result.citationType}`
      result.success = false
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
  }
  
  return result
}

describe('Detailed Citation Parsing Test', () => {
  test('Parse all citations and generate report', () => {
    console.log('\n========================================')
    console.log('DETAILED CITATION PARSING TEST RESULTS')
    console.log('========================================\n')
    
    const results: TestResult[] = []
    const categoryStats: Record<string, { total: number, success: number }> = {}
    
    // Run tests
    for (const testCase of testCases) {
      const result = runDetailedTest(testCase)
      results.push(result)
      
      // Update stats
      if (!categoryStats[testCase.category]) {
        categoryStats[testCase.category] = { total: 0, success: 0 }
      }
      categoryStats[testCase.category].total++
      if (result.success) {
        categoryStats[testCase.category].success++
      }
    }
    
    // Print detailed results by category
    const categories = Object.keys(categoryStats).sort()
    
    for (const category of categories) {
      console.log(`\n${category} Citations:`)
      console.log('─'.repeat(60))
      
      const categoryResults = results.filter(r => r.category === category)
      
      for (const result of categoryResults) {
        console.log(`\nCitation: "${result.text}"`)
        console.log(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`)
        if (result.citationType) {
          console.log(`Type: ${result.citationType}`)
        }
        if (result.error) {
          console.log(`Error: ${result.error}`)
        }
        
        // Print relevant metadata
        if (Object.keys(result.metadata).length > 0) {
          console.log('Metadata:')
          const metadataKeys = Object.keys(result.metadata).filter(k => k !== 'span' && k !== 'text')
          for (const key of metadataKeys) {
            const value = result.metadata[key]
            if (value !== undefined && value !== null && value !== '') {
              console.log(`  - ${key}: ${JSON.stringify(value)}`)
            }
          }
        }
      }
    }
    
    // Print summary statistics
    console.log('\n\nSUMMARY STATISTICS:')
    console.log('═'.repeat(60))
    
    let totalTests = 0
    let totalSuccess = 0
    
    for (const category of categories) {
      const stats = categoryStats[category]
      totalTests += stats.total
      totalSuccess += stats.success
      const percentage = ((stats.success / stats.total) * 100).toFixed(1)
      console.log(`${category}: ${stats.success}/${stats.total} (${percentage}%)`)
    }
    
    console.log('─'.repeat(60))
    const overallPercentage = ((totalSuccess / totalTests) * 100).toFixed(1)
    console.log(`TOTAL: ${totalSuccess}/${totalTests} (${overallPercentage}%)`)
    
    // Special attention items
    console.log('\n\nSPECIAL ATTENTION ITEMS:')
    console.log('═'.repeat(60))
    
    // Check Marbury v. Madison parsing
    const marburyResult = results.find(r => r.text.includes('Marbury v. Madison'))
    if (marburyResult) {
      console.log('\n1. Marbury v. Madison (parallel citation):')
      console.log(`   Status: ${marburyResult.success ? '✓ SUCCESS' : '✗ FAILED'}`)
      console.log(`   Type: ${marburyResult.citationType}`)
      if (marburyResult.metadata.reporter) {
        console.log(`   Reporter: ${marburyResult.metadata.reporter}`)
      }
      if (marburyResult.error) {
        console.log(`   Error: ${marburyResult.error}`)
      }
    }
    
    // Check complex section parsing
    console.log('\n2. Complex Section Parsing:')
    const complexSections = results.filter(r => 
      r.text.includes('§§') || r.text.includes('(c)(3)') || r.text.includes('-')
    )
    let complexSuccess = 0
    for (const result of complexSections) {
      if (result.success) complexSuccess++
      console.log(`   "${result.text}": ${result.success ? '✓' : '✗'}`)
    }
    console.log(`   Success rate: ${complexSuccess}/${complexSections.length}`)
    
    // Check state law citations
    console.log('\n3. State Law Citations:')
    const stateLawResults = results.filter(r => r.category === 'State Law')
    for (const result of stateLawResults) {
      console.log(`   "${result.text}": ${result.success ? '✓' : '✗'}`)
      if (result.metadata.title) {
        console.log(`     Title: ${result.metadata.title}`)
      }
    }
    
    console.log('\n========================================\n')
  })
})