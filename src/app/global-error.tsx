"use client";

// Replaces the root layout when it fails, so it must render its own <html> and
// cannot rely on the app's fonts or stylesheet. Inline styles keep the palette.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#13110e",
          color: "#e9e4da",
          fontFamily: "Georgia, serif",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 500, margin: 0 }}>A loose thread</h1>
        <p style={{ maxWidth: 360, margin: 0, fontFamily: "system-ui, sans-serif", fontSize: 15, opacity: 0.8 }}>
          Aether Wardrobe did not load. Your wardrobe is safe. Try again in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            minHeight: 44,
            padding: "0 20px",
            borderRadius: 10,
            border: "none",
            background: "#c9a45c",
            color: "#1d1913",
            fontFamily: "system-ui, sans-serif",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ margin: 0, fontFamily: "system-ui, sans-serif", fontSize: 12, opacity: 0.6 }}>
            Reference: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
