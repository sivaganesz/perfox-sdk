/** A successful response: the parsed body plus HTTP metadata. */
export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Reads a response body as JSON. Returns `undefined` for an empty body and the
 * raw text when the body is not valid JSON (callers decide whether that is an error).
 */
export async function readBody(response: Response): Promise<{ parsed: unknown; isJson: boolean }> {
  const text = await response.text();
  if (text === "") return { parsed: undefined, isJson: false };
  try {
    return { parsed: JSON.parse(text) as unknown, isJson: true };
  } catch {
    return { parsed: text, isJson: false };
  }
}
