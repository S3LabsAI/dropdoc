import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Who may write to the store (upload or delete). The rule is fail-closed: a deployment with no
// `UPLOAD_SECRET` accepts no writes at all. It used to be the reverse — an unset secret left both
// endpoints open — which turned the production site into anonymous HTML hosting for anyone who
// found `/api/upload`. Only `next dev` keeps the open default, so local work needs no setup.

const HEADER = "x-upload-secret";

function openForLocalDev(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * True when a request with no credentials would be accepted — i.e. only under `next dev` with no
 * secret set. The browser UI never sends a secret, so this is also when it's worth rendering.
 */
export function uploadsOpen(): boolean {
  return openForLocalDev() && !process.env.UPLOAD_SECRET;
}

/** Returns the refusal to send, or `null` when the request may write. */
export function refuseWrite(request: Request): NextResponse | null {
  const secret = process.env.UPLOAD_SECRET;

  if (!secret) {
    if (openForLocalDev()) return null;
    return NextResponse.json({ error: "Uploads are closed" }, { status: 403 });
  }

  const provided = request.headers.get(HEADER);
  if (provided === null || !sameSecret(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// Compared as digests so the check takes the same time whatever the guess's length or content.
function sameSecret(provided: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}
