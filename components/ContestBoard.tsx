"use client";

import { useEffect, useRef, useState } from "react";
import { browserId, collectSignals } from "@/lib/browser-fingerprint";
import { ApiError, api } from "@/lib/api";
import { placeLabel } from "@/lib/format";
import { themeCopy } from "@/lib/themes";
import type { PublicContest, PublicEntry } from "@/lib/types";

const FLAKES = [
  { left: "6%", delay: "0s", duration: "13s", size: 5, opacity: 0.8 },
  { left: "14%", delay: "2s", duration: "17s", size: 3, opacity: 0.6 },
  { left: "23%", delay: "4.5s", duration: "12s", size: 4, opacity: 0.75 },
  { left: "31%", delay: "1s", duration: "15s", size: 6, opacity: 0.55 },
  { left: "44%", delay: "6s", duration: "18s", size: 3, opacity: 0.7 },
  { left: "53%", delay: "3s", duration: "11s", size: 5, opacity: 0.5 },
  { left: "62%", delay: "7s", duration: "16s", size: 4, opacity: 0.8 },
  { left: "71%", delay: "1.5s", duration: "14s", size: 3, opacity: 0.65 },
  { left: "80%", delay: "5s", duration: "19s", size: 6, opacity: 0.45 },
  { left: "88%", delay: "2.8s", duration: "12s", size: 4, opacity: 0.7 },
  { left: "94%", delay: "8s", duration: "15s", size: 3, opacity: 0.55 },
];

function SweaterIcon() {
  return (
    <svg className="sweater-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="#D7263D"
        d="M25 18c0-6 14-6 14 0l7-2c6 3 12 11 11 19-1 4-5 5-7 2l-6-4v19c0 3-5 5-12 5s-12-2-12-5V33l-6 4c-2 3-6 2-7-2-1-8 5-16 11-19l7 2z"
      />
      <path fill="#F4F1EA" d="M27.2 17.2c.6 5 8.8 5 9.6 0-.3 2.4-2 4.2-4.8 4.2s-4.5-1.8-4.8-4.2z" />
      <path fill="#F4F1EA" d="M9.2 33.2c1.6 3.4 5.2 3.2 6.2.2l-1.6 3.2c-1.4 2.2-4.6 1.6-5.6-.8zM54.8 33.2c-1.6 3.4-5.2 3.2-6.2.2l1.6 3.2c1.4 2.2 4.6 1.6 5.6-.8z" />
      <path fill="#F4F1EA" d="M20 47h24v5c0 2.4-4 4-12 4s-12-1.6-12-4z" />
      <g fill="#D7263D">
        <rect x="23" y="47.5" width="1.7" height="8" />
        <rect x="27.4" y="47.5" width="1.7" height="8" />
        <rect x="31.8" y="47.5" width="1.7" height="8" />
        <rect x="36.2" y="47.5" width="1.7" height="8" />
        <rect x="40.6" y="47.5" width="1.7" height="8" />
      </g>
      <path fill="#1F7A4D" d="M32 30.5 29.2 35h5.6zM32 33.4 27.6 39.6h8.8zM32 36.6 26.4 43.4h11.2z" />
      <rect x="30.7" y="43.2" width="2.6" height="2.8" rx="0.4" fill="#8C5A32" />
      <path fill="#F2C14E" d="M32 27.2 33.1 29.8 35.8 30 33.8 31.6 34.4 34.2 32 32.8 29.6 34.2 30.2 31.6 28.2 30 30.9 29.8z" />
    </svg>
  );
}

function PennantIcon() {
  return (
    <svg className="sweater-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path fill="#13155C" d="M16 6h6v52h-6z" />
      <path fill="#0032A0" d="M22 10h30L40 26l12 16H22z" />
      <path fill="#F4F1EA" d="M22 18h20l-6 8 6 8H22z" />
      <path fill="#0ECBF0" d="M22 28h12l-4 6 4 6H22z" />
    </svg>
  );
}

function PhotoFrame({ src, alt, badge = "" }: { src: string; alt: string; badge?: string }) {
  return (
    <div className="portrait">
      <div className="knit edge" aria-hidden="true" />
      <img src={src} alt={alt} />
      <div className="knit edge" aria-hidden="true" />
      {badge ? <p className="your-vote">{badge}</p> : null}
    </div>
  );
}

