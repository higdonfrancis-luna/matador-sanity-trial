# Handoff: Matador Sanity Trial

## Purpose and scope

Adam and Nick are comparing Sanity with Storyblok using three existing Wyatt pages. This is an isolated CMS trial, not a client launch. Content and pictures come from `https://wyatt-netlify.netlify.app`; no law-firm copy or images were invented.

- Sanity project: **Matador Pilot** (`i2tdfchw`), public dataset `production`.
- Trial document IDs start with `wyatt-trial-`.
- The older **82 Matador documents remain untouched**. Their types have no schemas in this trial Studio and are excluded from website queries.
- The governing manual is `higdonfrancis-luna/matador-sites`, including its `CLAUDE.md`, canonical build process, and project notes.

## Implementation complete

- **About Us** preserves the Wyatt reference's exact main-content layout, styling, and copy. Its headline, keyed body blocks, and original picture positions are connected to Sanity. This does not recreate the entire Wyatt site or its shared navigation.
- **Ten About Us images have been seeded from the original assets**: header background, two portraits, and seven award images. Editors can replace or remove them, set alternative text, and use Sanity crop/hotspot controls. Removed pictures stay removed when the initialization script runs again.
- **Phoenix Car Accident Lawyer** and **Justin L. Wyatt, Esq.** remain simple generic previews of their existing practice-area and attorney documents. Their original Wyatt layouts have not been applied.
- Studio includes **Website editor** (Presentation) and the standard content editor. Overlays connect supported text and pictures to their fields, with draft refresh while editing.
- The build creates the website and a same-origin Studio at `/studio/`. Netlify Functions implement `/api/content`, `/api/preview/enable`, and `/api/preview/disable`.
- Ordinary visits request published content. Draft reads require a validated Sanity preview link and an expiring signed session. A preview flag alone does not grant access, and a preview cookie does not switch ordinary website visits to drafts.
- The draft implementation requires a read-only Sanity token and an independent session-signing secret in **server-only environment variables**. Neither belongs in browser code, `SANITY_STUDIO_*` variables, or committed files. Runtime configuration is still pending below.
- Preview responses are private and non-cacheable. The trial is marked `noindex, nofollow`.

## Validation completed

The implementation pass recorded **28 passing tests**, a passing TypeScript check, and a successful combined website/Studio build:

```sh
npm test
npm run typecheck
npm run build
```

Tests cover authorization and expiry, redirects, published/draft separation, image migration/removal/cropping, and keyed About Us edits. These results do not establish that the deployed signed-in editor works.

## Deployment and configuration pending

| Intended endpoint | Purpose | Status for this implementation |
| --- | --- | --- |
| `https://matador-sanity-trial.netlify.app/about-us/` | Published About Us trial | Deployment and live verification pending |
| `https://matador-sanity-trial.netlify.app/studio/presentation` | Team visual editor | Deployment and authenticated browser verification pending |
| `https://matador-pilot.sanity.studio` | Existing standalone Studio | Update planned; not yet verified |

Public-site and Studio deployment can proceed through the already authorized workflow. **The secure draft hookup still needs the user's action-time approval at the Netlify CLI authorization grant**, which explicitly grants project creation/management. Server environment setup and an end-to-end draft editing test remain pending; do not describe draft preview as operational until they pass.

Remaining rollout checks:

1. Verify the deployed revision, public About Us page, Studio, and Functions on their live URLs.
2. Finish the approved server configuration for `SANITY_API_READ_TOKEN` and an independent `SANITY_PREVIEW_SESSION_SECRET`; confirm permitted Sanity origins.
3. Test a signed-in draft edit, visual preview, publish, and an ordinary published-page visit. Verify desktop/mobile presentation.
4. Update the standalone Studio from the intended pushed revision and record the deployment revision and actual acceptance results here.

The target URLs and a successful local build are not deployment evidence.

## Team editing workflow after rollout verification

1. Open `/studio/presentation` and sign in with your own Sanity account with project editing access.
2. Open **Website editor**, select **About Us**, and click a supported text or picture overlay to open its field. The standard content editor remains available for all fields.
3. Edit the draft. **Pictures on this page** controls the ten original images; **Additional pictures** appends pictures below the content. Review the draft preview while ordinary visits continue showing published content.
4. Click **Publish**, then check `/about-us/` without preview parameters. Content is fetched at runtime, so content edits need no code build.

This is structured editing within the existing layout, not a drag-and-drop page builder. Layout, schema, and application changes require repository changes and deployment. Each editor uses their own Sanity sign-in so document history identifies them.

## Development and maintenance

Use Node 24 and the committed lockfile. See the root README for routine commands.

| Script or path | Use |
| --- | --- |
| `scripts/build.mjs` | Builds the Vite website into `dist/`, Studio into `dist/studio/`, and copies assets |
| `scripts/dev-preview.mjs` | Local website server with the same content and preview handlers |
| `scripts/seed-about-images.mjs` | Revision-checked initialization of original About Us pictures; uses environment `SANITY_AUTH_TOKEN`; preserves initialized choices and removals |
| `scripts/import_wyatt.py` | Initial import from saved HTML using environment `SANITY_TOKEN`; not routine editing and should not be rerun over editor changes |
| `scripts/capture-about.mjs` | Maintenance capture of reference layout, bindings, and assets; not a build step; needs `jsdom` separately |
| `web/about-template.html`, `web/assets/about-bindings.json` | Captured main layout and stable body-block bindings |
| `web/about-image-slots.json` | Original image provenance and ten editable positions |
| `server/` | Scoped Sanity queries, preview validation, and session handling |

Netlify runs `npm run build`, publishes `dist`, and bundles `netlify/functions`. Standalone Studio deployment uses `npm run deploy` with `SANITY_AUTH_TOKEN` supplied through the environment, from the intended pushed revision. `.env.example` documents names only. Never commit credentials.

## Remaining limits

- Server environment setup and live signed-in acceptance remain pending above.
- Only About Us uses the captured Wyatt layout; the other two pages are CMS demonstrations.
- Older Matador content is preserved but not exposed by this Studio's schemas.
- This trial is not approved as a production client launch or replacement for the existing Wyatt site.
