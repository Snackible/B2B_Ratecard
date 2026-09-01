import Link from "next/link";
import { listRateCards } from "@/lib/storage";
import { formatINR } from "@/lib/rows";
import DownloadRateCardButton from "@/components/DownloadRateCardButton";
import DeleteRateCardButton from "@/components/DeleteRateCardButton";

export const dynamic = "force-dynamic";

export default async function SavedRateCardsPage() {
  const cards = await listRateCards();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Saved Rate Cards</h1>
      <p className="mb-5 text-sm text-[var(--text-muted)]">
        {cards.length > 0
          ? `${cards.length} rate card${cards.length === 1 ? "" : "s"} saved`
          : "Rate cards you save will show up here."}
      </p>
      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft-bg)] text-[var(--accent-soft-fg)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M7 9h10M7 13h6" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">No rate cards saved yet.</p>
          <Link
            href="/"
            className="rounded-md bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            Build your first rate card
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[var(--panel-border)] overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-sm">
          {cards.map((card) => {
            const displayName = card.clientName?.trim() || "Untitled rate card";
            const filename = `${displayName.replace(/\s+/g, "-").toLowerCase()}.jpg`;
            return (
              <div
                key={card.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5 hover:bg-[var(--input-bg)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[var(--text-primary)]">{displayName}</div>
                  <div className="tabular-nums mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--text-muted)]">
                    <span>{card.itemCount} item{card.itemCount === 1 ? "" : "s"}</span>
                    <span aria-hidden>&middot;</span>
                    {card.discountPercent > 0 ? (
                      <span className="rounded bg-[var(--secondary-soft-bg)] px-1.5 py-0.5 text-[var(--secondary-accent)]">
                        {card.discountPercent}% off
                      </span>
                    ) : (
                      <span>No discount</span>
                    )}
                    <span aria-hidden>&middot;</span>
                    <span className="font-medium text-[var(--text-secondary)]">{formatINR(card.totalAmount)}</span>
                    <span aria-hidden>&middot;</span>
                    <span>
                      {new Date(card.updatedAt ?? card.createdAt).toLocaleString("en-IN")}
                      {card.updatedAt ? " (edited)" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
                  <DownloadRateCardButton imageUrl={card.imageUrl} filename={filename} />
                  <Link href={`/?edit=${card.id}`} className="text-[var(--text-secondary)] hover:text-[var(--accent)]">
                    Edit
                  </Link>
                  <Link href={`/?from=${card.id}`} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                    Load
                  </Link>
                  <DeleteRateCardButton id={card.id} name={displayName} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
