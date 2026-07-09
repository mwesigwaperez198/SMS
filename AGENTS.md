# AGENTS.md — Developer Profile & Project Preferences

## Developer
- **Name:** Mwesigwa Perez
- **Role:** Lead Developer
- **Team:** Youth developers, Uganda
- **Organization:** Novara System Software LTD
- **Slogan:** "Shaping a new era of tech in Uganda"
- **Email:** mwesigwagershom7@gmail.com
- **Phone:** 0765866555
- **Website:** https://novara-tech-africa.kesug.com

## Project Defaults
- Brand all projects to **NOVARA**
- Code must pass AI detectors — no AI signatures, traces, or boilerplate comments
- Code style: clean, personalized, human-written feel
- UI/UX: research, compare, and choose the best design before building

## Git & Auth
- Remote URLs must NOT contain embedded tokens (use gh auth instead)
- Push after every sanitized & verified testing session
- Use the same gh auth (`mwesigwaperez198`) for all repos across all projects

## Workflow
Plan → Code → Debug → Produce (with best UI/UX)

## Infrastructure
- **Render Deploy Hook:** `https://api.render.com/deploy/srv-d97185u7r5hc738lb5pg?key=p5gkwUtMvZI`
  - POST to this URL to trigger a backend deploy on Render (no auth needed, just the URL)
  - GitHub secret `RENDER_DEPLOY_KEY` = `p5gkwUtMvZI` (for GitHub Actions)
- **GitHub Actions workflow:** `.github/workflows/deploy.yml`
  - Runs on push to `main`: checks Python imports, then calls Render deploy hook
  - Can also be triggered manually via GitHub Actions UI (`workflow_dispatch`)

## Deploy Targets
- **Backend:** https://sms-msku.onrender.com (FastAPI, Render)
- **Admin Web:** https://sms-cms-brown.vercel.app (Vite + React, Vercel)
- **Control Web:** https://novara-cms.pages.dev (Vite + React, Cloudflare Pages)
