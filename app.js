// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// Initialize theme on load
initTheme();

// State
const state = {
  apiKey: localStorage.getItem('pollinations_api_key') || '',
  history: JSON.parse(localStorage.getItem('pollinations_history') || '[]'),
  isGenerating: false,
  // 批量生成状态
  batchMode: false,
  batchCount: 4,
  batchResults: [],
  batchProgress: { current: 0, total: 0 }
};

// Default config
const defaults = {
  model: 'z-image-turbo',
  width: 512,
  height: 512,
  seed: -1,
  enhance: false,
  nologo: true,
  safe: false,
  quality: 'medium'
};

// Available models (image only)
const imageModels = [
  'z-image-turbo', 'z-image', 'zimage', 'flux', 'turbo',
  'gptimage', 'gptimage-large', 'kontext',
  'seedream', 'seedream-pro', 'nanobanana', 'nanobanana-pro'
];

// Quality options
const qualityOptions = ['low', 'medium', 'high', 'hd'];

// Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Modal functions
function openModal() {
  document.getElementById('apiModal').classList.add('show');
  document.getElementById('apiKey').value = state.apiKey;
}

function closeModal() {
  document.getElementById('apiModal').classList.remove('show');
}

// Render params panel
function renderParamsPanel() {
  const modelOpts = imageModels.map(m =>
    `<option value="${m}" ${m === defaults.model ? 'selected' : ''}>${m}</option>`
  ).join('');
  const qualityOpts = qualityOptions.map(q =>
    `<option value="${q}" ${q === defaults.quality ? 'selected' : ''}>${q}</option>`
  ).join('');

  document.getElementById('params-panel').innerHTML = `
    <div class="sidebar-header"><h2>生成参数</h2></div>
    <div class="sidebar-content">
      <div class="form-section">
        <div class="form-group">
          <label>提示词</label>
          <textarea id="prompt" placeholder="描述您想要生成的图片..."></textarea>
        </div>
        <div class="form-group">
          <label>反向提示词</label>
          <input type="text" id="negativePrompt" value="worst quality, blurry" placeholder="需要避免的内容...">
        </div>
      </div>
      <div class="form-section">
        <div class="form-group">
          <label>模型</label>
          <select id="model">${modelOpts}</select>
        </div>
        <div class="row">
          <div class="form-group">
            <label>宽度</label>
            <input type="number" id="width" value="${defaults.width}" min="64" max="2048">
          </div>
          <div class="form-group">
            <label>高度</label>
            <input type="number" id="height" value="${defaults.height}" min="64" max="2048">
          </div>
        </div>
        <div class="row">
          <div class="form-group">
            <label>种子</label>
            <input type="number" id="seed" value="${defaults.seed}" min="-1" placeholder="-1 随机">
          </div>
          <div class="form-group">
            <label>质量</label>
            <select id="quality">${qualityOpts}</select>
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="row">
          <div class="form-group">
            <label>引导系数</label>
            <input type="number" id="guidanceScale" value="" step="0.5" min="1" max="20" placeholder="1-20">
          </div>
          <div class="form-group">
            <label>参考图片</label>
            <input type="text" id="imageUrl" placeholder="URL">
          </div>
        </div>
        <div class="checkbox-group">
          <label class="checkbox-label"><input type="checkbox" id="enhance">优化提示词</label>
          <label class="checkbox-label"><input type="checkbox" id="nologo" checked>无水印</label>
          <label class="checkbox-label"><input type="checkbox" id="safe">安全模式</label>
          <label class="checkbox-label"><input type="checkbox" id="transparent">透明背景</label>
        </div>
      </div>
      <div class="form-section">
        <div class="batch-toggle">
          <label class="checkbox-label" style="flex:1;">
            <input type="checkbox" id="batchMode" onchange="toggleBatchMode()">批量生成
          </label>
          <select id="batchCount" style="width:80px;" ${state.batchMode ? '' : 'disabled'}>
            <option value="2">2张</option>
            <option value="4" selected>4张</option>
            <option value="6">6张</option>
            <option value="9">9张</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" id="generateBtn" onclick="handleGenerate()">生成图片</button>
    </div>
  `;
}

// Render result panel
function renderResultPanel(imageUrl = null, loading = false) {
  let content = '';
  if (loading) {
    content = `
      <div class="result-container">
        <div style="text-align:center;">
          <div class="spinner"></div>
          <p style="margin-top:16px;color:#666;">正在生成图片...</p>
        </div>
      </div>`;
  } else if (imageUrl) {
    content = `
      <div class="result-container">
        <img src="${imageUrl}" alt="Generated">
      </div>
      <div class="result-actions">
        <a href="${imageUrl}" download class="btn btn-secondary" style="text-decoration:none;">下载图片</a>
        <button class="btn btn-secondary" onclick="copyUrl('${imageUrl}')">复制链接</button>
      </div>`;
  } else {
    content = `
      <div class="result-container">
        <p style="color:#999;">生成的图片将显示在这里</p>
      </div>`;
  }
  document.getElementById('result-panel').innerHTML = content;
}

