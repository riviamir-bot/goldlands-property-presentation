# Gold View (GOLDLANDS Presentation)

Hebrew RTL presentation app that marketers open in front of prospective buyers.

Projects, renders, apartments and prices are read live and read-only from the GOLDLANDS marketing
dashboard database through one serverless function, `GET /api/presentation`. Users sign in with their
marketing-system account; a marketer sees only the projects assigned to them there.

## Run locally

```bash
npm install
npm run dev      # UI only; /api needs `vercel dev`
npm test
npm run build
```

## Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `VITE_MARKETING_SUPABASE_URL` | browser | public |
| `VITE_MARKETING_SUPABASE_ANON_KEY` | browser | public |
| `MARKETING_SUPABASE_URL` | server | same URL |
| `MARKETING_SUPABASE_SERVICE_ROLE_KEY` | server only | secret; never prefix with `VITE_`, never commit |
| `PUBLIC_APP_URL` | server (production) | public address used in client summary links |
| `MARKETING_APP_URL` | server | https origin of the marketing system; the contact form posts leads to its `/api/inbox/{token}` |

## Rules the server layer enforces

- Read-only toward the marketing data. The only writes go to `presentation_share_links` and `presentation_usage_events`.
- Contact-form leads are not written directly: they are posted to the marketing system's per-project intake (`gold_view` inbox, else `other`), so its duplicate detection and lead rules apply.
- No leads, clients, budgets or campaigns; internal notes on projects and apartments never leave the server.
- Sold apartments are returned without a price.

## Features

- Sign-in with the marketing account, or automatically from the marketing system's "תצוגה ללקוחות" button
- Project overview, renders (full screen, zoom), apartment card and comparison, floor plans, 3D model, live map
- Hebrew, English and French; price visibility toggle
- Client summary links (`/s/<token>`, 30 days) sent by WhatsApp; usage visible to managers in the marketing system

Design and plans: `docs/superpowers/`.

## Brand logo

The official GOLDLANDS logo (from the brand design "GOLDLANDS.CO.IL" in Canva) is in `public/brand/`: `goldlands-logo-horizontal.png` (navy, for light pages) and `goldlands-logo-light-horizontal.png` (white, for the dark marketer app), plus the full stacked versions.
