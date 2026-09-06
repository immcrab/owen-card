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
    "i print, i edit, i ship.",
    "somewhere with a printer running too loud.",
    "one more cut and it's done.",
    "40% infill, 100% commitment.",
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
})();
