"use client";

import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { PhotoField } from "@/components/PhotoField";
import { describeDomains } from "@/lib/validators";

export function SubmitForm({ domain, photoLabel }: { domain: string; photoLabel: string }) {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = event.currentTarget;
    try {
      await api("/api/submissions", { method: "POST", body: new FormData(form) });
      setDone(true);
      form.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="alert good" role="status">
        Received. An admin will post it after a quick look. It stays off the public lineup until then.
      </p>
    );
  }

  return (
    <form className="stack panel" onSubmit={onSubmit}>
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        Whose apparel is this?
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label className="field">
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder={domain ? `name@${domain.split(",")[0].trim()}` : "you@example.com"}
        />
      </label>
      <p className="quiet">
        {domain
          ? `Use a ${describeDomains(domain)} address. One entry per email, and it is reviewed before it goes live.`
          : "One entry per email. It is reviewed before it goes live."}
      </p>
      <PhotoField label={photoLabel} />
      <p className="quiet">A full shot of the apparel works better than a tight portrait. JPEG, PNG, WebP, or GIF under 8 MB.</p>
      <label className="check">
        <input name="permission" type="checkbox" value="yes" required />
        <span>I have permission to publish this photo in the competition.</span>
      </label>
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Submit for review"}
      </button>
    </form>
  );
}
