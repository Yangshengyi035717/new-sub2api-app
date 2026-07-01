## 2026-06-23 - Task: Rebuild Sub2API mobile admin as uni-app CLI Vue3 H5
### What was done
- 梳理原 Expo/React Native 项目功能，并用 uni-app CLI + Vue 3 重建 H5 管理端入口。
- 复刻登录、服务器配置、概览、用户列表/详情/创建、账号列表/创建、分组列表等原有管理流程。
- 重写移动端 UI，改为现代化渐变背景、玻璃卡片、指标卡、列表卡和轻量趋势柱状图。
- 保留原有 Sub2API 管理接口路径与请求语义，H5 端不持久化 Admin Key，避免相对原 web 安全策略退化。
- 更新项目脚本和文档，使默认 H5 开发/构建走 uni-app CLI。

### Testing
- `npm install`：通过，依赖已切换到 uni-app/Vue3 栈；npm audit 报告现有依赖存在安全告警，未执行强制升级以避免引入破坏性变更。
- `npm run build:h5`：通过，生成 `dist/build/h5`。
- H5 本地运行验证：通过，`npm run dev:h5` 在 `http://localhost:5173/` 启动。
- 浏览器验证：通过，未登录访问概览会回到登录页；登录空表单提示正常；假连接失败提示正常。
- 本地 mock Sub2API 验证：通过，概览、用户、账号、分组、服务器五个主 tab 可渲染；用户详情、添加用户、添加账号页面可打开；账号测试按钮返回“测试成功”。

### Notes
- Modified files:
  - `package.json`：切换 npm 脚本和依赖到 uni-app CLI Vue3 H5。
  - `package-lock.json`：同步依赖锁文件。
  - `tsconfig.json`：调整 TypeScript 配置以适配 uni-app/Vue SFC。
  - `index.html`：新增 H5 Vite 入口。
  - `vite.config.ts`：新增 uni-app Vite 插件配置。
  - `src/App.vue`：新增 uni-app 应用入口与登录态初始化。
  - `src/main.ts`：新增 Vue3/uni-app 创建入口。
  - `src/pages.json`：新增页面路由与底部 tab 配置。
  - `src/manifest.json`：新增 uni-app 应用清单。
  - `src/styles.css`：新增现代化 H5 全局样式。
  - `src/env.d.ts`：新增 Vue SFC 类型声明。
  - `src/types/admin.ts`：保留并迁移 Sub2API 管理数据类型。
  - `src/services/admin.ts`：迁移管理接口服务到 uni-app 请求体系。
  - `src/services/admin-fetch.ts`：新增 uni.request 管理请求封装。
  - `src/store/admin-config.ts`：迁移服务器配置状态与 H5 安全存储策略。
  - `src/utils/format.ts`：新增格式化、日期范围、JSON 解析等通用工具。
  - `src/components/uni/PageShell.vue`：新增页面容器组件。
  - `src/components/uni/HeroHeader.vue`：新增现代化页头组件。
  - `src/components/uni/SectionCard.vue`：新增通用卡片区块组件。
  - `src/components/uni/StatCard.vue`：新增指标卡组件。
  - `src/components/uni/NoticeBlock.vue`：新增提示/错误态组件。
  - `src/components/uni/MiniTrend.vue`：新增轻量趋势图组件。
  - `src/pages/login/index.vue`：新增登录页。
  - `src/pages/monitor/index.vue`：新增概览页。
  - `src/pages/users/index.vue`：新增用户列表页。
  - `src/pages/users/detail.vue`：新增用户详情页。
  - `src/pages/users/create-user.vue`：新增用户创建页。
  - `src/pages/accounts/index.vue`：新增账号列表页。
  - `src/pages/accounts/create.vue`：新增账号创建页。
  - `src/pages/groups/index.vue`：新增分组列表页。
  - `src/pages/settings/index.vue`：新增服务器配置页。
  - `docs/UNIAPP_H5_REBUILD.md`：新增 H5 重建说明、运行方式和安全说明。
- Rollback: 使用 Git 回滚本轮改动即可，例如 `git checkout -- package.json package-lock.json tsconfig.json src docs/UNIAPP_H5_REBUILD.md index.html vite.config.ts`，并删除新增的 uni-app 页面/组件文件；或直接回退到本任务前的提交。

## 2026-06-23 - Task: Verify uni-app H5 against real Sub2API server
### What was done
- 使用用户提供的真实 Sub2API 服务地址完成 H5 端联调。
- 先确认真实服务只读接口和 Admin Key 可用，再定位 H5 直连失败原因为目标服务对 localhost 跨域预检返回 403。
- 通过项目本地代理连接真实服务，完成 H5 登录和真实数据页面读取验证。
- 仅执行只读页面加载验证，未执行创建用户、创建账号、禁用用户、余额变更、账号测试、账号暂停/恢复等会修改后台状态的操作。

### Testing
- `Invoke-WebRequest https://apis.ysyun.xyz/api/v1/admin/settings` with `x-api-key`：通过，返回 `code: 0`。
- `Invoke-WebRequest https://apis.ysyun.xyz/api/v1/admin/dashboard/stats` with `x-api-key`：通过，返回 `code: 0`。
- `OPTIONS https://apis.ysyun.xyz/api/v1/admin/settings` from `Origin: http://localhost:5173`：返回 403，确认 H5 直连存在 CORS 预检限制。
- `node server/index.js` 本地代理：通过，`http://localhost:8787` 可代理真实服务。
- H5 登录 `http://127.0.0.1:8787`：通过，进入概览页，站点名显示为 `YS API`。
- H5 真实数据只读页面验证：通过，概览、用户、账号、分组、服务器页面均可加载真实数据。

### Notes
- Modified files: none。本轮只做真实服务联调和进度记录，没有修改业务代码。
- Rollback: 本轮无代码改动；如需撤销记录，可回退 `progress.md` 最后一段追加内容。

## 2026-06-23 - Task: Package uni-app build as App resources
### What was done
- 补齐 uni-app App 端构建依赖，新增 `dev:app` 与 `build:app` 脚本。
- 执行 App 端构建，生成可导入 HBuilderX 的 App 资源包。
- 同步更新文档，说明本地 CLI 产物位置和后续 Android APK/AAB 云打包路径。

### Testing
- `npm install @dcloudio/uni-app-plus @dcloudio/uni-app-uts @dcloudio/uni-uts-v1 @dcloudio/uni-cli-shared --save-dev`：通过。
- `npm run build:app`：通过，生成 `dist/build/app`，CLI 提示“打开 HBuilderX, 导入 dist\build\app 运行”。
- `npm run build:h5`：通过，确认 H5 构建未被 App 端依赖影响。

### Notes
- Modified files:
  - `package.json`：新增 App 端构建脚本和 App 构建依赖。
  - `package-lock.json`：同步 App 端构建依赖锁定结果。
  - `docs/UNIAPP_H5_REBUILD.md`：追加 App 资源构建和 Android APK/AAB 后续打包说明。
  - `progress.md`：追加本轮 App 打包记录。
