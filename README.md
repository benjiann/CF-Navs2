# CF-Navs

> 🚀 一个运行在 Cloudflare Workers 上的轻量个人导航面板——前台展示常用站点，后台管理分类、书签、主题、搜索引擎和数据备份。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)
![Svelte](https://img.shields.io/badge/Svelte-4-ff3e00.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)

[特性](#-核心特性) • [快速部署](#-快速部署) • [本地开发](#-本地开发) • [环境变量说明](#-环境变量说明) • [贡献](#-贡献) • [致谢](#-致谢)

---

## 🖼️ 效果预览

**桌面端 · 亮色 & 暗色**

![桌面端亮色](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-light.jpg)
![桌面端暗色](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-dark.jpg)

**分类视图 & 小卡片样式**

![分类视图](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-tag.jpg)
![小卡片样式](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-bookmark-small.jpg)

**移动端 · 亮色 & 暗色**

![移动端亮色](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-light-mobile.jpg)
![移动端暗色](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-dark-mobile.jpg)

**书签编辑 & 加载性能**

![书签编辑弹窗](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-bookmarkedit.jpg)
![加载性能](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-loadtime.jpg)

**后台管理 · 分类 & 书签**

![后台分类管理](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-admin-tag.jpg)
![后台书签管理](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-admin-bookmark.jpg)

**后台 · 设置 & 备份**

![后台设置](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-admin-setting.jpg)
![后台备份](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-admin-backup.jpg)

**首次加载过渡动画**

![加载动画](https://raw.githubusercontent.com/lbjxr/CF-Navs/main/docs/screenshots/cf-navs-loading.jpg)

> 💡 支持亮色/暗色/跟随系统三种主题模式，桌面端和移动端自适应。

---

## ✨ 核心特性

| 特性 | 说明 |
|---|---|
| ☁️ **轻量部署** | 全栈运行在 Cloudflare Workers + D1 + KV，无需自建服务器 |
| 🧭 **清爽首页** | 分类分区、响应式布局、玻璃质感分类快速选择栏；详情/极简两种卡片样式 |
| 🛠️ **顺手管理** | 分类和书签支持新增、编辑、删除、搜索、分页和拖拽排序 |
| 🎨 **图标省心** | 支持 favicon、文字图标、Iconify、自定义图片 URL、文字或表情；首页优先使用聚合数据和浏览器本地缓存展示图标 |
| 🌓 **主题完整** | 亮色、暗色、跟随系统；内置渐变方案保存选中状态，背景、遮罩、卡片尺寸和图标大小都可配置 |
| 🔎 **搜索实用** | 首页输入直接筛选本地书签（匹配标题、描述、URL 和分类），也可切换外部搜索引擎 |
| 💾 **数据可控** | 支持 JSON 导出、导入、恢复；兼容 Sun-Panel 数据迁移 |
| 🔐 **安全可靠** | 密码 PBKDF2 哈希存储、HttpOnly Session Cookie、CSRF 防护；登录失败限流、默认 7 天会话有效期 |
| 📱 **PWA 支持** | 生产构建提供基础 PWA app shell，Service Worker 离线回退 |
| ⚡ **性能优化** | 边缘缓存、图标懒加载、代码分割、聚合数据批量读取、浏览器本地快照增量更新 |

---

## 🚀 快速部署

### 方式一：Wrangler CLI 部署（推荐）

**前置要求**：Node.js 18+、npm、Cloudflare 账号

```bash
# 1. 克隆并安装依赖
git clone https://github.com/lbjxr/CF-Navs.git
cd CF-Navs
npm install

# 2. 登录 Cloudflare
npx wrangler login

# 3. 创建 D1 数据库
npx wrangler d1 create cf-navs-db

# 4. 创建 KV 命名空间
npx wrangler kv namespace create SESSION

# 5. 生成本地 Wrangler 配置（保存真实资源 ID，已加入 .gitignore）
npm run setup:wrangler

# 6. 设置管理员密码
npx wrangler secret put INIT_ADMIN_PASSWORD

# 7. 初始化数据库并部署
npm run db:init:remote
npm run deploy
```

部署成功后，访问 Wrangler 返回的 Workers URL。首次登录用户名 `admin`，密码为 `INIT_ADMIN_PASSWORD`。

### 方式二：Cloudflare 控制台在线部署

适合不想在本地运行 CLI、直接从 GitHub Fork 在线部署的用户。

1. Fork 本仓库到你的 GitHub 账号。
2. 进入 Cloudflare 控制台 **Workers & Pages → Create application → Import a repository**，关联 GitHub 并选择你的 fork。
3. 项目名建议使用 `cf-navs`，Deploy command 填写 `npm run build && npx wrangler deploy`。
4. 保存并完成首次部署。（此时尚未绑定数据库，页面不可用是正常的）
5. 在 Cloudflare 控制台创建 D1 数据库 `cf-navs-db`，打开 SQL Console，执行 [schema.sql](schema.sql)。
6. 创建 KV 命名空间 `SESSION`。
7. 在 Worker 的 **Settings → Bindings** 中添加绑定：

| 类型 | 绑定名 | 选择 |
|---|---|---|
| D1 database | `DB` | `cf-navs-db` |
| KV namespace | `SESSION` | 你的会话 KV 命名空间 |

8. 在 Worker 的 **Settings → Variables & Secrets** 中添加 Secret：

```text
INIT_ADMIN_PASSWORD = 你的管理员密码
```

9. 重新部署或重试最近一次部署，然后访问 Workers URL。

> ⚠️ 绑定名必须为 `DB` 和 `SESSION`。控制台中 Worker 名称需与 `wrangler.toml` 的 `name` 一致（默认 `cf-navs`）。

---

## 🧪 本地开发

> 首次使用请先 `npm install`。本地开发依赖 `wrangler.toml` 公开模板配置；真实资源 ID 通过 `npm run setup:wrangler` 写入 Git 忽略的 `wrangler.local.toml`。

```bash
# 终端 1：启动 Worker 开发服务
npm run dev

# 终端 2：启动前端开发服务器
npm run dev:web
```

访问 `http://localhost:5173`。验证完成后在对应终端按 `Ctrl+C` 停止服务。

```bash
npm run type-check      # TypeScript 与 Svelte 类型检查
npm test                # Vitest 单元测试
npm run build           # 生产构建
npm run db:init         # 初始化本地 D1
npx wrangler tail       # 查看 Worker 日志
```

---

## 🔑 环境变量说明

### Secrets（通过 `wrangler secret put` 设置）

| 变量名 | 说明 |
|---|---|
| `INIT_ADMIN_PASSWORD` | 管理员初始密码，仅首次初始化时写入 D1；之后在后台「站点设置 → 账号安全」修改 |

### 必需绑定

| 绑定名 | 类型 | 说明 |
|---|---|---|
| `DB` | D1 database | 数据库，存储分类、书签、设置 |
| `SESSION` | KV namespace | 会话存储，保存登录 Token |

### 可选变量（`wrangler.toml` vars 或 Dashboard Variables）

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `INIT_ADMIN_USER` | `admin` | 初始管理员用户名 |
| `SESSION_TTL` | `604800` | 会话有效期（秒），默认 7 天 |

---

## 🌟 贡献

欢迎通过 Issue 或 Pull Request 为本项目贡献代码。

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

---

## 🙏 致谢

本项目参考了 [Sun-Panel](https://github.com/hslr-s/sun-panel) 的设计思路，部分图标获取逻辑受 [iori-nav](https://github.com/jy02739244/iori-nav) 启发。

---

## ⭐ Star 趋势

<a href="https://star-history.com/#lbjxr/CF-Navs&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=lbjxr/CF-Navs&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=lbjxr/CF-Navs&type=Date&theme=default" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=lbjxr/CF-Navs&type=Date&theme=default" />
 </picture>
</a>

---

## 📄 许可证

[MIT](LICENSE)