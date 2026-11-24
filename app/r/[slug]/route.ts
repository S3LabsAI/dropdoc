import { NextRequest, NextResponse } from "next/server";
import { getReport, type StoredReport } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const report = await getReport(slug);

  if (!report) return unavailableResponse();

  return report.kind === "pdf" ? pdfResponse(report) : htmlResponse(report.html);
}

// Shown for any slug with nothing behind it — never uploaded, since removed, or the store itself
// is unreachable. The people who land here were sent a link by someone else, so it says what to
// do next rather than just "404". Not cached: a report that comes back should show up at once.
function unavailableResponse() {
  return new NextResponse(UNAVAILABLE_PAGE, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "no-store",
    },
  });
}

const UNAVAILABLE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Report unavailable · DropDoc</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #09090b; --muted: #52525b; --line: #dfe9f1; --brand: #2e9df1; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0a0e14; --fg: #fafafa; --muted: #a1a8b3; --line: #1f2732; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 32px 20px;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 460px; text-align: center; }
  .mark { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand); margin: 0 0 20px; }
  h1 { margin: 0 0 14px; font-size: 28px; line-height: 1.2; letter-spacing: -0.01em; text-wrap: balance; }
  p { margin: 0; font-size: 16px; line-height: 1.6; color: var(--muted); text-wrap: pretty; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 28px auto; width: 56px; }
</style>
</head>
<body>
<main>
  <p class="mark">DropDoc</p>
  <h1>This report isn&rsquo;t available</h1>
  <p>The link may have expired or the report may have been removed.</p>
  <hr>
  <p>Ask the person who sent it to you for a current copy.</p>
</main>
</body>
</html>
`;

function htmlResponse(html: string) {
  // `sandbox allow-scripts allow-popups` forces the document into an opaque/null origin so
  // uploaded scripts can run (Leaflet, inline data, etc.) but cannot touch this app's cookies,
  // localStorage, or same-origin endpoints. Without `allow-same-origin` the document's origin is
  // null; without `allow-top-navigation` it can't redirect the tab. External https script/style/
  // image/font/XHR loads are permitted so CDN-hosted libraries and map tiles work. `blob:` is
  // allowed so self-unpacking report bundles (base64 assets → `URL.createObjectURL`) can inject
  // their scripts, styles, images, and fonts.
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": [
        "sandbox allow-scripts allow-popups",
        "default-src 'none'",
        "script-src 'unsafe-inline' https: blob:",
        "style-src 'unsafe-inline' https: blob:",
        "img-src data: https: blob:",
        "font-src data: https: blob:",
        "media-src data: https: blob:",
        "connect-src https: blob:",
        "frame-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function pdfResponse(report: Extract<StoredReport, { kind: "pdf" }>) {
  // PDFs deliberately do *not* get the sandbox CSP the HTML branch relies on.
  //
  // That sandbox exists to strip an uploaded document of this origin's privileges, because an
  // uploaded <script> would otherwise run as DropDoc. A PDF has no comparable reach: it has no
  // DOM and executes no page script — browsers hand it to their own out-of-process viewer — so it
  // cannot read this app's cookies, storage, or same-origin endpoints whether it is sandboxed or
  // not. Set against that nil benefit is a real rendering risk: the built-in viewers are
  // themselves documents, and browsers differ on how they treat a sandboxed one. Chromium renders
  // it fine today; a browser that instead falls back to "download this file" would break the one
  // thing a shared link has to do.
  //
  // What actually carries the weight here is pairing an explicit `application/pdf` with
  // `nosniff`: together they stop a polyglot upload — bytes that are a valid PDF *and* valid
  // HTML — from ever being re-interpreted as markup on this origin. The directives below are
  // inert for a real PDF and cost nothing if some future browser does treat one as a document.
  return new NextResponse(report.bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(report.filename),
      "Content-Security-Policy": [
        "default-src 'none'",
        // 'self' rather than 'none': plugin-style PDF viewing is object-src-governed in some
        // browsers, and there is nothing to gain by blocking the viewer from loading the very
        // document it was handed.
        "object-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// `inline` so the browser shows the report rather than downloading it; the filename is what the
// viewer's own Save button offers. RFC 6266 asks for both forms — a plain-ASCII fallback and the
// UTF-8 one — since the original filename is arbitrary user input.
function contentDisposition(filename: string | null): string {
  const fallback = "report.pdf";
  const base = (filename ?? fallback).split(/[\\/]/).pop() || fallback;
  const ascii = base.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(base)}`;
}
