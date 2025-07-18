/**
 * TypeScript implementation of reporters-db
 * Using actual data from Free Law Project
 */

import caseNameAbbreviationsData from '../data/case_name_abbreviations.json'
import courtsData from '../data/courts.json'
// Import the actual data
import reportersData from '../data/reporters.json'
import stateAbbreviationsData from '../data/state_abbreviations.json'

export interface Edition {
  name?: string
  start?: string | null
  end?: string | null
}

export interface Reporter {
  name: string
  cite_type: 'federal' | 'state' | 'specialty' | 'neutral' | 'scotus_early'
  editions: Record<string, Edition>
  variations?: Record<string, string>
  mlz_jurisdiction?: string[]
  publisher?: string
  examples?: string[]
}

export interface Court {
  id: string
  name: string
  citation_string: string
  regex?: string
  dates?: Array<{
    start?: string
    end?: string | null
  }>
  system?: string
  level?: string
  type?: string
}

// Export the actual data with proper types
export const REPORTERS: Record<string, Reporter[]> = reportersData as Record<string, Reporter[]>
export const COURTS: Court[] = courtsData as Court[]
export const STATE_ABBREVIATIONS: Record<string, string> = stateAbbreviationsData as Record<
  string,
  string
>
export const CASE_NAME_ABBREVIATIONS: Record<string, string[]> =
  caseNameAbbreviationsData as Record<string, string[]>

// Additional databases (empty for now, can be populated if needed)
export const LAWS: Record<string, unknown> = {}
export const JOURNALS: Record<string, unknown> = {}

// Raw regex variables
export const RAW_REGEX_VARIABLES: Record<string, string> = {
  reporter: Object.keys(REPORTERS).join('|'),
  page: '\\d+',
  volume: '\\d+',
}

// Build variations mapping
export const VARIATIONS_ONLY: Record<string, string> = {}
for (const [_reporter, configs] of Object.entries(REPORTERS)) {
  for (const config of configs) {
    if (config.variations) {
      Object.assign(VARIATIONS_ONLY, config.variations)
    }
  }
}

// Build editions mapping
export const EDITIONS: Record<string, Reporter> = {}
for (const [_reporter, configs] of Object.entries(REPORTERS)) {
  for (const config of configs) {
    for (const edition of Object.keys(config.editions)) {
      EDITIONS[edition] = config
    }
  }
}

// Build a mapping of all reporter strings (including variations) to canonical form
export const ALL_REPORTERS: Set<string> = new Set()
for (const [reporter, configs] of Object.entries(REPORTERS)) {
  ALL_REPORTERS.add(reporter)
  for (const config of configs) {
    if (config.variations) {
      for (const variation of Object.keys(config.variations)) {
        ALL_REPORTERS.add(variation)
      }
    }
  }
}
