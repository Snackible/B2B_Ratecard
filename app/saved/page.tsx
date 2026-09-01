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
      <h1 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Saved Rate Cards</h1>
      {cards.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No rate cards saved yet. Build one from the Create Rate Card page and click
          &ldquo;Save &amp; Download JPEG&rdquo;.
        </p>
      ) : (
        <div className="divide-y divide-[var(--panel-border)] overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)]">
          {cards.map((card) => {
            const displayName = card.clientName?.trim() || "Untitled rate card";
            const filename = `${displayName.replace(/\s+/g, "-").toLowerCase()}.jpg`;
            return (
              <div key={card.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[var(--text-primary)]">{displayName}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {card.itemCount} item{card.itemCount === 1 ? "" : "s"} &middot;{" "}
                    {card.discountPercent > 0 ? `${card.discountPercent}% off` : "No discount"} &middot;{" "}
                    {formatINR(card.totalAmount)} &middot;{" "}
                    {new Date(card.updatedAt ?? card.createdAt).toLocaleString("en-IN")}
                    {card.updatedAt ? " (edited)" : ""}
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
