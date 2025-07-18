#!/usr/bin/env bun
/**
 * Script to fetch reporters and courts data from Free Law Project repositories
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const REPORTERS_URL = 'https://raw.githubusercontent.com/freelawproject/reporters-db/main/reporters_db/data/reporters.json'
const COURTS_URL = 'https://raw.githubusercontent.com/freelawproject/courts-db/main/courts_db/data/courts.json'
const STATE_ABBREVS_URL = 'https://raw.githubusercontent.com/freelawproject/reporters-db/main/reporters_db/data/state_abbreviations.json'
const CASE_NAME_ABBREVS_URL = 'https://raw.githubusercontent.com/freelawproject/reporters-db/main/reporters_db/data/case_name_abbreviations.json'

const DATA_DIR = join(process.cwd(), 'src/data')

async function fetchData(url: string, filename: string) {
  console.log(`Fetching ${filename}...`)
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    
    // Ensure data directory exists
    mkdirSync(DATA_DIR, { recursive: true })
    
    // Write the data
    const filepath = join(DATA_DIR, filename)
    writeFileSync(filepath, JSON.stringify(data, null, 2))
    console.log(`✓ Saved ${filename} (${Object.keys(data).length} entries)`)
    
    return data
  } catch (error) {
    console.error(`✗ Failed to fetch ${filename}:`, error)
    throw error
  }
}

async function main() {
  console.log('Fetching legal citation data from Free Law Project...\n')
  
  try {
    // Fetch all data files
    await Promise.all([
      fetchData(REPORTERS_URL, 'reporters.json'),
      fetchData(COURTS_URL, 'courts.json'),
      fetchData(STATE_ABBREVS_URL, 'state_abbreviations.json'),
      fetchData(CASE_NAME_ABBREVS_URL, 'case_name_abbreviations.json'),
    ])
    
    console.log('\n✓ All data fetched successfully!')
    console.log(`Data saved to: ${DATA_DIR}`)
    
    // Create index file
    const indexContent = `/**
 * Auto-generated index for legal citation data
 * Generated on: ${new Date().toISOString()}
 */

import reportersData from './reporters.json'
import courtsData from './courts.json'
import stateAbbreviations from './state_abbreviations.json'
import caseNameAbbreviations from './case_name_abbreviations.json'

export const REPORTERS = reportersData as any
export const COURTS = courtsData as any
export const STATE_ABBREVIATIONS = stateAbbreviations as any
export const CASE_NAME_ABBREVIATIONS = caseNameAbbreviations as any
`
    
    writeFileSync(join(DATA_DIR, 'index.ts'), indexContent)
    console.log('✓ Created index.ts')
    
  } catch (error) {
    console.error('\n✗ Failed to fetch all data')
    process.exit(1)
  }
}

// Run the script
main()