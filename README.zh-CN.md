# Sub2API Mobile Admin

[English](README.md) | [中文](README.zh-CN.md)

Sub2API Mobile Admin 是基于 uni-app CLI + Vue 3 重建的 Sub2API 移动端管理台。项目保留原有管理流程，同时支持 H5 和 App 构建，并提供蓝白玻璃拟态风格的移动端运维看板。
<img width="670" height="936" alt="1782579122104 jpg" src="https://github.com/user-attachments/assets/b470b97d-e20f-4622-b1f6-3a987a738446" />
<img width="1200" height="2670" alt="Screenshot_2026-06-29-18-20-42-216_io H565806EC" src="https://github.com/user-attachments/assets/7b5ab644-635b-461b-a1e9-8992083f2be0" />
<img width="1200" height="2670" alt="Screenshot_2026-06-29-18-20-34-532_io H565806EC" src="https://github.com/user-attachments/assets/90fed202-d018-45b2-8d41-1f27c65415f6" />
<img width="1200" height="2670" alt="Screenshot_2026-06-29-18-20-52-477_io H565806EC" src="https://github.com/user-attachments/assets/26285be3-e3dc-4e97-9f45-8e2e73679947" />
<img width="1200" height="2670" alt="Screenshot_2026-06-29-18-20-48-605_io H565806EC" src="https://github.com/user-attachments/assets/a9c1fc94-b452-4970-bec8-89ba5da73d42" />
<img width="1200" height="2670" alt="Screenshot_2026-06-29-18-20-45-839_io H565806EC" src="https://github.com/user-attachments/assets/7a078f6f-858e-43d8-8f45-b8ae0b2ba150" />

## 功能特性

- 管理端服务器登录，支持保存和切换多个服务器配置。
- 概览看板包含健康分、实时吞吐、SLA、请求错误、成本、账号健康、模型排行和趋势图。
- 使用 uCharts / qiun-data-charts 提供 H5 和 App 可用的数据可视化。
- 用户列表、分页加载、用户详情、API Key 复制、余额操作和状态切换。
- 账号列表、吸顶筛选、用量排序、测试模型选择、账号测试、暂停和恢复。
- 账号创建和用户创建表单，保留当前 Sub2API 管理字段。
- 分组列表支持吸顶搜索，并展示订阅类型、倍率、配额和创建时间。
- 服务器设置页支持新增、验证、切换和删除管理端地址。
- 主要 Tab 页面支持下拉刷新和显式刷新按钮。

## 当前 UI 方向

当前界面采用蓝白玻璃拟态移动端看板风格：

- 柔和蓝白渐变背景；
- 大圆角玻璃卡片、半透明填充、青蓝描边和内高光；
- 时间范围、筛选和操作使用胶囊控件；
- 主操作按钮采用亮蓝色和轻量 Neo 阴影；
- H5/App 统一的半透明浮动 TabBar。

## 技术栈

- uni-app CLI
- Vue 3
- TypeScript
- Vite
- @qiun/uni-ucharts / qiun-data-charts
- Express 本地代理，用于可选的 H5 跨域开发代理

## 环境要求

- Node.js 20+
- npm 10+
- 如需手动打开或打包 App 项目，需要 HBuilderX

## 安装依赖

```bash
npm ci
```

## 运行 H5

```bash
npm run dev:h5
```

默认本地地址：

```text
http://localhost:5173/
```

如果 5173 端口被占用，uni-app 开发服务器可能会自动选择下一个可用端口。

## 构建

构建 H5：

```bash
npm run build:h5
```

H5 输出目录：

```text
dist/build/h5
```

构建 App 资源：

```bash
npm run build:app
```

App 输出目录：

```text
dist/build/app
```

App 构建会在原始 uni-app 构建后执行 `scripts/fix-app-runtime-version.cjs`，用于修正当前打包流程依赖的 Runtime 编译器版本标记。

## 可选 H5 代理

应用默认直接请求配置的 Sub2API 管理端地址，并通过 `x-api-key` 发送 Admin Key。

如果本地开发遇到 CORS 限制，可以启动代理：

```bash
npm run proxy
```

也可以同时启动代理和 H5：

```bash
npm run dev:h5-proxy
```

然后在应用中将服务器地址配置为代理地址，例如：

```text
http://127.0.0.1:8787
```

## 项目结构

```txt
src/App.vue                         uni-app 入口
src/main.ts                         Vue 启动入口
src/pages.json                      页面和 tabBar 配置
src/manifest.json                   uni-app manifest
src/pages/                          移动端页面
src/components/uni/                 共享 UI 组件
src/components/qiun-data-charts/    H5/App 图表组件
src/components/u-charts/            图表运行时
src/services/                       Sub2API 管理端请求层
src/store/                          管理端服务器配置和会话状态
src/static/tabbar/                  本地 TabBar 图标
src/styles.css                      共享玻璃拟态主题
server/                             可选本地 Express 代理
docs/                               实现和运维文档
```

## 安全说明

- 不要提交真实 Admin Key 或私有 Token。
- H5 会在本地保存服务器配置元数据，Admin Key 只应在可信设备上使用。
- 生产环境建议使用 HTTPS 管理端地址。

## 相关文档

- [English README](README.md)
- [uni-app H5 重建说明](docs/UNIAPP_H5_REBUILD.md)
- [本地代理配置](docs/LOCAL_PROXY_SETUP.md)
- [安全策略](SECURITY.md)

## 许可证

本项目使用 MIT License，详见 [LICENSE](LICENSE)。
