# m//instruments

Independent music instruments for the browser.

A dependency-light suite portal for mpump, mloop, mdrone, mpumpit, midip, mchord, mgrains, and mspectr. It includes an intent-based instrument chooser and four practical cross-instrument workflows.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The production site is written to `dist/` and can be hosted as a static site.

Three complete visual direction studies are available in `visual-options.html`.

## Deployment

Pushes to `main` build and deploy automatically with GitHub Actions. The Pages site uses the custom domain [instruments.mdrone.org](https://instruments.mdrone.org/).

In the GitHub repository, Pages must use **GitHub Actions** as its publishing source. The custom domain and DNS are configured separately in the repository Pages settings.

## Marks

The portal reuses each project's own visual identity. The SVG marks come from the corresponding project `public/` directories. mpumpit's mark reproduces its source-defined ASCII wordmark; midip's mark reproduces its terminal transport identity because those projects do not contain standalone logo files.
