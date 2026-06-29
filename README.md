# Sub2API Mobile Admin

[English](README.md) | [????](README.zh-CN.md)

Sub2API Mobile Admin is a uni-app CLI + Vue 3 mobile administration console for Sub2API operations. It keeps the existing admin workflows while providing H5 and App builds with a blue-white glassmorphism dashboard style.

## Features

- Admin server login with multiple saved server profiles.
- Dashboard overview with health score, realtime throughput, SLA, request errors, cost cards, account health, model ranking, and trend charts.
- uCharts / qiun-data-charts based visual analytics for H5 and App builds.
- User list, pagination loading, user detail, API Key copy, balance operations, and status toggling.
- Account list, sticky filters, usage sorting, test model selection, account testing, pause and resume.
- Account creation and user creation forms that keep the current Sub2API admin fields.
- Group list with sticky search.
- Server settings page for adding, validating, switching, and deleting admin endpoints.
- Pull-down refresh and explicit refresh buttons on the main tab pages.

## Current UI Direction

The current UI follows a blue-white glassmorphism mobile dashboard language:

- soft blue-white gradient app background;
- large rounded glass cards with translucent fill, cyan border, and inner highlights;
- pill controls for time range, filters, and actions;
- bright blue primary actions with neo-style shadows;
- floating translucent tab bar styling for H5/App visual consistency.

## Tech Stack

- uni-app CLI
- Vue 3
- TypeScript
- Vite
- @qiun/uni-ucharts / qiun-data-charts
- Express local proxy for optional H5 development proxying

## Prerequisites

- Node.js 20+
- npm 10+
- HBuilderX if you want to open or package the App project manually

## Install

```bash
npm ci
```

## Run H5

```bash
npm run dev:h5
```

Default local URL:

```text
http://localhost:5173/
```

If port 5173 is occupied, the uni-app dev server may choose the next available port.

## Build

Build H5:

```bash
npm run build:h5
```

H5 output:

```text
dist/build/h5
```

Build App resources for HBuilderX / local packaging:

```bash
npm run build:app
```

App output:

```text
dist/build/app
```

The App build runs `scripts/fix-app-runtime-version.cjs` after the raw uni-app build to normalize the runtime compiler version used by the current packaging flow.

## Optional H5 Proxy

The app normally calls the configured Sub2API admin base URL directly and sends the admin key with the `x-api-key` header.

For local development where CORS needs a proxy:

```bash
npm run proxy
```

Or run proxy and H5 together:

```bash
npm run dev:h5-proxy
```

Then configure the app server URL as the proxy URL, for example:

```text
http://127.0.0.1:8787
```

## Project Structure

```txt
src/App.vue                         uni-app root
src/main.ts                         Vue app bootstrap
src/pages.json                      pages and tabBar configuration
src/manifest.json                   uni-app manifest
src/pages/                          mobile pages
src/components/uni/                 shared app UI components
src/components/qiun-data-charts/    local chart component for H5/App
src/components/u-charts/            local chart runtime
src/services/                       Sub2API admin request layer
src/store/                          admin server profile/session state
src/static/tabbar/                  local tab bar icons
src/styles.css                      shared glassmorphism theme
server/                             optional local Express proxy
docs/                               implementation and operation docs
```

## Security Notes

- Do not commit real Admin Keys or private tokens.
- H5 stores server profile metadata locally, but Admin Key handling should only be used on trusted devices.
- Use HTTPS endpoints in production.

## Related Docs

- [????](README.zh-CN.md)
- [Uni-app H5 rebuild notes](docs/UNIAPP_H5_REBUILD.md)
- [Local proxy setup](docs/LOCAL_PROXY_SETUP.md)
- [Security policy](SECURITY.md)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