- Build output: `dist/build/app`。
- Limitation: 当前 Windows CLI 构建产出的是 uni-app App 资源包，不是签名 APK；生成 APK/AAB 需要使用 HBuilderX 云打包或具备完整原生打包链路与签名配置。
- Rollback: 使用 Git 回滚 `package.json`、`package-lock.json`、`docs/UNIAPP_H5_REBUILD.md` 和 `progress.md` 本轮追加内容；删除 `dist/build/app` 可移除本地构建产物。

## 2026-06-23 - Task: Fix App runtime URLSearchParams error
### What was done
- 修复 App 打包后概览页加载时报 `URLSearchParams is not defined` 的问题。
- 将管理接口查询参数拼接从 `URLSearchParams` 改为 `encodeURIComponent` 手动拼接，避免依赖 App WebView 不一定提供的浏览器 API。
- 重新生成 H5 与 App 构建产物。

### Testing
- `npm run build:h5`：通过。
- `npm run build:app`：通过，已重新生成 `dist/build/app`。

### Notes
- Modified files:
  - `src/services/admin.ts`：替换查询字符串构造逻辑，兼容 App 运行环境。
  - `progress.md`：追加本轮修复记录。
- Build output: `dist/build/app`。
- Rollback: 使用 Git 回滚 `src/services/admin.ts` 和 `progress.md` 本轮追加内容；如需撤销产物，删除 `dist/build/app` 后重新构建旧版本。

## 2026-06-24 - Task: Fix App blank pages, account test response, refresh behavior, and rebuild App resources
### What was done
- 修复 App 端概览、用户等页面可能因运行环境缺少浏览器 API 而空白的问题，移除主流程中的 `window`、`URL`、`Intl.NumberFormat`、`Object.fromEntries/Object.values/Object.entries` 等高风险用法。
- 修正账号“测试”接口处理逻辑，兼容 Sub2API 返回 `text/event-stream` 流式测试结果，不再把可联通的流式响应误判成“不是 JSON”。
- 调整主 tab 数据加载策略：同一服务器配置下切换 tab 不再每次强制重新请求，只在首次进入、切换服务器、搜索/筛选、点击刷新或下拉刷新时更新。
- 为概览、用户、账号、分组、服务器页面启用下拉刷新，并增加顶部刷新状态和最近更新时间展示。
- 补充 H5 端服务器配置去重，避免 H5 不持久化 Admin Key 导致同一服务地址重复出现在服务器列表。
- 更新使用文档并重新生成 HBuilderX 可导入的 App 构建资源包。

### Testing
- `npm run build:h5`：通过，H5 构建成功。
- H5 真实服务联调：通过本地代理连接真实 Sub2API 服务，登录成功并进入概览。
- H5 页面验证：概览显示 `YS API` 与账号统计；用户页显示 2 个用户；账号页显示 11 个账号；分组页显示 12 个分组；服务器页可显示当前服务配置，均未出现空白或业务错误提示。
- H5 tab 切换验证：用户、账号等页面切换后保留已有数据，不再因 tab 切换本身强制刷新。
- H5 账号测试验证：点击一个真实账号的“测试”后显示“测试成功。”，未再出现“当前地址返回的数据格式不正确”。
- App 构建验证：`npm run build:app` 通过，已重新生成 `dist/build/app`，CLI 提示可打开 HBuilderX 导入运行。

### Notes
- Modified files:
  - `src/services/admin-fetch.ts`：增强请求封装，兼容流式测试响应、超时提示和 App 端请求异常。
  - `src/services/admin.ts`：移除查询参数构造中的浏览器兼容风险，并让账号测试走流式兼容请求。
  - `src/types/admin.ts`：新增账号测试结果类型。
  - `src/utils/format.ts`：移除 `Intl.NumberFormat` 依赖并补充网络、超时、流式测试错误提示。
  - `src/store/admin-config.ts`：移除 `new URL` 依赖，并对 H5 服务器配置按地址去重。
  - `src/pages/monitor/index.vue`：增加缓存式 tab 加载、刷新状态、下拉刷新，并移除 App 兼容风险用法。
  - `src/pages/users/index.vue`：增加缓存式 tab 加载、刷新状态、下拉刷新，并修复 `window.setTimeout` 兼容问题。
  - `src/pages/accounts/index.vue`：增加缓存式 tab 加载、刷新状态、下拉刷新，修复统计映射与账号测试展示逻辑。
  - `src/pages/groups/index.vue`：增加缓存式 tab 加载、刷新状态、下拉刷新，并修复 `window.setTimeout` 兼容问题。
  - `src/pages.json`：为主 tab 页面启用 `enablePullDownRefresh`。
  - `src/styles.css`：新增刷新状态栏样式。
  - `docs/UNIAPP_H5_REBUILD.md`：补充刷新策略、账号测试响应和 App 兼容说明。
  - `progress.md`：追加本轮修复与验证记录。
- Build output: `D:\project\sub2api-mobile\dist\build\app`。
- Rollback: 使用 Git 回滚上述文件到本轮修改前状态；如需移除构建产物，可删除 `D:\project\sub2api-mobile\dist\build\app` 后重新构建旧版本。

## 2026-06-24 - Task: Redesign mobile overview with uCharts and rebuild App resources
### What was done
- 参考后台运维监控面板重做移动端概览页视觉结构，保留原有概览、账号、趋势、模型排行和近期明细功能。
- 接入 uCharts / qiun-data-charts，新增健康环、实时趋势、账号状态环图、吞吐混合图、请求柱状图和成本折线图，替换原先简陋的静态趋势块。
- 将 uCharts 组件复制到项目本地组件目录，保证 HBuilderX App 构建时可以直接解析图表组件。
- 根据用户更正后的真实服务域名重新联调，确认旧域名返回 Nginx 404，新域名管理接口可用。
- 重新生成 HBuilderX 可导入的 App 构建资源包。

### Testing
- `npm run build:h5`：通过，H5 构建成功。
- `Invoke-WebRequest https://api.ysyun.xyz/api/v1/admin/settings`：通过，返回 `code: 0`。
- `Invoke-WebRequest https://api.ysyun.xyz/api/v1/admin/dashboard/stats`：通过，返回 `code: 0`。
- H5 真实服务联调：通过本地代理连接真实服务，概览页显示 `YS API`、实时健康、账号概览、吞吐趋势、请求与成本、模型 Top 5 和近期明细。
- H5 图表验证：概览页检测到 6 个 canvas 图表节点，覆盖健康环、实时 sparkline、账号环图、吞吐混合图、请求柱状图和成本折线图；浏览器控制台未出现 error/warn。
- H5 交互验证：切换 `30D` 时间范围后数据刷新，页面显示 `30D Token / 请求双轴趋势`，图表节点数量保持 6 个。
- `npm run build:app`：通过，已重新生成 `D:\project\sub2api-mobile\dist\build\app`。

