"use client";

import { FormEvent, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      window.location.href = "/admin";
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form className="stack panel" onSubmit={onSubmit}>
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
