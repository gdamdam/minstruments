import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const ROOT = import.meta.dirname;

// Small number-to-word table; the catalog is never going to reach twenty.
const NUMBER_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
];

const numberWord = (n) => NUMBER_WORDS[n] ?? String(n);
const pad2 = (n) => String(n).padStart(2, '0');
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const STICKERS = {
  beta: '<span class="beta-sticker">BETA</span>',
  alpha: '<span class="alpha-sticker">ALPHA</span>',
};

function renderCard(instrument, index) {
  const { id, accent, status, href, source, launchLabel, description, tags } = instrument;
  const sticker = STICKERS[status] ?? '';
  const mark = instrument.markHtml ?? '';
  const tagHtml = tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('');
  // Optional contextual link into a learning guide (e.g. the microtuning guide
  // from mdrone/mkeys/mchord/mraga). Kept out of the primary action row so the
  // Launch/Source calls to action stay unambiguous.
  const guideLink = instrument.guideHref
    ? `<a class="card-guide" href="${instrument.guideHref}">${escapeHtml(instrument.guideLabel ?? 'Read the guide')} →</a>`
    : '';
  return `<article class="instrument-card" id="${id}" style="--accent:${accent}">
            <div class="card-index">m/${pad2(index + 1)}</div>
            ${sticker}${mark}
            ${instrument.titleHtml}
            <p>${escapeHtml(description)}</p>
            ${guideLink}
            <div class="tags">${tagHtml}</div>
            <div class="card-actions">
              <a class="launch" href="${href}" target="_blank" rel="noreferrer">${escapeHtml(launchLabel)}</a>
              <a href="${source}" target="_blank" rel="noreferrer">Source</a>
            </div>
          </article>`;
}

function renderChooserButton(instrument) {
  const { id, intent } = instrument;
  return `<button class="intent" type="button" data-target="${id}">
            <span>${pad2(intent.order)}</span><strong>${escapeHtml(intent.label)}</strong><small>${escapeHtml(intent.hint)}</small>
          </button>`;
}

function renderJsonLd(catalog) {
  const { site, instruments } = catalog;
  const count = instruments.length;
  const suiteDescription = site.suiteDescriptionTemplate.replace('{{countWord}}', numberWord(count));
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${site.url}#website`,
      url: site.url,
      name: site.name,
      description: site.websiteDescription,
      inLanguage: 'en',
      publisher: { '@id': `${site.author.url}#person` },
    },
    {
      '@type': 'Person',
      '@id': `${site.author.url}#person`,
      name: site.author.name,
      url: site.author.url,
    },
    {
      '@type': 'WebApplication',
      '@id': `${site.url}#suite`,
      name: site.name,
      url: site.url,
      applicationCategory: 'MusicApplication',
      operatingSystem: 'Web browser',
      isAccessibleForFree: true,
      license: site.license,
      description: suiteDescription,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'ItemList',
      '@id': `${site.url}#instrument-list`,
      name: `${site.name} modules`,
      numberOfItems: count,
      itemListElement: instruments.map((instrument, i) => {
        const { jsonLd } = instrument;
        const item = {
          '@type': jsonLd.type,
          name: instrument.name,
          url: jsonLd.url,
          ...(jsonLd.downloadUrl ? { downloadUrl: jsonLd.downloadUrl } : {}),
          applicationCategory: 'MusicApplication',
          operatingSystem: jsonLd.operatingSystem,
          description: jsonLd.description,
        };
        return { '@type': 'ListItem', position: i + 1, item };
      }),
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return `<script type="application/ld+json">\n${json}\n    </script>`;
}

// Required fields are exactly what the render functions above consume; a
// missing one would otherwise crash the build with an opaque TypeError or,
// worse, ship a literal "undefined" in the HTML/JSON-LD.
const REQUIRED_SITE_FIELDS = ['name', 'url', 'websiteDescription', 'suiteDescriptionTemplate', 'license'];
const REQUIRED_INSTRUMENT_STRINGS = ['id', 'name', 'accent', 'href', 'source', 'launchLabel', 'description', 'titleHtml'];
const REQUIRED_INTENT_FIELDS = ['order', 'label', 'hint'];
const REQUIRED_JSONLD_FIELDS = ['type', 'url', 'operatingSystem', 'description'];

function validateCatalog(catalog) {
  const fail = (msg) => {
    throw new Error(`catalog.json: ${msg}`);
  };
  const requireFields = (obj, fields, label) => {
    if (obj == null || typeof obj !== 'object') fail(`${label} is missing or not an object`);
    for (const field of fields) {
      if (obj[field] == null) fail(`${label} is missing required field "${field}"`);
    }
  };
  requireFields(catalog.site, REQUIRED_SITE_FIELDS, 'site');
  requireFields(catalog.site.author, ['name', 'url'], 'site.author');
  if (!Array.isArray(catalog.instruments)) fail('"instruments" must be an array');
  for (const instrument of catalog.instruments) {
    const label = `instrument "${instrument?.id ?? '<missing id>'}"`;
    requireFields(instrument, REQUIRED_INSTRUMENT_STRINGS, label);
    if (!Array.isArray(instrument.tags)) fail(`${label} field "tags" must be an array`);
    requireFields(instrument.intent, REQUIRED_INTENT_FIELDS, `${label} intent`);
    requireFields(instrument.jsonLd, REQUIRED_JSONLD_FIELDS, `${label} jsonLd`);
  }
}

