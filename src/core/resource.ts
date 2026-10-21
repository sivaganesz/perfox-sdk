import type { HttpClient } from "../client/http-client.js";
import type { ApiRequest, RequestOptions } from "../client/request.js";

/**
 * Base class for an API category. A new category is added by extending this
 * class and exposing an instance on `PerfoxClient` — no transport changes needed.
 */
export abstract class APIResource {
  protected readonly _http: HttpClient;

  constructor(http: HttpClient) {
    this._http = http;
  }

  /** Sends a request and resolves with the parsed response body. */
  protected async _request<T>(request: ApiRequest, options?: RequestOptions): Promise<T> {
    const response = await this._http.request<T>(request, options);
    return response.data;
  }
}