### Notes
- Modified files:
  - `package.json`：新增 `@qiun/uni-ucharts` 图表依赖。
  - `package-lock.json`：同步锁定 uCharts 依赖。
  - `src/pages/monitor/index.vue`：重做移动端概览 UI 并接入 uCharts 图表。
  - `src/components/qiun-data-charts/qiun-data-charts.vue`：新增本地图表组件入口。
  - `src/components/qiun-error/qiun-error.vue`：新增 uCharts 错误态依赖组件。
  - `src/components/qiun-loading/`：新增 uCharts 加载态依赖组件。
  - `src/components/u-charts/`：新增 uCharts 渲染库与配置文件。
  - `docs/UNIAPP_H5_REBUILD.md`：补充概览图表和 HBuilderX 本地组件解析说明。
  - `progress.md`：追加本轮概览 UI 改造、验证和 App 构建记录。
- Build output: `D:\project\sub2api-mobile\dist\build\app`。
- Rollback: 使用 Git 回滚上述文件到本轮修改前状态，并删除 `src/components/qiun-data-charts/`、`src/components/qiun-error/`、`src/components/qiun-loading/`、`src/components/u-charts/`；如需移除构建产物，可删除 `D:\project\sub2api-mobile\dist\build\app` 后重新构建旧版本。

## 2026-06-24 - Task: Verify uCharts App package and prevent old overview cache confusion
### What was done
- 核对用户反馈截图，确认手机上显示的是旧概览资源，不是当前源码中的 uCharts 新概览页面。
- 将 uni-app App 标识和版本调整为 `__UNI__H565806EC` / `2.1.0` / `210`，用于降低 HBuilderX 与 Android 复用旧资源包的概率。
- 重新生成 H5 构建产物和 HBuilderX 可导入的 App 资源包。
- 补充 App 重新打包说明，提醒安装前先卸载旧 App，并说明如何核验新资源里是否包含 uCharts 概览代码。

### Testing
- `npm run build:h5`：通过，H5 构建成功。
- `npm run build:app`：通过，已重新生成 `D:\project\sub2api-mobile\dist\build\app`。
- `dist/build/app/manifest.json` 核验：通过，包含 `__UNI__H565806EC`、`2.1.0`、`210`。
- `dist/build/app/app-service.js` 核验：通过，包含 `qiun-data-charts`、`ops-overview`、`monitor-throughput-mix`，说明新概览和 uCharts 组件已打入 App 资源。
- `dist/build/app/app-service.js` 旧资源核验：通过，未检出旧概览关键文案 `今日请求`、`今日 Token`、`Token 消耗`、`7D Token 消耗`。
- `dist/build/app/pages/monitor/index.css` 核验：通过，包含 `ops-overview`、`health-ring`、`chart-panel` 等新概览样式。

### Notes
- Modified files:
  - `src/manifest.json`：调整 App 标识和版本号，避免继续安装或运行旧包时难以区分。
  - `docs/UNIAPP_H5_REBUILD.md`：补充重新打包、卸载旧 App 和包内 uCharts 资源核验说明。
  - `progress.md`：追加本轮核验与打包记录。
- Build output: `D:\project\sub2api-mobile\dist\build\app`。
- Rollback: 使用 Git 回滚 `src/manifest.json`、`docs/UNIAPP_H5_REBUILD.md` 和 `progress.md` 本轮追加内容；如需移除本轮构建产物，可删除 `D:\project\sub2api-mobile\dist\build\app` 后重新构建旧版本。


## 2026-06-24 - Task: Build local Android APK after cloud quota exhausted
### What was done
- ???? uni-app App ????????? APK ????? uCharts ?????
- ?? HBuilderX ?? Android ????????? `dist/build/app` ????????? Android ?? APK?
- ?? HBuilderX bundled `Test.keystore` ? APK ?????????????? APK ?????

### Testing
- `npm run build:app`????????? `D:\project\sub2api-mobile\dist\build\app`?
- ?? APK ???????? `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-debug-2.1.0.apk`?
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-debug-2.1.0.apk`????????? 0?
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-debug-2.1.0.apk`????v1/v2 ???? true?
- APK ???????????? `assets/apps/__UNI__H565806EC/www/app-service.js`?`manifest.json`?`assets/data/dcloud_control.xml`?
- APK ???????????`app-service.js` ?? `qiun-data-charts`?`ops-overview`?`monitor-throughput-mix`??????????? `????`?`?? Token`?`Token ??`?`7D Token ??`?
- ???????????`adb devices` ??????????

### Notes
- Modified files:
  - `docs/UNIAPP_H5_REBUILD.md`?????????????? Android ?? APK ??????????????????
  - `progress.md`????????????
  - `dist/local-apk/sub2api-mobile-local-debug-2.1.0.apk`???????? Android ?? APK?
- APK identity: `appid=__UNI__H565806EC`?`android package=io.H565806EC`?`versionName=2.1.0`?`versionCode=210`?
- Signing note: ?? APK ?? HBuilderX ??????????????????????????????????????
- Rollback: ?? `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-debug-2.1.0.apk` ????? APK??? Git ?? `docs/UNIAPP_H5_REBUILD.md` ? `progress.md` ????????????????? App ????? `D:\project\sub2api-mobile\dist\build\app` ?????????


## 2026-06-24 - Task: Fix local APK Vue3 runtime base error
### What was done
- ????????? APK ????????????? VUE3 ??? uni-app ????????????? HBuilderX ??????????? dev ??? Vue3 framework????????????????? Vue3 framework?
- ?????? APK??? `assets/uni-jsframework-vue3.js` ? `assets/uni-jsframework.js`???? dev framework ?????????
- ? Android ??????? `Sub2API Mobile`???????????? HBuilder??????? uCharts App ???
- ???? unsigned/aligned ?? APK ???????????????? APK?

### Testing
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-vue3fix-2.1.0.apk`??????? 0?
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-vue3fix-2.1.0.apk`????v1/v2 ???? true?
- APK ?? Vue3 framework ???????? `assets/uni-jsframework-vue3.js` ? `assets/uni-jsframework-vue3-dev.js`?
- APK ???????????? `assets/apps/__UNI__H565806EC/www/app-service.js`?`manifest.json`?`assets/data/dcloud_control.xml`?
- APK ??????????`appid=__UNI__H565806EC`?`name=Sub2API Mobile`?`android package=io.H565806EC`?`versionName=2.1.0`?`versionCode=210`?
- APK ???????????`app-service.js` ?? `qiun-data-charts`?`ops-overview`?`monitor-throughput-mix`??????????? `????`?`?? Token`?`Token ??`?`7D Token ??`?
- ???????????`adb devices` ??????????

### Notes
- Modified files:
  - `docs/UNIAPP_H5_REBUILD.md`????? APK ???????? Vue3 framework ???????
  - `progress.md`????? Vue3 ??????????
  - `dist/local-apk/sub2api-mobile-local-vue3fix-2.1.0.apk`???????????? Android ?? APK?
  - `dist/local-apk/sub2api-mobile-local-debug-2.1.0.apk`????????? Vue3 ?? APK????????????
