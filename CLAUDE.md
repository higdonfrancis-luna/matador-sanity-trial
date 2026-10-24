# Matador Sanity Trial

A trial of Sanity as the CMS for Matador law-firm sites, so Adam and Nick can compare it side by side with Storyblok. Not a client site, nothing here is live for a client.

Read the manual repo (`higdonfrancis-luna/matador-sites`, its `CLAUDE.md`) first. Its rules apply here.

- Sanity project: **Matador Pilot** (`i2tdfchw`), dataset `production` (public). Studio hosted at https://matador-pilot.sanity.studio
- The dataset also holds 82 older documents from an October 7 import of Nick's matadorsolutions.net content (types `caseStudy`, `homePage`, `logo`, `memberVideo`, `resource`, `testimonial`). The Studio has no schema for them yet. Never delete or overwrite them without Adam's yes.
- Trial content uses fixed IDs `wyatt-trial-*`, loaded word for word from the live Wyatt site by `scripts/import_wyatt.py`. Never invent law-firm content.
- Tokens never go in this repo. The script reads `SANITY_TOKEN` from the environment.
- Decisions and status live in `docs/HANDOFF.md`.
