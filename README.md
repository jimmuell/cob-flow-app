# cob-flow-app

COB Flow — decision-support SaaS for healthcare coordination of benefits,
auto med-pay/PIP recovery, and post-payment subrogation. Wisconsin pilot.

This is the Next.js conversion of the single-file HTML prototype. Pass 1
is functionally on par with the prototype with the architectural seams
described in `docs/COB_Flow_NextJS_Conversion_Handoff.md` §6.

## Tech stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS v4 · shadcn/ui · lucide-react
- Supabase (Auth + Postgres) · Drizzle ORM
- Hosted on Vercel

## Local development

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# fill in the values per docs/COB_Flow_NextJS_Conversion_Handoff.md Appendix B

# 3. Start local Supabase
supabase start

# 4. Run dev server
npm run dev   # http://localhost:3000

# 5. Lint, typecheck, test
npm run lint
npm run typecheck
npm test
```

## Project structure

See `docs/COB_Flow_NextJS_Conversion_Handoff.md` §9.

- `src/app/` — App Router pages and layouts
- `src/components/` — shared UI components
- `src/lib/` — auth, authority, audit, engine, mock fixtures, types
- `src/styles/` — Tailwind globals
- `tests/` — Vitest unit + Playwright e2e

## Sign-in (pass 1 — mock auth)

Any non-empty email + password works. The "Demo accounts" panel on the
sign-in page lets you click a user to skip the form. Production swaps
this for Supabase Auth — see `docs/COB_Flow_NextJS_Conversion_Handoff.md` §12.

## Docs

- `docs/COB_Flow_NextJS_Conversion_Handoff.md` — the conversion brief
- `docs/COB_Flow_Product_Spec_v0.8.docx` — product spec
- `docs/COB_Flow_Dashboard_Spec_v0.1.docx` — role / authority architecture
- `docs/COB_Flow_WI_Workflow_v1.0.docx` — analyst workflow

## Status

Pass 1 — prototype conversion. **No real PHI, no real customers, no real
auth.** See `docs/COB_Flow_NextJS_Conversion_Handoff.md` §17 for the BAA / PHI cliff that gates production use.

## License

TBD — placeholder
