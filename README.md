# GOLDLANDS Presentation

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

## Rules the server layer enforces

- Read-only: `select` and signed storage URLs only.
- No leads, clients, budgets or campaigns; internal notes on projects and apartments never leave the server.
- Sold apartments are returned without a price.

Design and plans: `docs/superpowers/`.
