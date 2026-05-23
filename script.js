/* Summarix AI — vanilla JS (accuracy-upgraded) */
(function(){
  'use strict';

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const saved = localStorage.getItem('sx-theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  }
  document.getElementById('themeToggle').addEventListener('click', () => {
    root.classList.toggle('dark');
    localStorage.setItem('sx-theme', root.classList.contains('dark') ? 'dark' : 'light');
  });

  /* ---------- Mobile nav ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.getElementById('navLinks');
  menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.addEventListener('click', e => { if (e.target.tagName === 'A') navLinks.classList.remove('open'); });

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- PDF.js setup ---------- */
  function ensurePdfJs(){
    return new Promise((resolve) => {
      const check = () => {
        if (window.pdfjsLib){
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        } else setTimeout(check, 50);
      };
      check();
    });
  }

  /* ---------- Upload ---------- */
  const dz = document.getElementById('dropzone');
  const fi = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropTitle = document.getElementById('dropTitle');
  const dropSub = document.getElementById('dropSub');
  const progressEl = document.getElementById('progress');
  const barEl = document.getElementById('bar');
  const filemeta = document.getElementById('filemeta');

  const open = () => fi.click();
  dz.addEventListener('click', (e) => { if (e.target === browseBtn) return; open(); });
  browseBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }});
  fi.addEventListener('change', () => fi.files[0] && handleFile(fi.files[0]));

  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  async function handleFile(file){
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')){
      alert('Please upload a PDF file.'); return;
    }
    if (file.size > 25 * 1024 * 1024){ alert('File too large. Max 25MB.'); return; }

    dropTitle.textContent = file.name;
    dropSub.textContent = (file.size/1024/1024).toFixed(2) + ' MB · extracting…';
    progressEl.hidden = false;
    barEl.style.width = '5%';

    await ensurePdfJs();
    try{
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const total = pdf.numPages;
      const pageTexts = [];
      for (let i=1;i<=total;i++){
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Reconstruct lines using y-coordinates for cleaner sentence flow
        const items = content.items;
        const lines = new Map();
        for (const it of items){
          const y = Math.round((it.transform ? it.transform[5] : 0) * 10) / 10;
          if (!lines.has(y)) lines.set(y, []);
          lines.get(y).push(it);
        }
        const ys = [...lines.keys()].sort((a,b)=>b-a); // top to bottom
        const pageStr = ys.map(y => lines.get(y)
          .sort((a,b)=> (a.transform?a.transform[4]:0) - (b.transform?b.transform[4]:0))
          .map(it => it.str).join(' ')
        ).join('\n');
        pageTexts.push(pageStr);
        barEl.style.width = (10 + (i/total)*85) + '%';
      }
      const fullText = cleanText(pageTexts.join('\n\n'));
      barEl.style.width = '100%';
      filemeta.hidden = false;
      filemeta.textContent = `${total} pages · ${countWords(fullText).toLocaleString()} words extracted`;
      setTimeout(() => { progressEl.hidden = true; barEl.style.width = '0%'; }, 600);

      processDocument(fullText, total, file.name);
    } catch(err){
      console.error(err);
      alert('Could not read PDF: ' + err.message);
      progressEl.hidden = true;
    }
  }

  /* ---------- Text cleanup ---------- */
  function cleanText(t){
    return t
      .replace(/-\n(\w)/g, '$1')           // de-hyphenate line breaks
      .replace(/\u00ad/g, '')              // soft hyphens
      .replace(/[ \t]+/g, ' ')             // collapse spaces
      .replace(/\n{3,}/g, '\n\n')          // collapse blank lines
      .replace(/(\w)\n(\w)/g, '$1 $2')     // join wrapped lines inside paragraphs
      .replace(/\s+([.,;:!?])/g, '$1')     // tighten punctuation
      .trim();
  }

  /* ---------- NLP helpers ---------- */
  const STOPWORDS = new Set("a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be,because,been,before,being,below,between,both,but,by,can,can't,cannot,could,couldn't,did,didn't,do,does,doesn't,doing,don't,down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her,here,here's,hers,herself,him,himself,his,how,how's,i,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its,itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their,theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to,too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where,where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're,you've,your,yours,yourself,yourselves,also,may,might,one,two,three,many,much,upon,within,without,whose,however,thus,therefore,among,across,toward,towards,per,via,e.g,i.e,etc,used,using,use,make,made,get,got,like,just,well,often,since,still,now,new,old,way,ways,thing,things,part,parts,able,based,due,able".split(','));

  const ABBREV = new Set(['mr','mrs','ms','dr','prof','sr','jr','st','vs','etc','e.g','i.e','fig','no','vol','approx','inc','ltd','co','cf','al']);

  function countWords(t){ return (t.trim().match(/\S+/g) || []).length; }

  // Robust sentence splitter: respects abbreviations, decimals, quotes
  function splitSentences(text){
    const out = [];
    const re = /[^.!?]+[.!?]+["')\]]?(?=\s+|$)/g;
    let m, buf = '';
    const flush = (s) => { s = s.trim(); if (s) out.push(s); };
    while ((m = re.exec(text)) !== null){
      let s = m[0].trim();
      const prev = s.replace(/[.!?"')\]]+$/, '').split(/\s+/).pop().toLowerCase();
      const next = text.slice(re.lastIndex).trimStart()[0];
      // Merge if abbreviation, single capital initial, decimal, or next char is lowercase
      const isAbbrev = ABBREV.has(prev) || /^[a-z]$/i.test(prev) && prev.length === 1;
      const isDecimal = /\d\.$/.test(s) && /^\d/.test(next || '');
      if (isAbbrev || isDecimal || (next && /[a-z]/.test(next))){
        buf += (buf ? ' ' : '') + s;
        continue;
      }
      flush(buf ? buf + ' ' + s : s);
      buf = '';
    }
    if (buf) flush(buf);
    // Filter junk: too short, mostly numbers/symbols, page headers, references
    return out
      .map(s => s.replace(/\s+/g,' ').trim())
      .filter(s => {
        const w = s.split(' ');
        if (w.length < 5 || w.length > 80) return false;
        if (s.length < 30) return false;
        const letters = (s.match(/[a-zA-Z]/g)||[]).length;
        if (letters / s.length < 0.55) return false;
        if (/^(page|figure|table|fig\.|chapter|section)\s+\d+/i.test(s)) return false;
        return true;
      });
  }

  function tokenize(text){
    return text.toLowerCase()
      .replace(/[^a-z0-9'\s-]/g,' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && w.length < 24 && !STOPWORDS.has(w) && !/^\d+$/.test(w) && !/^-+$/.test(w));
  }

  function bigrams(tokens){
    const out = [];
    for (let i=0;i<tokens.length-1;i++) out.push(tokens[i]+' '+tokens[i+1]);
    return out;
  }

  function wordFreq(words){
    const f = Object.create(null);
    for (const w of words) f[w] = (f[w]||0)+1;
    return f;
  }

  // TF-IDF style: term importance = tf * log(N / df)
  function computeIdf(sentenceTokens){
    const N = sentenceTokens.length || 1;
    const df = Object.create(null);
    for (const toks of sentenceTokens){
      const seen = new Set(toks);
      for (const w of seen) df[w] = (df[w]||0) + 1;
    }
    const idf = Object.create(null);
    for (const w in df) idf[w] = Math.log(1 + N / df[w]);
    return idf;
  }

  /* ---------- TextRank (lightweight) ---------- */
  function textRank(sentenceTokens, iterations = 25, damping = 0.85){
    const N = sentenceTokens.length;
    if (N === 0) return [];
    const sets = sentenceTokens.map(t => new Set(t));
    const lens = sets.map(s => Math.log(1 + s.size));
    // Build similarity matrix (sparse via row arrays)
    const sim = Array.from({length:N}, ()=>[]);
    for (let i=0;i<N;i++){
      for (let j=i+1;j<N;j++){
        if (!sets[i].size || !sets[j].size) continue;
        let overlap = 0;
        const a = sets[i], b = sets[j];
        if (a.size < b.size){ for (const w of a) if (b.has(w)) overlap++; }
        else { for (const w of b) if (a.has(w)) overlap++; }
        if (!overlap) continue;
        const denom = lens[i] + lens[j];
        if (denom <= 0) continue;
        const w = overlap / denom;
        sim[i].push([j,w]); sim[j].push([i,w]);
      }
    }
    // Normalize outgoing weights
    const outSum = sim.map(row => row.reduce((a,[,w])=>a+w,0) || 1);
    let scores = new Array(N).fill(1/N);
    for (let it=0; it<iterations; it++){
      const next = new Array(N).fill((1-damping)/N);
      for (let i=0;i<N;i++){
        for (const [j,w] of sim[i]){
          next[j] += damping * (scores[i] * w / outSum[i]);
        }
      }
      scores = next;
    }
    return scores;
  }

  /* ---------- Scoring + MMR de-duplication ---------- */
  function scoreSentences(sentences){
    const sentTokens = sentences.map(tokenize);
    const tr = textRank(sentTokens);
    const idf = computeIdf(sentTokens);
    const allTokens = sentTokens.flat();
    const tf = wordFreq(allTokens);
    const maxTf = Math.max(1, ...Object.values(tf));

    return sentences.map((s, i) => {
      const toks = sentTokens[i];
      if (!toks.length) return { s, i, toks, score: 0, vec: new Set() };
      const tfidf = toks.reduce((a,w)=> a + (tf[w]/maxTf) * (idf[w]||0), 0) / Math.sqrt(toks.length);
      const posBoost = 1 + Math.max(0, 1 - i/sentences.length) * 0.20;
      const len = toks.length;
      const lenBoost = len >= 10 && len <= 32 ? 1.15 : (len < 6 || len > 45 ? 0.75 : 1.0);
      const numBoost = /\b\d{2,}\b|\d+%|\$\d/.test(s) ? 1.08 : 1.0;   // facts, figures
      const cueBoost = /\b(conclud|result|therefore|in summary|overall|shows that|demonstrat|found that|propose|key|important|significant)\b/i.test(s) ? 1.18 : 1.0;
      const score = (0.55 * tr[i] * 100 + 0.45 * tfidf) * posBoost * lenBoost * numBoost * cueBoost;
      return { s, i, toks, score, vec: new Set(toks) };
    });
  }

  function jaccard(a, b){
    if (!a.size || !b.size) return 0;
    let inter = 0;
    const [small,big] = a.size < b.size ? [a,b] : [b,a];
    for (const w of small) if (big.has(w)) inter++;
    return inter / (a.size + b.size - inter);
  }

  // Maximal Marginal Relevance: balance relevance vs novelty
  function mmrSelect(scored, count, lambda = 0.72){
    const pool = scored.filter(x => x.score > 0).slice().sort((a,b)=>b.score-a.score);
    const picked = [];
    while (picked.length < count && pool.length){
      let bestIdx = 0, bestVal = -Infinity;
      for (let k=0;k<pool.length;k++){
        const cand = pool[k];
        let maxSim = 0;
        for (const p of picked){ const s = jaccard(cand.vec, p.vec); if (s>maxSim) maxSim = s; }
        const val = lambda * cand.score - (1-lambda) * maxSim * 100;
        if (val > bestVal){ bestVal = val; bestIdx = k; }
      }
      picked.push(pool.splice(bestIdx,1)[0]);
    }
    return picked.sort((a,b)=>a.i-b.i);
  }

  /* ---------- Keyword extraction (unigrams + bigrams) ---------- */
  function extractKeywords(sentences, n){
    const sentTokens = sentences.map(tokenize);
    const idf = computeIdf(sentTokens);
    const uni = wordFreq(sentTokens.flat());
    const bi = wordFreq(sentTokens.flatMap(bigrams));
    const scored = [];
    for (const w in uni) scored.push([w, uni[w] * (idf[w]||0)]);
    for (const p in bi){
      if (bi[p] < 2) continue;
      const [a,b] = p.split(' ');
      const phraseIdf = ((idf[a]||0) + (idf[b]||0)) / 2;
      scored.push([p, bi[p] * phraseIdf * 1.6]); // favor multi-word phrases
    }
    // Dedup: drop unigrams already covered by a higher-scoring bigram
    scored.sort((a,b)=>b[1]-a[1]);
    const out = [], used = new Set();
    for (const [term] of scored){
      const parts = term.split(' ');
      if (parts.some(p => used.has(p) && parts.length === 1)) continue;
      out.push(term);
      parts.forEach(p => used.add(p));
      if (out.length >= n) break;
    }
    return out;
  }

  /* ---------- Process & render ---------- */
  let currentData = null;

  function processDocument(text, pages, filename){
    const words = countWords(text);
    const sentences = splitSentences(text);
    const scored = scoreSentences(sentences);
    const keywords = extractKeywords(sentences, 14);

    const shortCount = clamp(Math.round(sentences.length * 0.06), 3, 5);
    const detailCount = clamp(Math.round(sentences.length * 0.18), 7, 14);
    const bulletCount = clamp(Math.round(sentences.length * 0.10), 5, 10);
    const highlightCount = 5;

    const shortSel = mmrSelect(scored, shortCount, 0.78);
    const detailSel = mmrSelect(scored, detailCount, 0.68);
    const bulletSel = mmrSelect(scored, bulletCount, 0.62);
    const highlightSel = mmrSelect(scored, highlightCount, 0.55);

    const short = shortSel.map(x=>x.s).join(' ');
    const detailed = detailSel.map(x=>x.s).join(' ');
    const bullets = bulletSel.map(x=>x.s);
    const highlights = highlightSel.map(x=>x.s);

    // Frequency for chart (raw token freq of top keywords)
    const tokFreq = wordFreq(sentences.flatMap(tokenize));
    const chartLabels = keywords.slice(0,8);
    const chartData = chartLabels.map(k => {
      if (k.includes(' ')){
        // approximate bigram freq
        const [a,b] = k.split(' ');
        return Math.min(tokFreq[a]||0, tokFreq[b]||0);
      }
      return tokFreq[k]||0;
    });

    const reductionPct = words ? Math.max(0, Math.round((1 - countWords(short)/words) * 100)) : 0;
    const readingTime = Math.max(1, Math.round(words / 220));

    currentData = { filename, text, short, detailed, bullets, keywords, highlights, words, pages, reductionPct, readingTime };

    document.getElementById('results').hidden = false;
    setTab('short');
    document.getElementById('keywords').innerHTML = keywords.map(k=>`<span>${escapeHtml(k)}</span>`).join('');
    document.getElementById('highlights').innerHTML = highlights.map(h=>`<li>${escapeHtml(h)}</li>`).join('');

    document.getElementById('stPages').textContent = pages;
    document.getElementById('stWords').textContent = words.toLocaleString();
    document.getElementById('stTime').textContent = readingTime + ' min';
    document.getElementById('stReduce').textContent = reductionPct + '%';

    renderChart(chartLabels, chartData);
    document.getElementById('results').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  function setTab(tab){
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
    const body = document.getElementById('resultBody');
    const title = document.getElementById('resultTitle');
    if (!currentData) return;
    if (tab === 'short'){ title.textContent='Short Summary'; body.textContent = currentData.short || '—'; }
    else if (tab === 'detailed'){ title.textContent='Detailed Summary'; body.textContent = currentData.detailed || '—'; }
    else if (tab === 'bullets'){
      title.textContent='Bullet Summary';
      body.innerHTML = '<ul>' + currentData.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('') + '</ul>';
    } else {
      title.textContent='Extracted Text';
      body.textContent = currentData.text.slice(0, 10000) + (currentData.text.length>10000?'\n\n…(truncated preview)':'');
    }
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

  /* ---------- Copy / Download ---------- */
  function activeSummaryText(){
    if (!currentData) return '';
    const tab = document.querySelector('.tab.active')?.dataset.tab || 'short';
    if (tab==='short') return currentData.short;
    if (tab==='detailed') return currentData.detailed;
    if (tab==='bullets') return currentData.bullets.map(b=>'• '+b).join('\n');
    return currentData.text;
  }
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const txt = activeSummaryText(); if (!txt) return;
    try{ await navigator.clipboard.writeText(txt); flash('Copied'); }catch{ flash('Copy failed'); }
  });
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const txt = activeSummaryText(); if (!txt) return;
    const blob = new Blob([txt], { type:'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (currentData.filename.replace(/\.pdf$/i,'')) + '-summary.txt';
    a.click(); URL.revokeObjectURL(a.href);
  });
  function flash(msg){
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;box-shadow:var(--shadow);z-index:99;font-size:14px';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1400);
  }

  /* ---------- Chart ---------- */
  let chartInst = null;
  function renderChart(labels, data){
    const ctx = document.getElementById('chart');
    if (!ctx || !window.Chart) return;
    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue('--primary').trim() || '#22D3EE';
    const accent = css.getPropertyValue('--accent').trim() || '#8B5CF6';
    const text = css.getPropertyValue('--muted').trim() || '#94A3B8';
    if (chartInst) chartInst.destroy();
    const grad = ctx.getContext('2d').createLinearGradient(0,0,0,200);
    grad.addColorStop(0, primary); grad.addColorStop(1, accent);
    chartInst = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Keyword frequency', data, backgroundColor: grad, borderRadius:6, maxBarThickness:36 }]},
      options:{
        responsive:true, animation:{ duration:500 },
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ ticks:{ color:text }, grid:{ display:false } },
          y:{ ticks:{ color:text }, grid:{ color:'rgba(127,127,127,.12)' }, beginAtZero:true }
        }
      }
    });
  }

  /* ---------- Demo ---------- */
  document.getElementById('tryDemo').addEventListener('click', () => {
    const demo = `Artificial intelligence is transforming the way organizations process and understand large volumes of unstructured text. Modern document workflows rely heavily on PDFs, which contain reports, contracts, research papers, invoices, and educational material. Manually reading and extracting insight from these documents is slow and error prone.
    Summarization techniques fall into two broad categories: extractive and abstractive. Extractive methods select and rank the most informative sentences from the original document, preserving the author's wording. Abstractive methods generate new sentences that paraphrase the source. Extractive summarization is faster and works well in the browser without large neural models.
    A typical extractive pipeline first tokenizes the input, removes stopwords, computes word frequencies, and scores each sentence based on the importance of the words it contains. Sentence position and length also influence the score, since the opening of a document often introduces the main topic.
    Once sentences are ranked, the top sentences are selected and arranged in their original order to produce a coherent summary. Keywords are surfaced as tags to highlight the main themes of the document. Analytics such as total words, reading time, and reduction percentage give the reader a quick overview of how much the document has been condensed.
    By running entirely in the browser, this approach keeps user data private, removes infrastructure costs, and offers instant feedback. With careful tuning, a lightweight algorithm can produce summaries that feel surprisingly close to those of much larger systems, while remaining fast enough for everyday use.`;
    processDocument(cleanText(demo), 1, 'demo.pdf');
  });

  /* ---------- Testimonials ---------- */
  const track = document.getElementById('tTrack');
  const dotsEl = document.getElementById('tDots');
  const cardsCount = track.children.length;
  let visible = window.innerWidth <= 960 ? 1 : 3;
  let idx = 0;
  function renderDots(){
    const pages = Math.max(1, cardsCount - visible + 1);
    dotsEl.innerHTML = '';
    for (let i=0;i<pages;i++){
      const d = document.createElement('i');
      if (i===idx) d.classList.add('active');
      d.addEventListener('click', () => { idx=i; update(); });
      dotsEl.appendChild(d);
    }
  }
  function update(){
    const card = track.children[0];
    const w = card.getBoundingClientRect().width + 18;
    track.style.transform = `translateX(${-idx*w}px)`;
    [...dotsEl.children].forEach((d,i)=>d.classList.toggle('active', i===idx));
  }
  renderDots(); update();
  window.addEventListener('resize', () => {
    visible = window.innerWidth <= 960 ? 1 : 3; idx = 0; renderDots(); update();
  });
  setInterval(() => {
    const pages = Math.max(1, cardsCount - visible + 1);
    idx = (idx+1) % pages; update();
  }, 5000);

  /* ---------- Utils ---------- */
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
