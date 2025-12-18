// API Key Checker 是一个基于 Cloudflare Workers 的 Web 工具，用于批量检测各种 AI API 提供商（如 OpenAI、Anthropic、Google Gemini 等）的 API Key 是否有效。它支持余额查询、模型列表获取，并提供现代化的 UI 界面，帮助用户快速验证和分类 Key。
// version 1.0.2 修复 429 判断错误、修复 openrouter 渠道 gpt-5 模型检验错误

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

// ================= 处理 CORS 预检请求 =================
function handleOptions(request) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
    'Access-Control-Max-Age': '86400',
  });
  return new Response(null, { status: 204, headers });
}

// ================= 代理请求处理 =================
async function handleProxyRequest(request) {
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 });

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return new Response('Invalid JSON', { status: 400 });
  }
  
  const { targetUrl, method = 'GET', headers, body } = payload || {};
  if (!targetUrl)
    return new Response('Target URL is required', { status: 400 });

  const init = { method };
  if (headers && typeof headers === 'object') init.headers = headers;
  if (body !== undefined && !['GET', 'HEAD'].includes(method)) init.body = body;

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    return new Response(err.message, { status: 502 });
  }

  const newHeaders = new Headers(upstream.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: newHeaders
  });
}

// ================= 主请求路由 =================
async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  switch (pathname) {
    case "/":
    case "/index.html":
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    case "/proxy":
      return handleProxyRequest(request);
    default:
      return new Response("Not Found", { status: 404 });
  }
}

