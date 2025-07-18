/**
 * Helper class to shift offsets from text_before to text_after.
 *
 * For example:
 * text_before = "foo bar"
 * text_after = "foo baz bar"
 * updater = new SpanUpdater(text_before, text_after)
 *
 * Offset 1 is still at offset 1:
 * updater.update(1) => 1
 *
 * Offset 4 has moved to offset 8:
 * updater.update(4) => 8
 */
export class SpanUpdater {
  private offsets: number[] = []
  private updaters: Array<(offset: number) => number> = []

  constructor(textBefore: string, textAfter: string) {
    // Calculate diff steps to transform textBefore into textAfter
    const steps = this.getDiffSteps(textBefore, textAfter)

    let offsetBefore = 0
    let offsetAfter = 0

    for (const [op, count] of steps) {
      if (op === '=') {
        // Characters are the same
        offsetBefore += count
        offsetAfter += count
      } else if (op === '+') {
        // Characters added
        this.offsets.push(offsetBefore)
        this.updaters.push((offset: number) => offset + (offsetAfter - offsetBefore))
        offsetAfter += count
      } else if (op === '-') {
        // Characters deleted
        offsetBefore += count
        this.offsets.push(offsetBefore)
        this.updaters.push((offset: number) => offset + (offsetAfter - offsetBefore))
      }
    }

    // Add final offset
    this.offsets.push(offsetBefore)
    this.updaters.push((offset: number) => offset + (offsetAfter - offsetBefore))
  }

  /**
   * Update an offset from the before text to the after text
   * @param offset The offset in the before text
   * @param bisectFunc Either bisectLeft or bisectRight function
   * @returns The corresponding offset in the after text
   */
  update(offset: number, bisectFunc: (arr: number[], val: number) => number = bisectRight): number {
    const index = bisectFunc(this.offsets, offset)

    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index - 1, this.updaters.length - 1))

    return this.updaters[clampedIndex](offset)
  }

  /**
   * Get diff steps to transform a into b
   * @param a The source string
   * @param b The target string
   * @returns Array of [operation, count] tuples
   */
  private getDiffSteps(a: string, b: string): Array<[string, number]> {
    const steps: Array<[string, number]> = []

    // Simple diff algorithm - can be improved with a proper diff library
    let i = 0
    let j = 0

    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        // Characters match
        let count = 0
        while (i < a.length && j < b.length && a[i] === b[j]) {
          count++
          i++
          j++
        }
        steps.push(['=', count])
      } else if (i >= a.length) {
        // Reached end of a, remaining characters in b are additions
        steps.push(['+', b.length - j])
        j = b.length
      } else if (j >= b.length) {
        // Reached end of b, remaining characters in a are deletions
        steps.push(['-', a.length - i])
        i = a.length
      } else {
        // Characters don't match, try to find next match
        const nextMatchA = a.indexOf(b[j], i + 1)
        const nextMatchB = b.indexOf(a[i], j + 1)

        if (nextMatchA !== -1 && (nextMatchB === -1 || nextMatchA - i < nextMatchB - j)) {
          // Delete from a
          steps.push(['-', nextMatchA - i])
          i = nextMatchA
        } else if (nextMatchB !== -1) {
          // Insert from b
          steps.push(['+', nextMatchB - j])
          j = nextMatchB
        } else {
          // No matches found, delete rest of a and insert rest of b
          if (i < a.length) {
            steps.push(['-', a.length - i])
            i = a.length
          }
          if (j < b.length) {
            steps.push(['+', b.length - j])
            j = b.length
          }
        }
      }
    }

    return steps
  }
}

/**
 * Binary search function to find the rightmost position where value can be inserted
 */
export function bisectRight(arr: number[], val: number): number {
  let left = 0
  let right = arr.length

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (arr[mid] <= val) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  return left
}

/**
 * Binary search function to find the leftmost position where value can be inserted
 */
export function bisectLeft(arr: number[], val: number): number {
  let left = 0
  let right = arr.length

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (arr[mid] < val) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  return left
}
