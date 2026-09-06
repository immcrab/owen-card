(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    }, 4600);
  }

  /* ---- reveal on scroll (in and out) ---- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle("in", e.isIntersecting);
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = Math.min(i * 55, 220) + "ms";
    io.observe(el);
  });

  /* ---- copy buttons ---- */
  document.querySelectorAll(".copy").forEach((btn) => {
    const val = btn.dataset.copy;
    const label = btn.querySelector(".cval");
    const orig = label.textContent;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(val);
      } catch {
        const t = document.createElement("textarea");
        t.value = val; document.body.appendChild(t); t.select();
        document.execCommand("copy"); t.remove();
      }
      btn.classList.add("done");
      label.textContent = "copied";
      setTimeout(() => { btn.classList.remove("done"); label.textContent = orig; }, 1300);
    });
  });

  /* ---- github stats (live, fresh) ---- */
  const setStat = (k, v) => {
    const el = document.querySelector(`[data-key="${k}"]`);
    if (el && v != null) el.textContent = v;
  };
  const opts = { cache: "no-store", headers: { Accept: "application/vnd.github+json" } };

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
})();
