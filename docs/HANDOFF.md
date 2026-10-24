# Handoff: Matador Sanity Trial

## Why this exists
Oct 24 2026: Nick doesn't like Storyblok and wanted to try Sanity. Adam approved a small side-by-side test: a Sanity Studio with three law-firm page types and a few real Wyatt pages, so Content Agent has something real to work on.

## Status
- Studio code: Sanity 6.20, types Page, Practice Area, Attorney (shared SEO and Body types).
- Content: Wyatt About Us (Page), Phoenix Car Accident Lawyer (Practice Area), Justin L. Wyatt, Esq. (Attorney), from wyatt-netlify.netlify.app.
- Preview site: `web/` (plain HTML and JS, reads published content from Sanity's public CDN, no token). Netlify serves `web/` from this repo's main (`netlify.toml`); the site's address must be added to the Sanity project's CORS origins.
- Studio deploys: `npx sanity deploy` with `SANITY_AUTH_TOKEN` set, run from a commit already pushed here.

## Open
- The older 82 Matador documents have no schema in the Studio, so they don't show in it.
- No photos loaded yet (text only).
