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
function renderSources(target, sources) {
  if (!sources || !sources.length) { target.textContent = ''; return; }
  target.innerHTML = '<b>Sources:</b> ' + sources.map(s => `<code>${s}</code>`).join(' · ');
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
