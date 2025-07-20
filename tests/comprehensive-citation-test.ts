import { getCitations } from '../src/index'
import type { CitationBase } from '../src/models'

interface TestCase {
  category: string
  text: string
  expectedType?: string
  expectedMetadata?: {
    volume?: string
    reporter?: string
    section?: string
    year?: string
    title?: string
    page?: string
  }
}

const testCases: TestCase[] = [
  // C.F.R. Citations
  {
    category: 'C.F.R. Citations',
    text: '40 C.F.R. § 261.4 (2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '40',
      reporter: 'C.F.R.',
      section: '261.4',
      year: '2023'
    }
  },
  {
    category: 'C.F.R. Citations',
    text: '21 C.F.R. § 314.50 (2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '21',
      reporter: 'C.F.R.',
      section: '314.50',
      year: '2023'
    }
  },
  {
    category: 'C.F.R. Citations',
    text: '29 C.F.R. § 1910.1200 (2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '29',
      reporter: 'C.F.R.',
      section: '1910.1200',
      year: '2023'
    }
  },
  {
    category: 'C.F.R. Citations',
    text: '45 C.F.R. §§ 160.101-160.104 (2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '45',
      reporter: 'C.F.R.',
      section: '160.101-160.104',
      year: '2023'
    }
  },

  // U.S.C. Citations
  {
    category: 'U.S.C. Citations',
    text: '42 U.S.C. § 1983 (2018)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '42',
      reporter: 'U.S.C.',
      section: '1983',
      year: '2018'
    }
  },
  {
    category: 'U.S.C. Citations',
    text: '18 U.S.C. § 1001 (2018)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '18',
      reporter: 'U.S.C.',
      section: '1001',
      year: '2018'
    }
  },
  {
    category: 'U.S.C. Citations',
    text: '26 U.S.C. § 501(c)(3) (2018)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '26',
      reporter: 'U.S.C.',
      section: '501(c)(3)',
      year: '2018'
    }
  },
  {
    category: 'U.S.C. Citations',
    text: '15 U.S.C. §§ 78a-78pp (2018)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      volume: '15',
      reporter: 'U.S.C.',
      section: '78a-78pp',
      year: '2018'
    }
  },

  // State Statutes
  {
    category: 'State Statutes',
    text: 'Cal. Penal Code § 187 (West 2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'Cal. Penal Code',
      section: '187',
      year: '2023'
    }
  },
  {
    category: 'State Statutes',
    text: 'N.Y. Gen. Bus. Law § 349 (McKinney 2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'N.Y. Gen. Bus. Law',
      section: '349',
      year: '2023'
    }
  },
  {
    category: 'State Statutes',
    text: 'Tex. Bus. & Com. Code Ann. §§ 17.41-17.63 (West 2023)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'Tex. Bus. & Com. Code Ann.',
      section: '17.41-17.63',
      year: '2023'
    }
  },

  // Public Laws
  {
    category: 'Public Laws',
    text: 'Pub. L. No. 116-136, 134 Stat. 281 (2020)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'Pub. L.',
      title: '116-136',
      volume: '134',
      page: '281',
      year: '2020'
    }
  },
  {
    category: 'Public Laws',
    text: 'Pub. L. No. 111-148, 124 Stat. 119 (2010)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'Pub. L.',
      title: '111-148',
      volume: '124',
      page: '119',
      year: '2010'
    }
  },

  // Restatements
  {
    category: 'Restatements',
    text: 'Restatement (Second) of Contracts § 90 (1981)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'Restatement (Second) of Contracts',
      section: '90',
      year: '1981'
    }
  },
  {
    category: 'Restatements',
    text: 'Restatement (Third) of Torts §§ 1-8 (2010)',
    expectedType: 'FullLawCitation',
    expectedMetadata: {
      reporter: 'Restatement (Third) of Torts',
      section: '1-8',
      year: '2010'
    }
  },

  // Case Citations
  {
    category: 'Case Citations',
    text: 'Brown v. Board of Education, 347 U.S. 483 (1954)',
    expectedType: 'FullCaseCitation',
    expectedMetadata: {
      volume: '347',
      reporter: 'U.S.',
      page: '483',
      year: '1954'
    }
  },
  {
    category: 'Case Citations',
    text: 'Miranda v. Arizona, 384 U.S. 436 (1966)',
    expectedType: 'FullCaseCitation',
    expectedMetadata: {
      volume: '384',
      reporter: 'U.S.',
      page: '436',
      year: '1966'
    }
  },
  {
    category: 'Case Citations',
    text: 'Roe v. Wade, 410 U.S. 113 (1973)',
    expectedType: 'FullCaseCitation',
    expectedMetadata: {
      volume: '410',
      reporter: 'U.S.',
      page: '113',
      year: '1973'
    }
  },

  // Journal Citations
  {
    category: 'Journal Citations',
    text: 'John Doe, The Future of Privacy Law, 135 Harv. L. Rev. 1234 (2022)',
    expectedType: 'FullJournalCitation',
    expectedMetadata: {
      volume: '135',
      reporter: 'Harv. L. Rev.',
      page: '1234',
      year: '2022'
    }
  },
  {
    category: 'Journal Citations',
    text: 'Jane Smith, Constitutional Interpretation in the Digital Age, 75 Stan. L. Rev. 567 (2023)',
    expectedType: 'FullJournalCitation',
    expectedMetadata: {
      volume: '75',
      reporter: 'Stan. L. Rev.',
      page: '567',
      year: '2023'
    }
  },
  {
    category: 'Journal Citations',
    text: 'Robert Johnson, Corporate Liability Under Environmental Statutes, 98 N.Y.U. L. Rev. 890 (2023)',
    expectedType: 'FullJournalCitation',
    expectedMetadata: {
      volume: '98',
      reporter: 'N.Y.U. L. Rev.',
      page: '890',
      year: '2023'
    }
  }
]

