# Uni-app Vue3 H5 Rebuild

This project has been rebuilt as a uni-app CLI + Vue 3 H5 admin console while keeping the original Sub2API admin workflow.

## Scope

The rebuilt H5 app covers:

- Admin server login and server profile switching.
- Dashboard overview with stats, account health, uCharts-powered operations charts, model ranking, and recent trend details.
- User list, user detail, API Key copy, balance operation, and user status toggle.
- User creation.
- Account list, status filtering, usage sorting, account testing, and schedulable pause/resume.
- Account creation.
- Group list.

The old Expo/React Native source remains in the repository for reference, but the npm scripts now target the uni-app CLI H5 build.

## Runtime behavior

- The overview, users, accounts, and groups tab pages load once per active server profile. Switching between tab pages reuses the current data instead of forcing a new request every time.
- To refresh current data, use the page refresh button or the native pull-down refresh gesture on the overview, users, accounts, groups, or server pages.
- Loading states are shown during the first page load and the top refresh line shows the latest successful update time.
- The tab bar uses local PNG icons under `src/static/tabbar/`, so H5 and App packages do not depend on external icon assets.
- The shared UI now follows the Glassmorphism + Neo SaaS design system: low-noise glass cards, fixed semantic colors, unified text hierarchy, 16px card radius, 12px input/button radius, and restrained status colors.
- The overview page uses `@qiun/uni-ucharts` / `qiun-data-charts` for the health ring, account ring, realtime sparkline, throughput mix chart, request column chart, and cost line chart. The required chart components are copied into `src/components/` so HBuilderX App builds can resolve them without relying on `node_modules` component discovery.
- The overview metric cards for requests, SLA, request errors, and cost open `pages/monitor/metric-detail`, where each metric has a dedicated detail view, chart, supporting cards, and related action entry.
- The users page shows the backend total user count, current loaded count, page index, and supports loading the next page from the `/api/v1/admin/users` pagination response.
- The users, accounts, and groups list filter cards are sticky during vertical scrolling, keeping search and filter actions available while browsing long lists.
- Account testing supports Sub2API test endpoints that return normal JSON or `text/event-stream` streaming responses. A streaming response means the management interface is reachable; if the upstream account does not finish in time, the app shows a timeout/upstream-specific message instead of reporting the server as “not JSON”.
- The App build avoids browser-only APIs in the main uni-app flow to reduce blank-page risk on Android WebView/JSCore runtimes.

## Run H5

```bash
npm install
npm run dev:h5
```

Default local URL:

```text
http://localhost:5173/
```

Build H5:

```bash
npm run build:h5
```

Build output:

```text
dist/build/h5
```

## Server configuration

The H5 app calls the configured Sub2API admin base URL directly and sends the admin key with the `x-api-key` header.

For local proxy usage, keep using:

```bash
npm run proxy
```

Then configure the H5 app server URL as the proxy URL, for example:

```text
http://127.0.0.1:8787
```

## H5 security note

To match the original web security behavior, H5 does not persist `adminApiKey` in browser storage. Server profiles persist the base URL and label, but the key is kept only in the current runtime session. After a refresh or reopening the page, enter the Admin Key again.

## App packaging

The uni-app App target has been enabled for this project.

### Build App resources

```bash
npm run build:app
```

Output:

```text
dist/build/app
```

The App build script runs `scripts/fix-app-runtime-version.cjs` after the raw uni-app build. This normalizes the generated App runtime `compilerVersion` marker to `5.13`, matching the local HBuilderX 5.13 Android base runtime and preventing the repeated HTML5+ Runtime version mismatch prompt on first launch.

The local CLI build produces App runtime resources. To generate an installable Android APK/AAB, open or import this output in HBuilderX and use **发行 -> 原生App-云打包** or **运行到手机/模拟器**.

### Repackaging cache note

The current App package identity/version is:

```text
appid: __UNI__H565806EC
versionName: 2.1.2
versionCode: 212
```

If Android still shows the old overview after repackaging, it is normally running an old APK or old HBuilderX/App resource cache rather than failing to import uCharts. Before installing a freshly packaged APK, uninstall the old App from the phone, rebuild `dist/build/app`, and then run HBuilderX packaging again from the regenerated resources.

The regenerated App resources should contain `qiun-data-charts`, `ops-overview`, and `monitor-throughput-mix` in `dist/build/app/app-service.js`; old overview strings such as `今日请求`, `今日 Token`, and `7D Token 消耗` should not be present.

### Android APK path

Cloud packaging is still the recommended release path. When cloud packaging quota is unavailable, a local Android test APK can be produced by repacking the HBuilderX Android base runtime with the latest `dist/build/app` resources and signing it with the bundled HBuilderX test keystore.

Current local APK output:

```text
dist/local-apk/sub2api-mobile-local-ui-2.1.2.apk
```

Compatibility note: the first local test package that only used the HBuilderX phone-run base can show `?????????VUE3????uni-app???`. The fixed local APK includes the production-named Vue3 framework files (`assets/uni-jsframework-vue3.js` and `assets/uni-jsframework.js`) and uses `Sub2API Mobile` as the Android app label.

Local APK identity:

```text
appid: __UNI__H565806EC
android package: io.H565806EC
versionName: 2.1.2
versionCode: 212
signing: HBuilderX app-safe-pack Test.keystore / debug test certificate
android label: Sub2API Mobile
```

Install note: because this APK uses a local debug/test certificate, uninstall any previously installed cloud-packaged APK first if Android reports a signature conflict.

### HBuilderX cloud APK/AAB path

1. Install and open HBuilderX.
2. Import this project or import `dist/build/app` after running `npm run build:app`.
3. Confirm `src/manifest.json` appid, app name, version, Android package name, icon, and signing certificate.
4. Use HBuilderX cloud packaging to generate a production Android APK/AAB.

### Notes

- The local APK above is suitable for installation/testing when cloud quota is exhausted; production distribution should use an official release keystore or HBuilderX cloud packaging.
- iOS packaging requires Apple signing assets and a macOS/iOS packaging workflow.
- App runtime requests are native requests and are not blocked by browser CORS like H5 direct requests.
