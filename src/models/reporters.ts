export interface ReporterInterface {
  shortName: string
  name: string
  citeType: string
  source: 'reporters' | 'laws' | 'journals'
  isScotus: boolean
}

export class Reporter implements ReporterInterface {
  shortName: string
  name: string
  citeType: string
  source: 'reporters' | 'laws' | 'journals'
  isScotus: boolean

  constructor(
    citeType: string,
    name: string,
    shortName: string,
    _editionName: string,
    _start?: string,
    _end?: string,
    isScotus = false,
    _mlzJurisdiction: string[] = [],
  ) {
    this.citeType = citeType
    this.name = name
    this.shortName = shortName
    this.source = 'reporters' // default, could be passed as param
    this.isScotus = isScotus
  }
}

export interface Edition {
  reporter: Reporter
  reporterFound?: string
  shortName?: string
  start?: Date | null
  end?: Date | null
}

/**
 * Date validation cache for performance optimization
 */
const dateValidationCache = new Map<string, boolean>()

/**
 * Validates if a given year falls within the publication range of a reporter edition.
 * Handles edge cases including ongoing publications, future dates, and invalid years.
 *
 * @param edition - The reporter edition with optional start and end dates
 * @param year - The year to validate (should be a 4-digit year)
 * @returns true if the year is valid for this edition, false otherwise
 */
export function includesYear(edition: Edition, year: number): boolean {
  // Input validation
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return false
  }

  // Create cache key for performance
  const cacheKey = `${edition.reporter?.shortName || 'unknown'}-${edition.start?.getTime() || 'null'}-${edition.end?.getTime() || 'null'}-${year}`

  // Check cache first
  if (dateValidationCache.has(cacheKey)) {
    return dateValidationCache.get(cacheKey)!
  }

  const currentYear = new Date().getFullYear()

  // Reject future years to maintain consistency with existing behavior
  if (year > currentYear) {
    dateValidationCache.set(cacheKey, false)
    return false
  }

  // Check start date constraint
  const startYear = edition.start?.getFullYear()
  if (startYear && year < startYear) {
    dateValidationCache.set(cacheKey, false)
    return false
  }

  // Check end date constraint
  const endYear = edition.end?.getFullYear()
  if (endYear && year > endYear) {
    dateValidationCache.set(cacheKey, false)
    return false
  }

  // Year is valid
  dateValidationCache.set(cacheKey, true)
  return true
}

/**
 * Validates a year range string (e.g., "1982-83", "2005-06") and returns the start and end years.
 *
 * @param yearRange - The year range string to parse
 * @returns Object with startYear, endYear, and isValid properties
 */
export function parseYearRange(yearRange: string): {
  startYear: number | null
  endYear: number | null
  isValid: boolean
} {
  if (!yearRange || typeof yearRange !== 'string') {
    return { startYear: null, endYear: null, isValid: false }
  }

  // Match patterns like "1982-83", "2005-06", "1990-1991"
  const rangeMatch = yearRange.match(/^(\d{4})(?:-(\d{2,4}))?$/)
  if (!rangeMatch) {
    // Try to match just a single year
    const singleYearMatch = yearRange.match(/^(\d{4})$/)
    if (singleYearMatch) {
      const year = parseInt(singleYearMatch[1])
      return { startYear: year, endYear: year, isValid: year >= 1000 && year <= 9999 }
    }
    return { startYear: null, endYear: null, isValid: false }
  }

  const startYear = parseInt(rangeMatch[1])
  let endYear: number

  if (rangeMatch[2]) {
    if (rangeMatch[2].length === 2) {
      // Two-digit year suffix (e.g., "82-83")
      const century = Math.floor(startYear / 100) * 100
      endYear = century + parseInt(rangeMatch[2])

      // Handle century boundary (e.g., "1999-00" should be "1999-2000")
      if (endYear < startYear) {
        endYear += 100
      }
    } else {
      // Full year (e.g., "1990-1991")
      endYear = parseInt(rangeMatch[2])
    }
  } else {
    endYear = startYear
  }

  // Validate the range
  const isValid =
    startYear >= 1000 &&
    startYear <= 9999 &&
    endYear >= 1000 &&
    endYear <= 9999 &&
    endYear >= startYear &&
    endYear - startYear <= 10 // Reasonable range limit

  if (!isValid) {
    return { startYear: null, endYear: null, isValid: false }
  }

  return { startYear, endYear, isValid }
}

