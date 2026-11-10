/**
 * ATS-Lens AI — Client-Side Resume vs. Job Description Matcher & Impact Analyzer
 * Automatically reads shared AI Engine config from Krishna.OS (`localStorage.kg_ai_config`)
 */
(function () {
  'use strict';

  const CONFIG_KEY = 'kg_ai_config';

  // Configure PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const STOPWORDS = new Set([
    'a','an','and','are','as','at','be','by','for','from','has','have','he','in','is','it','its','of','on','or',
    'that','the','to','was','were','will','with','we','you','your','our','their','they','this','these','those',
    'can','could','would','should','about','into','over','under','such','more','most','other','some','all','any',
    'both','each','few','many','must','using','used','use','work','working','role','team','ability','strong',
    'experience','years','year','required','preferred','plus','good','great','including','etc','well','also'
  ]);

  const WEAK_VERBS = ['worked on', 'helped', 'assisted', 'responsible for', 'handled', 'participated in', 'did', 'made'];

  const SAMPLE_RESUME = `KRISHNA GUPTA — AI & Full-Stack Engineer
Skills: Python, Java, C++, JavaScript, TypeScript, PyTorch, TensorFlow, OpenCV, MediaPipe, Qdrant, MySQL, Git, GitHub Actions, Docker

Experience & Projects:
- Built ZeroTouchSec computer vision HCI framework using PyTorch and OpenCV reducing touch interaction latency by 42%.
- Worked on JavaLabPortal 3-tier MVC portal with JSP, Servlets, and connection-pooled JDBC serving 300+ academic records.
- Helped design PromptShield AI security scanner detecting OWASP LLM01 prompt injections and indirect RAG poisoning in under 5ms.
- Developed DocuVector AI client-side semantic vector search engine using TF-IDF embeddings and cosine similarity.`;

  const SAMPLE_JD = `Software Engineer — Applied AI & Backend Systems
Requirements:
- Strong proficiency in Python, TypeScript, or Java with production backend or API experience.
- Experience with PyTorch, Vector Databases (Qdrant, Pinecone, or FAISS), RAG pipelines, and LLM Security / Guardrails.
- Familiarity with Docker, CI/CD (GitHub Actions), SQL databases (PostgreSQL or MySQL), and REST APIs.
- Bonus: Experience with Edge AI, WebGL/ONNX/TensorFlow.js, Kubernetes, and measurable latency optimization.`;

  // DOM
  const resumeInput = document.getElementById('resumeInput');
  const jdInput = document.getElementById('jdInput');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnAnalyze = document.getElementById('btnAnalyze');
  const btnCopyReport = document.getElementById('btnCopyReport');
  const btnAiRewrite = document.getElementById('btnAiRewrite');
  const aiEngineBadge = document.getElementById('aiEngineBadge');

  const matchScoreVal = document.getElementById('matchScoreVal');
  const matchBar = document.getElementById('matchBar');
  const matchedCountVal = document.getElementById('matchedCountVal');
  const missingCountVal = document.getElementById('missingCountVal');
  const impactScoreVal = document.getElementById('impactScoreVal');
  const impactSubVal = document.getElementById('impactSubVal');
  const matchedChips = document.getElementById('matchedChips');
  const missingChips = document.getElementById('missingChips');
  const bulletAuditList = document.getElementById('bulletAuditList');

  let lastAuditMarkdown = '';
  let lastWeakBullets = [];

  function getAiConfig() {
    try {
      const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      if (cfg.provider && cfg.provider !== 'offline') {
        aiEngineBadge.textContent = `Engine: ${cfg.provider.toUpperCase()} (${cfg.model || 'Active'})`;
        return cfg;
      }
    } catch {}
    aiEngineBadge.textContent = 'Engine: Offline NLP';
    return { provider: 'offline' };
  }

  function extractKeywords(text) {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9.+#/\-\s]/g, ' ')
      .split(/\s+/)
      .map(t => t.replace(/^[.\-/]+|[.\-/]+$/g, ''))
      .filter(t => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));

    const freq = new Map();
    tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0])
      .slice(0, 40);
  }

  function runAudit() {
    const resume = resumeInput.value.trim();
    const jd = jdInput.value.trim();

    if (!resume || !jd) return;

    const jdKeywords = extractKeywords(jd);
    const resumeLower = resume.toLowerCase();

    const matched = [];
    const missing = [];

    jdKeywords.forEach(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      if (regex.test(resumeLower)) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const matchPct = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 0;

    matchScoreVal.textContent = `${matchPct}%`;
    matchBar.style.width = `${matchPct}%`;
    matchedCountVal.textContent = matched.length;
    missingCountVal.textContent = missing.length;

    matchedChips.innerHTML = matched.map(k => `<span class="kw-chip hit">${k}</span>`).join('') || '<span class="empty-msg">None matched yet</span>';
    missingChips.innerHTML = missing.slice(0, 24).map(k => `<span class="kw-chip miss">${k}</span>`).join('') || '<span class="empty-msg">Zero gaps found!</span>';

    // Bullet Impact Analysis
    const bullets = resume
      .split('\n')
      .map(l => l.trim())
      .filter(l => /^[-•*]\s+/.test(l) || l.length > 45);

    let quantified = 0;
    lastWeakBullets = [];
    bulletAuditList.innerHTML = '';

    bullets.forEach((b, idx) => {
      const hasNumber = /(\d+%|\d+\+|\$\d+|\d+ms|\d+x|\d+\s*(users|records|docs|sec|ms|gb))/i.test(b);
      const weakVerb = WEAK_VERBS.find(v => b.toLowerCase().includes(v));

      if (hasNumber && !weakVerb) quantified++;

      const issues = [];
      if (!hasNumber) issues.push('Missing quantified metric (%, ms, scale)');
      if (weakVerb) issues.push(`Weak phrase: "${weakVerb}" -> use Engineered / Architected / Reduced`);

      const isStrong = issues.length === 0;
      if (!isStrong) lastWeakBullets.push({ idx, text: b, issues });

      const div = document.createElement('div');
      div.className = `bullet-item ${isStrong ? 'strong' : ''}`;
      div.id = `bullet-${idx}`;
      div.innerHTML = `
        <div>${b}</div>
        <div class="bullet-meta">${isStrong ? '✅ Strong impact & quantified metric' : '⚠️ ' + issues.join(' • ')}</div>
      `;
      bulletAuditList.appendChild(div);
    });

    const impactPct = bullets.length > 0 ? Math.round((quantified / bullets.length) * 100) : 0;
    impactScoreVal.textContent = `${impactPct}%`;
    impactSubVal.textContent = `${quantified} / ${bullets.length} bullets quantified`;

    lastAuditMarkdown = `# ATS-Lens AI Audit Report
- **Match Score**: ${matchPct}% (${matched.length}/${jdKeywords.length} JD keywords)
- **Impact Metric Ratio**: ${impactPct}% (${quantified}/${bullets.length} quantified bullets)
- **Matched**: ${matched.join(', ')}
- **Missing Priority Keywords**: ${missing.slice(0, 15).join(', ')}`;
  }

  // PDF Client-Side Extractor
  resumeFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf') && window.pdfjsLib) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let extracted = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extracted += content.items.map(item => item.str).join(' ') + '\n';
      }
      resumeInput.value = extracted.trim();
    } else {
      resumeInput.value = await file.text();
    }
    runAudit();
  });

  // Optional Shared AI Engine Bullet Rewriter
  async function callSharedAi(prompt) {
    const cfg = getAiConfig();
    if (cfg.provider === 'ollama') {
      const res = await fetch(cfg.endpoint || 'http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model || 'qwen2.5:7b', messages: [{ role: 'user', content: prompt }], stream: false })
      });
      const data = await res.json();
      return data.message?.content || data.response || '';
    }
    if (cfg.provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || 'gemini-2.5-flash'}:generateContent?key=${cfg.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    if (cfg.provider === 'groq' || cfg.provider === 'openai') {
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
    return null;
  }

  btnAiRewrite.addEventListener('click', async () => {
    if (lastWeakBullets.length === 0) {
      alert('All scanned bullets already look quantified and strong, or run audit first!');
      return;
    }
    const cfg = getAiConfig();
    if (cfg.provider === 'offline') {
      // Deterministic offline upgrade suggestion
      lastWeakBullets.forEach(wb => {
        const el = document.getElementById(`bullet-${wb.idx}`);
        if (!el || el.querySelector('.ai-rewrite-box')) return;
        const improved = wb.text
          .replace(/worked on/i, 'Engineered')
          .replace(/helped/i, 'Architected')
          .replace(/assisted/i, 'Delivered') + ' [Add metric: e.g., cutting latency by X% / serving N+ users]';
        const box = document.createElement('div');
        box.className = 'ai-rewrite-box';
        box.textContent = `Offline Suggestion: ${improved} (Tip: Configure Ollama/API in Krishna.OS for deep AI rewrites)`;
        el.appendChild(box);
      });
      return;
    }

    btnAiRewrite.textContent = 'Optimizing via AI...';
    btnAiRewrite.disabled = true;
    try {
      const missingStr = Array.from(missingChips.querySelectorAll('.kw-chip')).slice(0, 8).map(c => c.textContent).join(', ');
      for (const wb of lastWeakBullets.slice(0, 4)) {
        const el = document.getElementById(`bullet-${wb.idx}`);
        const prompt = `Rewrite this single resume bullet to use a strong engineering action verb and placeholder metric [X%] without inventing fake skills. Missing JD keywords for context: ${missingStr}.\nBullet: "${wb.text}"\nReply with ONLY the rewritten bullet.`;
        const rewritten = await callSharedAi(prompt);
        if (el && rewritten) {
          const box = document.createElement('div');
          box.className = 'ai-rewrite-box';
          box.textContent = `AI Rewrite: ${rewritten.trim()}`;
          el.appendChild(box);
        }
      }
    } catch (err) {
      alert(`AI rewrite failed: ${err.message}`);
    } finally {
      btnAiRewrite.textContent = 'AI Optimize Weak Bullets ✨';
      btnAiRewrite.disabled = false;
    }
  });

  btnLoadSample.addEventListener('click', () => {
    resumeInput.value = SAMPLE_RESUME;
    jdInput.value = SAMPLE_JD;
    runAudit();
  });

  btnAnalyze.addEventListener('click', runAudit);
  resumeInput.addEventListener('input', runAudit);
  jdInput.addEventListener('input', runAudit);

  btnCopyReport.addEventListener('click', () => {
    if (!lastAuditMarkdown) return;
    navigator.clipboard.writeText(lastAuditMarkdown).then(() => {
      btnCopyReport.textContent = 'Copied!';
      setTimeout(() => { btnCopyReport.textContent = 'Copy Audit MD'; }, 1600);
    });
  });

  getAiConfig();
  resumeInput.value = SAMPLE_RESUME;
  jdInput.value = SAMPLE_JD;
  runAudit();
})();
