# Uni-app Vue3 H5 / App Rebuild

This project has been rebuilt as a uni-app CLI + Vue 3 mobile admin console while keeping the original Sub2API admin workflow.

## Scope

The rebuilt app covers:

- Admin server login and server profile switching.
- Dashboard overview with health score, realtime throughput, SLA, request errors, cost cards, account health, model ranking, and trend charts.
- Metric detail pages for requests, SLA, request errors, and cost.
- User list, backend pagination, user detail, API Key copy, balance operation, and user status toggle.
- User creation.
- Account list, sticky filters, usage sorting, test model selection, account testing, and schedulable pause/resume.
- Account creation.
- Group list with sticky search and quota/limit fields.
- Server settings page for adding, validating, switching, and deleting admin endpoints.

## Runtime Behavior

- The overview, users, accounts, and groups tab pages load once per active server profile.
- Switching between tab pages reuses current data instead of forcing a new request every time.
- Current data can be refreshed with the page refresh button or native pull-down refresh.
- The tab bar uses local PNG icons from `src/static/tabbar/`, so H5 and App packages do not depend on external icon assets.
- The shared UI follows a blue-white Glassmorphism + Neo SaaS style: low-noise glass cards, fixed semantic colors, unified text hierarchy, and restrained status colors.
- The overview page uses `@qiun/uni-ucharts` / `qiun-data-charts` for health, account, sparkline, mix, column, and line charts.
- Account testing supports Sub2API test endpoints that return normal JSON or `text/event-stream` streaming responses.
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

## Server Configuration

The H5 app calls the configured Sub2API admin base URL directly and sends the admin key with the `x-api-key` header.

For local proxy usage:

```bash
npm run proxy
```

Then configure the H5 app server URL as the proxy URL, for example:

```text
http://127.0.0.1:8787
```

## H5 Security Note

To match the original web security behavior, H5 does not persist `adminApiKey` in browser storage. Server profiles persist the base URL and label, but the key is kept only in the current runtime session. After a refresh or reopening the page, enter the Admin Key again.

## App Packaging

Build App resources:

```bash
npm run build:app
```

Output:

```text
dist/build/app
```

The App build script runs `scripts/fix-app-runtime-version.cjs` after the raw uni-app build. This normalizes the generated App runtime `compilerVersion` marker to `5.13`, matching the local HBuilderX 5.13 Android base runtime and preventing the repeated HTML5+ Runtime version mismatch prompt on first launch.

The local CLI build produces App runtime resources. To generate a production Android APK/AAB, open or import this output in HBuilderX and use its cloud packaging flow with a production signing certificate.

## Local Android APK

Current local APK output:

```text
dist/local-apk/sub2api-mobile-local-guard-groups-2.1.3.apk
```

Local APK identity:

```text
appid: __UNI__H565806EC
android package: io.H565806EC
versionName: 2.1.3
versionCode: 213
signing: HBuilderX app-safe-pack Test.keystore / debug test certificate
android label: Sub2API Mobile
```

Packaging steps used for the local APK:

- Run `npm run build:app` to generate `dist/build/app`.
- Decode `dist/local-apk/sub2api-mobile-local-ui-2.1.2.apk`.
- Replace `assets/apps/__UNI__H565806EC/www` with the latest `dist/build/app` resources.
- Update native APK `versionName/versionCode` to `2.1.3 / 213`.
- Update `assets/data/dcloud_control.xml` `appver` to `2.1.3`.
- Align with HBuilderX bundled `zipalign`.
- Sign with HBuilderX bundled `Test.keystore`.

Validation:

- `zipalign -c -p 4`: passed.
- `apksigner verify --verbose`: passed; v1/v2 are both true.
- APK internal uni-app manifest: `2.1.3 / 213`.
- APK internal `compilerVersion`: `5.13`.

Install note: because this APK uses a local debug/test certificate, uninstall any previously installed cloud-packaged APK first if Android reports a signature conflict.

## Git LFS

`dist/local-apk/*.apk` is tracked with Git LFS because the local APK is larger than GitHub's regular 100 MB file limit.

After cloning the repository, run:

```bash
git lfs pull
```

## 中文说明

本项目已从原移动端实现重建为 uni-app CLI + Vue 3 管理台，并保留 Sub2API 的管理流程。当前同时支持 H5 调试和 App 资源构建。

本地 APK 路径：

```text
dist/local-apk/sub2api-mobile-local-guard-groups-2.1.3.apk
```

该 APK 使用 HBuilderX 测试证书签名，适合本地安装验证；正式发布请使用生产证书或 HBuilderX 云打包。