- Install note: ?????????????? `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-vue3fix-2.1.0.apk`?
- Rollback: ?? `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-vue3fix-2.1.0.apk` ??????????????????????????????????? `sub2api-mobile-local-debug-2.1.0.apk`??? Git ?? `docs/UNIAPP_H5_REBUILD.md` ? `progress.md` ???????????
## 2026-06-25 - Task: 继续重打包修改后的 App
### What was done
- 重新执行了 uni-app App 构建，确认最新账号模型选择、长名称布局和 uCharts 概览代码已进入 App 资源。
- 以已验证可安装的本地 Vue3 修复基座为模板，替换最新 `dist/build/app` 业务资源后重新签名，产出可安装的本地 Android APK。
- 完成了 APK 对齐、签名和包内资源一致性校验，确认最终安装包与当前构建资源一致。

### Testing
- `npm run build:app`：通过。
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-current-2.1.0.apk`：通过。
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-current-2.1.0.apk`：通过，v1/v2 均为 true。
- APK 内容核验：`assets/apps/__UNI__H565806EC/www/app-service.js`、`pages/accounts/index.css`、`manifest.json`、`assets/uni-jsframework-vue3.js`、`assets/uni-jsframework.js` 均存在。
- APK 业务标记核验：已检出 `选择测试模型`、`model_id`、`/models`、`account-title`、`model-sheet`、`qiun-data-charts`、`ops-overview`、`monitor-throughput-mix`。

### Notes
- Modified files:
  - `progress.md`：追加本轮重新打包与验证记录。
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-current-2.1.0.apk`。
- Rollback: 删除 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-current-2.1.0.apk`，并回滚 `progress.md` 本轮追加内容即可；如需重新生成，先执行 `npm run build:app` 再重新本地重打包。

## 2026-06-29 - Task: 修复 App 首启版本提示、tabBar 图标和用户分页统计
### What was done
- 修复 App 首次运行反复弹出的 HTML5+ Runtime 版本不匹配提示：App 构建后自动将运行时 `compilerVersion` 标记同步为 5.13，并把安装包版本提升到 2.1.1 / 211，减少手机端旧资源缓存干扰。
- 为底部 tabBar 生成并接入本地 PNG 图标，概览、用户、账号、分组、服务器均有普通态和选中态图标。
- 用户页增加用户总数、已加载数量、页码展示和“加载更多”分页能力，并使用后端实际返回的分页字段统计用户数量。
- 重新生成 H5、App 构建资源和本地 Android APK。

### Testing
- `npm run build:h5`：通过，H5 构建成功。
- `npm run build:app`：通过，App 构建成功，并执行 `scripts/fix-app-runtime-version.cjs` 将 App 资源 `compilerVersion` 修正为 5.13。
- 真实接口分页核验：`GET https://api.ysyun.xyz/api/v1/admin/users?page=1&page_size=5` 返回 `total: 58`、`page: 1`、`pages: 12`，确认用户数量来自后端分页响应。
- App 构建产物核验：`dist/build/app/manifest.json` 与 `app-config-service.js` 均包含 `compilerVersion: 5.13`；`static/tabbar` 图标已复制进 App 资源；`app-service.js` 包含 `用户总数`、`加载更多`、`page_size`、`last_active_at` 等分页标记。
- APK 对齐校验：`zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-fixes-2.1.1.apk` 通过。
- APK 签名校验：`apksigner verify --verbose dist/local-apk/sub2api-mobile-local-fixes-2.1.1.apk` 通过，v1/v2 均为 true。
- APK 内容核验：包内存在 `assets/apps/__UNI__H565806EC/www/manifest.json`、`app-config-service.js`、`app-service.js`、tabBar 图标、`assets/uni-jsframework-vue3.js` 和 `assets/uni-jsframework.js`。
- APK 版本核验：最终 APK 原生 `versionName: 2.1.1`、`versionCode: 211`；uni-app 内部 manifest 版本也为 `2.1.1 / 211`；`dcloud_control.xml` 中 appver 为 `2.1.1`。

### Notes
- Modified files:
  - `package.json`：升级并固定 uni-app 5.13 版本线依赖，新增 `build:app:raw`，并让 `build:app` 自动执行 App Runtime 版本标记修正。
  - `package-lock.json`：同步 uni-app/Vite 依赖升级和锁定结果。
  - `scripts/fix-app-runtime-version.cjs`：新增 App 构建后修正 `compilerVersion` 到 5.13 的脚本。
  - `src/manifest.json`：将 App 版本提升到 `2.1.1 / 211`。
  - `src/pages.json`：为 5 个 tabBar 页面配置本地普通态/选中态图标。
  - `src/static/tabbar/`：新增 tabBar 本地 PNG 图标资源。
  - `src/services/admin.ts`：让用户列表接口支持 `page` 和 `page_size` 参数。
  - `src/types/admin.ts`：补充用户 `last_active_at` 字段。
  - `src/pages/users/index.vue`：新增用户总数、已加载数量、页码展示和下一页加载逻辑。
  - `docs/UNIAPP_H5_REBUILD.md`：补充 Runtime 版本提示修复、tabBar 图标、用户分页和新 APK 路径说明。
  - `progress.md`：追加本轮修复、验证和打包记录。
  - `dist/local-apk/sub2api-mobile-local-fixes-2.1.1.apk`：生成本轮可安装 Android APK。
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-fixes-2.1.1.apk`。
- Rollback: 使用 Git 回滚上述源码、脚本、文档和日志文件；删除 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-fixes-2.1.1.apk`；如需回到上一安装包，可继续使用 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-current-2.1.0.apk`。

## 2026-06-29 - Task: 按 Glassmorphism Neo 设计系统重构 UI 并完善概览指标与吸顶筛选
### What was done
- 按 Markdown 设计系统统一全局 UI：页面底色、毛玻璃卡片、按钮、输入框、状态标签、列表卡片和文字层级收敛到低噪点 Glassmorphism + Neo SaaS 风格。
- 完善概览首页 4 个指标卡：请求、SLA、请求错误、今日成本现在可点击进入统一指标明细落地页，并按不同指标展示核心数值、趋势图、模型/账号落点和处理入口。
- 新增 `pages/monitor/metric-detail` 指标详情页，支持从概览携带时间范围进入，并支持下拉刷新。
- 用户、账号、分组 tabBar 页面搜索/筛选卡片增加上滑吸顶悬浮，长列表浏览时搜索和筛选操作保持可用。
- 将 App 版本提升到 `2.1.2 / 212`，重新生成 H5、App 构建资源和本地 Android APK。

### Testing
- `npm run build:h5`：通过，H5 构建成功。
- H5 本地运行 smoke test：`npm run dev:h5 -- --host 127.0.0.1 --port 5177` 启动成功，`http://127.0.0.1:5177/` 返回 HTTP 200。
- `npm run build:app`：通过，App 构建成功，并执行 `scripts/fix-app-runtime-version.cjs` 将 App 资源 `compilerVersion` 修正为 5.13。
- App 构建产物核验：`app-service.js` 包含 `pages/monitor/metric-detail`、`请求明细`、`SLA 明细`、`请求错误明细`、`今日成本明细`、`用户总数`、`加载更多`；`app.css` 包含 `sticky-filter` 和 `backdrop-filter`。
- APK 对齐校验：`zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-ui-2.1.2.apk` 通过。
- APK 签名校验：`apksigner verify --verbose dist/local-apk/sub2api-mobile-local-ui-2.1.2.apk` 通过，v1/v2 均为 true。
- APK 内容核验：最终 APK 内部 manifest 为 `2.1.2 / 212`，`compilerVersion` 为 5.13，`dcloud_control.xml` 中 appver 为 `2.1.2`，并包含新增指标详情页、吸顶样式和用户分页标记。

