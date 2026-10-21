/**
 * Request parameters shared by the API's opaque-cursor pagination.
 * Pass the previous response's `next_cursor` back as `cursor`.
 */
export interface CursorPageParams {
  /** Page size (documented range 1–200). */
  limit?: number;
  /** Opaque cursor from the previous page's `next_cursor`. */
  cursor?: string;
}

/** Response fields shared by opaque-cursor pages. Absent on the last page. */
export interface CursorPageInfo {
  next_cursor?: string;
}

/**
 * Page metadata returned by `GET /cases`.
 * Note: the API documents no request parameter for selecting a page.
 */
export interface PageMetadata {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
