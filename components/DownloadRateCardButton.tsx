"use client";

import { useState } from "react";

export default function DownloadRateCardButton({
  imageUrl,
  filename,
}: {
  imageUrl: string;
  filename: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-50"
    >
      {busy ? "Downloading..." : "Download"}
    </button>
  );
}
