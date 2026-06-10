# AI Hub · 个人 AI 资源导航

一个**单文件就能跑**的纯静态 AI 资源导航网站。聚合了：

- 🤖 **AI 大模型**：ChatGPT、Claude、Gemini、DeepSeek、通义千问、Kimi、智谱、豆包……
- 🔌 **MCP Servers**：Playwright、Filesystem、GitHub、Fetch、PostgreSQL、Notion……
- ⚡ **Skills**：Claude Code 模板、Superpowers、Continue、Cline、Aider……
- 🧩 **插件 / 扩展**：GitHub Copilot、Cursor、Monica、Merlin、Sider、Tabnine……

每张卡片可直接**点击打开官网**，**"安装方法 →"** 按钮弹出详细安装步骤，一键复制。

## 文件结构

```
ai_hub/
├── index.html        # 入口
├── css/
│   └── styles.css    # 深色现代风样式
├── js/
│   ├── data.js       # 全部资源数据（增删改都在这）
│   └── app.js        # 交互逻辑（搜索、Tab、弹窗）
└── README.md
```

## 本地运行

任选其一：

```bash
# 方式 1：直接双击 index.html
# 方式 2：起一个本地 server（推荐，避免某些浏览器 file:// 限制）
cd ai_hub
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 功能

- 🌌 深色现代风 + 渐变玻璃质感
- 🔍 顶部搜索框：实时按名称 / 描述 / 标签筛选
- 🏷️ 点击卡片上的标签 → 进一步筛选
- 📊 自动按 **下载量 / 热度** 排名，TOP 3 镀金银铜
- 📋 安装说明弹窗，**一键复制**
- ⌨️ `Esc` 关闭弹窗
- 📱 响应式：手机 / 平板 / 桌面自适应

## 自定义数据

所有数据都在 `js/data.js` 的 `window.AI_HUB_DATA` 对象里，按四大分类组织：

```js
window.AI_HUB_DATA = {
  categories: { models: {...}, mcp: {...}, skills: {...}, plugins: {...} },
  models:   [ { name, nameEn, desc, url, icon, color, tags, downloads, install }, ... ],
  mcp:      [ ... ],
  skills:   [ ... ],
  plugins:  [ ... ],
}
```

新增一项只要 push 一个对象即可。字段说明：

| 字段         | 必填 | 说明                                       |
| ------------ | ---- | ------------------------------------------ |
| `name`       | ✅   | 显示主名（中文）                           |
| `nameEn`     | ✅   | 英文 / 包名                                |
| `desc`       | ✅   | 一句话描述                                 |
| `url`        | ✅   | 官网 / GitHub 链接                         |
| `icon`       |      | emoji 图标                                 |
| `color`      |      | 主题色（用于卡片高亮）                     |
| `tags`       |      | 标签数组（用于筛选）                       |
| `downloads`  |      | 数字，用于排序（MCP / 插件）               |
| `hot`        |      | 数字 0-100，用于排序（AI 大模型）          |
| `install`    |      | 安装说明（支持多行）                       |

## 数据来源说明

- 排序与下载量基于 **GitHub stars、npm/PyPI 下载量、官网热度** 等公开榜单
- 数字为**近似值**，仅用于排序展示，不代表权威数据
- 如需精确数字，可接入 `https://api.npmjs.org/downloads/point/last-week/<pkg>` 之类的 API，在 `app.js` 的 `getList` 中改写排序逻辑

## 后续可扩展

- [ ] 接 npm registry API 实时拉取 MCP 下载量
- [ ] 接 Hugging Face API 拉取大模型数据
- [ ] 用户本地收藏（localStorage）
- [ ] PWA 离线可用
