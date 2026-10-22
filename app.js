import { terms, genericTerms, SUPPORTED_LANGS } from "./terms.js";
import { detectLanguage } from "./languageDetector.js";

(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const els = {
    name: $("projectName"), transcript: $("transcript"), file: $("transcriptFile"),
    fileStatus: $("fileStatus"), clipLength: $("clipLength"), platform: $("platform"),
    maxClips: $("maxClips"), analyze: $("analyzeBtn"), status: $("status"),
    results: $("results"), empty: $("emptyState"), export: $("exportBtn"),
    sample: $("sampleBtn"), save: $("saveProjectBtn"), projects: $("savedProjects"),
    clear: $("clearProjectsBtn")
  };
  const STORAGE_KEY = "clipforge_ai_projects_v2";
  let latestResults = [];
  let latestMeta = {};

  const sampleText = `[00:00] Most people think going viral is about having the best camera, but that's not really it.
[00:06] The biggest mistake creators make is waiting until they feel ready.
[00:12] Let me tell you the one change that made the biggest difference for me.
[00:18] I stopped trying to make every video perfect and started testing one idea every day.
[00:25] And here's the surprising part: the videos I spent the least time overthinking often performed better.
[00:33] If you're starting from zero, focus on the first three seconds. Give people a reason to stop scrolling.
[00:41] One clear promise is stronger than five different ideas fighting for attention.
[00:48] So before you post your next video, ask yourself this: would I stop scrolling for this opening?
[00:56] That single question changed how I write every hook.`;

  function setStatus(message, isError = false) {
    els.status.textContent = message;
    els.status.classList.toggle("error", isError);
  }
  function timeToSeconds(value) {
    const clean = value.replace(/[\[\]()]/g, "").trim();
    const parts = clean.split(":").map(Number);
    if (!parts.length || parts.some(n => !Number.isFinite(n))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }
  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  function stripTags(s) { return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").trim(); }

  function parseTranscript(raw) {
    const lines = raw.replace(/\r/g, "").split("\n");
    const entries = [];
    let pendingSrtTime = null;
    for (const original of lines) {
      const line = original.trim();
      if (!line) continue;
      if (/^(WEBVTT|NOTE\b|STYLE\b|REGION\b)/i.test(line)) continue;
      if (/^\d+$/.test(line)) continue;
      const srt = line.match(/^(\d{2,}:\d{2}(?::\d{2})?[,.]\d{3})\s*-->\s*(\d{2,}:\d{2}(?::\d{2})?[,.]\d{3})/);
      if (srt) {
        const start = timeToSeconds(srt[1].replace(",", ".").split(".")[0]);
        pendingSrtTime = start;
        continue;
      }
      let match = line.match(/^\[?(\d{1,}:\d{2}(?::\d{2})?)\]?\s*(?:[-–—|:]\s*)?(.*)$/);
      if (match && match[2].trim()) {
        const start = timeToSeconds(match[1]);
        if (start !== null) entries.push({ time: start, text: stripTags(match[2]) });
        pendingSrtTime = null;
        continue;
      }
      if (pendingSrtTime !== null) {
        entries.push({ time: pendingSrtTime, text: stripTags(line) });
        pendingSrtTime = null;
      } else if (entries.length) {
        entries[entries.length - 1].text += " " + stripTags(line);
      } else {
        entries.push({ time: 0, text: stripTags(line), untimed: true });
      }
    }
    return entries.filter(e => e.text && e.text.length > 1).sort((a,b) => a.time - b.time);
  }

  /** Pick keyword set based on detected language, with generic fallback. */
  function resolveTerms(lang) {
    if (SUPPORTED_LANGS.includes(lang) && terms[lang]) return terms[lang];
    return genericTerms;
  }

  function scoreText(text, duration, target, activeTerms) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sentenceCount = (text.match(/[.!?؟]+/g) || []).length;
    let score = 35;
    if (activeTerms.question && activeTerms.question.test(text)) score += 10;
    if (activeTerms.emotion && activeTerms.emotion.test(text)) score += 13;
    if (activeTerms.hook && activeTerms.hook.test(text)) score += 15;
    if (activeTerms.payoff && activeTerms.payoff.test(text)) score += 8;
    if (activeTerms.number && activeTerms.number.test(text)) score += 4;
    if (sentenceCount >= 1 && sentenceCount <= 4) score += 5;
    if (words.length >= 18 && words.length <= 95) score += 8;
    if (words.length < 8) score -= 13;
    if (words.length > 130) score -= 10;
    if (duration > target * 1.5) score -= 10;
    if (duration > 0 && duration < 10) score -= 5;
    return Math.max(20, Math.min(96, Math.round(score)));
  }

  function titleFor(text) {
    const cleaned = text.replace(/\s+/g," ").trim();
    const first = cleaned.split(/[.!?؟]/)[0].trim();
    let title = first.length > 68 ? first.slice(0,65).replace(/\s+\S*$/,"") + "…" : first;
    if (!title || title.length < 8) title = cleaned.slice(0,64);
    return title.replace(/^["'“”]+|["'“”]+$/g,"");
  }

  /** Hook templates — currently English UI, but adapt punctuation to source language. */
  function hookFor(text, lang) {
    const t = text.replace(/\s+/g," ").trim();
    if (lang === "ar") {
      if (/\b(إذا كنت|عندما|قبل أن)\b/.test(t)) return "قبل أن تمرر، اسمع هذا: " + shorten(t, 90);
      if (/[?؟]/.test(t)) return shorten(t, 105);
      if (/\b(خطأ|غلط|أسوأ|أبداً)\b/.test(t)) return "الخطأ الذي يفوته معظم الناس: " + shorten(t, 78);
      if (/\b(مفاجئ|سر|لا أحد|الحقيقة|أكبر)\b/.test(t)) return "لا أحد يتحدث عن هذا بما يكفي: " + shorten(t, 78);
      return "إليك الخلاصة الأساسية: " + shorten(t, 82);
    }
    if (/\b(if you|when you|before you)\b/i.test(t)) return "Before you scroll, hear this: " + shorten(t, 90);
    if (/\?/.test(t)) return shorten(t, 105);
    if (/\b(mistake|wrong|worst|never)\b/i.test(t)) return "The mistake most people miss: " + shorten(t, 78);
    if (/\b(surprising|secret|nobody|truth|biggest)\b/i.test(t)) return "Nobody talks about this enough: " + shorten(t, 78);
    return "Here's the key takeaway: " + shorten(t, 82);
  }
  function shorten(s, n) { return s.length > n ? s.slice(0,n-1).replace(/\s+\S*$/,"") + "…" : s; }
  function captionFor(title, platform, lang) {
    const tag = platform === "YouTube Shorts" ? "#Shorts" : platform === "Instagram Reels" ? "#Reels" : platform === "TikTok" ? "#TikTok" : "#Shorts #Reels";
    const cta = lang === "ar" ? "ما رأيك؟ شاركنا تعليقك أدناه." : "What do you think? Share your take below.";
    return `${title}\n\n${cta}\n\n${tag} #CreatorTips`;
  }

  function findCandidates(entries, target, maxClips, platform, lang) {
    const activeTerms = resolveTerms(lang);
    const candidates = [];
    for (let i = 0; i < entries.length; i++) {
      const start = entries[i].time;
      if (entries[i].untimed) continue;
      let endIndex = i + 1;
      while (endIndex < entries.length && entries[endIndex].time - start < target) endIndex++;
      endIndex = Math.min(entries.length, endIndex);
      let end = endIndex < entries.length ? entries[endIndex].time : start + target;
      if (end <= start) end = start + target;
      const chosen = entries.slice(i, endIndex);
      const text = chosen.map(e => e.text).join(" ").replace(/\s+/g," ").trim();
      if (text.split(/\s+/).length < 7) continue;
      const duration = Math.max(1, end - start);
      let score = scoreText(text, duration, target, activeTerms);
      if (chosen.length >= 2) score += 2;
      if (/[.!?؟]["')\]]?$/.test(text)) score += 2;
      score = Math.min(98, score);
      const ttl = titleFor(text);
      candidates.push({
        start, end, duration, text, score, title: ttl,
        hook: hookFor(text, lang),
        caption: captionFor(ttl, platform, lang),
      });
    }
    candidates.sort((a,b) => b.score - a.score || a.start - b.start);
    const picked = [];
    for (const item of candidates) {
      const overlaps = picked.some(p => item.start < p.end && item.end > p.start);
      if (!overlaps) picked.push(item);
      if (picked.length >= maxClips) break;
    }
    return picked.sort((a,b) => b.score - a.score);
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  function renderResults(results) {
    latestResults = results;
    els.results.innerHTML = "";
    els.empty.hidden = results.length > 0;
    els.export.disabled = results.length === 0;
    if (!results.length) return;
    results.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "clip-card";
      card.innerHTML = `
        <div class="clip-top"><div><div class="clip-number">CLIP OPPORTUNITY ${String(index+1).padStart(2,"0")}</div><h3>${escapeHTML(item.title)}</h3></div><div class="score">${item.score}<small>/ 100</small></div></div>
        <div class="clip-meta"><span class="chip">▶ ${formatTime(item.start)} – ${formatTime(item.end)}</span><span class="chip">◷ ${Math.round(item.duration)} sec</span><span class="chip">${escapeHTML(latestMeta.platform || "Short-form")}</span><span class="chip">🌐 ${escapeHTML((latestMeta.lang || "en").toUpperCase())}</span></div>
        <div class="clip-label">SOURCE EXCERPT</div><div class="clip-text">${escapeHTML(item.text)}</div>
        <div class="clip-label">SUGGESTED HOOK</div><div class="clip-text">${escapeHTML(item.hook)}</div>
        <div class="clip-label">CAPTION DRAFT</div><div class="clip-text">${escapeHTML(item.caption)}</div>
        <div class="clip-footer"><button class="button button-secondary" data-copy="${index}" type="button">Copy clip pack</button><button class="button button-quiet" data-copy-text="${index}" type="button">Copy excerpt</button></div>`;
      els.results.appendChild(card);
    });
    els.results.querySelectorAll("[data-copy]").forEach(btn => btn.addEventListener("click", () => {
      const r = latestResults[Number(btn.dataset.copy)];
      copyText(`TITLE: ${r.title}\nTIMECODE: ${formatTime(r.start)} - ${formatTime(r.end)}\nSCORE: ${r.score}/100\nHOOK: ${r.hook}\nCAPTION:\n${r.caption}\n\nTRANSCRIPT:\n${r.text}`, btn, "Copy clip pack");
    }));
    els.results.querySelectorAll("[data-copy-text]").forEach(btn => btn.addEventListener("click", () => copyText(latestResults[Number(btn.dataset.copyText)].text, btn, "Copy excerpt")));
  }

  async function copyText(text, button, original) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const temp = document.createElement("textarea"); temp.value = text; temp.style.position="fixed"; temp.style.opacity="0"; document.body.appendChild(temp); temp.select();
        const ok = document.execCommand("copy"); temp.remove(); if (!ok) throw new Error("copy failed");
      }
      button.textContent = "Copied ✓";
      setTimeout(() => button.textContent = original, 1200);
    } catch { setStatus("Copy failed in this browser. Select the text and copy it manually.", true); }
  }

  function runAnalysis() {
    const raw = els.transcript.value.trim();
    if (!raw) { setStatus("Paste or import a transcript first.", true); els.transcript.focus(); return; }
    const entries = parseTranscript(raw);
    const timed = entries.filter(e => !e.untimed);
    if (timed.length < 2) {
      setStatus("I couldn't find enough timestamps. Use formats like [00:12] text or import an SRT/VTT file.", true);
      return;
    }
    // Auto-detect the transcript language (also works when pasted manually).
    const fullText = timed.map(e => e.text).join(" ");
    const lang = detectLanguage(fullText);
    const target = Number(els.clipLength.value);
    const platform = els.platform.value;
    latestMeta = {
      name: els.name.value.trim() || "Untitled project",
      target, platform, lang,
      sourceLines: timed.length,
      createdAt: new Date().toISOString(),
    };
    const results = findCandidates(entries, target, Number(els.maxClips.value), platform, lang);
    renderResults(results);
    setStatus(`Analyzed ${timed.length} timestamped entries · detected language: ${lang.toUpperCase()} · found ${results.length} non-overlapping ideas. Review the original video for exact cut points.`);
    if (!results.length) setStatus("Not enough transcript text for clip ideas. Add more timestamped lines.", true);
  }

  function download(filename, content, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportResults() {
    if (!latestResults.length) return;
    download("clipforge-clip-ideas.json", JSON.stringify({ app:"ClipForge AI", version:3, project:latestMeta, clips:latestResults }, null, 2), "application/json");
  }

  function getProjects() {
    try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(data) ? data : []; } catch { return []; }
  }
  function saveProject() {
    const raw = els.transcript.value.trim();
    if (!raw) { setStatus("Add a transcript before saving a project.", true); return; }
    const projects = getProjects();
    const project = {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      name: els.name.value.trim() || "Untitled project",
      transcript: raw,
      clipLength: els.clipLength.value,
      platform: els.platform.value,
      maxClips: els.maxClips.value,
      savedAt: new Date().toISOString(),
    };
    projects.unshift(project);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0,20))); renderSavedProjects(); setStatus("Project saved locally on this device."); }
    catch { setStatus("Could not save. Browser storage may be full or disabled.", true); }
  }

  function renderSavedProjects() {
    const projects = getProjects();
    els.projects.innerHTML = "";
    if (!projects.length) { els.projects.innerHTML = '<p class="muted small">No saved projects yet.</p>'; return; }
    projects.forEach(project => {
      const row = document.createElement("div"); row.className = "saved-item";
      const date = project.savedAt ? new Date(project.savedAt).toLocaleDateString() : "";
      row.innerHTML = `<div><strong>${escapeHTML(project.name)}</strong><span>${escapeHTML(date)} · ${project.transcript.split(/\s+/).length} transcript items</span></div><div class="saved-item-actions"><button type="button" data-load="${escapeHTML(project.id)}">Load</button><button type="button" data-delete="${escapeHTML(project.id)}">Delete</button></div>`;
      els.projects.appendChild(row);
    });
    els.projects.querySelectorAll("[data-load]").forEach(btn => btn.addEventListener("click", () => {
      const p = getProjects().find(p => p.id === btn.dataset.load); if (!p) return;
      els.name.value=p.name; els.transcript.value=p.transcript;
      els.clipLength.value=p.clipLength || "30";
      els.platform.value=p.platform || "YouTube Shorts";
      els.maxClips.value=p.maxClips || "5";
      latestResults=[]; els.results.innerHTML=""; els.empty.hidden=false; els.export.disabled=true;
      setStatus("Project loaded. Run analysis to refresh clip ideas.");
      window.scrollTo({top:0,behavior:"smooth"});
    }));
    els.projects.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getProjects().filter(p => p.id !== btn.dataset.delete)));
      renderSavedProjects();
    }));
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setStatus("Please choose a transcript file smaller than 5 MB.", true); return; }
    try {
      els.transcript.value = await file.text();
      els.fileStatus.textContent = `Imported ${file.name}`;
      if (!els.name.value.trim()) els.name.value = file.name.replace(/\.[^.]+$/, "");
      setStatus("Transcript imported. Run analysis to find clip opportunities.");
    } catch { setStatus("Could not read that file. Try a plain-text SRT, VTT, or TXT file.", true); }
  }

  els.sample.addEventListener("click", () => {
    els.transcript.value=sampleText;
    els.name.value="Creator Tips — Sample";
    els.fileStatus.textContent="Sample loaded";
    setStatus("Sample loaded. Tap Find clip opportunities.");
  });
  els.file.addEventListener("change", () => importFile(els.file.files && els.file.files[0]));
  els.analyze.addEventListener("click", runAnalysis);
  els.export.addEventListener("click", exportResults);
  els.save.addEventListener("click", saveProject);
  els.clear.addEventListener("click", () => {
    if (!getProjects().length) return;
    if (confirm("Delete all locally saved ClipForge projects from this browser?")) {
      localStorage.removeItem(STORAGE_KEY); renderSavedProjects();
      setStatus("Saved projects cleared from this browser.");
    }
  });
  renderSavedProjects();
})();
