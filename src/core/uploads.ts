import { InvalidRequestError } from "../errors/sdk-error.js";

/**
 * File content accepted for uploads.
 *
 * In Node.js, pass a `Buffer` (from `fs.readFile`) or a `Blob` (from
 * `fs.openAsBlob`, Node 19.8+). In browsers/edge runtimes, pass a `File` or `Blob`.
 */
export type Uploadable = Blob | ArrayBuffer | ArrayBufferView;

export interface FileToUpload {
  /** The file bytes. */
  data: Uploadable;
  /**
   * Filename sent in the multipart part. Required unless `data` is a `File`
   * (which carries its own name).
   */
  filename?: string;
  /** MIME type. Defaults to the Blob's `type`, else `application/octet-stream`. */
  contentType?: string;
}

/** A `File` (named Blob), any `Blob` with a separate filename, or raw bytes with a filename. */
export type FileInput = Blob | FileToUpload;

/** Normalises upload input into a Blob plus the filename to send with it. */
export function toUploadPart(input: FileInput): { blob: Blob; filename: string } {
  const file: FileToUpload = input instanceof Blob ? { data: input } : input;
  const { data } = file;
  const ownName = isNamedBlob(data) ? data.name : undefined;
  const filename = file.filename ?? ownName;
  if (!filename || filename.trim() === "") {
    throw new InvalidRequestError(
      "A filename is required for uploads: pass `filename`, or pass a `File` that has a name.",
    );
  }

  let blob: Blob;
  if (data instanceof Blob) {
    blob = file.contentType && file.contentType !== data.type ? data.slice(0, data.size, file.contentType) : data;
  } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const bytes =
      data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    // Copy so the Blob never aliases a buffer the caller may reuse.
    blob = new Blob([bytes.slice()], { type: file.contentType ?? "application/octet-stream" });
  } else {
    throw new InvalidRequestError("Unsupported upload data: expected a Blob, File, ArrayBuffer or typed array.");
  }
  return { blob, filename };
}

function isNamedBlob(value: unknown): value is Blob & { name: string } {
  return value instanceof Blob && typeof (value as { name?: unknown }).name === "string";
}
