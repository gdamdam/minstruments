# m-suite

**m-suite is a collection of local-first browser instruments and music tools. No accounts or uploads.**

[Open the suite](https://instruments.mdrone.org/) · [Browse the instruments](https://instruments.mdrone.org/#instruments) · [See the workflows](https://instruments.mdrone.org/#workflows)

m-suite is a simple portal and launcher for fifteen free, open-source music tools. It helps you choose an instrument by musical intent, open each project or its source, and connect the tools into practical workflows. The instrument collection page is called **minstruments** — one room within the family.

> The instrument list is defined once in [`catalog.json`](./catalog.json), which generates the homepage cards, the chooser, and the JSON-LD structured data at build time. The table below mirrors it for convenience.

There is no suite account, subscription, shared project database, or proprietary format. Each instrument remains an independent project with its own identity and repository.

## Instruments

| Instrument | What it does | App | Source |
| --- | --- | --- | --- |
| **mpump** | A fast browser groovebox where drums, bass, synth, and the complete beat live in a shareable link. | [mpump.live](https://mpump.live/) | [gdamdam/mpump](https://github.com/gdamdam/mpump) |
| **mloop** | A live loop station and sampler for recording, layering, sequencing pads, resampling, and gentle destruction. | [mloop.mpump.live](https://mloop.mpump.live/) | [gdamdam/mloop](https://github.com/gdamdam/mloop) |
| **mdrone** | A microtonal drone instrument for slowly evolving, deeply layered sound that can hold for an hour. | [mdrone.org](https://mdrone.org/) | [gdamdam/mdrone](https://github.com/gdamdam/mdrone) |
| **mpumpit** | A compact browser MIDI sound module that turns notes from a sequencer, DAW, or controller into sound. | [play.mpump.live](https://play.mpump.live/) | [gdamdam/mpumpit](https://github.com/gdamdam/mpumpit) |
| **midip** | A terminal MIDI sequencer and live groovebox for patterns, scenes, song chains, and hardware performance. | [Latest release](https://github.com/gdamdam/midip/releases/latest) | [gdamdam/midip](https://github.com/gdamdam/midip) |
| **mchord** | A harmony-first performance instrument for building progressions and moving through smoothly voiced chords. | [mchord.mpump.live](https://mchord.mpump.live/) | [gdamdam/mchord](https://github.com/gdamdam/mchord) |
| **mgrains** | A granular instrument that blooms generated, imported, or live sound into clouds—or shatters it into rhythm. | [mgrains.mpump.live](https://mgrains.mpump.live/) | [gdamdam/mgrains](https://github.com/gdamdam/mgrains) |
| **mspectr** | A spectral resynthesis instrument for capturing what sounds are made of, then morphing and playing that identity. | [mspectr.mpump.live](https://mspectr.mpump.live/) | [gdamdam/mspectr](https://github.com/gdamdam/mspectr) |
| **mvox** _(alpha)_ | A browser voice instrument for synthesizing, harmonizing, and reshaping the human voice. | [mvox.mpump.live](https://mvox.mpump.live/) | [gdamdam/mvox](https://github.com/gdamdam/mvox) |
| **mtape** _(alpha)_ | A browser multitrack tape recorder and arranger for recording any tab, mic, or file, editing clips, and bouncing finished songs. | [mtape.mpump.live](https://mtape.mpump.live/) | [gdamdam/mtape](https://github.com/gdamdam/mtape) |
| **mfx** _(alpha)_ | A browser effects pedalboard you play — a reorderable 12-pedal chain performed live through an XY pad. | [mfx.mpump.live](https://mfx.mpump.live/) | [gdamdam/mfx](https://github.com/gdamdam/mfx) |
| **mkeys** _(alpha)_ | A browser scale-locked lead instrument where every touch bends, glides, and shapes timbre so you can't play a wrong note. | [mkeys.mpump.live](https://mkeys.mpump.live/) | [gdamdam/mkeys](https://github.com/gdamdam/mkeys) |
| **mraga** _(alpha)_ | A conductable generative microtonal instrument that improvises a struck raga line over an mdrone drone in its exact tuning. | [gdamdam.github.io/mraga](https://gdamdam.github.io/mraga/) | [gdamdam/mraga](https://github.com/gdamdam/mraga) |
| **mscope** | A local-first audio scope and diagnostic instrument for reading waveform, spectrum, loudness, stereo, and signal health. | [mscope.mpump.live](https://mscope.mpump.live/) | [gdamdam/mscope](https://github.com/gdamdam/mscope) |
| **mbus** _(alpha)_ | A local-first audio patchbay that discovers each instrument's live output and patches it into a monitored master mix, tab-to-tab over WebRTC. | [mbus.mpump.live](https://mbus.mpump.live/) | [gdamdam/mbus](https://github.com/gdamdam/mbus) |

## What qualifies as a portal instrument

An instrument appears in the portal when it is (1) an independent, publicly reachable project by the maintainer with its own repository, (2) a music or audio tool that fits the suite's "make, route, or inspect sound" scope, and (3) usable today — either a live app or a downloadable release. Instruments still stabilizing are listed and flagged `alpha`/`beta` rather than held back. Status follows each project's own release maturity: `alpha` for pre-1.0 builds, `beta` for 1.x releases the portal has not yet verified, and `stable` for 1.x releases verified against their README (version, tests, and live deployment). Every entry lives in [`catalog.json`](./catalog.json); adding a row there is what makes an instrument part of the suite.

## What the portal includes

- An intent-based **Choose your instrument** guide.
- A launcher with live app and source links for every project.
- Each instrument's native mark or interface wordmark.
- Seven documented signal routes with exact connection steps.
- A responsive, equipment-rack visual system with no application backend.
- A separate archive of the three original visual studies at [`visual-options.html`](https://instruments.mdrone.org/visual-options.html).

## Suite workflows

The homepage documents seven ways to patch the projects together:

1. **Sequence browser sound from the terminal:** `midip → virtual MIDI → mpumpit`
2. **Play voiced chords through another instrument:** `mchord → virtual MIDI → mpumpit or hardware`
3. **Run a synchronized browser ensemble:** [`Link Bridge`](https://github.com/gdamdam/mpump/tree/main/link-bridge)` → mpump + mchord + mdrone + mgrains + mspectr + mkeys + mfx`
4. **Turn one drone into two new instruments:** `mdrone WAV → mgrains + mspectr`
5. **Record any instrument into mtape:** `any m-suite tab → mtape tab capture → arrange / mixdown / stems` (Chromium desktop only)
6. **Inspect any instrument with mscope:** `any m-suite tab → mscope tab capture → waveform / spectrum / LUFS / diagnostics` (Chromium desktop only)
7. **Chain instruments through effects:** `mchord → mfx (tab-captures mchord) → mtape (tab-captures mfx)` (Chromium desktop only)

Open the [workflow section](https://instruments.mdrone.org/#workflows) for the full connection instructions.

## Local development

### Requirements

- [Node.js](https://nodejs.org/) 22 recommended
- npm (included with Node.js)

### Setup

```sh
git clone git@github.com:gdamdam/m-suite.git
cd m-suite
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173/`.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the static production site in `dist/`. |
| `npm run preview` | Serve the production build locally for a final check. |

## Project structure

```text
.
├── .github/workflows/deploy-pages.yml  # GitHub Pages CI/CD
├── public/
│   ├── CNAME                           # Custom domain
│   ├── og-card.svg                     # Social sharing preview
│   ├── robots.txt                      # Crawler rules
│   ├── sitemap.xml                     # Canonical sitemap
│   └── marks/                          # Instrument identities
├── catalog.json                        # Single source of truth for instruments
├── index.html                          # Portal structure (cards/chooser/JSON-LD generated)
├── rack.css                            # Current equipment-rack direction
├── styles.css                          # Shared/base styles
├── script.js                           # Chooser and wordmark behavior
├── visual-options.html                 # Original design studies
├── visual-options.css
├── visual-options.js
└── vite.config.js                      # Static build + catalog generator plugin
```

The site is intentionally small and dependency-light: semantic HTML, CSS, a little client-side JavaScript, and Vite for development and production builds. It has no API, database, analytics integration, or account system.

## Deployment

Deployment is handled by [GitHub Actions](./.github/workflows/deploy-pages.yml).

On every push to `main`, the workflow:

1. Installs dependencies with `npm ci`.
2. Builds the production site with `npm run build`.
3. Verifies the expected pages and custom-domain file.
4. Uploads `dist/` as a GitHub Pages artifact.
5. Deploys the artifact to GitHub Pages.

The workflow can also be started manually with **Run workflow** in the Actions tab.

Repository settings must use **GitHub Actions** as the Pages publishing source. The custom domain is declared in [`public/CNAME`](./public/CNAME) as:

```text
instruments.mdrone.org
```

## SEO and indexing

The canonical public URL is:

```text
https://instruments.mdrone.org/
```

The homepage includes crawlable copy, canonical metadata, Open Graph/Twitter preview tags, and JSON-LD structured data for the suite and its instruments (generated from [`catalog.json`](./catalog.json)). [`public/sitemap.xml`](./public/sitemap.xml) points crawlers to the canonical homepage, and [`public/robots.txt`](./public/robots.txt) advertises the sitemap.

[`visual-options.html`](./visual-options.html) is intentionally marked `noindex` and blocked in `robots.txt` because it is a design-study archive, not the page that should appear in search results.

## Adding or changing an instrument

Instrument content is defined once in [`catalog.json`](./catalog.json). A small Vite plugin in [`vite.config.js`](./vite.config.js) generates the homepage cards, the chooser buttons, the JSON-LD structured data, and the suite count from it at build time, so there is a single source of truth to edit. When updating the catalog:

1. Add or edit the instrument entry in `catalog.json` (name, links, description, tags, `status`, `intent`, and its `titleHtml`/`markHtml` identity markup).
2. Keep both the live destination (`href`) and source repository (`source`) links current.
3. Put reusable marks in `public/marks/`, preserve their original proportions, and reference them from the entry's identity markup.
4. Use the identity shown by the instrument itself rather than inventing a suite-wide substitute.
5. Run `npm run build` (or `npm run dev`) to regenerate the page before opening a pull request. The count in prose and structured data updates automatically from the number of entries.

## Visual identity and asset provenance

The portal preserves the projects' individual character rather than forcing them into one generic product brand. SVG marks are sourced from the corresponding project repositories where available. mpumpit's mark reproduces its source-defined ASCII wordmark; midip's terminal panel reflects its transport interface because those projects do not provide standalone logo files.

Each instrument remains owned and licensed through its own source repository. Check the linked project for its code license, documentation, platform requirements, and release files.

## License

This portal — its source, templates, and `catalog.json` — is licensed under the [GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0).

The AGPL applies only to this portal. Each linked instrument is a separate project owned and licensed through its own source repository; the marks under `public/marks/` remain the property of their respective projects and are used to represent them. Check each linked repository for its own license.

## Contributing

Corrections to links, descriptions, setup instructions, responsive behavior, and accessibility are welcome. Please keep changes focused, preserve the lightweight static architecture, and verify a production build before submitting them.

## Maintainer

Built in the open by [gdamdam](https://github.com/gdamdam).
