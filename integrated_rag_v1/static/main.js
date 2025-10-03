// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  t.classList.add('active');
  document.querySelector(t.dataset.target).classList.add('active');
}));

function renderMD(target, text) {
  target.innerHTML = marked.parse(text || '');
}

// ✅ 升級：同時支援字串陣列、物件陣列（表格 sources）、或一般物件
function renderSources(target, sources) {
  if (!sources || (Array.isArray(sources) && sources.length === 0)) {
    target.textContent = '';
    return;
  }

  if (typeof sources === 'string') {
    target.innerHTML = '<b>Sources:</b> <code>' + sources + '</code>';
    return;
  }

  if (Array.isArray(sources)) {
    // 字串清單（原行為）
    if (sources.every(s => typeof s === 'string')) {
      target.innerHTML = '<b>Sources:</b> ' + sources.map(s => `<code>${s}</code>`).join(' · ');
      return;
    }
    // 物件清單（Table 回傳的 sheet / shape / columns_sample）
    const html = sources.map(s => {
      if (s && typeof s === 'object') {
        const sheet = s.sheet ?? '(Sheet)';
        const shape = Array.isArray(s.shape) ? `${s.shape[0]}×${s.shape[1]}` : '';
        const cols = Array.isArray(s.columns_sample) ? s.columns_sample.join(', ') : '';
        return `<div style="margin:4px 0;">
          <b>${sheet}</b> <small>${shape}</small><br/>
          <code>${cols}</code>
        </div>`;
      }
      return `<code>${String(s)}</code>`;
    }).join('');
    target.innerHTML = '<b>Sources:</b><br/>' + html;
    return;
  }

  // 其他型態 → JSON 顯示
  target.innerHTML = '<b>Sources:</b><pre style="margin:4px 0;">' +
    JSON.stringify(sources, null, 2) + '</pre>';
}

// Web
const formWeb = document.getElementById('form-web');
const outWeb = document.getElementById('out-web');
const srcWeb = document.getElementById('src-web');
formWeb.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formWeb);
  const body = { question: fd.get('question'), url: fd.get('url') };
  outWeb.textContent = '⏳ Running...';
  srcWeb.textContent = '';
  const res = await fetch('/ask_web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) { outWeb.textContent = '❌ ' + data.error; return; }
  renderMD(outWeb, data.answer);
  renderSources(srcWeb, data.sources);
});

// PDF
const formPdf = document.getElementById('form-pdf');
const outPdf = document.getElementById('out-pdf');
const srcPdf = document.getElementById('src-pdf');
formPdf.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formPdf);
  outPdf.textContent = '⏳ Running...';
  srcPdf.textContent = '';
  const res = await fetch('/ask_pdf', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.error) { outPdf.textContent = '❌ ' + data.error; return; }
  renderMD(outPdf, data.answer);
  renderSources(srcPdf, data.sources);
});

// AV
const formAv = document.getElementById('form-av');
const outAv = document.getElementById('out-av');
const srcAv = document.getElementById('src-av');
formAv.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(formAv);
  outAv.textContent = '⏳ Transcribing... (Whisper)';
  srcAv.textContent = '';
  const res = await fetch('/ask_av', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.error) { outAv.textContent = '❌ ' + data.error; return; }
  renderMD(outAv, data.answer);
  renderSources(srcAv, data.sources);
});

// ✅ Table
const formTable = document.getElementById('form-table');
if (formTable) {
  const outTable = document.getElementById('out-table');
  const srcTable = document.getElementById('src-table');

  formTable.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formTable);
    outTable.textContent = '⏳ Parsing table...';
    srcTable.textContent = '';
    try {
      const res = await fetch('/ask_table', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      renderMD(outTable, data.answer);
      renderSources(srcTable, data.sources);
    } catch (err) {
      outTable.textContent = '❌ ' + err.message;
    }
  });
}
