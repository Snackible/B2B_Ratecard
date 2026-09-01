"use client";

import { useState } from "react";
import type { NewItemInput, Segment } from "@/lib/types";

type Props = {
  onClose: () => void;
  onAdd: (item: NewItemInput) => Promise<void>;
  existingCategories: string[];
  existingSections: string[];
};

const NEW_OPTION = "__new__";

export default function AddItemModal({ onClose, onAdd, existingCategories, existingSections }: Props) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    section: "",
    segment: "Standard Grammage" as Segment,
    grammage: "",
    mrp: "",
    largerPackGrammage: "",
    largerPackMrp: "",
    shelfLifeDays: "",
  });
  const [isNewCategory, setIsNewCategory] = useState(true);
  const [isNewSection, setIsNewSection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const mrp = Number(form.mrp);
    if (!form.name.trim() || !form.category.trim() || !mrp || mrp <= 0) {
      setError("Name, category and a valid MRP are required.");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd({
        name: form.name.trim(),
        category: form.category.trim(),
        section: form.segment === "Standard Grammage" ? form.section.trim() || null : null,
        segment: form.segment,
        grammage: form.grammage ? Number(form.grammage) : null,
        mrp,
        largerPackGrammage: form.largerPackGrammage ? Number(form.largerPackGrammage) : null,
        largerPackMrp: form.largerPackMrp ? Number(form.largerPackMrp) : null,
        shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : null,
      });
      onClose();
    } catch {
      setError("Could not add item. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">Add New Item</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-faint)] hover:bg-[var(--input-bg)] hover:text-[var(--text-secondary)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Product Name *" className="sm:col-span-2">
              <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>

            <Field label="Category *">
              {isNewCategory ? (
                <div className="flex gap-1">
                  <input
                    className={inputCls}
                    placeholder="New category name"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  />
                  {existingCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCategory(false);
                        set("category", existingCategories[0]);
                      }}
                      className="shrink-0 rounded-md border border-[var(--input-border)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                    >
                      Choose existing
                    </button>
                  )}
                </div>
              ) : (
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => {
                    if (e.target.value === NEW_OPTION) {
                      setIsNewCategory(true);
                      set("category", "");
                    } else {
                      set("category", e.target.value);
                    }
                  }}
                >
                  {existingCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={NEW_OPTION}>+ Add new category&hellip;</option>
                </select>
              )}
            </Field>

            <Field label="Segment *">
              <select
                className={inputCls}
                value={form.segment}
                onChange={(e) => set("segment", e.target.value as Segment)}
              >
                <option>Standard Grammage</option>
                <option>One Serving Pack</option>
              </select>
            </Field>

            {form.segment === "Standard Grammage" && (
              <Field label="Section" className="sm:col-span-2">
                {isNewSection ? (
                  <div className="flex gap-1">
                    <input
                      className={inputCls}
                      placeholder="e.g. Best Sellers, Savoury Snacks"
                      value={form.section}
                      onChange={(e) => set("section", e.target.value)}
                    />
                    {existingSections.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewSection(false);
                          set("section", "");
                        }}
                        className="shrink-0 rounded-md border border-[var(--input-border)] px-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--input-bg)]"
                      >
                        Choose existing
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    className={inputCls}
                    value={form.section}
                    onChange={(e) => {
                      if (e.target.value === NEW_OPTION) {
                        setIsNewSection(true);
                        set("section", "");
                      } else {
                        set("section", e.target.value);
                      }
                    }}
                  >
                    <option value="">No section</option>
                    {existingSections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value={NEW_OPTION}>+ Add new section&hellip;</option>
                  </select>
                )}
              </Field>
            )}

            <Field label="Grammage (g)">
              <input
                type="number"
                className={inputCls}
                value={form.grammage}
                onChange={(e) => set("grammage", e.target.value)}
              />
            </Field>
            <Field label="MRP (₹) *">
              <input type="number" className={inputCls} value={form.mrp} onChange={(e) => set("mrp", e.target.value)} />
            </Field>
            <Field label="Larger Pack Grammage (g)">
              <input
                type="number"
                className={inputCls}
                value={form.largerPackGrammage}
                onChange={(e) => set("largerPackGrammage", e.target.value)}
              />
            </Field>
            <Field label="Larger Pack MRP (₹)">
              <input
                type="number"
                className={inputCls}
                value={form.largerPackMrp}
                onChange={(e) => set("largerPackMrp", e.target.value)}
              />
            </Field>
            <Field label="Shelf Life (days)">
              <input
                type="number"
                className={inputCls}
                value={form.shelfLifeDays}
                onChange={(e) => set("shelfLifeDays", e.target.value)}
              />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--input-border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--input-bg)] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs font-medium text-[var(--text-secondary)] ${className ?? ""}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
