import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page narrow">
      <h1>That page isn&apos;t on the rack</h1>
      <p>The competition is back on the home page.</p>
      <p>
        <Link className="btn" href="/">
          Back to the competition
        </Link>
      </p>
    </main>
  );
}
