/**
 * Group an array of items by a key extractor function.
 *
 * @param items - Array of items to group.
 * @param keyFn - Function that returns the group key for each item.
 * @returns Object mapping group keys to arrays of items.
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}
