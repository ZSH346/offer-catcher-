/**
 * Offer捕手 · Render.com 部署版后端
 * 双阶段 AI Agent：智能寻岗 + 深度诊断
 * 
 * 部署到 Render.com 后，前端通过 https://xxx.onrender.com 调用
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 加载 .env 文件
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

const PORT = process.env.PORT || 3000;  // Render 会自动设置 PORT
const API_KEY = process.env.API_KEY || 'sk-628d78a2403d47d3936b427322622957';
const API_BASE_URL = (process.env.API_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
const MODEL_NAME = process.env.MODEL_NAME || 'deepseek-chat';

// System Prompt - 智能寻岗
const DISCOVER_PROMPT = `# 角色
你是拥有10年经验的资深AI猎头与简历诊断专家，擅长"精准寻岗"与"简历升维"。

# 任务
根据用户的【专业/背景】和【求职意向】，推荐3个与该背景最匹配的岗位。

# 输出格式
请严格按以下格式输出3个推荐岗位：

### 推荐岗位 1
- 🏢 **公司 | 岗位**：[知名公司 | 具体岗位名称]
- 💡 **核心门槛**：[一句话总结核心要求]
- 📍 **工作地点**：[城市]
- 🔗 **搜索链接**：https://www.zhipin.com/web/geek/job?query=关键词

### 推荐岗位 2
- 🏢 **公司 | 岗位**：[知名公司 | 具体岗位名称]
- 💡 **核心门槛**：[一句话总结核心要求]
- 📍 **工作地点**：[城市]
- 🔗 **搜索链接**：https://www.zhipin.com/web/geek/job?query=关键词

### 推荐岗位 3
- 🏢 **公司 | 岗位**：[知名公司 | 具体岗位名称]
- 💡 **核心门槛**：[一句话总结核心要求]
- 📍 **工作地点**：[城市]
- 🔗 **搜索链接**：https://www.zhipin.com/web/geek/job?query=关键词

# 约束
- 公司必须是真实存在的知名企业
- 岗位符合2025-2026年校招/实习市场
- 搜索链接格式：https://www.zhipin.com/web/geek/job?query=关键词`;

// System Prompt - 深度诊断
const ASSESS_PROMPT = `# 角色
你是拥有10年经验的资深AI猎头与简历诊断专家，擅长"精准寻岗"与"简历升维"。

# 任务
根据用户提供的【简历】和【目标岗位JD】，使用「全维度人才评估模型」进行深度的人岗匹配与潜力测评。

# 评分维度（总分100）
| 维度 | 分值 | 评估要点 |
|------|------|---------|
| 经历契合度 | 30分 | 硬性技能、行业经验与JD要求的直接匹配 |
| 人格特质匹配 | 30分 | 性格底色与岗位隐性要求的契合 |
| 潜力与学习力 | 20分 | 成长轨迹、迁移能力、解决未知问题的能力 |
| 文化价值观 | 20分 | 工作风格与JD隐藏文化的契合 |

# 输出格式
# 🎯 Offer捕手·全维度诊断报告
## 📊 匹配度评分 (总分100)
- **经历契合度**：XX/30
- **人格特质**：XX/30
- **潜力与学习力**：XX/20
- **文化价值观**：XX/20

## 🧠 核心差距 (Gap)
- [一针见血指出JD强要求但简历缺失的致命点]

## 🔧 简历升维话术
- ❌ **原描述**：[摘录]
- ✅ **升维话术**：[STAR法则重写，含专业术语和量化数据]

## 📌 面试避坑指南
- ⚠️ [预判面试官质疑点，提供应对话术]

# 约束
- 保持客观、犀利，拒绝老好人式夸奖
- JD强要求技能缺失则该维度扣除30分
- 使用清晰Markdown排版`;

// 调用大模型 API
function callLLM(messages, onChunk) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL_NAME,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const url = new URL(`${API_BASE_URL}/chat/completions`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          reject(new Error(`API返回${res.statusCode}: ${errorData.slice(0, 200)}`));
        });
        return;
      }

      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]' || data === '') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content && onChunk) onChunk(content);
          } catch {}
        }
      });

      res.on('end', () => resolve());
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('JSON格式错误')); }
    });
    req.on('error', reject);
  });
}

// 发送 SSE 响应
function sendSSE(res, generator) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  generator((content) => {
    res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
  }).then(() => {
    res.write('data: [DONE]\n\n');
    res.end();
  }).catch((err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
    res.end();
  });
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const urlPath = req.url.split('?')[0];

  // 健康检查
  if (urlPath === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '4.0',
      model: MODEL_NAME,
      apiConfigured: !!API_KEY,
    }));
    return;
  }

  // 阶段一：智能寻岗
  if (urlPath === '/api/discover' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { background, intent } = body;
      if (!background?.trim() && !intent?.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '请填写专业背景和求职意向' }));
        return;
      }

      const messages = [
        { role: 'system', content: DISCOVER_PROMPT },
        { role: 'user', content: `【专业/背景】${background}\n【求职意向】${intent}` },
      ];

      sendSSE(res, (onChunk) => callLLM(messages, onChunk));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 阶段二：深度诊断
  if (urlPath === '/api/assess' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { resume, jd, personalityAnswer } = body;
      
      if (!resume?.trim() || !jd?.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '简历和JD不能为空' }));
        return;
      }

      const messages = [
        { role: 'system', content: ASSESS_PROMPT },
        { role: 'user', content: `【简历】${resume}\n【JD】${jd}\n【偏好】${personalityAnswer || '未提供'}` },
      ];

      sendSSE(res, (onChunk) => callLLM(messages, onChunk));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`✅ Offer捕手后端启动成功！`);
  console.log(`   端口：${PORT}`);
  console.log(`   健康检查：http://localhost:${PORT}/api/health`);
  console.log(`   API配置：${API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
});
