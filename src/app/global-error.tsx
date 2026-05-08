"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#F2F5F2",
          color: "#1A2332",
          padding: "1.5rem",
          textAlign: "center"
        }}
      >
        <div>
          <div style={{ fontSize: "2rem" }}>⚠</div>
          <h1 style={{ fontSize: "1.25rem", margin: "0.5rem 0" }}>
            App-crash
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#5A6675",
              maxWidth: "20rem",
              margin: "0 auto 1rem"
            }}
          >
            {error.message || "Onbekende fout in de root layout."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "999px",
              border: "none",
              background: "#1A2332",
              color: "white",
              fontSize: "0.875rem",
              cursor: "pointer"
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  );
}