// Render batch result panel
function renderBatchResultPanel() {
  const { current, total } = state.batchProgress;
  const results = state.batchResults;

  let progressHtml = `
    <div class="batch-progress">
      <div class="progress-text">生成进度: ${current}/${total}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${(current/total)*100}%"></div>
      </div>
    </div>`;

  let gridHtml = '<div class="batch-grid">';
  for (let i = 0; i < total; i++) {
    const result = results[i];
    if (result && result.success) {
      gridHtml += `
        <div class="batch-item" onclick="showBatchImage(${i})">
          <img src="${result.url}" alt="Generated ${i+1}">
          <div class="batch-item-overlay">
            <span class="batch-item-number">${i+1}</span>
          </div>
        </div>`;
    } else if (result && !result.success) {
      gridHtml += `
        <div class="batch-item batch-item-error">
          <div class="batch-error-icon">✕</div>
          <div class="batch-error-text">失败</div>
        </div>`;
    } else {
      gridHtml += `
        <div class="batch-item batch-item-loading">
          <div class="spinner-small"></div>
        </div>`;
    }
  }
  gridHtml += '</div>';

  let actionsHtml = '';
  if (current === total && results.some(r => r && r.success)) {
    actionsHtml = `
      <div class="result-actions">
        <button class="btn btn-secondary" onclick="downloadAllBatch()">下载全部</button>
        <button class="btn btn-secondary" onclick="clearBatchResults()">清除结果</button>
      </div>`;
  }

  document.getElementById('result-panel').innerHTML = progressHtml + gridHtml + actionsHtml;
}

// Render history panel
function renderHistoryPanel() {
  let content = '';
  if (state.history.length === 0) {
    content = `
      <div class="history-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <p>暂无历史记录</p>
      </div>`;
  } else {
    content = `
      <div class="history-list">
        ${state.history.map((item, i) => `
          <div class="history-item" onclick="loadFromHistory(${i})">
            <img src="${item.url}" alt="历史图片">
            <div class="history-prompt">${item.prompt}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary" style="width:100%;margin-top:16px;" onclick="clearHistory()">清除历史</button>
    `;
  }
  document.getElementById('history-panel').innerHTML = `
    <div class="sidebar-header"><h2>历史记录 (${state.history.length})</h2></div>
    <div class="sidebar-content">${content}</div>
  `;
}

// Save API key
function saveApiKey() {
  const key = document.getElementById('apiKey').value.trim();
  state.apiKey = key;
  localStorage.setItem('pollinations_api_key', key);
  closeModal();
  alert('API 密钥已保存！');
}

// Generate image
async function generateImage() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) {
    alert('请输入提示词');
    return;
  }

  state.isGenerating = true;
  document.getElementById('generateBtn').disabled = true;
  renderResultPanel(null, true);

  const params = new URLSearchParams();
  params.set('model', document.getElementById('model').value);
  params.set('width', document.getElementById('width').value);
  params.set('height', document.getElementById('height').value);
  params.set('seed', document.getElementById('seed').value);
  params.set('quality', document.getElementById('quality').value);

  const negPrompt = document.getElementById('negativePrompt').value.trim();
  if (negPrompt) params.set('negative_prompt', negPrompt);

  const guidance = document.getElementById('guidanceScale').value;
  if (guidance) params.set('guidance_scale', guidance);

  const imageUrl = document.getElementById('imageUrl').value.trim();
  if (imageUrl) params.set('image', imageUrl);

  if (document.getElementById('enhance').checked) params.set('enhance', 'true');
  if (document.getElementById('nologo').checked) params.set('nologo', 'true');
  if (document.getElementById('safe').checked) params.set('safe', 'true');
  if (document.getElementById('transparent').checked) params.set('transparent', 'true');

  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`;

  try {
    const fetchOptions = {};
    if (state.apiKey) {
      fetchOptions.headers = {
        'Authorization': `Bearer ${state.apiKey}`
      };
    }

    const response = await fetch(url, fetchOptions);
    if (!response.ok) throw new Error('生成失败');

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    addToHistory({ prompt, url: base64 });
    renderResultPanel(base64);
  } catch (err) {
    alert('错误: ' + err.message);
    renderResultPanel();
  } finally {
    state.isGenerating = false;
    document.getElementById('generateBtn').disabled = false;
  }
}

// Add to history
function addToHistory(item) {
  state.history.unshift(item);
  if (state.history.length > 20) state.history.pop();
  localStorage.setItem('pollinations_history', JSON.stringify(state.history));
  renderHistoryPanel();
}

// Load from history
function loadFromHistory(index) {
  const item = state.history[index];
  if (item) {
    document.getElementById('prompt').value = item.prompt;
    renderResultPanel(item.url);
  }
}

// Clear history
function clearHistory() {
  if (confirm('确定要清除所有历史记录吗？')) {
    state.history = [];
    localStorage.removeItem('pollinations_history');
    renderHistoryPanel();
  }
}

// Copy URL
function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert('链接已复制！');
  });
}

