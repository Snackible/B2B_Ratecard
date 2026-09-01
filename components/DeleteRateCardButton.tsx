"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteRateCardButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(`Permanently delete "${name}"? This can't be undone.`);
    if (!ok) return;

    setBusy(true);
    try {
      await fetch(`/api/ratecards/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-[var(--text-faint)] hover:text-red-500 disabled:opacity-50"
    >
      {busy ? "Deleting..." : "Delete"}
    </button>
  );
}
