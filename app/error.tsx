"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page narrow">
      <h1>Something went wrong</h1>
      <p>The competition page hit an unexpected error.</p>
      <button className="btn" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
