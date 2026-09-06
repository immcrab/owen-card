# owen-card

Personal card at [owenis.me](https://owenis.me). Static — HTML, CSS, one JS file.

- `index.html` — markup
- `style.css` — warm dark theme, serif display, mobile at ≤520px
- `main.js` — live clock, tagline crossfade, scroll reveal, copy buttons, live GitHub stats
- `pfp.jpg` — profile image (falls back to a monogram if missing)

## Run locally

```bash
python -m http.server 8777
```

Then open http://localhost:8777.

## Deploy

Any static host (GitHub Pages, Cloudflare Pages, Netlify). Point the domain's DNS at it.