// Single source of truth: catalog.json generates the instrument cards, the
// chooser buttons, the JSON-LD structured data, and the suite count at build
// time. Output stays static HTML, so nothing is lost for crawlers.
function catalogPlugin() {
  return {
    name: 'm-suite-catalog',
    transformIndexHtml(html) {
      const catalog = JSON.parse(readFileSync(resolve(ROOT, 'catalog.json'), 'utf8'));
      validateCatalog(catalog);
      const count = catalog.instruments.length;
      return html
        .replace('<!-- catalog:jsonld -->', () => renderJsonLd(catalog))
        .replace(
          '<!-- catalog:cards -->',
          () => catalog.instruments.map(renderCard).join('\n\n          '),
        )
        .replace(
          '<!-- catalog:chooser -->',
          () => catalog.instruments
            .slice()
            .sort((a, b) => a.intent.order - b.intent.order)
            .map(renderChooserButton)
            .join('\n          '),
        )
        .replaceAll('%CATALOG_COUNT_WORD%', numberWord(count))
        .replaceAll('%CATALOG_COUNT%', String(count));
    },
  };
}

// --- Guides ---------------------------------------------------------------
// Learning section. Metadata lives in guides/guides.json (mirroring the
// catalog.json convention); chapter content is authored HTML in each guide's
// own page. The plugin renders the guides-index cards and their structured
// data at build time so the output stays static.
const REQUIRED_GUIDE_FIELDS = ['slug', 'title', 'href', 'summary', 'readingLevel', 'duration'];

function validateGuides(data) {
  const fail = (msg) => {
    throw new Error(`guides.json: ${msg}`);
  };
  if (data == null || typeof data.section !== 'object') fail('"section" is missing or not an object');
  if (!Array.isArray(data.guides)) fail('"guides" must be an array');
  for (const guide of data.guides) {
    const label = `guide "${guide?.slug ?? '<missing slug>'}"`;
    for (const field of REQUIRED_GUIDE_FIELDS) {
      if (guide[field] == null) fail(`${label} is missing required field "${field}"`);
    }
    if (!Array.isArray(guide.topics)) fail(`${label} field "topics" must be an array`);
  }
}

function renderGuideCard(guide) {
  const topics = (guide.topics ?? []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const badge = guide.featured ? '<span class="guide-badge">Featured</span>' : '';
  const accent = guide.accent ?? 'var(--acid)';
  return `<a class="guide-card${guide.featured ? ' guide-card-featured' : ''}" href="${guide.href}" style="--accent:${accent}">
            <div class="guide-card-head">
              <p class="eyebrow">Guide</p>
              ${badge}
            </div>
            <h3>${escapeHtml(guide.title)}</h3>
            <p class="guide-card-summary">${escapeHtml(guide.summary)}</p>
            <dl class="guide-meta">
              <div><dt>Level</dt><dd>${escapeHtml(guide.readingLevel)}</dd></div>
              <div><dt>Time</dt><dd>${escapeHtml(guide.duration)}</dd></div>
            </dl>
            <ul class="guide-topics" aria-label="Topics covered">${topics}</ul>
            <span class="guide-card-cta">Start reading →</span>
          </a>`;
}

function renderGuidesJsonLd(data) {
  const { section, guides } = data;
  const graph = [
    {
      '@type': 'CollectionPage',
      '@id': `${section.url}#guides`,
      url: section.url,
      name: `${section.name} — m-suite`,
      description: section.intro,
      inLanguage: 'en',
      isPartOf: { '@id': 'https://instruments.mdrone.org/#website' },
    },
    {
      '@type': 'ItemList',
      '@id': `${section.url}#guide-list`,
      name: 'm-suite guides',
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'LearningResource',
          name: guide.title,
          url: `https://instruments.mdrone.org${guide.href}`,
          description: guide.jsonLd?.description ?? guide.summary,
          educationalLevel: 'Beginner',
          inLanguage: 'en',
        },
      })),
    },
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
  return `<script type="application/ld+json">\n${json}\n    </script>`;
}

function guidesPlugin() {
  return {
    name: 'm-suite-guides',
    transformIndexHtml(html) {
      // Placeholders only exist on the guides index; on other pages these
      // replacements are harmless no-ops.
      if (!html.includes('guides:cards') && !html.includes('guides:jsonld')) return html;
      const data = JSON.parse(readFileSync(resolve(ROOT, 'guides/guides.json'), 'utf8'));
      validateGuides(data);
      return html
        .replace('<!-- guides:jsonld -->', () => renderGuidesJsonLd(data))
        .replace(
          '<!-- guides:cards -->',
          () => data.guides.map(renderGuideCard).join('\n\n          '),
        )
        .replaceAll('%GUIDES_INTRO%', () => escapeHtml(data.section.intro));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [catalogPlugin(), guidesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(ROOT, 'index.html'),
        visualOptions: resolve(ROOT, 'visual-options.html'),
        guides: resolve(ROOT, 'guides/index.html'),
        guidesMicrotuning: resolve(ROOT, 'guides/microtuning/index.html'),
      },
    },
  },
});