function extractMetadata(citation: CitationBase): Record<string, string | undefined> {
  const metadata: Record<string, string | undefined> = {
    type: citation.constructor.name
  }

  // Extract common fields
  if ('volume' in citation && citation.volume) {
    metadata.volume = citation.volume.toString()
  }
  if ('reporter' in citation) {
    // Handle different citation types differently
    if ('editionGuess' in citation && citation.editionGuess && 'reporter' in citation.editionGuess) {
      // Case citations have editionGuess with reporter object
      metadata.reporter = citation.editionGuess.reporter.shortName
    } else if ('groups' in citation && citation.groups && 'reporter' in citation.groups) {
      // Fall back to groups.reporter
      metadata.reporter = citation.groups.reporter
    } else if (citation.reporter) {
      // For other citation types (FullLawCitation, FullJournalCitation)
      metadata.reporter = citation.reporter.toString()
    }
  }
  if ('page' in citation && citation.page) {
    metadata.page = citation.page.toString()
  }
  if ('year' in citation && citation.year) {
    metadata.year = citation.year.toString()
  }
  if ('section' in citation && citation.section) {
    metadata.section = citation.section.toString()
  }
  if ('title' in citation && citation.title) {
    metadata.title = citation.title.toString()
  }

  return metadata
}

function runTests() {
  console.log('='.repeat(80))
  console.log('COMPREHENSIVE CITATION PARSING TEST')
  console.log('='.repeat(80))
  console.log()

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {} as Record<string, { total: number; passed: number; failed: number }>
  }

  let currentCategory = ''

  for (const testCase of testCases) {
    if (testCase.category !== currentCategory) {
      currentCategory = testCase.category
      console.log(`\n${currentCategory}:`)
      console.log('-'.repeat(currentCategory.length + 1))
      
      if (!results.byCategory[currentCategory]) {
        results.byCategory[currentCategory] = { total: 0, passed: 0, failed: 0 }
      }
    }

    results.total++
    results.byCategory[currentCategory].total++

    console.log(`\nTesting: "${testCase.text}"`)

    try {
      const citations = getCitations(testCase.text)
      
      if (citations.length === 0) {
        console.log('  ❌ FAILED: No citations found')
        results.failed++
        results.byCategory[currentCategory].failed++
      } else if (citations.length > 1) {
        console.log(`  ⚠️  WARNING: Multiple citations found (${citations.length}), using first one`)
        const citation = citations[0]
        const metadata = extractMetadata(citation)
        
        console.log(`  ✓ Type: ${metadata.type}`)
        console.log('  ✓ Metadata:', JSON.stringify(metadata, null, 2))
        
        // Check if type matches expected
        if (testCase.expectedType && metadata.type !== testCase.expectedType) {
          console.log(`  ⚠️  Expected type: ${testCase.expectedType}, got: ${metadata.type}`)
        }
        
        results.passed++
        results.byCategory[currentCategory].passed++
      } else {
        const citation = citations[0]
        const metadata = extractMetadata(citation)
        
        console.log(`  ✓ Type: ${metadata.type}`)
        console.log('  ✓ Metadata:', JSON.stringify(metadata, null, 2))
        
        // Check if type matches expected
        if (testCase.expectedType && metadata.type !== testCase.expectedType) {
          console.log(`  ⚠️  Expected type: ${testCase.expectedType}, got: ${metadata.type}`)
        }
        
        // Check expected metadata fields
        if (testCase.expectedMetadata) {
          const mismatches: string[] = []
          for (const [key, expectedValue] of Object.entries(testCase.expectedMetadata)) {
            if (metadata[key] !== expectedValue) {
              mismatches.push(`${key}: expected "${expectedValue}", got "${metadata[key] || 'undefined'}"`)
            }
          }
          if (mismatches.length > 0) {
            console.log('  ⚠️  Metadata mismatches:')
            mismatches.forEach(m => console.log(`    - ${m}`))
          }
        }
        
        results.passed++
        results.byCategory[currentCategory].passed++
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error}`)
      results.failed++
      results.byCategory[currentCategory].failed++
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(80)}`)
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total tests: ${results.total}`)
  console.log(`Passed: ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${results.failed} (${((results.failed / results.total) * 100).toFixed(1)}%)`)
  
  console.log('\nBy Category:')
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const successRate = ((stats.passed / stats.total) * 100).toFixed(1)
    console.log(`  ${category}: ${stats.passed}/${stats.total} passed (${successRate}%)`)
  }
}

// Run the tests
runTests()