/**
 * Validates if a year range is valid for a given reporter edition.
 *
 * @param edition - The reporter edition
 * @param yearRange - The year range string
 * @returns true if the year range is valid for this edition
 */
export function includesYearRange(edition: Edition, yearRange: string): boolean {
  const parsed = parseYearRange(yearRange)
  if (!parsed.isValid || !parsed.startYear || !parsed.endYear) {
    return false
  }

  // Check if both start and end years are valid for this edition
  return includesYear(edition, parsed.startYear) && includesYear(edition, parsed.endYear)
}

/**
 * Validates month and day information in a date string.
 *
 * @param dateStr - Date string that may contain month and day information
 * @returns Object with validation results and warnings
 */
export function validateDateComponents(dateStr: string): {
  isValid: boolean
  warnings: string[]
  month?: number
  day?: number
  year?: number
} {
  const warnings: string[] = []

  if (!dateStr || typeof dateStr !== 'string') {
    return { isValid: false, warnings: ['Invalid date string'] }
  }

  // Try to parse various date formats
  let month: number | undefined
  let day: number | undefined
  let year: number | undefined

  // Match formats like "Jan. 15, 2023", "January 15, 2023", "1/15/2023", etc.
  const datePatterns = [
    /\b(\w{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/i, // "Jan 15, 2023" or "January 15, 2023"
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, // "1/15/2023"
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // "2023-01-15"
  ]

  const monthNames = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  }

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern)
    if (match) {
      if (pattern.source.includes('\\w')) {
        // Month name format
        const monthName = match[1].toLowerCase().replace('.', '')
        month = monthNames[monthName as keyof typeof monthNames]
        day = parseInt(match[2])
        year = parseInt(match[3])
      } else if (pattern.source.includes('-')) {
        // ISO format
        year = parseInt(match[1])
        month = parseInt(match[2])
        day = parseInt(match[3])
      } else {
        // M/D/Y format
        month = parseInt(match[1])
        day = parseInt(match[2])
        year = parseInt(match[3])
      }
      break
    }
  }

  // Validate components
  let isValid = true

  if (year !== undefined) {
    if (year < 1000 || year > 9999) {
      isValid = false
      warnings.push(`Invalid year: ${year}`)
    } else if (year > new Date().getFullYear() + 1) {
      warnings.push(`Future year detected: ${year}`)
    } else if (year < 1600) {
      warnings.push(`Very old year detected: ${year}`)
    }
  }

  if (month !== undefined) {
    if (month < 1 || month > 12) {
      isValid = false
      warnings.push(`Invalid month: ${month}`)
    }
  }

  if (day !== undefined) {
    if (day < 1 || day > 31) {
      isValid = false
      warnings.push(`Invalid day: ${day}`)
    } else if (month !== undefined && year !== undefined) {
      // Check if day is valid for the specific month/year
      const daysInMonth = new Date(year, month, 0).getDate()
      if (day > daysInMonth) {
        isValid = false
        warnings.push(`Invalid day ${day} for ${year}-${month.toString().padStart(2, '0')}`)
      }
    }
  }

  return { isValid, warnings, month, day, year }
}

/**
 * Clears the date validation cache. Useful for testing or memory management.
 */
export function clearDateValidationCache(): void {
  dateValidationCache.clear()
}

/**
 * Creates a reporter instance with the given parameters.
 */
export function createReporter(
  shortName: string,
  name: string,
  citeType: string,
  source: 'reporters' | 'laws' | 'journals',
): Reporter {
  const isScotus =
    (citeType === 'federal' && name.toLowerCase().includes('supreme')) ||
    citeType.toLowerCase().includes('scotus') ||
    shortName === 'U.S.'

  return {
    shortName,
    name,
    citeType,
    source,
    isScotus,
  }
}

export function createEdition(
  reporter: Reporter,
  shortName: string,
  start: Date | null,
  end: Date | null,
): Edition {
  return {
    reporter,
    shortName,
    start,
    end,
  }
}
