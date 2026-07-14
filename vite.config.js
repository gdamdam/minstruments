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
  return `<article class="instrument-card" id="${id}" style="--accent:${accent}">
            <div class="card-index">m/${pad2(index + 1)}</div>
            ${sticker}${mark}
            ${instrument.titleHtml}
            <p>${escapeHtml(description)}</p>
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

export default defineConfig({
  base: './',
  plugins: [catalogPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(ROOT, 'index.html'),
        visualOptions: resolve(ROOT, 'visual-options.html'),
      },
    },
  },
});
