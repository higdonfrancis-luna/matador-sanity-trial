# Matador Sanity Trial

A Sanity CMS trial for Adam and Nick using three existing Wyatt pages. About Us preserves the reference's main-content layout and connects its text and ten original images to Sanity. The attorney and practice-area pages remain simple generic content previews.

**Implementation is complete; deployment, server preview configuration, and signed-in acceptance are pending.** The implementation checks recorded 28 passing tests, a passing TypeScript check, and a successful website/Studio build. See [the handoff](docs/HANDOFF.md) for current status and remaining work.

## Intended review links

- [About Us](https://matador-sanity-trial.netlify.app/about-us/)
- [Website editor](https://matador-sanity-trial.netlify.app/studio/presentation)
- [Existing standalone Studio](https://matador-pilot.sanity.studio), with its update planned

These are target URLs, not confirmation that this revision is deployed.

## Team editing after rollout

Sign into the Website editor with your own Sanity account, open About Us, and click a supported text or picture overlay to edit its field. Use **Pictures on this page** to replace or remove an original image and **Additional pictures** to append images. Review the draft, then click **Publish**. Published content is fetched at runtime, so content edits need no website build.

Ordinary visits show published content. Draft preview requires a validated Studio session and the pending server configuration. Layout and schema changes go through this repository and require deployment.

## Development

Use Node 24:

```sh
npm ci
npm run dev
```

The website and content API run on port 4173. `npm run dev:studio` starts the standalone Studio development server. Local published-content reads need no token; authenticated preview needs server credentials and a browser environment compatible with the secure preview cookie.

| Command | Purpose |
| --- | --- |
| `npm test` | Run preview and About Us tests |
| `npm run typecheck` | Check TypeScript |
| `npm run build` | Build website and `/studio/` into `dist/` |
| `npm run build:studio` | Build standalone Studio only |
| `npm run deploy` | Deploy standalone Sanity Studio |

## Configuration and content

- Project: **Matador Pilot** (`i2tdfchw`), dataset `production`.
- `SANITY_STUDIO_PREVIEW_URL` is the public website origin.
- `SANITY_API_READ_TOKEN` and the independent `SANITY_PREVIEW_SESSION_SECRET` belong only in server environment settings. Never expose or commit their values.
- Studio deployment and image initialization use `SANITY_AUTH_TOKEN` through the environment.
- Netlify runs `npm run build`, serves `dist`, and bundles `netlify/functions`.
- Trial documents use `wyatt-trial-*` IDs. The older **82 Matador documents are untouched** and excluded from trial queries.
- The ten original About Us pictures are already seeded. The initialization script preserves subsequent image edits and removals.

This is an isolated, non-indexed trial, not a client launch. Read [CLAUDE.md](CLAUDE.md) and its linked Matador manual before changing the implementation. Never invent law-firm content or overwrite the older Matador documents.
