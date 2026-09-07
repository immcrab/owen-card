(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opts = { cache: "no-store", headers: { Accept: "application/vnd.github+json" } };

  /* ---- live clock ---- */
  const clock = document.getElementById("clock");
  const fmt = new Intl.DateTimeFormat([], {
    weekday: "short", hour: "numeric", minute: "2-digit",
    hour12: true, timeZoneName: "short"
  });
  const tick = () => { clock.textContent = fmt.format(new Date()).toLowerCase(); };
  tick();
  setInterval(tick, 15000);
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---- tagline crossfade ---- */
  const ticker = document.getElementById("ticker");
  const lines = [
    "I built something",
    "This is my website",
    "I got this website for free (github education)",
    "Oh.",
  ];
  if (!reduce) {
    let i = 0;
    const tl = ticker.closest(".tagline");
    setInterval(() => {
      tl.style.opacity = "0";
      setTimeout(() => {
        i = (i + 1) % lines.length;
        ticker.textContent = lines[i];
        tl.style.opacity = "1";
      }, 500);
    }, 4800);
  }

  /* ---- reveal on scroll (in and out) ---- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle("in", e.isIntersecting);
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = Math.min(i * 50, 200) + "ms";
    io.observe(el);
  });

  /* ---- collapsible blocks ---- */
  const wireBlock = (block) => {
    const btn = block.querySelector(".block-head");
    const body = block.querySelector(".block-body");
    const grow = () => { body.style.maxHeight = body.scrollHeight + "px"; };
    grow();
    addEventListener("resize", () => { if (block.dataset.open === "true") grow(); });
    btn.addEventListener("click", () => {
      const open = block.dataset.open === "true";
      block.dataset.open = String(!open);
      btn.setAttribute("aria-expanded", String(!open));
      if (open) { grow(); requestAnimationFrame(() => (body.style.maxHeight = "0px")); }
      else grow();
    });
  };
  document.querySelectorAll(".block:not([hidden])").forEach(wireBlock);

  /* ---- copy buttons ---- */
  document.querySelectorAll(".copy").forEach((btn) => {
    const val = btn.dataset.copy;
    const label = btn.querySelector(".cval");
    const orig = label.textContent;
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(val); }
      catch {
        const t = document.createElement("textarea");
        t.value = val; document.body.appendChild(t); t.select();
        document.execCommand("copy"); t.remove();
      }
      btn.classList.add("done");
      label.textContent = "copied";
      setTimeout(() => { btn.classList.remove("done"); label.textContent = orig; }, 1300);
    });
  });

  /* ---- github stats ---- */
  const setStat = (k, v) => {
    const el = document.querySelector(`[data-key="${k}"]`);
    if (el && v != null) el.textContent = v;
  };
  fetch("https://api.github.com/users/immcrab", opts)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      setStat("repos", d.public_repos);
      setStat("followers", d.followers);
      setStat("following", d.following);
    })
    .catch(() => {});

  (async () => {
    let stars = 0, page = 1;
    try {
      while (page <= 5) {
        const r = await fetch(
          `https://api.github.com/users/immcrab/repos?per_page=100&page=${page}&sort=pushed`, opts);
        if (!r.ok) break;
        const batch = await r.json();
        if (!Array.isArray(batch) || !batch.length) break;
        stars += batch.reduce((s, x) => s + (x.stargazers_count || 0), 0);
        if (batch.length < 100) break;
        page++;
      }
      setStat("stars", stars);
    } catch { /* leave placeholder */ }
  })();

  /* ---- activity feed ---- */
  const ago = (iso) => {
    const s = Math.max(1, (Date.now() - new Date(iso)) / 1000);
    const u = [["y", 31536000], ["mo", 2592000], ["w", 604800], ["d", 86400], ["h", 3600], ["m", 60]];
    for (const [k, n] of u) if (s >= n) return Math.floor(s / n) + k + " ago";
    return "just now";
  };
  const describe = (e) => {
    const repo = e.repo && e.repo.name;
    const p = e.payload || {};
    switch (e.type) {
      case "PushEvent": {
        const n = p.size || p.distinct_size || (p.commits || []).length;
        return n ? `pushed ${n} commit${n === 1 ? "" : "s"} to` : "pushed to";
      }
      case "CreateEvent":
        if (p.ref_type === "repository") return "created repo";
        if (p.ref_type === "branch") return `created branch ${p.ref} on`;
        if (p.ref_type === "tag") return `tagged ${p.ref} on`;
        return "created in";
      case "WatchEvent": return "starred";
      case "ForkEvent": return "forked";
      case "PublicEvent": return "open-sourced";
      case "ReleaseEvent": return `released ${p.release ? p.release.tag_name : ""} in`;
      case "PullRequestEvent": return `${p.action} a pull request in`;
      case "IssuesEvent": return `${p.action} an issue in`;
      case "IssueCommentEvent": return "commented in";
      default: return null;
    }
  };
  fetch("https://api.github.com/users/immcrab/events/public?per_page=30", opts)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((events) => {
      if (!Array.isArray(events)) return;
      const feed = document.getElementById("feed");
      const rows = [];
      let last = "";
      for (const e of events) {
        const verb = describe(e);
        if (!verb || !e.repo) continue;
        const key = verb + "|" + e.repo.name;
        if (key === last) continue;
        last = key;
        rows.push(
          `<li><span class="ev">${verb} <b>${e.repo.name}</b></span>` +
          `<span class="ago">${ago(e.created_at)}</span></li>`
        );
        if (rows.length === 5) break;
      }
      if (!rows.length) return;
      feed.innerHTML = rows.join("");
      const sec = document.getElementById("activity");
      const rule = document.getElementById("act-rule");
      sec.hidden = false;
      rule.hidden = false;
      io.observe(rule);
      io.observe(sec);
      wireBlock(sec);
    })
    .catch(() => {});

  /* ---- music player ---- */
  (() => {
    const pl = document.getElementById("player");
    if (!pl) return;
    const audio = document.getElementById("pl-audio");
    const grip = document.getElementById("pl-grip");
    const playBtn = document.getElementById("pl-play");
    const backBtn = document.getElementById("pl-back");
    const fwdBtn = document.getElementById("pl-fwd");
    const muteBtn = document.getElementById("pl-mute");
    const miniBtn = document.getElementById("pl-mini");
    const seek = document.getElementById("pl-seek");
    const seekFill = document.getElementById("pl-seek-fill");
    const volEl = document.getElementById("pl-vol");
    const volFill = document.getElementById("pl-vol-fill");
    const curEl = document.getElementById("pl-cur");
    const durEl = document.getElementById("pl-dur");
    const KEY = "player.v1";

    const state = Object.assign(
      { vol: 0.7, muted: false, min: false, x: null, y: null },
      (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })()
    );
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

    const mmss = (s) => {
      if (!isFinite(s)) return "0:00";
      s = Math.max(0, Math.floor(s));
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    };

    /* restore */
    pl.hidden = false;
    audio.volume = state.vol;
    audio.muted = state.muted;
    pl.dataset.min = String(state.min);
    volFill.style.width = (state.muted ? 0 : state.vol * 100) + "%";
    muteBtn.textContent = state.muted ? "🔇" : "♪";
    muteBtn.classList.toggle("off", state.muted);
    pl.classList.add("paused");

    const clampPos = () => {
      const r = pl.getBoundingClientRect();
      const maxX = innerWidth - r.width, maxY = innerHeight - r.height;
      if (state.x != null) state.x = Math.min(Math.max(0, state.x), Math.max(0, maxX));
      if (state.y != null) state.y = Math.min(Math.max(0, state.y), Math.max(0, maxY));
    };
    const applyPos = () => {
      if (state.x == null || state.y == null) return;
      clampPos();
      pl.style.setProperty("--pl-x", state.x + "px");
      pl.style.setProperty("--pl-y", state.y + "px");
      pl.style.right = "auto";
      pl.style.bottom = "auto";
    };
    applyPos();
    addEventListener("resize", applyPos);

    /* ---- playback ---- */
    const setPlaying = (on) => {
      pl.classList.toggle("paused", !on);
      playBtn.textContent = on ? "❚❚" : "▶";
      playBtn.setAttribute("aria-label", on ? "pause" : "play");
    };
    const tryPlay = () => audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));

    playBtn.addEventListener("click", () => { audio.paused ? tryPlay() : audio.pause(); });
    backBtn.addEventListener("click", () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
    fwdBtn.addEventListener("click", () => {
      audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10);
    });

    /* autoplay attempt — browsers usually block sound until a gesture */
    tryPlay();
    const kick = () => {
      if (audio.paused) tryPlay();
      removeEventListener("pointerdown", kick);
      removeEventListener("keydown", kick);
    };
    addEventListener("pointerdown", kick);
    addEventListener("keydown", kick);

    /* ---- time / seek ---- */
    audio.addEventListener("loadedmetadata", () => { durEl.textContent = mmss(audio.duration); });
    audio.addEventListener("timeupdate", () => {
      curEl.textContent = mmss(audio.currentTime);
      const d = audio.duration;
      seekFill.style.width = (d ? (audio.currentTime / d) * 100 : 0) + "%";
    });

    const dragBar = (el, onFrac) => {
      let active = false;
      const frac = (clientX) => {
        const r = el.getBoundingClientRect();
        return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      };
      const move = (e) => { if (active) onFrac(frac(e.clientX)); };
      el.addEventListener("pointerdown", (e) => {
        active = true; el.setPointerCapture(e.pointerId); onFrac(frac(e.clientX));
      });
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", () => { active = false; });
      el.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowLeft" ? -0.05 : e.key === "ArrowRight" ? 0.05 : 0;
        if (step) { e.preventDefault(); onFrac(step > 0 ? 2 : -1, step); }
      });
    };

    dragBar(seek, (f, step) => {
      if (!audio.duration) return;
      audio.currentTime = step ? Math.min(audio.duration, Math.max(0, audio.currentTime + step * audio.duration))
                                : f * audio.duration;
    });
    dragBar(volEl, (f, step) => {
      let v = step ? Math.min(1, Math.max(0, audio.volume + step)) : f;
      audio.volume = v;
      state.vol = v;
      if (v > 0 && audio.muted) { audio.muted = false; state.muted = false; }
      volFill.style.width = (audio.muted ? 0 : v * 100) + "%";
      muteBtn.textContent = audio.muted ? "🔇" : "♪";
      muteBtn.classList.toggle("off", audio.muted);
      save();
    });

    /* ---- mute ---- */
    muteBtn.addEventListener("click", () => {
      audio.muted = !audio.muted;
      state.muted = audio.muted;
      volFill.style.width = (audio.muted ? 0 : state.vol * 100) + "%";
      muteBtn.textContent = audio.muted ? "🔇" : "♪";
      muteBtn.classList.toggle("off", audio.muted);
      save();
    });

    /* ---- minimize ---- */
    miniBtn.addEventListener("click", () => {
      state.min = pl.dataset.min !== "true";
      pl.dataset.min = String(state.min);
      applyPos();
      save();
    });

    /* ---- drag window ---- */
    let d = null;
    grip.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".pl-btn")) return;
      const r = pl.getBoundingClientRect();
      d = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener("pointermove", (e) => {
      if (!d) return;
      state.x = e.clientX - d.dx;
      state.y = e.clientY - d.dy;
      pl.style.right = "auto";
      pl.style.bottom = "auto";
      clampPos();
      pl.style.setProperty("--pl-x", state.x + "px");
      pl.style.setProperty("--pl-y", state.y + "px");
    });
    grip.addEventListener("pointerup", () => { if (d) { d = null; save(); } });
  })();
})();
