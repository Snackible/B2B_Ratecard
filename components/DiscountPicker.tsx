"use client";

import { useState } from "react";
import { DISCOUNT_OPTIONS } from "@/lib/types";

type Props = {
  value: number;
  onChange: (percent: number) => void;
};

export default function DiscountPicker({ value, onChange }: Props) {
  const isPreset = (DISCOUNT_OPTIONS as readonly number[]).includes(value);
  const [customMode, setCustomMode] = useState(!isPreset && value > 0);
  const [customValue, setCustomValue] = useState(isPreset ? "" : value ? String(value) : "");

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Discount</div>
      <div className="flex flex-wrap gap-1">
        {DISCOUNT_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setCustomMode(false);
              onChange(d);
            }}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium active:scale-[0.97] ${
              !customMode && value === d
                ? "border-[var(--secondary-accent)] bg-[var(--secondary-accent)] text-[var(--secondary-fg)]"
                : "border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
            }`}
          >
            {d}%
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium active:scale-[0.97] ${
            customMode
              ? "border-[var(--secondary-accent)] bg-[var(--secondary-accent)] text-[var(--secondary-fg)]"
              : "border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
          }`}
        >
          Custom
        </button>
        {customMode && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              placeholder="%"
              value={customValue}
              onChange={(e) => {
                const raw = e.target.value;
                setCustomValue(raw);
                const num = Number(raw);
                onChange(raw && !Number.isNaN(num) ? Math.min(100, Math.max(0, num)) : 0);
              }}
              className="w-16 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