// Show batch image in modal/fullscreen
function showBatchImage(index) {
  const result = state.batchResults[index];
  if (result && result.success) {
    renderResultPanel(result.url);
  }
}

// Download all batch images
function downloadAllBatch() {
  state.batchResults.forEach((result, i) => {
    if (result && result.success) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = `generated_${i + 1}.png`;
      link.click();
    }
  });
}

// Clear batch results
function clearBatchResults() {
  state.batchResults = [];
  state.batchProgress = { current: 0, total: 0 };
  renderResultPanel();
}

// Toggle batch mode
function toggleBatchMode() {
  state.batchMode = document.getElementById('batchMode').checked;
  document.getElementById('batchCount').disabled = !state.batchMode;
}

// Handle generate button click
function handleGenerate() {
  if (state.batchMode) {
    state.batchCount = parseInt(document.getElementById('batchCount').value);
    generateBatch();
  } else {
    generateImage();
  }
}

// Build generation URL with params
function buildGenerationUrl(prompt, customSeed = null) {
  const params = new URLSearchParams();
  params.set('model', document.getElementById('model').value);
  params.set('width', document.getElementById('width').value);
  params.set('height', document.getElementById('height').value);
  params.set('quality', document.getElementById('quality').value);

  // Use custom seed or random for batch
  const seed = customSeed !== null ? customSeed : Math.floor(Math.random() * 999999);
  params.set('seed', seed);

  const negPrompt = document.getElementById('negativePrompt').value.trim();
  if (negPrompt) params.set('negative_prompt', negPrompt);

  const guidance = document.getElementById('guidanceScale').value;
  if (guidance) params.set('guidance_scale', guidance);

  const imageUrl = document.getElementById('imageUrl').value.trim();
  if (imageUrl) params.set('image', imageUrl);

  if (document.getElementById('enhance').checked) params.set('enhance', 'true');
  if (document.getElementById('nologo').checked) params.set('nologo', 'true');
  if (document.getElementById('safe').checked) params.set('safe', 'true');
  if (document.getElementById('transparent').checked) params.set('transparent', 'true');

  return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`;
}

// Generate single image for batch
async function generateSingleForBatch(prompt, index) {
  const url = buildGenerationUrl(prompt);
  const fetchOptions = {};
  if (state.apiKey) {
    fetchOptions.headers = { 'Authorization': `Bearer ${state.apiKey}` };
  }

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) throw new Error('生成失败');
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    return { success: true, url: base64, prompt, index };
  } catch (err) {
    return { success: false, error: err.message, prompt, index };
  }
}

// Batch generate images
async function generateBatch() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) {
    alert('请输入提示词');
    return;
  }

  state.isGenerating = true;
  state.batchResults = [];
  state.batchProgress = { current: 0, total: state.batchCount };
  document.getElementById('generateBtn').disabled = true;

  renderBatchResultPanel();

  // Generate images concurrently (max 3 at a time)
  const concurrency = 3;
  const results = [];

  for (let i = 0; i < state.batchCount; i += concurrency) {
    const batch = [];
    for (let j = i; j < Math.min(i + concurrency, state.batchCount); j++) {
      batch.push(generateSingleForBatch(prompt, j));
    }

    const batchResults = await Promise.all(batch);

    for (const result of batchResults) {
      results.push(result);
      state.batchProgress.current++;
      state.batchResults = results;
      renderBatchResultPanel();
    }
  }

  // Add successful results to history
  for (const result of results) {
    if (result.success) {
      addToHistory({ prompt, url: result.url });
    }
  }

  state.isGenerating = false;
  document.getElementById('generateBtn').disabled = false;
}

// Initialize
function init() {
  renderParamsPanel();
  renderResultPanel();
  renderHistoryPanel();

  // Close modal on overlay click
  document.getElementById('apiModal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
