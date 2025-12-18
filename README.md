# LLM API-KEY 检测工具

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/nekohy/llm-api-key-checker)

LLM API KEY 检测工具 是一个基于 Cloudflare Workers 的 Web 工具，用于批量检测各种 AI API 提供商（如 OpenAI、Anthropic、Google Gemini 等）的 API Key 是否有效。它支持余额查询、模型列表获取，并提供现代化的 UI 界面，帮助用户快速验证和分类 Key。

此工具适合 AI 开发者、批量管理 API 资源的用户。

## 最近更新
- 2025.08.16 version 1.0.2 修复 429 判断错误、修复 openrouter 渠道 gpt-5 模型检验错误
- 2025.08.13 version 1.0.1 新增 DeepSeek 渠道余额币种显示，**请注意，阈值判断仍然使用数值进行阈值比较，没有考虑币种转换**

## 作用

- **批量检测 API Key**：输入多个 Key，支持自动去重、有效性验证和分类（有效、低额、零额、限流、无效、重复）。
- **余额查询**：对于支持的提供商，显示可用余额，并可查看总额/已用详情（例如 OpenRouter）。
- **模型列表获取**：从提供商 API 获取可用模型列表，支持选择并复制。
- **代理请求**：通过 Cloudflare 代理，避免浏览器 CORS 限制，支持自定义 Base URL。

## 特点

- **多提供商支持**：内置 OpenAI、Anthropic、Google Gemini、X AI、OpenRouter、Groq、GitHub Models、SiliconFlow、DeepSeek、Moonshot、Aliyun、Zhipu 等 12 个提供商。
- **并发优化**：支持自定义并发数（默认 5），加速批量检测。
- **美观 UI**：响应式设计、可搜索下拉选择、折叠配置面板、Toast 通知。
- **扩展性**：配置驱动架构，轻松添加新提供商。
- **单文件部署**：整个应用封装在 `worker.js` 中，一键部署到 Cloudflare Workers。
- **安全**：所有请求通过 Worker 代理，不泄露 Key 到客户端。
- **免费**：基于 Cloudflare 免费计划运行。
- **兼容性**：兼容 OpenAI 格式的其他 LLM 提供商，手动修改 OpenAI Base URL 即可快速测试。

## 部署方法

1. **创建 Cloudflare Worker**：
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
   - 转到 "Workers" 部分，点击 "Create a Worker"。

2. **复制代码**：
   - 将 `worker.js` 代码粘贴到 Worker 编辑器中。

3. **保存并部署**：
   - 点击 "Save and Deploy"。

4. **访问工具**：
   - 使用分配的 Worker URL（如 `https://your-worker.your-username.workers.dev`）在浏览器打开。
   - 建议绑定自定义域名。

## 使用方法

1. **选择 API 提供商**：
   - 使用下拉菜单选择提供商。

2. **配置 Base URL 和测试模型**：
   - 修改 Base URL（默认提供官方或 api-proxy.me 公共代理地址。**强烈建议自己搭建代理服务**）。
   - 输入或从"获取"按钮选择测试模型。

3. **输入 API Keys**：
   - 在文本框输入多个 Key（逗号、分号或换行分隔）。
   - 支持拖拽 .txt 文件或通过"导入文件"按钮上传。

4. **高级配置**（可选）：
   - 点击"⚙️ 高级配置"展开，设置最低余额阈值和并发数。

5. **开始检测**：
   - 点击"开始检测KEY"，查看进度条。
   - 结果显示在右侧 Tab 中，支持搜索、排序和复制。

6. **获取模型**：
   - 配置区点击"获取"从第一个 Key 获取模型列表。
   - 结果区有效 Key 旁点击 🎛 查看该 Key 可用模型。

## 如何添加更多 API 提供商

项目采用配置驱动设计 foss, 便于扩展。新提供商只需 3 步添加，无需修改 UI 代码。

### 步骤
1. **在 PROVIDERS 对象添加条目**（在 <script> 标签的开始位置）：
   - 格式：
     ```javascript
     newprovider: {
       label: 'New Provider',  // 显示名称
       icon: '🚀',             // Emoji 图标
       hasBalance: true/false, // 是否支持余额查询
       defaultBase: 'https://api.newprovider.com/v1', // 默认 Base URL
       defaultModel: 'default-model',                 // 默认测试模型
       checkFunction: 'checkNewProviderToken',         // 检测函数名
       fetchModels: 'fetchNewProviderModels'           // 模型获取函数名
     }
     ```
   - 添加后，下拉菜单会自动显示新提供商。

2. **实现检测函数**（在 KEY 检测函数区域添加）：
   - 格式：
     ```javascript
     async function checkNewProviderToken(token) {
       try {
         const baseUrl = document.getElementById(`${currentProvider}__base`).value.trim() || PROVIDERS.newprovider.defaultBase;
         const model = document.getElementById(`${currentProvider}__model`).value.trim() || PROVIDERS.newprovider.defaultModel;
         // API 调用逻辑
         const response = await proxiedFetch(/* URL */, { /* options */ });
         if (!response.ok) {
           const { message, rawError } = await handleApiError(response);
           return { token, isValid: false, message, rawError, error: true };
         }
         // 如有余额
         const data = await response.json();
         const balance = /* parse balance */;
         return { token, isValid: true, balance };
       } catch (error) {
         return { token, isValid: false, message: "网络错误", rawError: error.message, error: true };
       }
     }
     ```
   - 暴露全局：`window.checkNewProviderToken = checkNewProviderToken;`

3. **实现模型获取函数**（在通用模型获取函数区域添加）：
   - 格式：
     ```javascript
     async function fetchNewProviderModels(token, baseUrl) {
       try {
         const apiUrl = (baseUrl || PROVIDERS.newprovider.defaultBase).replace(/\/+$/, '') + '/models';
         const response = await proxiedFetch(apiUrl, {
           method: 'GET',
           headers: { /* headers */ }
         });
         if (!response.ok) throw new Error(`HTTP ${response.status}`);
         const data = await response.json();
         return data.data?.map(m => m.id) || [];
       } catch (error) {
         throw error;
       }
     }
     ```
   - 暴露全局：`window.fetchNewProviderModels = fetchNewProviderModels;`

### 示例
假设添加一个名为 "NewAI" 的提供商：
- 在 PROVIDERS 添加对象。
- 实现 `checkNewAIToken` 和 `fetchNewAIModels` 函数。
- 保存并重新部署 Worker，新提供商即可使用。

更多详情见源代码注释。

## 特别鸣谢

[LLM API 代理](https://api-proxy.me)

[hzruo/keycheck](https://github.com/hzruo/keycheck)

## 许可

MIT License. 自由使用和修改。

---

Powered by Cloudflare Workers. Made with ❤️ by @[sfun](https://github.com/ssfun)
