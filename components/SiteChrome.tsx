import Link from "next/link";

export function SiteHeader({ admin, pending }: { admin: boolean; pending: number }) {
  return (
    <header className="uni-bar">
      <Link className="brand" href="/">
        <strong>Grand Valley State University</strong>
        <span>Information Technology</span>
      </Link>
      <nav className="nav" aria-label="Competition">
        <Link href="/">Competition</Link>
        <Link href="/submit">Enter</Link>
        {admin ? (
          <Link href="/admin">
            Desk
            {pending > 0 ? <span className="badge">{pending}</span> : null}
          </Link>
        ) : null}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <p>Grand Valley State University</p>
          <p>Information Technology</p>
        </div>
      </div>
    </footer>
  );
}

export function PageIntro({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <div className="page-intro">
      <div className="knit" aria-hidden="true" />
      <div className="page-intro-inner">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
      <div className="knit" aria-hidden="true" />
    </div>
  );
}
