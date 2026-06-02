import { API_BASE_URL } from "@/types/constants";
import { ApiError } from "@/utils/fetcher";

/**
 * Allowed MIME types for the `token-logo` upload purpose. Mirrored from
 * the backend's UploadsService.ALLOWED_MIME — keeping these in sync avoids
 * a network round-trip just to discover the file is unsupported.
 *
 * Note: SVG is intentionally NOT supported. The backend rejects it at the
 * magic-byte sniff stage; rasterise client-side first if you need vectors.
 */
const ALLOWED_LOGO_MIME = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

interface UploadResult {
  id: string;
  url: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Convert a `data:image/...;base64,…` URL produced by FileUpload into a
 * `File` that the multipart endpoint will accept. We can't reuse the
 * original File reference because FileUpload only ever held the FileReader
 * result, not the source File itself.
 */
async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  const mime = blob.type || "application/octet-stream";
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new Error(
      `Unsupported logo MIME type: ${mime}. Allowed: ${Array.from(ALLOWED_LOGO_MIME).join(", ")}`,
    );
  }
  return new File([blob], `logo.${ext}`, { type: mime });
}

/**
 * Upload a token logo image to the backend CDN pipeline and return its
 * public URL. The caller passes the same EIP-191 auth header bundle used
 * for other protected routes; the backend resolves the owner address
 * from `x-address`.
 *
 * Uses raw fetch (not fetchApi) because the request body is multipart
 * FormData — fetchApi unconditionally sets `Content-Type: application/json`
 * when a body is present, which would clobber the multipart boundary the
 * browser auto-generates.
 */
export async function uploadTokenLogo(
  dataUrl: string,
  auth: Record<string, string>,
): Promise<string> {
  const file = await dataUrlToFile(dataUrl);
  const form = new FormData();
  form.append("file", file);

  const url = `${API_BASE_URL}/api/uploads/token-logo`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", ...auth },
    body: form,
  });

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      (body as { message?: string })?.message ??
      (body as { error?: string })?.error ??
      `${response.status} ${response.statusText}`;
    throw new ApiError(
      response.status,
      body,
      `[uploadTokenLogo] ${message} — /api/uploads/token-logo`,
    );
  }

  // TransformInterceptor envelope: { data: UploadResult, timestamp }.
  // Tolerate both wrapped and unwrapped shapes so we don't break if the
  // interceptor is ever bypassed for this route.
  const payload =
    body &&
    typeof body === "object" &&
    "data" in (body as Record<string, unknown>)
      ? ((body as { data: UploadResult }).data ?? (body as UploadResult))
      : (body as UploadResult);

  if (!payload?.url) {
    throw new ApiError(
      response.status,
      body,
      `[uploadTokenLogo] response missing url field — /api/uploads/token-logo`,
    );
  }
  return payload.url;
}
