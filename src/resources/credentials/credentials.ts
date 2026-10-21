import { buildPath, type RequestOptions } from "../../client/request.js";
import { APIResource } from "../../core/resource.js";
import type {
  Credential,
  CredentialListResponse,
  CredentialRegisterParams,
  CredentialResourceListResponse,
} from "./types.js";

/** Credentials API — provider connections (Plivo, SES, Gemini, …). */
export class Credentials extends APIResource {
  /**
   * Register a provider credential — `POST /credentials` (scope `credentials:write`).
   * Secret config values are stored but never returned; the response lists only
   * which keys were set.
   */
  async register(params: CredentialRegisterParams, options?: RequestOptions): Promise<Credential> {
    return this._request({ method: "POST", path: "/credentials", body: params, idempotent: false }, options);
  }

  /** List provider credentials — `GET /credentials` (scope `credentials:read`). */
  async list(options?: RequestOptions): Promise<CredentialListResponse> {
    return this._request({ method: "GET", path: "/credentials", idempotent: true }, options);
  }

  /** Get a provider credential — `GET /credentials/{id}` (scope `credentials:read`). */
  async get(id: string, options?: RequestOptions): Promise<Credential> {
    return this._request({ method: "GET", path: buildPath("/credentials/{id}", { id }), idempotent: true }, options);
  }

  /**
   * List a credential's resources (numbers / senders) and which agent owns each —
   * `GET /credentials/{id}/resources` (scope `credentials:read`).
   */
  async listResources(id: string, options?: RequestOptions): Promise<CredentialResourceListResponse> {
    return this._request(
      { method: "GET", path: buildPath("/credentials/{id}/resources", { id }), idempotent: true },
      options,
    );
  }
}
