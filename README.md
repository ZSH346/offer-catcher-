# Offer捕手 · 双阶段 AI Agent

> 🎯 智能寻岗 + 深度诊断与简历升维

## 功能特色

### 🔍 阶段一：智能寻岗
- 根据专业背景和求职意向，AI 自动推荐 3 个高匹配岗位
- 包含公司、岗位、核心门槛、工作地点、搜索链接

### 🎯 阶段二：深度诊断
- 全维度人才评估模型（总分 100）
  - 经历契合度（30分）
  - 人格特质匹配（30分）
  - 潜力与学习力（20分）
  - 文化价值观（20分）
- 简历升维话术（STAR 法则重写）
- 面试避坑指南

## 本地开发

```bash
# 1. 安装依赖（如果需要）
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key

# 3. 启动服务器
node server.js

# 4. 访问
# 打开 http://localhost:3000
```

## 部署到 Render.com

### 第一步：上传到 GitHub

1. 在 GitHub 创建新仓库（如 `offer-catcher`）
2. 上传以下文件到仓库：
   - `server.js`
   - `package.json`
   - `.gitignore`
   - `public/` 文件夹（包含 `index.html`）

### 第二步：在 Render.com 部署

1. 登录 [render.com](https://render.com)
2. 点击 **"New +"** → **"Web Service"**
3. 连接你的 GitHub 仓库
4. 配置：
   - **Name**: `offer-catcher`（或你喜欢的名字）
   - **Environment**: `Node`
   - **Build Command**: `npm install`（可留空，因为无依赖）
   - **Start Command**: `node server.js`
   - **Plan**: Free（免费）
5. 展开 **"Advanced"** → **"Add Environment Variable"**：
   - Key: `API_KEY`，Value: `sk-你的DeepSeekKey`
   - Key: `API_BASE_URL`，Value: `https://api.deepseek.com/v1`
   - Key: `MODEL_NAME`，Value: `deepseek-chat`
   - Key: `PORT`，Value: `10000`（Render 会自动覆盖）
6. 点击 **"Create Web Service"**
7. 等待部署完成（约 2-3 分钟）
8. 获得永久网址：`https://offer-catcher.onrender.com`

### 第三步：更新前端 API 地址

部署成功后，需要让前端知道后端地址：

**方法 A：每次访问时手动配置**
- 打开网站 → 点击右上角 ⚙️
- 填入后端地址：`https://你的APP名.onrender.com`
- 点击保存

**方法 B：自动检测（推荐）**
- 前端代码已支持同域部署，如果前后端在同一个 Render 服务中，无需配置

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | `3000`（Render 会自动设置） |
| `API_KEY` | DeepSeek API Key | - |
| `API_BASE_URL` | DeepSeek API 地址 | `https://api.deepseek.com/v1` |
| `MODEL_NAME` | 模型名称 | `deepseek-chat` |

## 技术栈

- **前端**: 原生 HTML/CSS/JS + Marked.js
- **后端**: Node.js (原生 http/https)
- **AI 模型**: DeepSeek Chat
- **部署**: Render.com (PaaS)

## 注意事项

⚠️ **免费版 Render.com 限制**：
- 15 分钟无访问后自动休眠
- 下次访问需要等待 30-60 秒唤醒
- 每月 750 小时免费额度（足够个人使用）

💡 **建议**：
- 首次访问可能较慢（唤醒中），请耐心等待
- 如需更快响应，可升级到付费计划（$7/月）

## 许可证

MIT License
