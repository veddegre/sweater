"use client";

import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { formatWhen, placeLabel } from "@/lib/format";
import { themeChoices, themeCopy } from "@/lib/themes";
import type { AdminEntry, AdminOverview, ContestSettings, EntryStatus } from "@/lib/types";
import { PhotoField } from "@/components/PhotoField";

export function AdminDashboard({ initial }: { initial: AdminOverview }) {
  const [data, setData] = useState(initial);
  const [settings, setSettings] = useState(initial.settings);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function apply(next: AdminOverview, message = "") {
    setData(next);
    setSettings(next.settings);
    setNotice(message);
    setError("");
  }

  async function run(task: () => Promise<AdminOverview>, message: string) {
    setBusy(true);
    setError("");
    try {
      apply(await task(), message);
    } catch (caught) {
      setNotice("");
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await run(
      () => api<AdminOverview>("/api/admin/settings", { method: "POST", body: JSON.stringify(settings) }),
      "Competition settings saved.",
    );
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(async () => {
      const next = await api<AdminOverview>("/api/admin/entries", { method: "POST", body: new FormData(form) });
      form.reset();
      return next;
    }, "Apparel posted.");
  }

  async function patch(entry: AdminEntry, status: EntryStatus, fields?: Partial<AdminEntry>) {
    await run(
      () =>
        api<AdminOverview>(`/api/admin/entries/${entry.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: fields?.name ?? entry.name,
            status,
          }),
        }),
      status === entry.status ? "Entry updated." : `Marked ${status}.`,
    );
  }

  async function remove(entry: AdminEntry) {
    if (
      !window.confirm(
        `Remove ${entry.name}? Votes already cast for them stay used, so those browsers cannot vote again.`,
      )
    ) {
      return;
    }
    await run(
      () => api<AdminOverview>(`/api/admin/entries/${entry.id}`, { method: "DELETE" }),
      "Entry removed.",
    );
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="stack">
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="alert good" role="status">
          {notice}
        </p>
      ) : null}
      <section className="panel stack">
        <p className="quiet">
          Public vote counts stay hidden until you close voting. This desk can see them the whole time.
        </p>
        <p className="quiet">
          {data.pending.length} waiting · {data.approved.length} posted · {data.countingVotes} votes on the board
          {data.spentVotes > data.countingVotes
            ? ` · ${data.spentVotes - data.countingVotes} ballots belong to removed entries and cannot be reused`
            : ""}
        </p>
        <div className="actions">
          <a className="btn secondary small" href="/">
            View the competition
          </a>
          <button className="btn secondary small" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </section>

      <section className="section">
        <h2>Competition window</h2>
        <form className="stack panel" onSubmit={saveSettings}>
          <label className="field">
            Title
            <input
              value={settings.title}
              maxLength={80}
              required
              onChange={(event) => setSettings({ ...settings, title: event.target.value })}
            />
          </label>
          <label className="field">
            Year
            <input
              type="number"
              min={2000}
              max={2100}
              value={settings.year}
              required
              onChange={(event) => setSettings({ ...settings, year: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            Tagline
            <input
              value={settings.tagline}
              maxLength={180}
              required
              onChange={(event) => setSettings({ ...settings, tagline: event.target.value })}
            />
          </label>
          <label className="field">
            Allowed email domains
            <input
              value={settings.allowedDomain}
              placeholder="gvsu.edu, mail.gvsu.edu"
              onChange={(event) => setSettings({ ...settings, allowedDomain: event.target.value })}
            />
          </label>
          <p className="quiet">
            Separate domains with commas. Leave it blank to allow any email. Voting is one ballot per browser,
            not per email or network address.
          </p>
          <div className="checks">
            <Toggle
              label="Accept submissions"
              checked={settings.submissionsOpen}
              onChange={(submissionsOpen) => setSettings({ ...settings, submissionsOpen })}
            />
            <Toggle
              label="Voting is open"
              checked={settings.votingOpen}
              onChange={(votingOpen) => setSettings({ ...settings, votingOpen })}
            />
          </div>
          <fieldset className="theme-pick">
            <legend>Theme</legend>
            {themeChoices().map((theme) => (
              <label key={theme.id} className={settings.theme === theme.id ? "theme-option on" : "theme-option"}>
                <span className="theme-name">
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === theme.id}
                    onChange={() => setSettings({ ...settings, theme: theme.id })}
                  />
                  <strong>{theme.label}</strong>
                </span>
                <span className="quiet">{theme.blurb}</span>
              </label>
            ))}
          </fieldset>
          <p className="quiet">The theme changes the decoration and a few labels. The title and tagline stay as you wrote them.</p>
          <p className="quiet">Closing voting publishes the places and saves this year on the desk.</p>
          <button className="btn" type="submit" disabled={busy}>
            Save settings
          </button>
        </form>
      </section>

      <section className="section">
        <h2>Waiting for review</h2>
        {data.pending.length === 0 ? (
          <p className="quiet">No submissions waiting.</p>
        ) : (
          <div className="panel">
            {data.pending.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                busy={busy}
                onPatch={patch}
                onRemove={remove}
                onPhoto={(file) =>
                  run(async () => {
                    const body = new FormData();
                    body.set("photo", file);
                    return api<AdminOverview>(`/api/admin/entries/${entry.id}/photo`, { method: "POST", body });
                  }, "Photo replaced.")
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Add apparel</h2>
        <p className="quiet">This posts immediately. Use it when you are entering people yourself.</p>
        <form className="stack panel" onSubmit={addEntry}>
          <label className="field">
            Name
            <input name="name" required maxLength={80} />
          </label>
          <label className="field">
            Email
            <input name="email" type="email" maxLength={254} placeholder="Optional" />
          </label>
          <PhotoField label={themeCopy(settings.theme).photo} />
          <button className="btn" type="submit" disabled={busy}>
            Post apparel
          </button>
        </form>
      </section>

      <section className="section">
        <h2>Posted</h2>
        {data.approved.length === 0 ? (
          <p className="quiet">Nothing is on the lineup yet.</p>
        ) : (
          <div className="panel">
            {data.approved.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                busy={busy}
                onPatch={patch}
                onRemove={remove}
                onPhoto={(file) =>
                  run(async () => {
                    const body = new FormData();
                    body.set("photo", file);
                    return api<AdminOverview>(`/api/admin/entries/${entry.id}/photo`, { method: "POST", body });
                  }, "Photo replaced.")
                }
              />
            ))}
          </div>
        )}
      </section>

      {data.rejected.length > 0 ? (
        <details className="section">
          <summary>Not posted ({data.rejected.length})</summary>
          <div className="panel">
            {data.rejected.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                busy={busy}
                onPatch={patch}
                onRemove={remove}
                onPhoto={(file) =>
                  run(async () => {
                    const body = new FormData();
                    body.set("photo", file);
                    return api<AdminOverview>(`/api/admin/entries/${entry.id}/photo`, { method: "POST", body });
                  }, "Photo replaced.")
                }
              />
            ))}
          </div>
        </details>
      ) : null}

      <section className="section">
        <h2>Saved results</h2>
        <p className="quiet">
          Closing voting keeps this year's order, including the photos, after the lineup is cleared.
        </p>
        <div className="actions">
          <a className="btn secondary small" href="/api/admin/export">
            Download the current tally
          </a>
        </div>
        {data.history.length === 0 ? (
          <p className="quiet">No years saved yet. Close voting after people have voted to keep the first one.</p>
        ) : (
          <div className="year-list">
            {data.history.map((year) => (
              <div className="panel year-card" key={year.year}>
                <div className="actions">
                  <h3>{year.year}</h3>
                  <a className="btn secondary small" href={`/api/admin/export?year=${year.year}`}>
                    Download
                  </a>
                </div>
                <ul>
                  {year.entries.map((entry) => (
                    <li key={`${year.year}-${entry.place}-${entry.name}`}>
                      {placeLabel(entry.place)} · {entry.name} · {entry.votes} votes · {entry.percent}%
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Ballot audit</h2>
        <p className="quiet">Each row is one browser. Choices stay on this desk until voting closes.</p>
        {data.ballots.length === 0 ? (
          <p className="quiet">No votes yet.</p>
        ) : (
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Browser</th>
                  <th>Voted for</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {data.ballots.map((ballot) => (
                  <tr key={ballot.voterId}>
                    <td>{ballot.voterId.slice(0, 8)}</td>
                    <td>{ballot.entryName}</td>
                    <td>{formatWhen(ballot.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Reset</h2>
        <div className="actions">
          <button
            className="btn danger"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Clear every ballot? Those browsers will be able to vote again.")) return;
              void run(
                () => api<AdminOverview>("/api/admin/reset", { method: "POST", body: JSON.stringify({ scope: "votes" }) }),
                "Ballots cleared.",
              );
            }}
          >
            Clear votes
          </button>
          <button
            className="btn danger"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Remove every entry and every ballot? This cannot be undone.")) return;
              void run(
                () => api<AdminOverview>("/api/admin/reset", { method: "POST", body: JSON.stringify({ scope: "all" }) }),
                "Competition cleared.",
              );
            }}
          >
            Remove everything
          </button>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function EntryRow({
  entry,
  busy,
  onPatch,
  onRemove,
  onPhoto,
}: {
  entry: AdminEntry;
  busy: boolean;
  onPatch: (entry: AdminEntry, status: EntryStatus, fields?: Partial<AdminEntry>) => Promise<void>;
  onRemove: (entry: AdminEntry) => Promise<void>;
  onPhoto: (file: File) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entry.name);

  return (
    <article className="entry-row">
      <img src={entry.imageUrl} alt="" />
      <div className="stack">
        {editing ? (
          <>
            <label className="field">
              Name
              <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              Replace photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onPhoto(file);
                }}
              />
            </label>
          </>
        ) : (
          <>
            <h3>{entry.name}</h3>
            <p className="meta">
              {entry.email ? `${entry.email} · ` : ""}
              {entry.place !== null ? `${placeLabel(entry.place)} · ` : ""}
              {entry.votes} votes · {formatWhen(entry.createdAt)}
            </p>
          </>
        )}
        <div className="actions">
          {entry.status !== "approved" ? (
            <button className="btn small" type="button" disabled={busy} onClick={() => void onPatch(entry, "approved")}>
              Post
            </button>
          ) : null}
          {entry.status !== "rejected" ? (
            <button
              className="btn secondary small"
              type="button"
              disabled={busy}
              onClick={() => void onPatch(entry, "rejected")}
            >
              Hold back
            </button>
          ) : (
            <button
              className="btn secondary small"
              type="button"
              disabled={busy}
              onClick={() => void onPatch(entry, "pending")}
            >
              Return to review
            </button>
          )}
          {editing ? (
            <button
              className="btn small"
              type="button"
              disabled={busy}
              onClick={() => {
                void onPatch(entry, entry.status, { name });
                setEditing(false);
              }}
            >
              Save details
            </button>
          ) : (
            <button className="btn secondary small" type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="btn danger small" type="button" disabled={busy} onClick={() => void onRemove(entry)}>
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
