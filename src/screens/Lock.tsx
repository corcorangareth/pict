import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Slats } from "@/components/brand/Slats";
import { api } from "@/lib/api";

// The unlock screen — a single password gate. On success the server sets a
// long-lived session cookie, so you only see this once per device (~400 days).
export function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    const ok = await api.login(password);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setPassword("");
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        background: "var(--paper)",
        textAlign: "center",
      }}
    >
      <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Slats size={38} color="var(--paper)" />
      </div>
      <h1 style={{ fontSize: 34, letterSpacing: "-0.02em" }}>
        Welcome back<span style={{ fontStyle: "italic" }}> to Pict</span>
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-faint)", marginTop: 8, marginBottom: 28 }}>
        Enter your password to unlock.
      </p>

      <form onSubmit={submit} style={{ width: "100%", maxWidth: 320 }}>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          placeholder="Password"
          autoComplete="current-password"
          enterKeyHint="go"
          style={{
            width: "100%",
            padding: "15px 18px",
            fontSize: 16.5,
            fontFamily: "var(--font-ui)",
            color: "var(--ink)",
            textAlign: "center",
            border: `1px solid ${error ? "var(--brand)" : "var(--line)"}`,
            borderRadius: 16,
            background: "rgba(21,20,15,0.03)",
            outline: "none",
          }}
        />
        {error && <p style={{ color: "var(--brand)", fontSize: 13.5, marginTop: 10 }}>That's not right — try again.</p>}
        <button
          type="submit"
          disabled={!password || busy}
          className="press"
          style={{
            width: "100%",
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: password ? "var(--brand)" : "rgba(21,20,15,0.12)",
            color: "var(--paper)",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {busy && <Loader2 size={17} className="spin" />}
          Unlock
        </button>
      </form>
    </div>
  );
}