### Notes
- Modified files:
  - `src/styles.css`：按 Glassmorphism + Neo SaaS 规范统一全局卡片、按钮、输入、标签、列表和吸顶筛选样式。
  - `src/pages/monitor/index.vue`：让 4 个概览指标卡成为可点击入口，并调整指标卡玻璃质感样式。
  - `src/pages/monitor/metric-detail.vue`：新增请求、SLA、请求错误、今日成本共用的指标详情落地页。
  - `src/pages/users/index.vue`：搜索统计卡增加吸顶类，并同步局部摘要卡片样式。
  - `src/pages/accounts/index.vue`：搜索筛选卡增加吸顶类，并统一模型选择弹层/选项的玻璃样式。
  - `src/pages/groups/index.vue`：搜索卡增加吸顶类。
  - `src/pages.json`：注册指标详情页路由。
  - `src/manifest.json`：将 App 版本提升到 `2.1.2 / 212`。
  - `docs/UNIAPP_H5_REBUILD.md`：补充 UI 设计系统、指标详情页、吸顶筛选和新 APK 路径说明。
  - `progress.md`：追加本轮 UI 重构、功能完善、验证和打包记录。
  - `dist/local-apk/sub2api-mobile-local-ui-2.1.2.apk`：生成本轮可安装 Android APK。
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-ui-2.1.2.apk`。
- Rollback: 使用 Git 回滚上述源码、文档和日志文件；删除 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-ui-2.1.2.apk`；如需回到上一安装包，可继续使用 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-fixes-2.1.1.apk`。


## 2026-06-29 - Task: 账号/分组页安全守卫完善与分组信息增强
### What was done
- 为账号页和分组页补充了未连接服务器的安全守卫（`hasAccount` computed 和 `NoticeBlock` 提示），与概览页、用户页保持一致。
- 账号页筛选栏合并为单行：状态筛选 chip + 用量排序 chip，减少垂直空间占用，标签文本更紧凑。
- 分组卡片补充了订阅类型、倍率、描述、日/周/月限额和创建时间等完整字段，业务运营人员可直接在列表卡片获取关键配额信息。
- App 版本提升至 `2.1.3 / 213`。

### Testing
- `npm run build:h5`：通过，H5 构建成功。
- `npm run build:app`：通过，App 构建成功，`compilerVersion` 修正为 5.13。
- H5 产物核验：`pages-accounts-*.js` 和 `pages-groups-*.js` 均包含新增守卫逻辑和分组增强字段。
- App 产物核验：`app-service.js` 包含 `accounts/index`、`groups/index` 页面引用。

### Notes
- Modified files:
  - `src/pages/accounts/index.vue`：新增 `hasAccount` 守卫与 `NoticeBlock` 未连接提示；合并筛选 chip 为单行；用 `<template v-if="hasAccount">` 包裹主内容。
  - `src/pages/groups/index.vue`：新增 `hasAccount` 守卫与 `NoticeBlock` 未连接提示；分组卡片展示订阅类型、倍率、日/周/月限额、创建时间；新增 `formatMoney` 导入和 `group-meta-row` 样式。
  - `src/manifest.json`：App 版本提升至 `2.1.3 / 213`。
  - `docs/UNIAPP_H5_REBUILD.md`：补充本轮改动记录。
  - `progress.md`：追加本轮记录。
- Rollback: 使用 Git 回滚上述源文件、文档和日志。

## 2026-06-29 - Task: 打包本地 Android APK 2.1.3
### What was done
- 将 App 版本同步为 `2.1.3 / 213`。
- 重新执行 `npm run build:app`，生成最新 `dist/build/app` 资源，并由 `scripts/fix-app-runtime-version.cjs` 修正 App Runtime `compilerVersion`。
- 基于 `dist/local-apk/sub2api-mobile-local-ui-2.1.2.apk` 解包，替换 `assets/apps/__UNI__H565806EC/www` 为本轮最新 App 构建资源。
- 同步 APK 原生版本、uni-app 内部 manifest 版本和 `dcloud_control.xml` appver，生成并签名本地 Android APK。

### Testing
- `npm run build:app`：通过，App 构建成功，`compilerVersion` 修正为 5.13。
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-guard-groups-2.1.3.apk`：通过。
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-guard-groups-2.1.3.apk`：通过，v1/v2 均为 true。
- APK 内容核验：原生 `versionName: 2.1.3`、`versionCode: 213`；uni-app 内部 manifest 为 `2.1.3 / 213`；`dcloud_control.xml` 中 appver 为 `2.1.3`；`app-service.js` 包含 `pages/accounts/index`、`pages/groups/index` 和分组增强字段标记。

### Notes
- Modified files:
  - `src/manifest.json`：将 App 版本提升至 `2.1.3 / 213`。
  - `docs/UNIAPP_H5_REBUILD.md`：补充本地 APK 2.1.3 的产物路径、打包方式和验证记录。
  - `progress.md`：追加本轮 APK 打包记录。
  - `dist/local-apk/sub2api-mobile-local-guard-groups-2.1.3.apk`：生成本轮可安装 Android APK。
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-guard-groups-2.1.3.apk`。
- Signing: 使用 HBuilderX 自带 `Test.keystore` 测试证书签名，适合本地安装验证；正式发布需改用生产证书。
- Rollback: 使用 Git 回滚 `src/manifest.json`、`docs/UNIAPP_H5_REBUILD.md`、`progress.md`；删除 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-guard-groups-2.1.3.apk`；如需回到上一包，可继续使用 `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-ui-2.1.2.apk`。

## 2026-06-29 - Task: 配置 APK Git LFS 入库
### What was done
- 为 `dist/local-apk/*.apk` 配置 Git LFS 跟踪，避免超过 GitHub 普通 Git 单文件 100MB 限制。
- 准备将本轮最终 APK 作为 LFS 对象随源码一起推送到远端仓库。

### Testing
- `git lfs version`：通过，本机 Git LFS 可用。
- `git lfs track "dist/local-apk/*.apk"`：通过，已生成 `.gitattributes` 规则。

### Notes
- Modified files:
  - `.gitattributes`：新增 APK 的 Git LFS 跟踪规则。
  - `docs/UNIAPP_H5_REBUILD.md`：补充 APK 使用 Git LFS 入库的说明。
  - `progress.md`：追加本轮 LFS 配置记录。
- Rollback: 删除 `.gitattributes` 中 `dist/local-apk/*.apk` 的 LFS 规则；如已提交 APK，可用 `git rm --cached` 移除 LFS 指针并删除远端对应对象。

## 2026-06-29 - Task: 修复 GitHub 中文文档乱码
### What was done
- 重写 `README.zh-CN.md` 为标准 UTF-8 中文内容，修复 GitHub 页面显示为 `????` 的问题。
- 修复 `README.md` 中指向中文说明的链接文字。
- 重写 `docs/UNIAPP_H5_REBUILD.md`，清理此前写入的 mojibake 乱码段落，并保留 H5/App 构建、APK、Git LFS 和验证说明。

### Testing
- 字节级核验：`README.zh-CN.md` 中 `中文` 两个字符的 Unicode 码点为 `20013 / 25991`，确认文件内容为正常 Unicode 文本。
- `Select-String` 检查 `README.md`、`README.zh-CN.md`、`docs/UNIAPP_H5_REBUILD.md`：未发现 `????`、`锛`、`鐨`、`瀹`、`�`、`鈥` 等常见乱码标记。

### Notes
- Modified files:
  - `README.zh-CN.md`：重写中文说明，恢复正常中文。
  - `README.md`：修复中文说明链接文字。
  - `docs/UNIAPP_H5_REBUILD.md`：清理乱码段落并重写构建/打包说明。
  - `progress.md`：追加本轮修复记录。
- Rollback: 使用 Git 回滚上述文档文件即可。


## 2026-06-30 - Task: Add PC-style account filters and upstream project link
### What was done
- Expanded the account page filters to match the PC categories: search, platform, type, status, privacy, and group.
- Added backend pagination support to the account list and used the backend `total` value for the all-account count.
- Added loaded count, page label, and load-more behavior so mobile users are not limited to the first account page.
- Added the upstream project link `https://github.com/Wei-Shaw/sub2api` to project documentation.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully.
- `npm run build:app`: passed; App build completed successfully and `compilerVersion` was normalized to `5.13`.
- App output check: `app-service.js` includes account filter markers for privacy and group filtering.
- Documentation check: `README.md`, `README.zh-CN.md`, and `docs/UNIAPP_H5_REBUILD.md` include `Wei-Shaw/sub2api`.

### Notes
- Modified files:
  - `src/pages/accounts/index.vue`: added platform, type, status, privacy, and group filters plus total, loaded count, page label, and load-more UI.
  - `src/services/admin.ts`: added account list pagination/filter parameters and group list page-size support.
  - `src/types/admin.ts`: added `AccountListParams` and account privacy fields.
  - `README.md`: added the upstream project link.
  - `README.zh-CN.md`: added the upstream project link.
  - `docs/UNIAPP_H5_REBUILD.md`: added the upstream project link.
  - `progress.md`: restored this progress record.
- Rollback: use Git to revert the files listed above.

## 2026-06-30 - Task: Package account-filter Android APK 2.1.4
### What was done
- Bumped the App version to `2.1.4 / 214` for the account-filter build.
- Rebuilt `dist/build/app` with `npm run build:app` and normalized App Runtime `compilerVersion`.
- Repacked the Android APK from `dist/local-apk/sub2api-mobile-local-guard-groups-2.1.3.apk` by replacing `assets/apps/__UNI__H565806EC/www` with the latest App resources.
- Synced native APK version, internal uni-app manifest version, and `dcloud_control.xml` appver, then aligned and signed the local APK.

### Testing
- `npm run build:app`: passed; App build completed successfully and `compilerVersion` was normalized to `5.13`.
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-filters-2.1.4.apk`: passed.
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-filters-2.1.4.apk`: passed; v1/v2 are both true.
- APK content check: native `versionName: 2.1.4`, `versionCode: 214`; internal uni-app manifest `2.1.4 / 214`; `dcloud_control.xml` appver `2.1.4`; `app-service.js` includes account pagination and filter markers.

### Notes
- Modified files:
  - `src/manifest.json`: bumped App version to `2.1.4 / 214`.
  - `docs/UNIAPP_H5_REBUILD.md`: updated the local APK path and version notes.
  - `progress.md`: restored this APK packaging record.
  - `dist/local-apk/sub2api-mobile-local-filters-2.1.4.apk`: generated the installable local Android APK.
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-filters-2.1.4.apk`.
- Signing: used the HBuilderX bundled `Test.keystore` test certificate for local installation validation; production release must use a production certificate.
- Rollback: use Git to revert `src/manifest.json`, `docs/UNIAPP_H5_REBUILD.md`, and `progress.md`; delete `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-filters-2.1.4.apk`; use `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-guard-groups-2.1.3.apk` if the previous package is needed.

## 2026-06-30 - Task: Fix Android APK Chinese text and package 2.1.5
### What was done
- Fixed static account-page Chinese text that appeared as `??` / `????` after packaging.
- Bumped the App version to `2.1.5 / 215` to distinguish it from the previous garbled-text APK.
- Rebuilt App resources and replaced `assets/apps/__UNI__H565806EC/www` inside the APK with the latest `dist/build/app` resources.
- Realigned and resigned the Android APK as `dist/local-apk/sub2api-mobile-local-filters-cnfix-2.1.5.apk`.

### Testing
- `npm run build:app`: passed; App resource build completed successfully and `compilerVersion` was normalized to `5.13`.
- Source check: `src/pages/accounts/index.vue` no longer contains `??Privacy` or blocks of question-mark UI copy.
- App output check: `dist/build/app/app-service.js` includes account-page Chinese markers and does not contain `??Privacy` / `????`.
- APK content check: final APK `app-service.js` includes the expected text markers and does not contain `??Privacy` / `????`; internal uni-app manifest is `2.1.5 / 215`; `dcloud_control.xml` appver is `2.1.5`.
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-filters-cnfix-2.1.5.apk`: passed.
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-filters-cnfix-2.1.5.apk`: passed; v1/v2 are both true.

### Notes
- Modified files:
  - `src/pages/accounts/index.vue`: restored account-page Chinese UI copy and changed the model picker entry label to the test-model wording.
  - `src/manifest.json`: bumped App version to `2.1.5 / 215`.
  - `docs/UNIAPP_H5_REBUILD.md`: updated the current APK path, version, and local repack/signing steps.
  - `progress.md`: restored this garbled-text fix and APK packaging record.
  - `dist/local-apk/sub2api-mobile-local-filters-cnfix-2.1.5.apk`: generated the installable local Android APK.
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-filters-cnfix-2.1.5.apk`.
- Signing: used the HBuilderX bundled `Test.keystore` test certificate for local installation validation; production release must use a production certificate.
- Rollback: use Git to revert `src/pages/accounts/index.vue`, `src/manifest.json`, `docs/UNIAPP_H5_REBUILD.md`, and `progress.md`; delete `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-filters-cnfix-2.1.5.apk`; use `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-filters-2.1.4.apk` if the previous package is needed.

## 2026-06-30 - Task: Fix account test streaming disconnect message
### What was done
- Added explicit handling for account-test streaming disconnects containing `stream disconnected before completion: stream closed before response.completed`.
- Converted that case to a stable account-test error code/message so the UI asks the operator to retry or switch test model instead of showing the raw transport error.
- Covered SSE `data:` payloads, plain text bodies, JSON error fields, and request-level exceptions for the same disconnect signature.
- Updated the H5/App rebuild notes with the streaming disconnect behavior.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully.
- `npm run build:app`: passed; App build completed successfully and `scripts/fix-app-runtime-version.cjs` normalized App Runtime `compilerVersion` to `5.13`.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.

### Notes
- Modified files:
  - `src/services/admin-fetch.ts`: handles `response.completed` pre-completion streaming disconnects across SSE, text, JSON error, and request exception paths.
  - `src/utils/format.ts`: adds the user-facing account-test streaming disconnect message.
  - `docs/UNIAPP_H5_REBUILD.md`: documents the account-test streaming disconnect behavior.
  - `progress.md`: records this fix, validation, and rollback point.
- Rollback: use Git to revert `src/services/admin-fetch.ts`, `src/utils/format.ts`, `docs/UNIAPP_H5_REBUILD.md`, and this appended `progress.md` entry.


## 2026-06-30 - Task: Package stream-disconnect fix Android APK 2.1.5
### What was done
- Repacked the Android APK after the account-test streaming disconnect fix so the installable package includes the latest App resources.
- Used `dist/local-apk/sub2api-mobile-local-verified-2.1.5.apk` as the native base package and replaced `assets/apps/__UNI__H565806EC/www` with the rebuilt `dist/build/app` resources.
- Aligned and signed the APK with the HBuilderX bundled local test certificate.
- Updated the H5/App rebuild notes to point to the stream-fix APK.

### Testing
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-streamfix-2.1.5.apk`: passed.
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-streamfix-2.1.5.apk`: passed; v1/v2 are both true.
- APK content check: `app-service.js` contains `ACCOUNT_TEST_STREAM_DISCONNECTED` and `response.completed`; internal uni-app manifest is `2.1.5 / 215`; `compilerVersion` is `5.13`; `dcloud_control.xml` appver is `2.1.5`.

### Notes
- Modified files:
  - `docs/UNIAPP_H5_REBUILD.md`: updated the current local APK path to the stream-fix package.
  - `progress.md`: records this APK packaging, validation, and rollback point.
  - `dist/local-apk/sub2api-mobile-local-streamfix-2.1.5.apk`: generated the installable local Android APK containing the stream-disconnect fix.
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-streamfix-2.1.5.apk`.
- Signing: used the HBuilderX bundled `Test.keystore` test certificate for local installation validation; production release must use a production certificate.
- Rollback: revert `docs/UNIAPP_H5_REBUILD.md` and this appended `progress.md` entry, then delete `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-streamfix-2.1.5.apk`.


## 2026-06-30 - Task: Fix account JSON import fallback and add batch grouping
### What was done
- Checked the account JSON import flow and confirmed the upload/import request already exists; the weak point was App-side file selection and reading, not the backend import action.
- Hardened JSON file import on App by avoiding direct `File` access when the App runtime has no browser `File` object, handling `tempFilePaths`, and showing a clear paste-JSON fallback when the system file picker is unavailable.
- Added account batch-selection mode on the account page, including select-current-list, clear selection, target group picker, and batch group assignment.
- Added `bulkUpdateAccounts` service support for `/api/v1/admin/accounts/bulk-update` with selected account IDs and target `group_ids`.
- Updated rebuild documentation with JSON import fallback and batch grouping behavior.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully.
- `npm run build:app`: passed; App build completed successfully and `scripts/fix-app-runtime-version.cjs` normalized App Runtime `compilerVersion` to `5.13`.

### Notes
- Modified files:
  - `src/pages/accounts/index.vue`: fixed App JSON file selection fallback and added batch account selection/group assignment UI.
  - `src/services/admin.ts`: added `bulkUpdateAccounts` for account batch updates.
  - `src/types/admin.ts`: added `AccountBulkUpdateResult` for the batch update response.
  - `docs/UNIAPP_H5_REBUILD.md`: documented JSON import fallback and batch grouping support.
  - `progress.md`: records this fix, validation, and rollback point.
- Rollback: use Git to revert `src/pages/accounts/index.vue`, `src/services/admin.ts`, `src/types/admin.ts`, `docs/UNIAPP_H5_REBUILD.md`, and this appended `progress.md` entry.


## 2026-06-30 - Task: Package Android APK 2.1.6 and prepare push
### What was done
- Bumped the App version to `2.1.6 / 216` for the JSON-import fallback and batch-grouping build.
- Rebuilt H5 and App resources, then repacked the local Android APK with the latest `dist/build/app` resources.
- Used apktool no-source decode/rebuild to preserve the native dex files while updating app resources, native version, internal uni-app manifest, and `dcloud_control.xml` appver.
- Aligned and signed the installable APK with the HBuilderX bundled local test certificate.
- Updated rebuild documentation to point to the `2.1.6` APK.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully.
- `npm run build:app`: passed; App build completed successfully and `scripts/fix-app-runtime-version.cjs` normalized App Runtime `compilerVersion` to `5.13`.
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-batch-import-2.1.6.apk`: passed.
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-batch-import-2.1.6.apk`: passed; v1/v2 are both true.
- APK content check: `app-service.js` contains `bulk-update`, `tempFilePaths`, `group_ids`, and `ACCOUNT_TEST_STREAM_DISCONNECTED`; internal uni-app manifest is `2.1.6 / 216`; `compilerVersion` is `5.13`; `dcloud_control.xml` appver is `2.1.6`; native `apktool.yml` reports `versionCode: 216` and `versionName: 2.1.6`.

### Notes
- Modified files:
  - `src/manifest.json`: bumped App version to `2.1.6 / 216`.
  - `docs/UNIAPP_H5_REBUILD.md`: updated the current APK path, version, and package notes.
  - `progress.md`: records this packaging, validation, and rollback point.
  - `dist/local-apk/sub2api-mobile-local-batch-import-2.1.6.apk`: generated the installable local Android APK.
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-batch-import-2.1.6.apk`.
- Signing: used the HBuilderX bundled `Test.keystore` test certificate for local installation validation; production release must use a production certificate.
- Rollback: revert `src/manifest.json`, `docs/UNIAPP_H5_REBUILD.md`, and this appended `progress.md` entry, then delete `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-batch-import-2.1.6.apk`.


## 2026-06-30 - Task: Add mobile announcement management and package Android APK 2.1.7
### What was done
- Added a mobile announcement management entry under the server/settings page instead of adding another bottom tab, keeping navigation lightweight.
- Implemented announcement list, search, status filter, create/edit form, delete action, status selection, silent/popup notification mode, optional start/end time, and PC-compatible targeting conditions.
- Added typed admin service calls for `/api/v1/admin/announcements` CRUD and bumped the App version to `2.1.7 / 217`.
- Rebuilt H5/App resources and repacked the local Android APK with the announcement pages.
- Updated docs and README to document the new announcement capability and current APK output.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully.
- `npm run build:app`: passed; App build completed successfully and `scripts/fix-app-runtime-version.cjs` normalized App Runtime `compilerVersion` to `5.13`.
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-announcements-2.1.7.apk`: passed.
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-announcements-2.1.7.apk`: passed; v1/v2 are both true.
- APK content check: internal uni-app manifest is `2.1.7 / 217`; `compilerVersion` is `5.13`; `dcloud_control.xml` appver is `2.1.7`; native `apktool.yml` reports `versionCode: 217` and `versionName: 2.1.7`; `app-service.js` contains `/api/v1/admin/announcements`, `pages/announcements/index`, `notify_mode`, and `targeting`.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.

### Notes
- Modified files:
  - `src/pages/announcements/index.vue`: added the mobile announcement list, filters, refresh, edit navigation, and delete flow.
  - `src/pages/announcements/edit.vue`: added the PC-compatible announcement create/edit form with status, notify mode, time window, and targeting conditions.
  - `src/pages/settings/index.vue`: added the announcement management entry under server management tools.
  - `src/pages.json`: registered the announcement list and edit routes.
  - `src/services/admin.ts`: added announcement CRUD calls for `/api/v1/admin/announcements`.
  - `src/types/admin.ts`: added announcement, targeting, and request types.
  - `src/manifest.json`: bumped App version to `2.1.7 / 217`.
  - `README.zh-CN.md`: documented the announcement management feature.
  - `docs/UNIAPP_H5_REBUILD.md`: documented announcement behavior and the current APK package.
  - `progress.md`: records this implementation, validation, and rollback point.
  - `dist/local-apk/sub2api-mobile-local-announcements-2.1.7.apk`: generated the installable local Android APK.
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-announcements-2.1.7.apk`.
- Signing: used the HBuilderX bundled `Test.keystore` test certificate for local installation validation; production release must use a production certificate.
- Rollback: revert the listed source/docs files and this appended `progress.md` entry, then delete `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-announcements-2.1.7.apk`.

## 2026-07-01 - Task: Use uni-file-picker for account JSON import
### What was done
- Replaced the H5 raw JSON file input in the account import sheet with `uni-file-picker` configured for local JSON selection and `auto-upload=false`.
- Kept the existing App system file picker button as a fallback, and preserved pasted JSON import for runtimes that cannot open or read local files.
- Added the required `@dcloudio/uni-ui` dependency and `sass` build dependency for compiling the uni-ui file picker component styles.
- Updated rebuild documentation with the new import picker behavior and dependency note.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully with the uni-file-picker component included.
- `npm run build:app`: passed; App build completed successfully and `scripts/fix-app-runtime-version.cjs` normalized App Runtime `compilerVersion` to `5.13`.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.
- Build output content check: `dist/build/h5` and `dist/build/app` contain the new `uni-file-picker` import flow and JSON picker copy.

### Notes
- Modified files:
  - `src/pages/accounts/index.vue`: replaced the import file-selection UI with `uni-file-picker`, added picker select/fail handlers, and retained the App system picker fallback.
  - `package.json`: added `@dcloudio/uni-ui` and `sass`.
  - `package-lock.json`: locked the new dependencies.
  - `docs/UNIAPP_H5_REBUILD.md`: documented the picker behavior and dependency requirement.
  - `progress.md`: records this implementation, validation, and rollback point.
- Rollback: use Git to revert `src/pages/accounts/index.vue`, `package.json`, `package-lock.json`, `docs/UNIAPP_H5_REBUILD.md`, and this appended `progress.md` entry.

## 2026-07-01 - Task: Package Android APK 2.1.8 and push uni-file-picker import
### What was done
- Bumped the App version to `2.1.8 / 218` for the uni-file-picker JSON import build.
- Rebuilt H5 and App resources, then repacked the local Android APK with the latest `dist/build/app` resources.
- Used the 2.1.7 no-source Android base package, replaced `assets/apps/__UNI__H565806EC/www`, updated native version metadata, internal uni-app manifest, and `dcloud_control.xml` appver to `2.1.8`.
- Aligned and signed the installable APK with the HBuilderX bundled local test certificate.
- Updated rebuild documentation to point to the `2.1.8` APK.

### Testing
- `npm run build:h5`: passed; H5 build completed successfully.
- `npm run build:app`: passed; App build completed successfully and `scripts/fix-app-runtime-version.cjs` normalized App Runtime `compilerVersion` to `5.13`.
- `zipalign -c -p 4 dist/local-apk/sub2api-mobile-local-file-picker-2.1.8.apk`: passed.
- `apksigner verify --verbose dist/local-apk/sub2api-mobile-local-file-picker-2.1.8.apk`: passed; v1/v2 are both true.
- APK content check: internal uni-app manifest is `2.1.8 / 218`; `compilerVersion` is `5.13`; `dcloud_control.xml` appver is `2.1.8`; native `apktool.yml` reports `versionCode: 218` and `versionName: 2.1.8`; account import resources contain `uni-file-picker`, `chooseAndUploadFile`, and the JSON import fallback copy.
- `git diff --check`: passed; only existing Windows line-ending warnings were reported.

### Notes
- Modified files:
  - `src/pages/accounts/index.vue`: uses `uni-file-picker` for JSON file selection while retaining the App fallback picker and pasted JSON fallback.
  - `package.json`: added `@dcloudio/uni-ui` and `sass` for the picker component.
  - `package-lock.json`: locked the new dependencies.
  - `src/manifest.json`: bumped App version to `2.1.8 / 218`.
  - `docs/UNIAPP_H5_REBUILD.md`: documented the uni-file-picker import behavior and current APK package.
  - `progress.md`: records this packaging, validation, and rollback point.
  - `dist/local-apk/sub2api-mobile-local-file-picker-2.1.8.apk`: generated the installable local Android APK.
- Build output: `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-file-picker-2.1.8.apk`.
- Signing: used the HBuilderX bundled `Test.keystore` test certificate for local installation validation; production release must use a production certificate.
- Rollback: revert the listed source/docs files and this appended `progress.md` entry, then delete `D:\project\sub2api-mobile\dist\local-apk\sub2api-mobile-local-file-picker-2.1.8.apk`.
