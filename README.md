## Snackible B2B Rate Card

Internal tool to build, price and export B2B rate cards.

- Pick products from the catalog (seeded from `IGP_Segregated_Ratecard.xlsx`), grouped by
  Segment → Section → Category. Items with a larger pack size show both pack options.
- Apply a flat discount (5/10/15/20/25/30%) to compute final prices.
- Set a quantity per line item — a running Grand Total is calculated automatically.
- Optionally toggle on a client name shown at the top of the card.
- Download the rate card as a JPEG, or Save it (stores the image + line items for later).
- Add new products to the catalog from the Builder page ("+ Add Item").
- "Saved Rate Cards" page lists every rate card that's been saved, with its total and date.

### Local development

```bash
npm install
npm run dev
```

Without any extra configuration, the catalog and saved rate cards are stored as JSON files
under `data/` (gitignored, except for `data/seed-catalog.json`, which is the one-time import
from the spreadsheet and is safe to keep in version control).

### Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it into Vercel (or run `vercel deploy`).
2. In the Vercel project, add a **Blob** store (Storage tab → Create Database → Blob). Vercel
   automatically sets the `BLOB_READ_WRITE_TOKEN` environment variable for you.
3. Redeploy. Once `BLOB_READ_WRITE_TOKEN` is present, the app automatically switches from the
   local JSON fallback to Vercel Blob storage for both the catalog and saved rate cards — no
   code changes needed.

### Re-importing the spreadsheet

If the source spreadsheet (`IGP_Segregated_Ratecard.xlsx`) changes, regenerate the seed data with:

```bash
node scripts/import-catalog.mjs
```

This only rewrites `data/seed-catalog.json` — it does **not** touch the live catalog
(`data/catalog.json` locally, or the `catalog.json` blob in production) or any saved rate
cards, so items added through the app are never lost by re-running the import.