export function ContestBoard({ initial }: { initial: PublicContest }) {
  const [contest, setContest] = useState(initial);
  const [selected, setSelected] = useState<PublicEntry | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setContest(initial);
  }, [initial]);

  const votedEntry = contest.viewer
    ? contest.entries.find((entry) => entry.id === contest.viewer?.entryId)
    : undefined;

  function closeDialog() {
    setSelected(null);
    triggerRef.current?.focus();
  }

  const copy = themeCopy(contest.theme);

  return (
    <>
      <section className="hero">
        <div className="knit" aria-hidden="true" />
        <div className="hero-inner">
          {contest.theme === "holiday" ? (
            <div className="snow" aria-hidden="true">
              {FLAKES.map((flake) => (
                <span
                  key={flake.left}
                  className="flake"
                  style={{
                    left: flake.left,
                    animationDelay: flake.delay,
                    animationDuration: flake.duration,
                    width: flake.size,
                    height: flake.size,
                    opacity: flake.opacity,
                  }}
                />
              ))}
            </div>
          ) : null}
          <div className="year-row">
            {contest.theme === "holiday" ? <SweaterIcon /> : null}
            {contest.theme === "spirit" ? <PennantIcon /> : null}
            <p className="year-flag">{contest.year}</p>
          </div>
          <p className="eyebrow">Information Technology</p>
          <h1>{contest.title}</h1>
          <p className="lede">{contest.tagline}</p>
          {contest.submissionsOpen ? (
            <div className="hero-actions">
              <a className="btn" href="/submit">
                {copy.enter}
              </a>
            </div>
          ) : null}
          <dl className="hero-stats">
            <div>
              <dt>Entries</dt>
              <dd>{contest.entries.length}</dd>
            </div>
            {contest.resultsVisible ? (
              <div>
                <dt>Votes</dt>
                <dd>{contest.totalVotes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="knit" aria-hidden="true" />
      </section>

      <p className="status-strip" role="status">
        {contest.votingOpen
          ? "Voting is open. Results stay hidden until voting closes."
          : contest.resultsVisible && contest.totalVotes > 0
            ? "Voting is closed. Results are in."
            : "Voting is closed."}
      </p>
      {contest.viewer ? (
        <p className="viewer-note">
          {votedEntry ? (
            <>
              You voted for <strong>{votedEntry.name}</strong>.
            </>
          ) : (
            <>You already voted.</>
          )}
        </p>
      ) : null}

      <main className="page">
        <div className="section-head" id="lineup">
          <h2>{contest.year} lineup</h2>
        </div>

        {contest.entries.length === 0 ? (
          <div className="empty">
            <h2>The rack is empty</h2>
            <p>
              {contest.submissionsOpen ? copy.emptyOpen : copy.emptyClosed}
            </p>
          </div>
        ) : (
          <div className="lineup">
            {contest.entries.map((entry) => {
              const yours = contest.viewer?.entryId === entry.id;
              return (
                <article key={entry.id} className={yours ? "card yours" : "card"}>
                  <PhotoFrame src={entry.imageUrl} alt={copy.alt(entry.name)} badge={yours ? "Your vote" : ""} />
                  <div className="card-body">
                    {entry.place !== null ? <p className="place">{placeLabel(entry.place)}</p> : null}
                    <h2>{entry.name}</h2>
                    {entry.votes !== null && entry.percent !== null && contest.totalVotes > 0 ? (
                      <>
                        <div className="meter">
                          <div className="track" aria-hidden="true">
                            <div className="fill" style={{ width: `${entry.percent}%` }} />
                          </div>
                          <span
                            className="pill"
                            style={{ left: `clamp(1.4rem, ${entry.percent}%, calc(100% - 1.4rem))` }}
                          >
                            {entry.percent}%
                          </span>
                        </div>
                        <p className="tally">
                          {entry.votes} / {contest.totalVotes}
                        </p>
                      </>
                    ) : null}
                    {contest.votingOpen ? (
                      <button
                        className="btn wide"
                        type="button"
                        onClick={(event) => {
                          triggerRef.current = event.currentTarget;
                          setSelected(entry);
                        }}
                      >
                        Vote
                      </button>
                    ) : (
                      <p className="quiet">Voting is closed</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {contest.pastWinners.length > 0 ? (
          <section className="section" aria-label="Past winners">
            <div className="section-head">
              <h2>Past winners</h2>
            </div>
            <div className="history">
              {contest.pastWinners.map((winner) => (
                <article key={`${winner.year}-${winner.name}`}>
                  {winner.imageUrl ? <img src={winner.imageUrl} alt="" /> : null}
                  <div>
                    <p className="place">{winner.year}</p>
                    <h3>{winner.name}</h3>
                    <p className="quiet">{winner.votes} votes</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {selected ? (
        <VoteDialog entry={selected} prompt={copy.vote} onClose={closeDialog} onVoted={setContest} />
      ) : null}
    </>
  );
}

function VoteDialog({
  entry,
  prompt,
  onClose,
  onVoted,
}: {
  entry: PublicEntry;
  prompt: string;
  onClose: () => void;
  onVoted: (contest: PublicContest) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"confirm" | "done">("confirm");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const casting = useRef(false);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>("input, button, textarea, a[href]")).filter(
        (item) => !item.hasAttribute("disabled"),
      );
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [step, onClose]);

  async function cast() {
    if (casting.current) return;
    casting.current = true;
    setError("");
    setPending(true);
    try {
      const result = await api<{ already: boolean; entryName: string; contest: PublicContest }>("/api/vote", {
        method: "POST",
        body: JSON.stringify({
          entryId: entry.id,
          clientId: browserId(),
          signals: collectSignals(),
        }),
      });
      onVoted(result.contest);
      setMessage(
        result.already
          ? `You already voted for ${result.entryName}.`
          : `Vote recorded for ${result.entryName}.`,
      );
      setStep("done");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      casting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-title"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-person">
          <img src={entry.imageUrl} alt="" />
          <div>
            <p className="eyebrow">Your ballot</p>
            <h2 id="vote-title">{entry.name}</h2>
          </div>
        </div>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        {step === "confirm" ? (
          <div className="stack">
            <p className="quiet">{prompt}</p>
            <button className="btn" type="button" onClick={() => void cast()} disabled={pending}>
              {pending ? "Casting…" : "Cast vote"}
            </button>
            <button className="btn secondary" type="button" onClick={onClose} disabled={pending}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="stack">
            <p className="alert good" role="status">
              {message}
            </p>
            <button className="btn" type="button" onClick={onClose}>
              Back to the lineup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
