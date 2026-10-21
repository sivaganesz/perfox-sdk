/**
 * Lazily walks a paginated endpoint.
 *
 * - `for await (const item of paginator)` yields every item across pages.
 * - `paginator.pages()` yields whole page responses.
 * - `paginator.toArray({ maxItems })` collects items into an array.
 *
 * Nothing is fetched until iteration starts, and each page is requested only
 * when the previous one has been consumed.
 */
export class Paginator<TPage, TItem> implements AsyncIterable<TItem> {
  constructor(
    private readonly fetchPage: (cursor: string | undefined) => Promise<TPage>,
    private readonly getItems: (page: TPage) => readonly TItem[],
    /** Returns the cursor for the next page, or `undefined` when this is the last page. */
    private readonly getNextCursor: (page: TPage) => string | undefined,
    private readonly initialCursor?: string,
  ) {}

  async *pages(): AsyncGenerator<TPage, void, undefined> {
    let cursor = this.initialCursor;
    const seen = new Set<string>();
    for (;;) {
      const page = await this.fetchPage(cursor);
      yield page;
      const next = this.getNextCursor(page);
      // Stop on the last page, on an empty page, or if the server repeats a
      // cursor (guards against an infinite loop).
      if (!next || this.getItems(page).length === 0 || seen.has(next)) return;
      seen.add(next);
      cursor = next;
    }
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<TItem, void, undefined> {
    for await (const page of this.pages()) {
      yield* this.getItems(page);
    }
  }

  /** Collects items into an array, stopping after `maxItems` if given. */
  async toArray(options: { maxItems?: number } = {}): Promise<TItem[]> {
    const { maxItems } = options;
    const items: TItem[] = [];
    if (maxItems !== undefined && maxItems <= 0) return items;
    for await (const item of this) {
      items.push(item);
      if (maxItems !== undefined && items.length >= maxItems) break;
    }
    return items;
  }
}
