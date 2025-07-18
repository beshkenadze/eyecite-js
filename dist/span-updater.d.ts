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
export declare class SpanUpdater {
    private offsets;
    private updaters;
    constructor(textBefore: string, textAfter: string);
    /**
     * Update an offset from the before text to the after text
     * @param offset The offset in the before text
     * @param bisectFunc Either bisectLeft or bisectRight function
     * @returns The corresponding offset in the after text
     */
    update(offset: number, bisectFunc?: (arr: number[], val: number) => number): number;
    /**
     * Get diff steps to transform a into b
     * @param a The source string
     * @param b The target string
     * @returns Array of [operation, count] tuples
     */
    private getDiffSteps;
}
/**
 * Binary search function to find the rightmost position where value can be inserted
 */
export declare function bisectRight(arr: number[], val: number): number;
/**
 * Binary search function to find the leftmost position where value can be inserted
 */
export declare function bisectLeft(arr: number[], val: number): number;
//# sourceMappingURL=span-updater.d.ts.map