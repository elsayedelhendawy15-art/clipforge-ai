(() => {
  const $ = (id) => document.getElementById(id);
  const transcriptEl = $("transcript");
  const resultsEl = $("results");
  let latestResults = [];

  const sample = `[00:00] Most people think getting better is about motivation.
[00:05] But motivation disappears the moment your day gets difficult.
[00:10] The real secret is making the habit easier to repeat.
[00:16] Here's the mistake I made for three years: I tried to change everything at once.
[00:23] I bought the equipment, made a huge plan, and expected a perfect week.
[00:30] Then one bad day made me quit completely.
[00:35] What finally worked was starting so small it felt almost silly.
[00:41] Ten minutes a day beat three hours once a month.
[00:47] If you're trying to build a skill, make it easy to show up tomorrow.
[00:54] That's how consistency starts to compound.`;

  const hookWords = ["secret", "mistake", "nobody", "never", "always", "truth", "why", "how", "stop", "instead", "finally", "the problem", "here's", "here is", "what if", "imagine", "because", "learned", "three years", "wrong"];
  const emotionWords = ["love", "hate", "fear", "scared", "crazy", "amazing", "terrible", "fail", "failed", "success", "surprise", "shocking", "angry", "worst", "best", "regret", "dream", "pain", "happy", "sad"];
  const storyWords = ["story", "mistake", "then", "finally", "until", "because", "lesson", "learned", "changed", "worked", "problem", "solution", "result"];
  const questionWords = ["why", "how", "what", "when", "where", "who", "if"];

  function toSeconds(stamp) {
    const parts = stamp.split(":").map(Number);
    if (parts.some(n => !Number.isFinite(n))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  function parseTranscript(raw) {
    const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const out = [];
    for (const line of lines) {
      const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:[-–—|]\s*)?(.*)$/);
      if (!match || !match[2].trim()) continue;
      const seconds = toSeconds(match[1]);
      if (seconds !== null) out.push({ time: seconds, text: match[2].trim() });
    }
    return out.sort((a,b) => a.time - b.time);
  }
  function countHits(text, words) {
    const low = text.toLowerCase();
    return words.reduce((n, word) => n + (low.includes(word) ? 1 : 0), 0);
  }
  function scoreSegment(text, duration) {
    const low = text.toLowerCase();
    let score = 38;
    score += Math.min(18, countHits(low, hookWords) * 6);
    score += Math.min(12, countHits(low, emotionWords) * 4);
    score += Math.min(12, countHits(low, storyWords) * 3);
    if (/[?؟]/.test(text) || countHits(low, questionWords) > 0) score += 7;
    if (/\b(but|however|instead|until|then|because|so)\b/i.test(text)) score += 5;
    if (/\b(you|your|we|I|my)\b/i.test(text)) score += 3;
    if (text.length > 100 && text.length < 420) score += 5;
    if (text.length < 55) score -= 8;
    if (duration < 12 || duration > 75) score -= 8;
    return Math.max(25, Math.min(96, score));
  }
  function makeHook(text) {
    const clean = text.replace(/^[\s"'“”]+|[\s"'“”]+$/g, "").replace(/[.!?؟]+$/,"");
    const lower = clean.toLowerCase();
    if (lower.includes("mistake")) return "The mistake that changed everything";
    if (lower.includes("secret")) return "The secret most people overlook";
    if (lower.includes("why")) return "Here's why this matters";
    if (lower.includes("how")) return "How to get better without overcomplicating it";
    if (lower.includes("nobody")) return "What nobody tells you about this";
    if (lower.includes("finally") || lower.includes("worked")) return "What finally worked for me";
    const short = clean.split(/\s+/).slice(0, 7).join(" ");
    return short.length > 8 ? `${short}…` : "The lesson I wish I knew earlier";
  }
  function makeTitle(text, index) {
    const low = text.toLowerCase();
    if (low.includes("mistake")) return "The mistake that holds people back";
    if (low.includes("motivation")) return "Why motivation isn't enough";
    if (low.includes("secret")) return "The simple secret to consistency";
    if (low.includes("three years") || low.includes("3 years")) return "A lesson learned the hard way";
    if (low.includes("ten minutes") || low.includes("10 minutes")) return "Small habits beat big plans";
    if (low.includes("if you're") || low.includes("if you are")) return "A reminder for anyone learning";
    return ["One idea worth remembering", "A lesson you can use today", "The part people often miss"][index % 3];
  }
  function makeCaption(title, platform) {
    const tags = platform === "TikTok" ? "#LearnOnTikTok #Mindset #CreatorTips" : platform === "Instagram Reels" ? "#Reels #Mindset #PersonalGrowth" : "#Shorts #Mindset #PersonalGrowth";
    return `${title}. Save this for later and share it with someone who needs the reminder. ${tags}`;
  }
  function buildCandidates(rows, target) {
    const candidates = [];
    const minLen = Math.max(12, target - 12), maxLen = target + 12;
    for (let start = 0; start < rows.length; start++) {
      let best = null;
      for (let end = start + 1; end < rows.length; end++) {
        const duration = rows[end].time - rows[start].time;
        if (duration > maxLen) break;
        if (duration < minLen) continue;
        const text = rows.slice(start, end + 1).map(r => r.text).join(" ");
        const score = scoreSegment(text, duration);
        const candidate = { start: rows[start].time, end: rows[end].time, duration, text, score };
        if (!best || score > best.score) best = candidate;
      }
      if (best) candidates.push(best);
    }
    candidates.sort((a,b) => b.score - a.score);
    const selected = [];
    for (const c of candidates) {
      const overlaps = selected.some(s => c.start < s.end && c.end > s.start);
      if (!overlaps) selected.push(c);
      if (selected.length >= 6) break;
    }
    return selected.sort((a,b) => b.score - a.score);
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  function render(results) {
    resultsEl.innerHTML = "";
    const platform = $("platform").value;
    results.forEach((item, i) => {
      const card = document.createElement("article");
      card.className = "clip-card";
      const hook = makeHook(item.text);
      const title = makeTitle(item.text, i);
      const caption = makeCaption(title, platform);
      card.innerHTML = `
        <div class="clip-top"><span class="clip-number">CLIP ${String(i+1).padStart(2,"0")}</span><span class="score">${item.score}/100 score</span></div>
        <h3>${escapeHtml(title)}</h3>
        <div class="time">◷ ${fmt(item.start)} – ${fmt(item.end)} · ${Math.round(item.duration)} sec</div>
        <p class="clip-text">${escapeHtml(item.text)}</p>
        <div class="draft"><label>SUGGESTED HOOK</label><p>${escapeHtml(hook)}</p></div>
        <div class="draft"><label>CAPTION · ${escapeHtml(platform.toUpperCase())}</label><p>${escapeHtml(caption)}</p></div>
        <div class="card-actions"><button class="button button-secondary" data-copy="${i}" type="button">Copy details</button><button class="button button-quiet" data-text="${i}" type="button">Copy transcript</button></div>`;
      resultsEl.appendChild(card);
    });
    resultsEl.querySelectorAll("[data-copy]").forEach(btn => btn.addEventListener("click", () => {
      const x = results[Number(btn.dataset.copy)];
      copyText(`ClipForge AI suggestion\nTime: ${fmt(x.start)} - ${fmt(x.end)}\nScore: ${x.score}/100\nTranscript: ${x.text}\nHook: ${makeHook(x.text)}\nTitle: ${makeTitle(x.text, Number(btn.dataset.copy))}\nCaption: ${makeCaption(makeTitle(x.text, Number(btn.dataset.copy)), $("platform").value)}`, btn);
    }));
    resultsEl.querySelectorAll("[data-text]").forEach(btn => btn.addEventListener("click", () => copyText(results[Number(btn.dataset.text)].text, btn)));
  }
  async function copyText(text, button) {
    const old = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied ✓";
    } catch {
      const area = document.createElement("textarea");
      area.value = text; document.body.appendChild(area); area.select();
      document.execCommand("copy"); area.remove(); button.textContent = "Copied ✓";
    }
    setTimeout(() => button.textContent = old, 1400);
  }
  $("loadSample").addEventListener("click", () => { transcriptEl.value = sample; $("error").hidden = true; });
  $("analyze").addEventListener("click", () => {
    const rows = parseTranscript(transcriptEl.value);
    const error = $("error");
    if (rows.length < 3) {
      error.textContent = "Please add at least 3 timestamped transcript lines. Example: [00:12] This is what the speaker said.";
      error.hidden = false; $("resultsSection").hidden = true; return;
    }
    const target = Number($("duration").value);
    latestResults = buildCandidates(rows, target);
    if (!latestResults.length) {
      error.textContent = "Not enough time between timestamps to build clips of this length. Add more transcript lines or choose a shorter target.";
      error.hidden = false; $("resultsSection").hidden = true; return;
    }
    error.hidden = true;
    $("resultSummary").textContent = `Found ${latestResults.length} suggestions from ${rows.length} timestamped lines. Best matches appear first.`;
    render(latestResults);
    $("resultsSection").hidden = false;
    $("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("export").addEventListener("click", () => {
    if (!latestResults.length) return;
    const platform = $("platform").value;
    const payload = latestResults.map((x, i) => ({ number: i+1, start: fmt(x.start), end: fmt(x.end), duration_seconds: Math.round(x.duration), heuristic_score: x.score, transcript: x.text, suggested_hook: makeHook(x.text), title: makeTitle(x.text, i), caption: makeCaption(makeTitle(x.text, i), platform), platform }));
    const blob = new Blob([JSON.stringify({ app: "ClipForge AI", generated_at: new Date().toISOString(), note: "Heuristic suggestions, not predictions of performance.", clips: payload }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "clipforge-suggestions.json"; a.click(); URL.revokeObjectURL(url);
  });
  transcriptEl.value = sample;
})();