// ================= HTML 内容（包含所有 CSS 和 JS） =================
const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>API KEY 检测工具</title>
  <style>
    /* ========== CSS 样式 ========== */
    :root {
      --primary-color-start: #667eea;
      --primary-color-end: #764ba2;
      --text-color-primary: #2c3e50;
      --text-color-secondary: #374151;
      --background-gradient: linear-gradient(135deg, var(--primary-color-start) 0%, var(--primary-color-end) 100%);
      --surface-color: rgba(255, 255, 255, 0.98);
      --input-bg: linear-gradient(135deg, #f8fafc, #f1f5f9);
      --input-border-color: #e2e8f0;
      --shadow-color-light: rgba(0, 0, 0, 0.05);
      --shadow-color-medium: rgba(0, 0, 0, 0.1);
      --border-radius-large: 20px;
      --border-radius-medium: 16px;
      --border-radius-small: 12px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--background-gradient);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: var(--text-color-primary);
      line-height: 1.6;
      padding: 16px;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: var(--surface-color);
      border-radius: var(--border-radius-large);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px var(--shadow-color-medium);
      padding: 40px;
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .header { text-align: center; margin-bottom: 32px; }

    h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #2c3e50, #3498db);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
    }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }

    .main-content { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
    .sidebar-content { position: sticky; top: 20px; min-width: 0; }

    .input-section {
      background: var(--input-bg);
      padding: 24px;
      border-radius: var(--border-radius-medium);
      border: 1px solid var(--input-border-color);
      box-shadow: 0 4px 12px var(--shadow-color-light);
    }

    label {
      display: block;
      margin-bottom: 12px;
      font-weight: 600;
      color: var(--text-color-secondary);
      font-size: 1rem;
    }

    textarea, input[type="text"], input[type="number"], input[type="search"] {
      width: 100%;
      padding: 0 16px;
      height: 48px;
      box-sizing: border-box;
      border: 2px solid var(--input-border-color);
      border-radius: var(--border-radius-small);
      font-size: 15px;
      transition: all 0.3s ease;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    textarea:focus, input[type="text"]:focus, input[type="number"]:focus, input[type="search"]:focus {
      border-color: var(--primary-color-start);
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
      outline: none;
    }

    textarea {
      height: 180px;
      line-height: 1.5;
      padding: 12px 16px;
      resize: vertical;
    }

    textarea.drag-over {
      border-color: var(--primary-color-start);
      border-style: dashed;
      background-color: #f0f4ff;
    }

    .custom-provider-select {
      position: relative;
      width: 100%;
    }

    .custom-provider-trigger {
      width: 100%;
      height: 48px;
      padding: 0 40px 0 16px;
      background: white;
      border: 2px solid var(--input-border-color);
      border-radius: var(--border-radius-small);
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .custom-provider-trigger:hover {
      border-color: #cbd5e1;
    }

    .custom-provider-trigger.open {
      border-color: var(--primary-color-start);
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
    }

    .custom-provider-trigger::after {
      content: '';
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%) rotate(0deg);
      width: 10px;
      height: 10px;
      border-left: 2px solid #94a3b8;
      border-bottom: 2px solid #94a3b8;
      transform: translateY(-60%) rotate(-45deg);
      transition: transform 0.3s ease;
    }

    .custom-provider-trigger.open::after {
      transform: translateY(-40%) rotate(135deg);
    }

    .custom-provider-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border-radius: var(--border-radius-small);
      border: 2px solid var(--input-border-color);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      z-index: 100;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.3s ease;
      max-height: 300px;
      overflow-y: auto;
    }

    .custom-provider-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .provider-option {
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      border-bottom: 1px solid #f1f5f9;
    }

    .provider-option:last-child {
      border-bottom: none;
    }

    .provider-option:hover {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      color: var(--primary-color-start);
    }

    .provider-option.selected {
      background: linear-gradient(135deg, #eef2ff, #f0f4ff);
      color: var(--primary-color-start);
      font-weight: 600;
    }

    .provider-option .provider-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      background: linear-gradient(135deg, var(--primary-color-start), var(--primary-color-end));
      color: white;
      border-radius: 4px;
    }

    /* Provider 配置区域 */
    .provider-config-area {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }

    .config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .config-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .config-item label {
      font-size: 0.9rem;
      margin-bottom: 0;
    }

    .input-with-button {
      display: flex;
      gap: 8px;
    }

    .input-with-button input {
      flex-grow: 1;
    }

    /* 高级配置折叠面板 */
    .advanced-config {
      margin-top: 16px;
      border: 1px solid var(--input-border-color);
      border-radius: var(--border-radius-small);
      overflow: hidden;
      background: white;
    }

    .advanced-config-header {
      padding: 12px 16px;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      font-size: 0.9rem;
      color: var(--text-color-secondary);
    }

    .advanced-config-header:hover {
      background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    }

    .advanced-config-arrow {
      width: 16px;
      height: 16px;
      transition: transform 0.3s ease;
      color: #94a3b8;
    }

    .advanced-config.expanded .advanced-config-arrow {
      transform: rotate(180deg);
    }

    .advanced-config-body {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .advanced-config.expanded .advanced-config-body {
      max-height: 200px;
    }

    .advanced-config-content {
      padding: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .fetch-models-btn, .import-btn {
      padding: 0 16px;
      color: white;
      border: none;
      border-radius: var(--border-radius-small);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
      height: 48px;
    }

    .fetch-models-btn {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      flex-shrink: 0;
    }

    .fetch-models-btn:hover {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      transform: translateY(-1px);
    }

    .import-btn {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      height: auto;
      padding: 8px 16px;
    }

    .import-btn:hover {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      transform: translateY(-1px);
    }

    .actions-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    .button {
      width: 100%;
      height: 56px;
      font-size: 1.1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 16px 32px;
      border-radius: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      color: white;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: relative;
      overflow: hidden;
    }

    .button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .button:hover::before {
      left: 100%;
    }

    .primary-button {
      background: linear-gradient(135deg, var(--primary-color-start), var(--primary-color-end));
    }

    .primary-button:hover {
      background: linear-gradient(135deg, #5a6fd8, #6a4190);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
    }

    .button:disabled {
      background: #a5b4fc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Progress Bar */
    #progress-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    }

    .progress-bar-wrapper {
      width: 100%;
      height: 10px;
      background-color: #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
    }

    #progressBar {
      width: 0%;
      height: 100%;
      background: var(--background-gradient);
      border-radius: 5px;
      transition: width 0.3s ease;
    }

    #progressText {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-color-secondary);
    }

    /* Toast 通知样式 */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      max-width: 400px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      transform: translateX(120%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .toast.show {
      transform: translateX(0);
    }

    .toast-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      flex-shrink: 0;
    }

    .toast.success .toast-icon {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .toast.error .toast-icon {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }

    .toast.warning .toast-icon {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .toast.info .toast-icon {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 2px;
      font-size: 0.95rem;
    }

    .toast-message {
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .toast-close:hover {
      background: #f3f4f6;
      color: #4b5563;
    }

    /* Results Section */
    .results-wrapper {
      background: #fff;
      border-radius: var(--border-radius-medium);
      border: 1px solid var(--input-border-color);
      box-shadow: 0 4px 12px var(--shadow-color-light);
      overflow: hidden;
    }

    .results-tabs {
      display: flex;
      background-color: #f8fafc;
      border-bottom: 1px solid var(--input-border-color);
      overflow-x: auto;
    }

    .tab-btn {
      padding: 12px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      color: #64748b;
      transition: all 0.2s ease;
      border-bottom: 3px solid transparent;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab-btn:hover {
      color: var(--primary-color-start);
    }

    .tab-btn.active {
      color: var(--primary-color-start);
      border-bottom-color: var(--primary-color-start);
    }

    .tab-btn .counter {
      background: #e2e8f0;
      color: #475569;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.8rem;
      transition: all 0.2s ease;
    }

    .tab-btn.active .counter {
      background-color: var(--primary-color-start);
      color: white;
    }

    .results-panels {
      padding: 8px;
    }

    .results-panel {
      display: none;
    }

    .results-panel.active {
      display: block;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 8px;
      flex-wrap: wrap;
    }

    .results-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color-primary);
      white-space: nowrap;
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .search-input {
      width: calc(100% - 16px);
      margin: 4px 8px 8px 8px;
      height: 40px;
      border-radius: 8px;
    }

    .results-content {
      background: #f8fafc;
      padding: 4px;
      border-radius: 8px;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid var(--input-border-color);
    }

    .result-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-radius: 6px;
      transition: background-color 0.2s ease;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.85rem;
    }

    .result-line.hidden {
      display: none;
    }

    .result-line:hover {
      background-color: #eef2ff;
    }

    .key-text {
      word-break: break-all;
      padding-right: 16px;
    }

    .key-text .message {
      color: #64748b;
      margin-left: 4px;
    }

    .key-text .balance-high {
      color: #10b981;
      font-weight: 600;
    }

    .key-text .balance-medium {
      color: #f59e0b;
      font-weight: 600;
    }

    .key-text .balance-low {
      color: #ef4444;
      font-weight: 600;
    }

    .result-line-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .copy-key-btn, .get-models-btn, .view-error-btn, .view-details-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      border-radius: 4px;
      flex-shrink: 0;
      opacity: 0.4;
      transition: all 0.2s;
      line-height: 1;
    }

    .result-line:hover .copy-key-btn,
    .result-line:hover .get-models-btn,
    .result-line:hover .view-error-btn,
    .result-line:hover .view-details-btn {
      opacity: 1;
    }

    .copy-key-btn:hover, .get-models-btn:hover, .view-details-btn:hover {
      color: var(--primary-color-start);
      transform: scale(1.1);
    }

    .view-error-btn:hover {
      color: #ef4444 !important;
      transform: scale(1.1);
    }

    .get-models-btn {
      font-size: 0.8rem;
      background-color: #eef2ff;
      padding: 2px 6px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      color: #94a3b8;
    }

    .empty-state .empty-icon {
      font-size: 48px;
      line-height: 1;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state .empty-icon::before {
      content: '📭';
    }

    .copy-btn {
      padding: 0 16px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
      white-space: nowrap;
      height: 32px;
    }

    .copy-btn:hover {
      background: linear-gradient(135deg, #059669, #047857);
      transform: translateY(-1px);
    }

    .copy-btn-warning {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .copy-btn-neutral {
      background: linear-gradient(135deg, #64748b, #475569);
    }

    .input-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .loader {
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      color: #666;
      font-size: 0.9rem;
    }

    /* Custom Select for Sorting */
    .custom-select {
      position: relative;
      width: 120px;
      font-size: 0.85rem;
      height: 32px;
    }

    .custom-select-trigger {
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      background: #f8fafc;
      border: 1px solid var(--input-border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .custom-select-trigger:hover {
      border-color: var(--primary-color-start);
    }

    .custom-select.open .custom-select-trigger {
      border-color: var(--primary-color-start);
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
    }

    .custom-select-trigger .arrow {
      width: 8px;
      height: 8px;
      border-left: 2px solid #94a3b8;
      border-bottom: 2px solid #94a3b8;
      transform: rotate(-45deg);
      transition: transform 0.2s ease;
    }

    .custom-select.open .arrow {
      transform: rotate(135deg);
    }

    .custom-options {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
    }

    .custom-select.open .custom-options {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .custom-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      display: block;
    }

    .custom-option:hover {
      background-color: #f1f5f9;
    }

    .custom-option.selected {
      background-color: #eef2ff;
      color: var(--primary-color-start);
      font-weight: 600;
    }

    /* Modal Styles */
    .custom-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .custom-modal.show {
      opacity: 1;
      visibility: visible;
    }

    .modal-content, .model-selector-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: scale(0.8) translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .custom-modal.show .modal-content,
    .custom-modal.show .model-selector-content {
      transform: scale(1) translateY(0);
    }

    .modal-content {
      padding: 24px;
      max-width: 400px;
      width: 90%;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .modal-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      flex-shrink: 0;
    }

    .modal-icon.success {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .modal-icon.error {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }

    .modal-icon.warning {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .modal-icon.info {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }

    .modal-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .modal-message {
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 20px;
      white-space: pre-wrap;
      text-align: center;
      font-size: 0.95rem;
      word-break: break-all;
    }

    .modal-message.raw-data {
      text-align: left;
      background-color: #f3f4f6;
      padding: 12px;
      border-radius: 8px;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.85rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
    }

    .modal-btn.primary {
      background: linear-gradient(135deg, var(--primary-color-start), var(--primary-color-end));
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
    }

    .model-selector-content {
      width: 90%;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      max-height: 80vh;
    }

    .model-selector-header {
      padding: 16px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .model-selector-close {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
    }

    .model-selector-body {
      padding: 8px;
      overflow-y: auto;
      flex-grow: 1;
    }

    .model-selector-footer {
      padding: 8px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .model-list {
      list-style: none;
    }

    .model-list li {
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      font-family: monospace;
      font-size: 0.9rem;
    }

    .model-list li:hover {
      background-color: #f3f4f6;
      color: var(--primary-color-start);
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
      .sidebar-content {
        position: static;
        top: auto;
      }
    }

    @media (max-width: 768px) {
      body {
        padding: 12px;
      }
      .container {
        padding: 24px;
      }
      h1 {
        font-size: 2rem;
      }
      .config-grid {
        grid-template-columns: 1fr;
      }
      .advanced-config-content {
        grid-template-columns: 1fr;
      }
      .panel-header {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .panel-actions {
        margin-left: 0;
      }
    }

    @media (max-width: 480px) {
      body {
        padding: 8px;
      }
      .container {
        padding: 16px;
      }
      h1 {
        font-size: 1.8rem;
      }
      .input-section {
        padding: 16px;
      }
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>API KEY 检测工具</h1>
    </div>

    <div class="main-grid">
      <div class="main-content">
        <!-- Provider 选择和配置 -->
        <div class="input-section">
          <label for="providerSelect">API 提供商</label>
          <div class="custom-provider-select" id="providerSelectWrapper">
            <div class="custom-provider-trigger" id="providerTrigger">
              <span id="providerDisplay">OpenAI</span>
            </div>
            <div class="custom-provider-dropdown" id="providerDropdown"></div>
          </div>
          
          <!-- Provider 配置区域 -->
          <div class="provider-config-area">
            <div class="config-grid" id="providerConfigGrid">
              <!-- 动态生成配置项 -->
            </div>
          </div>
        </div>

        <!-- API Keys 输入 -->
        <div class="input-section">
          <div class="input-header">
            <label for="tokens">API KEYS</label>
            <button type="button" class="import-btn" id="importBtn">📁 导入文件</button>
            <input type="file" id="fileInput" accept=".txt" style="display: none;">
          </div>
          <textarea id="tokens" placeholder="输入或拖拽.txt文件到此处&#10;多个KEY以英文逗号、分号或换行分隔"></textarea>
        </div>

        <!-- 操作按钮 -->
        <div class="actions-container">
          <button id="checkButton" class="button primary-button">开始检测KEY</button>
          
          <!-- 进度条 -->
          <div id="progress-container" style="display: none;">
            <div class="progress-bar-wrapper">
              <div id="progressBar"></div>
            </div>
            <span id="progressText"></span>
          </div>
          
          <!-- 高级配置折叠面板 -->
          <div class="advanced-config" id="advancedConfig">
            <div class="advanced-config-header" onclick="toggleAdvancedConfig()">
              <span>⚙️ 高级配置</span>
              <svg class="advanced-config-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="advanced-config-body">
              <div class="advanced-config-content">
                <div class="config-item">
                  <label for="threshold">最低余额阈值</label>
                  <input id="threshold" type="number" value="1" min="0" step="0.1"/>
                </div>
                <div class="config-item">
                  <label for="concurrency">并发请求数</label>
                  <input id="concurrency" type="number" value="5" min="1" max="10"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 结果侧边栏 -->
      <div class="sidebar-content">
        <div class="results-wrapper">
          <div class="results-tabs">
            <button class="tab-btn active" data-tab="valid">有效 <span id="validCount" class="counter">0</span></button>
            <button class="tab-btn" data-tab="lowBalance">低额 <span id="lowBalanceCount" class="counter">0</span></button>
            <button class="tab-btn" data-tab="zeroBalance">零额 <span id="zeroBalanceCount" class="counter">0</span></button>
            <button class="tab-btn" data-tab="rateLimit">限流 <span id="rateLimitCount" class="counter">0</span></button>
            <button class="tab-btn" data-tab="invalid">无效 <span id="invalidCount" class="counter">0</span></button>
            <button class="tab-btn" data-tab="duplicate">重复 <span id="duplicateCount" class="counter">0</span></button>
          </div>
          <div class="results-panels">
            <div id="valid" class="results-panel active">
              <div class="panel-header" id="validActions" style="display: none;">
                <span id="validTitle" class="results-title">有效KEY</span>
                <div class="panel-actions">
                  <div class="custom-select" id="validSort" data-value="default">
                    <div class="custom-select-trigger"><span>默认排序</span><div class="arrow"></div></div>
                    <div class="custom-options">
                      <span class="custom-option selected" data-value="default">默认排序</span>
                      <span class="custom-option" data-value="balance-desc">余额 ▾</span>
                      <span class="custom-option" data-value="balance-asc">余额 ▴</span>
                    </div>
                  </div>
                  <button class="copy-btn" id="copyValidBtn">📋 复制</button>
                </div>
              </div>
              <input type="search" class="search-input" id="validSearch" placeholder="🔍 在结果中搜索..." style="display: none;">
              <div id="validResults" class="results-content"><div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div></div>
            </div>
            <div id="lowBalance" class="results-panel">
              <div class="panel-header" id="lowBalanceActions" style="display: none;">
                <span class="results-title">低余额KEY</span>
                <div class="panel-actions">
                  <div class="custom-select" id="lowBalanceSort" data-value="default">
                    <div class="custom-select-trigger"><span>默认排序</span><div class="arrow"></div></div>
                    <div class="custom-options">
                      <span class="custom-option selected" data-value="default">默认排序</span>
                      <span class="custom-option" data-value="balance-desc">余额 ▾</span>
                      <span class="custom-option" data-value="balance-asc">余额 ▴</span>
                    </div>
                  </div>
                  <button class="copy-btn" id="copyLowBalanceBtn">📋 复制</button>
                </div>
              </div>
              <input type="search" class="search-input" id="lowBalanceSearch" placeholder="🔍 在结果中搜索..." style="display: none;">
              <div id="lowBalanceResults" class="results-content"><div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div></div>
            </div>
            <div id="zeroBalance" class="results-panel">
              <div class="panel-header" id="zeroBalanceActions" style="display: none;">
                <span class="results-title">零余额KEY</span>
                <div class="panel-actions">
                  <button class="copy-btn" id="copyZeroBalanceBtn">📋 复制</button>
                </div>
              </div>
              <input type="search" class="search-input" id="zeroBalanceSearch" placeholder="🔍 在结果中搜索..." style="display: none;">
              <div id="zeroBalanceResults" class="results-content"><div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div></div>
            </div>
            <div id="rateLimit" class="results-panel">
              <div class="panel-header" id="rateLimitActions" style="display: none;">
                <span class="results-title">限流KEY</span>
                <div class="panel-actions">
                  <button class="copy-btn copy-btn-warning" id="copyRateLimitBtn">📋 复制</button>
                </div>
              </div>
              <input type="search" class="search-input" id="rateLimitSearch" placeholder="🔍 在结果中搜索..." style="display: none;">
              <div id="rateLimitResults" class="results-content"><div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div></div>
            </div>
            <div id="invalid" class="results-panel">
              <div class="panel-header" id="invalidActions" style="display: none;">
                <span class="results-title">无效KEY</span>
                <div class="panel-actions">
                  <button class="copy-btn copy-btn-warning" id="copyInvalidBtn">📋 复制</button>
                </div>
              </div>
              <input type="search" class="search-input" id="invalidSearch" placeholder="🔍 在结果中搜索..." style="display: none;">
              <div id="invalidResults" class="results-content"><div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div></div>
            </div>
            <div id="duplicate" class="results-panel">
              <div class="panel-header" id="duplicateActions" style="display: none;">
                <span class="results-title">重复KEY</span>
                <div class="panel-actions">
                  <button class="copy-btn copy-btn-neutral" id="copyDuplicateBtn">📋 复制</button>
                </div>
              </div>
              <input type="search" class="search-input" id="duplicateSearch" placeholder="🔍 在结果中搜索..." style="display: none;">
              <div id="duplicateResults" class="results-content"><div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>© 2025 LLM API KEY 检测工具 | <a href="https://github.com/ssfun/llm-api-key-checker" target="_blank" rel="noopener noreferrer">@sfun</a></p>
    </div>
  </div>

  <!-- Toast 容器 -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- 通用模态框 -->
  <div id="customModal" class="custom-modal">
    <div class="modal-content">
      <div class="modal-header">
        <div id="modalIcon" class="modal-icon success">✓</div>
        <h3 id="modalTitle" class="modal-title">操作成功</h3>
      </div>
      <div id="modalMessage" class="modal-message">操作已成功完成</div>
      <div class="modal-actions">
        <button class="modal-btn primary" id="modalCloseBtn">确定</button>
      </div>
    </div>
  </div>

  <!-- 模型选择器模态框 -->
  <div id="modelSelectorModal" class="custom-modal">
    <div class="model-selector-content">
      <div class="model-selector-header">
        <h3 id="modelSelectorTitle">选择一个模型</h3>
        <button id="modelSelectorCloseBtn" class="model-selector-close">&times;</button>
      </div>
      <div class="model-selector-body">
        <ul id="modelList" class="model-list"></ul>
      </div>
      <div class="model-selector-footer">
        <span id="modelCount"></span>
        <button id="copyAllModelsBtn" class="copy-btn">📋 复制全部</button>
      </div>
    </div>
  </div>

  <script>
    // ========== Provider 配置注册表 ==========
    const PROVIDERS = {
      openai: {
        label: 'OpenAI',
        icon: '🤖',
        hasBalance: false,
        defaultBase: 'https://api-proxy.me/openai/v1',
        defaultModel: 'gpt-4o-mini',
        checkFunction: 'checkOpenAIToken',
        fetchModels: 'fetchOpenAIModels'
      },
      anthropic: {
        label: 'Anthropic',
        icon: '🔮',
        hasBalance: false,
        defaultBase: 'https://api-proxy.me/anthropic/v1',
        defaultModel: 'claude-3-5-haiku-20241022',
        checkFunction: 'checkAnthropicToken',
        fetchModels: 'fetchAnthropicModels'
      },
      gemini: {
        label: 'Google Gemini',
        icon: '✨',
        hasBalance: false,
        defaultBase: 'https://api-proxy.me/gemini',
        defaultModel: 'gemini-2.5-flash',
        checkFunction: 'checkGeminiToken',
        fetchModels: 'fetchGoogleModels'
      },
      xai: {
        label: 'X AI',
        icon: '🚀',
        hasBalance: false,
        defaultBase: 'https://api-proxy.me/xai/v1',
        defaultModel: 'grok-3-latest',
        checkFunction: 'checkXaiToken',
        fetchModels: 'fetchXAIModels'
      },
      openrouter: {
        label: 'OpenRouter',
        icon: '🌐',
        hasBalance: true,
        defaultBase: 'https://api-proxy.me/openrouter/v1',
        defaultModel: 'mistralai/mistral-7b-instruct:free',
        checkFunction: 'checkOpenRouterToken',
        fetchModels: 'fetchOpenRouterModels'
      },
      groq: {
        label: 'Groq',
        icon: '🥗',
        hasBalance: false,
        defaultBase: 'https://api-proxy.me/groq/v1',
        defaultModel: 'openai/gpt-oss-20b',
        checkFunction: 'checkGroqToken',
        fetchModels: 'fetchGroqModels'
      },
      github: {
        label: 'GitHub Models',
        icon: '🐱',
        hasBalance: false,
        defaultBase: 'https://models.github.ai/inference',
        defaultModel: 'gpt-4o-mini',
        checkFunction: 'checkGitHubToken',
        fetchModels: 'fetchGitHubModels'
      },
      siliconflow: {
        label: 'SiliconFlow',
        icon: '💧',
        hasBalance: true,
        defaultBase: 'https://api.siliconflow.cn/v1',
        defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
        checkFunction: 'checkSiliconFlowToken',
        fetchModels: 'fetchSiliconFlowModels'
      },
      deepseek: {
        label: 'DeepSeek',
        icon: '🔍',
        hasBalance: true,
        defaultBase: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        checkFunction: 'checkDeepSeekToken',
        fetchModels: 'fetchDeepSeekModels'
      },
      moonshot: {
        label: 'Moonshot',
        icon: '🌙',
        hasBalance: true,
        defaultBase: 'https://api.moonshot.cn/v1',
        defaultModel: 'kimi-latest',
        checkFunction: 'checkMoonshotToken',
        fetchModels: 'fetchMoonshotModels'
      },
      aliyun: {
        label: 'Aliyun',
        icon: '☁️',
        hasBalance: false,
        defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultModel: 'qwen-turbo',
        checkFunction: 'checkAliyunToken',
        fetchModels: 'fetchAliyunModels'
      },
      zhipu: {
        label: 'Zhipu',
        icon: '〽️',
        hasBalance: false,
        defaultBase: 'https://open.bigmodel.cn/api/paas/v4',
        defaultModel: 'glm-4.5-air',
        checkFunction: 'checkZhipuToken',
        fetchModels: 'fetchZhipuModels'
      }
    };

    // ========== 全局状态 ==========
    let currentProvider = 'openai';
    let originalOrder = 0;
    const TOKEN_RESULTS = {
      valid: [], lowBalance: [], zeroBalance: [], rateLimit: [], invalid: [], duplicate: []
    };

    // ========== Toast 通知系统 ==========
    function showToast(message, type = 'success', duration = 3500) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = \`toast \${type}\`;
      
      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };
      
      const titles = {
        success: '成功',
        error: '错误',
        warning: '警告',
        info: '提示'
      };
      
      toast.innerHTML = \`
        <div class="toast-icon">\${icons[type]}</div>
        <div class="toast-content">
          <div class="toast-title">\${titles[type]}</div>
          <div class="toast-message">\${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      \`;
      
      container.appendChild(toast);
      
      // 触发动画
      setTimeout(() => toast.classList.add('show'), 10);
      
      // 自动移除
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    // ========== API 错误处理 ==========
    async function handleApiError(response) {
      const rawText = await response.text();
      let rawError;
      try {
        rawError = JSON.parse(rawText);
      } catch (e) {
        rawError = rawText;
      }

      let message = \`HTTP \${response.status}\`;
      if (typeof rawError === 'object' && rawError?.error?.message) {
        message = rawError.error.message;
      } else if (typeof rawError === 'object' && rawError?.message) {
        message = rawError.message;
      } else if (typeof rawError === 'string' && rawError.length > 0 && rawError.length < 100) {
        message = rawError;
      } else if (response.status === 401) {
        message = '认证失败';
      } else if (response.status === 429) {
        message = '请求过于频繁';
      } else if (response.status === 400) {
        message = '请求无效';
      }
      return { message, rawError };
    }

    // ========== 代理请求 ==========
    async function proxiedFetch(url, options) {
      const proxyUrl = '/proxy';
      const proxyOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: url,
          method: options.method,
          headers: options.headers,
          body: options.body
        })
      };
      return fetch(proxyUrl, proxyOptions);
    }

    // ========== 通用模型获取函数（为所有Provider提供） ==========
    async function fetchOpenAIModels(token, baseUrl) {
      try {
        const apiUrl = (baseUrl || PROVIDERS.openai.defaultBase).replace(/\\/+$/, '') + '/models';
        const response = await proxiedFetch(apiUrl, { 
          method: 'GET',
          headers: { "Authorization": "Bearer " + token } 
        });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
        }
        const data = await response.json();
    
        // 检查数据类型，如果是数组，直接 map
        if (Array.isArray(data)) {
          return data.map(m => m.id);
        } else if (data && Array.isArray(data.data)) {
          return data.data.map(m => m.id);
        } else {
          throw new Error('Unexpected data format');
        }
      } catch (error) {
        throw error;
      }
    }

    async function fetchGoogleModels(token, baseUrl) {
      const base = baseUrl || PROVIDERS.gemini.defaultBase;
      const apiUrl = \`\${base.replace(/\\/+$/, '')}/v1beta/models?key=\${token}\`;
      const response = await proxiedFetch(apiUrl, { method: 'GET' });
      if (!response.ok) {
        const err = await response.json().catch(()=>null);
        throw new Error(err?.error?.message || \`HTTP \${response.status}\`);
      }
      const data = await response.json();
      return data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent') && !m.name.includes('embedding'))
        .map(m => m.name.replace('models/', ''));
    }

    async function fetchAnthropicModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.anthropic.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { 
          "x-api-key": token, 
          "anthropic-version": "2023-06-01", 
          "anthropic-dangerous-direct-browser-access": "true" 
        } 
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error?.message || \`HTTP \${response.status}\`);
      }
      const data = await response.json();
      return data.data.map(model => model.id);
    }

    // 为其他Provider提供模型获取（使用OpenAI兼容接口）
    async function fetchXAIModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.xai.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }

    async function fetchOpenRouterModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.openrouter.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }
    
    async function fetchGroqModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.groq.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }
    
    async function fetchGitHubModels(token, baseUrl) {
      try {
        const apiUrl = (baseUrl || PROVIDERS.github.defaultBase).replace(/\\/+$/, '').replace('/inference', '') + '/catalog/models';
        const response = await proxiedFetch(apiUrl, { 
          method: 'GET',
          headers: { "Authorization": "Bearer " + token } 
        });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
        }
        const data = await response.json();
    
        if (Array.isArray(data)) {
          return data.map(m => m.id);
        } else if (data && Array.isArray(data.data)) {
          return data.data.map(m => m.id);
        } else {
          throw new Error('Unexpected data format');
        }
      } catch (error) {
        throw error;
      }
    }

    async function fetchSiliconFlowModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.siliconflow.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }

    async function fetchDeepSeekModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.deepseek.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }

    async function fetchMoonshotModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.moonshot.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }

    async function fetchAliyunModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.aliyun.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }
    
    async function fetchZhipuModels(token, baseUrl) {
      const apiUrl = (baseUrl || PROVIDERS.zhipu.defaultBase).replace(/\\/+$/, '') + '/models';
      const response = await proxiedFetch(apiUrl, { 
        method: 'GET',
        headers: { "Authorization": "Bearer " + token } 
      });
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      return data.data?.map(m => m.id) || [];
    }

    // ========== KEY 检测函数 ==========
    async function checkOpenAIToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.openai.defaultBase;
        const testModel = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.openai.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/chat/completions';
        
        const commonPayload = { model: testModel, messages: [{ role: "user", content: "Hello" }] };
        const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + token };

        const response1 = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers, 
          body: JSON.stringify({ ...commonPayload, max_tokens: 1 }) 
        });

        if (response1.ok) return { token, isValid: true };

        const { message: message1, rawError: rawError1 } = await handleApiError(response1);

        if (rawError1?.error?.code === 'unsupported_parameter' && rawError1?.error?.param === 'max_tokens') {
          const response2 = await proxiedFetch(apiUrl, { 
            method: "POST", 
            headers, 
            body: JSON.stringify({ ...commonPayload, max_completion_tokens: 10 }) 
          });
          
          if (response2.ok) return { token, isValid: true };
          
          const { message: message2, rawError: rawError2 } = await handleApiError(response2);
          return { token, isValid: false, message: message2, rawError: rawError2, error: true };
        }

        return { token, isValid: false, message: message1, rawError: rawError1, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkAnthropicToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.anthropic.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.anthropic.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/messages';
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { 
            "x-api-key": token, 
            "anthropic-version": "2023-06-01", 
            "Content-Type": "application/json", 
            "anthropic-dangerous-direct-browser-access": "true"  
          }, 
          body: JSON.stringify({ 
            model: model, 
            max_tokens: 1, 
            messages: [{ role: "user", content: "Hello" }] 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkGeminiToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.gemini.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.gemini.defaultModel;
        const apiUrl = \`\${baseUrl.replace(/\\/+$/, '')}/v1beta/models/\${model}:generateContent?key=\${token}\`;
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: "Hello" }] }], 
            generationConfig: { maxOutputTokens: 10 } 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkXaiToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.xai.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.xai.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/chat/completions';
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "Hello" }], 
            max_tokens: 1 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkOpenRouterToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.openrouter.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.openrouter.defaultModel;
        const validationResponse = await proxiedFetch(baseUrl.replace(/\\/+$/, '') + '/chat/completions', { 
          method: "POST", 
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "Hi" }], 
            max_tokens: 16 
          }) 
        });
        if (!validationResponse.ok) {
          const { message, rawError } = await handleApiError(validationResponse);
          return { token, isValid: false, message, rawError, error: true };
        }
        
        const creditsUrl = baseUrl.replace(/\\/+$/, '').replace('/v1', '') + '/v1/credits';
        const creditsResponse = await proxiedFetch(creditsUrl, { 
          method: "GET", 
          headers: { "Authorization": "Bearer " + token } 
        });
        
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          const totalCredits = creditsData.data?.total_credits || 0;
          const totalUsage = creditsData.data?.total_usage || 0;
          const available = parseFloat((totalCredits - totalUsage).toFixed(4));
          return { 
            token, 
            isValid: true, 
            balance: available,
            totalBalance: totalCredits,
            usedBalance: totalUsage
          };
        }
        return { token, isValid: true, balance: -1, message: "有效但无法获取额度" };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }
    
    async function checkGroqToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.groq.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.groq.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/chat/completions';
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "Hello" }], 
            max_tokens: 1 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }
    
    async function checkGitHubToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.github.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.github.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/chat/completions';
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "Hello" }], 
            max_tokens: 1 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkSiliconFlowToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.siliconflow.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.siliconflow.defaultModel;
        const resp1 = await proxiedFetch(baseUrl.replace(/\\/+$/, '') + '/chat/completions', { 
          method: "POST", 
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "hi" }], 
            max_tokens: 1 
          }) 
        });
        if (!resp1.ok) {
          const { message, rawError } = await handleApiError(resp1);
          return { token, isValid: false, message, rawError, error: true };
        }
        const resp2 = await proxiedFetch(baseUrl.replace(/\\/+$/, '').replace('/v1', '') + '/v1/user/info', { 
          method: "GET", 
          headers: { "Authorization": "Bearer " + token } 
        });
        if (!resp2.ok) return { token, isValid: true, balance: -1, message: "有效但无法获取余额" };
        const data2 = await resp2.json();
        const balanceValue = data2.data?.balance;
        if (balanceValue === undefined) return { token, isValid: true, balance: -1, message: "有效但无法获取余额" };
        const balanceNumber = parseFloat(balanceValue);
        return { token, isValid: true, balance: isNaN(balanceNumber) ? -1 : parseFloat(balanceNumber.toFixed(4)) };
      } catch(error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkDeepSeekToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.deepseek.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.deepseek.defaultModel;
        const validationResponse = await proxiedFetch(baseUrl.replace(/\\/+$/, '') + '/chat/completions', { 
          method: "POST", 
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "hi" }], 
            max_tokens: 1 
          }) 
        });
        if (!validationResponse.ok) {
          const { message, rawError } = await handleApiError(validationResponse);
          return { token, isValid: false, message, rawError, error: true };
        }
        const balanceResponse = await proxiedFetch(baseUrl.replace(/\\/+$/, '').replace('/v1', '') + '/user/balance', { 
          method: "GET", 
          headers: { "Authorization": "Bearer " + token, "Accept": "application/json" } 
        });
        if (balanceResponse.ok) {
          const data = await balanceResponse.json();
          // 如果有多个币种，收集所有币种信息
          if (data.balance_infos && data.balance_infos.length > 0) {
            const allBalances = data.balance_infos.map(info => ({
              currency: info.currency,
              total: parseFloat(info.total_balance),
              granted: parseFloat(info.granted_balance || 0),
              toppedUp: parseFloat(info.topped_up_balance || 0)
            }));

            // 优先使用 USD，其次 CNY，用于主显示
            const usdInfo = data.balance_infos.find(b => b.currency === 'USD');
            const cnyInfo = data.balance_infos.find(b => b.currency === 'CNY');
            const mainBalanceInfo = usdInfo || cnyInfo || data.balance_infos[0];

            return {
              token,
              isValid: true,
              balance: parseFloat(mainBalanceInfo.total_balance),
              currency: mainBalanceInfo.currency,
              grantedBalance: parseFloat(mainBalanceInfo.granted_balance || 0),
              toppedUpBalance: parseFloat(mainBalanceInfo.topped_up_balance || 0),
              allBalances: allBalances  // 添加所有币种信息
            };
          }
          return { token, isValid: true, balance: -1, message: "有效但无法获取余额" };
        }
        return { token, isValid: true, balance: -1, message: "有效但无法获取余额" };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkMoonshotToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.moonshot.defaultBase;
        const balanceResponse = await proxiedFetch(baseUrl.replace(/\\/+$/, '') + '/users/me/balance', { 
          method: "GET", 
          headers: { "Authorization": "Bearer " + token } 
        });
        if (balanceResponse.ok) {
          const data = await balanceResponse.json();
          const availableBalance = data.data?.available_balance ?? -1;
          const cashBalance = data.data?.cash_balance ?? 0;
          const voucherBalance = data.data?.voucher_balance ?? 0;
          return {
            token,
            isValid: true,
            balance: availableBalance,
            cashBalance: cashBalance,
            voucherBalance: voucherBalance
          };
        }
        const { message, rawError } = await handleApiError(balanceResponse);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    async function checkAliyunToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.aliyun.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.aliyun.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/chat/completions';
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "Hello" }], 
            max_tokens: 1 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }
    
    async function checkZhipuToken(token) {
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim() || PROVIDERS.zhipu.defaultBase;
        const model = document.getElementById(\`\${currentProvider}__model\`).value.trim() || PROVIDERS.zhipu.defaultModel;
        const apiUrl = baseUrl.replace(/\\/+$/, '') + '/chat/completions';
        const response = await proxiedFetch(apiUrl, { 
          method: "POST", 
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: "user", content: "Hello" }], 
            max_tokens: 1 
          }) 
        });
        if (response.ok) return { token, isValid: true };
        const { message, rawError } = await handleApiError(response);
        return { token, isValid: false, message, rawError, error: true };
      } catch (error) { 
        return { token, isValid: false, message: "网络错误", rawError: error.message, error: true }; 
      }
    }

    // ========== UI 初始化 ==========
    function initializeProviderSelect() {
      const dropdown = document.getElementById('providerDropdown');
      dropdown.innerHTML = '';
      
      Object.entries(PROVIDERS).forEach(([key, config]) => {
        const option = document.createElement('div');
        option.className = 'provider-option';
        if (key === currentProvider) option.classList.add('selected');
        option.dataset.value = key;
        option.innerHTML = \`
          <span class="provider-icon">\${config.icon}</span>
          <span>\${config.label}</span>
        \`;
        option.addEventListener('click', () => selectProvider(key));
        dropdown.appendChild(option);
      });
      
      // 设置点击事件
      const trigger = document.getElementById('providerTrigger');
      trigger.addEventListener('click', () => {
        trigger.classList.toggle('open');
        dropdown.classList.toggle('open');
      });
      
      // 点击外部关闭
      document.addEventListener('click', (e) => {
        if (!document.getElementById('providerSelectWrapper').contains(e.target)) {
          trigger.classList.remove('open');
          dropdown.classList.remove('open');
        }
      });
    }

    function selectProvider(key) {
      currentProvider = key;
      const config = PROVIDERS[key];
      
      // 更新显示
      document.getElementById('providerDisplay').textContent = config.label;
      
      // 更新选中状态
      document.querySelectorAll('.provider-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === key);
      });
      
      // 关闭下拉
      document.getElementById('providerTrigger').classList.remove('open');
      document.getElementById('providerDropdown').classList.remove('open');
      
      // 更新配置区域
      updateProviderConfig();
    }

    function updateProviderConfig() {
      const config = PROVIDERS[currentProvider];
      const configGrid = document.getElementById('providerConfigGrid');
      
      configGrid.innerHTML = \`
        <div class="config-item">
          <label for="\${currentProvider}__base">Base URL</label>
          <input type="text" id="\${currentProvider}__base" value="\${config.defaultBase}" placeholder="API Base URL">
        </div>
        <div class="config-item">
          <label for="\${currentProvider}__model">测试模型</label>
          <div class="input-with-button">
            <input type="text" id="\${currentProvider}__model" value="\${config.defaultModel}" placeholder="测试用的模型名称">
            <button type="button" class="fetch-models-btn" onclick="handleFetchModels('\${currentProvider}')">获取</button>
          </div>
        </div>
      \`;
      
      // 更新余额相关UI
      const hasBalance = config.hasBalance;
      document.querySelector('.tab-btn[data-tab="lowBalance"]').style.display = hasBalance ? 'flex' : 'none';
      document.querySelector('.tab-btn[data-tab="zeroBalance"]').style.display = hasBalance ? 'flex' : 'none';
      document.getElementById('validSort').style.display = hasBalance ? 'block' : 'none';
      document.getElementById('lowBalanceSort').style.display = hasBalance ? 'block' : 'none';
      
      clearResults();
    }

    function toggleAdvancedConfig() {
      document.getElementById('advancedConfig').classList.toggle('expanded');
    }

    // ========== 结果处理（保持原有逻辑） ==========
    function clearResults() {
      originalOrder = 0;
      ['valid', 'lowBalance', 'zeroBalance', 'rateLimit', 'invalid', 'duplicate'].forEach(cat => {
        document.getElementById(cat + 'Results').innerHTML = '<div class="empty-state"><span class="empty-icon"></span><p>检测结果将显示在这里</p></div>';
        document.getElementById(cat + 'Count').textContent = '0';
        const actionsEl = document.getElementById(cat + 'Actions');
        if (actionsEl) actionsEl.style.display = 'none';
        const searchEl = document.getElementById(cat + 'Search');
        if(searchEl) { 
          searchEl.style.display = 'none'; 
          searchEl.value = ''; 
        }
        const sortEl = document.getElementById(cat + 'Sort');
        if(sortEl) {
          sortEl.dataset.value = "default";
          sortEl.querySelector('.custom-select-trigger span').textContent = "默认排序";
          sortEl.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
          sortEl.querySelector('.custom-option[data-value="default"]')?.classList.add('selected');
        }
        TOKEN_RESULTS[cat] = [];
      });
      
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="valid"]').classList.add('active');
      document.querySelectorAll('.results-panel').forEach(panel => panel.classList.remove('active'));
      document.getElementById('valid').classList.add('active');
    }

    function addResultLine(res, innerHTML, category) {
      const container = document.getElementById(category + 'Results');
      const token = res.token;
      
      if (TOKEN_RESULTS[category].length === 0) {
        container.innerHTML = '';
        document.getElementById(category + 'Search').style.display = 'block';
      }

      const line = document.createElement('div');
      line.className = 'result-line';
      line.dataset.order = originalOrder++;
      if (res.balance !== undefined) line.dataset.balance = res.balance;
      line.dataset.token = token;
      
      const textSpan = document.createElement('span');
      textSpan.className = 'key-text';
      textSpan.innerHTML = innerHTML;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'result-line-actions';

      // OpenRouter 特殊处理
      if (currentProvider === 'openrouter' && res.totalBalance !== undefined) {
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'view-details-btn';
        detailsBtn.innerHTML = '📊';
        detailsBtn.title = '查看详情';
        detailsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const details = \`总额度: \${res.totalBalance}\\n已使用: \${res.usedBalance || 0}\\n可用余额: \${res.balance}\`;
          showCustomModal(details, 'info', 'OpenRouter 额度详情');
        });
        actionsDiv.appendChild(detailsBtn);
      }
      // 错误详情按钮
      if ((category === 'invalid' || category === 'rateLimit') && res.rawError) {
        const viewErrorBtn = document.createElement('button');
        viewErrorBtn.className = 'view-error-btn';
        viewErrorBtn.innerHTML = 'ℹ️';
        viewErrorBtn.title = '查看详情';
        viewErrorBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const errorMessage = typeof res.rawError === 'object' 
            ? JSON.stringify(res.rawError, null, 2) 
            : res.rawError;
          showCustomModal(errorMessage, 'info', '接口返回详情');
        });
        actionsDiv.appendChild(viewErrorBtn);
      }

      // 获取模型按钮
      if (category === 'valid') {
        const getModelsBtn = document.createElement('button');
        getModelsBtn.className = 'get-models-btn';
        getModelsBtn.textContent = '🎛';
        getModelsBtn.title = '获取可用模型';
        getModelsBtn.addEventListener('click', e => {
          e.stopPropagation();
          handleFetchModelsForToken(token);
        });
        actionsDiv.appendChild(getModelsBtn);
      }

      // 复制按钮
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-key-btn';
      copyBtn.innerHTML = '📋';
      copyBtn.title = '复制此KEY';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(token).then(() => {
          copyBtn.innerHTML = '✓';
          setTimeout(() => { copyBtn.innerHTML = '📋'; }, 1500);
        });
      });

      actionsDiv.appendChild(copyBtn);
      line.appendChild(textSpan);
      line.appendChild(actionsDiv);
      container.appendChild(line);

      const countEl = document.getElementById(category + 'Count');
      const newCount = (TOKEN_RESULTS[category].push(token), TOKEN_RESULTS[category].length);
      countEl.textContent = newCount;

      if (newCount === 1) {
        const actionsEl = document.getElementById(category + 'Actions');
        if (actionsEl) actionsEl.style.display = 'flex';
      }
    }

    // ========== 检测逻辑 ==========
    async function checkTokens() {
      const tokensInput = document.getElementById("tokens").value.trim();
      if (!tokensInput) { 
        showToast("请输入至少一个 API KEY", "warning");
        return; 
      }
      
      clearResults();
      
      const config = PROVIDERS[currentProvider];
      const threshold = parseFloat(document.getElementById("threshold").value) || 1;
      const concurrency = parseInt(document.getElementById("concurrency").value) || 5;
      const checkButton = document.getElementById("checkButton");
      const progressContainer = document.getElementById('progress-container');
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');

      let tokensRaw = tokensInput.split(/[,;\\n\\r]+/).map(t => t.trim()).filter(t => t !== "");
      let seen = new Set();
      let uniqueTokens = [];
      
      tokensRaw.forEach(token => {
        if (seen.has(token)) {
          TOKEN_RESULTS.duplicate.push(token);
        } else { 
          seen.add(token); 
          uniqueTokens.push(token); 
        }
      });

      if (TOKEN_RESULTS.duplicate.length > 0) {
        TOKEN_RESULTS.duplicate.forEach(token => {
          addResultLine({token: token}, \`\${token} <span class="message">(重复)</span>\`, "duplicate");
        });
      }

      checkButton.disabled = true;
      checkButton.innerHTML = '<span class="loader"></span>检测中...';
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      progressText.textContent = \`0 / \${uniqueTokens.length}\`;

      const tasks = uniqueTokens.map(token => () => window[config.checkFunction](token));
      let completedCount = 0;

      function onSingleResult(res) {
        completedCount++;
        const progress = Math.round((completedCount / uniqueTokens.length) * 100);
        progressBar.style.width = progress + '%';
        progressText.textContent = \`\${completedCount} / \${uniqueTokens.length} (\${progress}%)\`;
  
        let category, displayText;
        if (!res || res.error || !res.isValid) {
          const fullMessage = (res && res.message) ? res.message : (res && res.error ? "请求失败: " + res.error : "未知错误");
    
          const lowerCaseMessage = fullMessage.toLowerCase();
          category = lowerCaseMessage.includes("rate") || lowerCaseMessage.includes("quota") || fullMessage.includes("429") ? 'rateLimit' : 'invalid';
    
          let simpleMessage = "验证失败";
          if (category === 'rateLimit') {
            simpleMessage = "请求频繁";
          } else if (fullMessage.includes("401") || fullMessage.toLowerCase().includes("authentication")) {
            simpleMessage = "认证失败";
          } else if (fullMessage.includes("insufficient_quota")) {
            simpleMessage = "额度不足";
          } else if (fullMessage.toLowerCase().includes("not found")) {
            simpleMessage = "模型或地址无效";
          }

          displayText = \`\${res.token} <span class="message">(\${simpleMessage})</span>\`;
        } else {
          if (config.hasBalance) {
            const bal = res.balance;
            const balClass = bal >= 10 ? 'high' : (bal > 0 ? 'medium' : 'low');
      
          // 处理币种显示
          let balanceDisplay = bal.toString();
          if (res.currency) {
            // 如果有币种信息，添加到显示中
            balanceDisplay = \`\${bal} \${res.currency}\`;
          }
      
          // OpenRouter 特殊显示
          if (currentProvider === 'openrouter' && res.totalBalance !== undefined) {
            displayText = \`\${res.token} <span class="message">(余额: <span class="balance-\${balClass}">\${bal} / \${res.totalBalance}</span>)</span>\`;
          }
          // DeepSeek 特殊显示 - 显示所有币种
          else if (currentProvider === 'deepseek' && res.allBalances && res.allBalances.length > 0) {
            let balanceDetails = res.allBalances.map(b =>
              \`\${b.currency}: \${b.total}(赠:\${b.granted} 充:\${b.toppedUp})\`
            ).join(' | ');
            displayText = \`\${res.token} <span class="message">(\${balanceDetails})</span>\`;
          }
          // Moonshot 特殊显示 - 显示 cash 和 voucher
          else if (currentProvider === 'moonshot' && (res.cashBalance !== undefined || res.voucherBalance !== undefined)) {
            displayText = \`\${res.token} <span class="message">(总: <span class="balance-\${balClass}">\${bal}</span> | 现金: \${res.cashBalance} | 券: \${res.voucherBalance})</span>\`;
          }
          else if (res.currency) {
            // 有币种信息的显示方式
            displayText = \`\${res.token} <span class="message">(余额: <span class="balance-\${balClass}">\${balanceDisplay}</span>)</span>\`;
          } else {
            // 默认显示方式
            displayText = \`\${res.token} <span class="message">(余额: <span class="balance-\${balClass}">\${bal}</span>)</span>\`;
          }
      
          if (bal === 0) category = 'zeroBalance';
          else if (bal < threshold) category = 'lowBalance';
          else category = 'valid';
        } else {
          displayText = \`\${res.token} <span class="message">(状态: 有效)</span>\`;
          category = 'valid';
        }
      }
      addResultLine(res, displayText, category);
    }

      try {
        await runWithConcurrencyLimit(tasks, concurrency, onSingleResult);
        // 使用 Toast 替代模态框
        showToast(\`检测完成！共处理 \${uniqueTokens.length} 个KEY\`, 'success');
      } catch (err) {
        showToast("检测失败: " + err.message, "error");
        console.error(err);
      } finally {
        checkButton.disabled = false;
        checkButton.textContent = "开始检测KEY";
        setTimeout(() => { 
          progressContainer.style.display = 'none'; 
        }, 2000);
      }
    }

    async function runWithConcurrencyLimit(tasks, concurrency, onResult) {
      return new Promise((resolve) => {
        let i = 0, running = 0, completed = 0;
        function runNext() {
          if (completed === tasks.length) { 
            resolve(); 
            return; 
          }
          while (running < concurrency && i < tasks.length) {
            const task = tasks[i++];
            running++;
            task()
              .then(result => onResult(result))
              .catch(err => {
                const failedToken = tasks[i-1].toString().match(/'(sk-[^']*)'/);
                onResult({ 
                  error: err.message, 
                  token: failedToken ? failedToken[1] : 'unknown' 
                });
              })
              .finally(() => { 
                running--; 
                completed++; 
                runNext(); 
              });
          }
        }
        runNext();
      });
    }

    // ========== 模型获取 ==========
    async function handleFetchModels(provider) {
      const config = PROVIDERS[provider || currentProvider];
      const firstKey = document.getElementById('tokens').value.trim().split(/[,;\\n\\r]+/)[0]?.trim();
      if (!firstKey) {
        showToast('请先在API KEYS文本框中输入至少一个有效的KEY', 'warning');
        return;
      }
      
      const button = event.target;
      const originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = '<span class="loader"></span>';
      
      try {
        const baseUrl = document.getElementById(\`\${provider || currentProvider}__base\`).value.trim();
        const models = await window[config.fetchModels](firstKey, baseUrl);
        if (models && models.length > 0) {
          showModelSelectorModal(models, \`\${provider || currentProvider}__model\`);
        } else {
          showToast('未能获取到模型列表', 'warning');
        }
      } catch (error) {
        showToast(\`获取模型失败: \${error.message}\`, 'error');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    }

    async function handleFetchModelsForToken(token) {
      const config = PROVIDERS[currentProvider];
      const button = event.target;
      const originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = '<span class="loader"></span>';
      
      try {
        const baseUrl = document.getElementById(\`\${currentProvider}__base\`).value.trim();
        const models = await window[config.fetchModels](token, baseUrl);
        if (models && models.length > 0) {
          showModelSelectorModal(models);
        } else {
          showToast('未能获取到模型列表', 'warning');
        }
      } catch (error) {
        showToast(\`获取模型失败: \${error.message}\`, 'error');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    }

    function showModelSelectorModal(models, targetInputId = null) {
      const modal = document.getElementById('modelSelectorModal');
      const modelList = document.getElementById('modelList');
      const countSpan = document.getElementById('modelCount');
      const copyAllBtn = document.getElementById('copyAllModelsBtn');
      
      modelList.innerHTML = '';
      
      if (!models || models.length === 0) {
        modelList.innerHTML = '<li>未能获取到模型列表或列表为空。</li>';
        countSpan.textContent = '总数: 0';
        copyAllBtn.disabled = true;
      } else {
        models.sort();
        models.forEach(model => {
          const li = document.createElement('li');
          li.textContent = model;
          if (targetInputId) {
            li.addEventListener('click', () => {
              document.getElementById(targetInputId).value = model;
              modal.classList.remove('show');
            });
          }
          modelList.appendChild(li);
        });
        countSpan.textContent = \`总数: \${models.length}\`;
        copyAllBtn.disabled = false;

        const newCopyAllBtn = copyAllBtn.cloneNode(true);
        copyAllBtn.parentNode.replaceChild(newCopyAllBtn, copyAllBtn);
        newCopyAllBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(models.join('\\n')).then(() => {
            showToast(\`已复制 \${models.length} 个模型ID\`, 'success');
          });
        });
      }

      document.getElementById('modelSelectorCloseBtn').onclick = () => modal.classList.remove('show');
      modal.classList.add('show');
    }

    // ========== 工具函数 ==========
    function showCustomModal(message, type = 'success', title = '') {
      const modal = document.getElementById('customModal');
      const icon = document.getElementById('modalIcon');
      const titleEl = document.getElementById('modalTitle');
      const messageEl = document.getElementById('modalMessage');
      
      icon.className = "modal-icon " + type;
      switch(type) {
        case 'success': 
          icon.textContent = '✓'; 
          titleEl.textContent = title || '操作成功'; 
          break;
        case 'error': 
          icon.textContent = '✕'; 
          titleEl.textContent = title || '操作失败'; 
          break;
        case 'warning': 
          icon.textContent = '⚠'; 
          titleEl.textContent = title || '注意'; 
          break;
        case 'info': 
          icon.textContent = 'ℹ'; 
          titleEl.textContent = title || '提示'; 
          break;
      }
      
      if (type === 'info' && (message.trim().startsWith('{') || message.trim().startsWith('['))) {
        messageEl.classList.add('raw-data');
      } else {
        messageEl.classList.remove('raw-data');
      }

      messageEl.textContent = message;
      modal.classList.add('show');

      // 只有 info 类型不自动关闭（用于查看详情）
      if (type === 'info') {
        return;
      }
    }

    function closeCustomModal() { 
      document.getElementById('customModal').classList.remove('show'); 
    }

    function copyTokensFromCategory(category, title) {
      const resultNodes = document.querySelectorAll(\`#\${category}Results .result-line:not(.hidden)\`);
      const tokensToCopy = Array.from(resultNodes).map(node => node.dataset.token);

      if (tokensToCopy.length === 0) {
        showToast(\`没有可复制的 \${title}\`, "warning");
        return;
      }
      navigator.clipboard.writeText(tokensToCopy.join('\\n')).then(() => {
        showToast(\`\${title} 已复制到剪贴板 (共 \${tokensToCopy.length} 个)\`, "success");
      }).catch(err => {
        showToast("复制失败: " + err.message, "error");
      });
    }

    // ========== 文件处理 ==========
    function importFromFile() { 
      document.getElementById('fileInput').click(); 
    }

    function processFileContent(content) {
      const tokensTextarea = document.getElementById('tokens');
      const cleanContent = content.split(/[,\\n\\r]+/)
        .map(line => line.trim())
        .filter(line => line !== '')
        .join('\\n');
      tokensTextarea.value += (tokensTextarea.value.trim() ? '\\n' : '') + cleanContent;
      showToast('文件导入成功！共导入 ' + cleanContent.split('\\n').length + ' 个KEY', 'success');
    }

    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) readFile(file);
    }

    function readFile(file) {
      if (!file.name.toLowerCase().endsWith('.txt')) { 
        showToast('请选择 .txt 格式的文件', 'warning'); 
        return; 
      }
      const reader = new FileReader();
      reader.onload = e => processFileContent(e.target.result);
      reader.onerror = () => showToast('文件读取失败，请重试', 'error');
      reader.readAsText(file);
    }

    function setupDragAndDrop() {
      const textarea = document.getElementById('tokens');
      ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        textarea.addEventListener(eventName, e => { 
          e.preventDefault(); 
          e.stopPropagation(); 
        });
      });
      textarea.addEventListener('dragover', () => textarea.classList.add('drag-over'));
      textarea.addEventListener('dragleave', () => textarea.classList.remove('drag-over'));
      textarea.addEventListener('drop', e => {
        textarea.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
      });
    }

    // ========== UI 事件绑定 ==========
    function setupTabs() {
      const tabContainer = document.querySelector('.results-tabs');
      tabContainer.addEventListener('click', e => {
        const targetButton = e.target.closest('.tab-btn');
        if (!targetButton) return;
        const tabId = targetButton.dataset.tab;
        tabContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        targetButton.classList.add('active');
        document.querySelectorAll('.results-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
      });
    }

    function setupEventListeners() {
      // 搜索功能
      document.querySelectorAll('.search-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const panel = e.target.closest('.results-panel');
          panel.querySelectorAll('.result-line').forEach(line => {
            line.classList.toggle('hidden', !line.textContent.toLowerCase().includes(searchTerm));
          });
        });
      });

      // 排序功能
      document.querySelectorAll('.custom-select').forEach(select => {
        const trigger = select.querySelector('.custom-select-trigger');
        const options = select.querySelectorAll('.custom-option');
        
        trigger.addEventListener('click', () => {
          select.classList.toggle('open');
        });

        options.forEach(option => {
          option.addEventListener('click', () => {
            const selectedValue = option.dataset.value;
            if (select.dataset.value === selectedValue) {
              select.classList.remove('open');
              return;
            }
            select.dataset.value = selectedValue;
            trigger.querySelector('span').textContent = option.textContent;
            select.querySelector('.custom-option.selected').classList.remove('selected');
            option.classList.add('selected');
            select.classList.remove('open');
            select.dispatchEvent(new Event('change'));
          });
        });

        select.addEventListener('change', e => {
          const sortType = e.target.dataset.value;
          const panel = e.target.closest('.results-panel');
          const container = panel.querySelector('.results-content');
          const lines = Array.from(container.querySelectorAll('.result-line'));
          
          lines.sort((a, b) => {
            if (sortType === 'default') {
              return parseInt(a.dataset.order) - parseInt(b.dataset.order);
            }
            const balanceA = parseFloat(a.dataset.balance) || 0;
            const balanceB = parseFloat(b.dataset.balance) || 0;
            if (sortType === 'balance-desc') return balanceB - balanceA;
            if (sortType === 'balance-asc') return balanceA - balanceB;
          });

          lines.forEach(line => container.appendChild(line));
        });
      });

      // 点击外部关闭下拉菜单
      window.addEventListener('click', e => {
        document.querySelectorAll('.custom-select').forEach(select => {
          if (!select.contains(e.target)) {
            select.classList.remove('open');
          }
        });
      });
    }

    // ========== 页面初始化 ==========
    document.addEventListener('DOMContentLoaded', function() {
      // 初始化 Provider 选择器
      initializeProviderSelect();
      updateProviderConfig();
      
      // 绑定主要按钮事件
      document.getElementById('importBtn').addEventListener('click', importFromFile);
      document.getElementById('fileInput').addEventListener('change', handleFileSelect);
      document.getElementById('checkButton').addEventListener('click', checkTokens);
      document.getElementById('modalCloseBtn').addEventListener('click', closeCustomModal);
      
      // 绑定复制按钮事件
      ['valid', 'lowBalance', 'zeroBalance', 'rateLimit', 'invalid', 'duplicate'].forEach(cat => {
        const btn = document.getElementById('copy' + cat.charAt(0).toUpperCase() + cat.slice(1) + 'Btn');
        if(btn) {
          btn.addEventListener('click', () => {
            const titleEl = btn.closest('.panel-header').querySelector('.results-title');
            copyTokensFromCategory(cat, titleEl ? titleEl.textContent : cat);
          });
        }
      });

      // 设置拖拽功能
      setupDragAndDrop();
      
      // 设置标签页
      setupTabs();
      
      // 设置其他事件监听
      setupEventListeners();
    });

    // 将检测函数暴露到全局作用域
    window.checkOpenAIToken = checkOpenAIToken;
    window.checkAnthropicToken = checkAnthropicToken;
    window.checkGeminiToken = checkGeminiToken;
    window.checkXaiToken = checkXaiToken;
    window.checkOpenRouterToken = checkOpenRouterToken;
    window.checkGroqToken = checkGroqToken;
    window.checkGitHubToken = checkGitHubToken;
    window.checkSiliconFlowToken = checkSiliconFlowToken;
    window.checkDeepSeekToken = checkDeepSeekToken;
    window.checkMoonshotToken = checkMoonshotToken;
    window.checkAliyunToken = checkAliyunToken;
    window.checkZhipuToken = checkZhipuToken;
    
    // 将模型获取函数暴露到全局作用域
    window.fetchOpenAIModels = fetchOpenAIModels;
    window.fetchAnthropicModels = fetchAnthropicModels;
    window.fetchGoogleModels = fetchGoogleModels;
    window.fetchXAIModels = fetchXAIModels;
    window.fetchOpenRouterModels = fetchOpenRouterModels;
    window.fetchGroqModels = fetchGroqModels;
    window.fetchGitHubModels = fetchGitHubModels;
    window.fetchSiliconFlowModels = fetchSiliconFlowModels;
    window.fetchDeepSeekModels = fetchDeepSeekModels;
    window.fetchMoonshotModels = fetchMoonshotModels;
    window.fetchZhipuModels = fetchZhipuModels;
    
    // 暴露工具函数
    window.handleFetchModels = handleFetchModels;
    window.showCustomModal = showCustomModal;
    window.showToast = showToast;
    window.toggleAdvancedConfig = toggleAdvancedConfig;
  </script>
</body>
</html>`;
