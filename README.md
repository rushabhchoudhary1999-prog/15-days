# 15 Days — Rushabh & Medhavi

A cinematic, multi-screen romantic anniversary website celebrating 15 beautiful days together. Created by Rushabh exclusively for Medhavi.

A static, dependency-free digital love letter — no backend, no database, no API keys, no paid services. Ready to deploy on GitHub Pages.

## Features

- **8 interactive scenes**: Secret invitation, beginning of us, fifteen little reasons, poetry, hidden love notes, love drawn in circles, a letter from Rushabh, and the final reveal.
- **Fourier-series drawing**: Chapter 6 writes "Love You Medhavi" with hundreds of epicycles (circles spinning on circles), computed live from the text outline with a discrete Fourier transform.
- **Lively, colourful look**: Sunset pinks, corals, peach, lilac and violet gradients per chapter, script headlines, glass cards, floating hearts and confetti.
- **Stickers & clip art**: Hand-drawn SVG stickers (hugging bears, holding hands, heart hands, teddy with a heart, love birds, kissing cats and more) plus emoji stickers.
- **Fully interactive**: Clickable envelope/hearts/notes, reveal-all option, secret interactions, redraw button, replay button.
- **Phone-first**: Fixed top progress bar and bottom Back/Next bar that never overlap content, swipe navigation, safe-area aware, works on desktops too.
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation (← → Home End), reduced-motion support.
- **Deep links**: Open any chapter directly with `index.html#chapter-6`.
- **Optional ambient music**: Visible play/pause control, never autoplay. The button hides itself if the audio file is missing.

## File structure

```
15-days/
├── index.html          # Main page with all 8 scenes
├── styles.css          # Colourful, phone-first styling
├── script.js           # Navigation, interactions and animations
├── fourier.js          # Fourier-series epicycle drawing ("Love You Medhavi")
├── stickers.js         # Inline SVG sticker clip art
├── README.md           # This file
├── .nojekyll           # GitHub Pages bypass (optional but safe)
└── assets/
    └── audio/
        └── ambient.mp3 # Optional ambient music (you must provide this)
```

## GitHub Pages deployment

1. Create a new repository on GitHub (e.g. `15-days`).
2. Upload or push these files to the **main** branch in the repository **root**:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `fourier.js`
   - `stickers.js`
   - `README.md`
   - `.nojekyll`
3. In the repository on GitHub, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, select **Deploy from a branch**.
5. Choose branch: **main**, folder: **/(root)**.
6. Click **Save**.
7. Your site will be published at `https://<your-username>.github.io/<repository-name>/`.

### Subpath / repository name

Because GitHub Pages serves user/organization pages at the root and project pages under a subpath (`/repo-name/`), all asset paths in this project are relative (`./styles.css`, `./script.js`). The site works both at the root and under a repository subpath without changes.

### Optional music

If you want ambient instrumental music, place your own legally usable audio file at `assets/audio/ambient.mp3`. The music control is visible and never autoplays. If the file is missing, the button simply does nothing — the rest of the site works unaffected.

Do not download or commit copyrighted music you do not have rights to.

## Local development

Open `index.html` directly in your browser, or serve it with any static server:

```bash
# Python 3
python -m http.server 8000
# then visit http://localhost:8000
```

## Browser support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). Canvas-based visualizations (particles, galaxy) are progressively enhanced — if Canvas is unsupported, all scenes and messages remain fully functional.

## Notes

- All assets use relative paths for GitHub Pages compatibility.
- No build step required. Pure HTML/CSS/JS.
- Fonts (Dancing Script, Pacifico, Quicksand) load from Google Fonts; offline, the site falls back to system fonts.
- Do not commit, push, or modify remote settings without explicit permission.

---

Made with care for Medhavi, by Rushabh.