import Image from "next/image";

// What a deployment shows at `/`: uploads are closed, links that were already shared are served
// as before. Deliberately static — no client JS, so the theme just follows the blocking script in
// app/layout.tsx.
export default function Closed() {
  return (
    <div className="v1-root flex-1 flex flex-col">
      <header className="v1-header">
        <div className="v1-header-inner">
          <span className="v1-brand-swap">
            <Image
              src="/dropdoc-lockup-light.png"
              alt="DropDoc"
              width={540}
              height={225}
              className="v1-brand-light"
              priority
            />
            <Image
              src="/dropdoc-lockup.png"
              alt="DropDoc"
              width={540}
              height={225}
              className="v1-brand-dark"
              priority
            />
          </span>
        </div>
      </header>

      <main className="v1-hero flex-1">
        <p className="v1-kicker">
          A tiny utility from <span>S3 Labs</span>
        </p>
        <h1 className="v1-h1">
          <span className="brand">Uploads are closed.</span>
        </h1>
        <p className="v1-lead">
          DropDoc no longer accepts new files. If someone sent you a DropDoc
          link, open that link directly. If it doesn&rsquo;t load, ask them for
          a current copy of the report.
        </p>
      </main>

      <footer className="v1-footer-base w-full">
        <span>© 2026 S3 Labs</span>
      </footer>
    </div>
  );
}
