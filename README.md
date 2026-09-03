# Demo site — tca.mtcodec.com

Static site: `index.html` (product page with a replay of a real recorded
session) and `api/index.html` (Swagger UI reading `openapi.yaml`).

## Build

```bash
python site/build.py        # copies api/openapi.yaml and api/tools/claude_tools.json into site/
```

## Hosting options (mtcodec.com itself stays on Wix)

1. **GitHub Pages / Cloudflare Pages** (recommended): publish the `site/`
   folder, then in Wix → Domains → Manage DNS Records add
   `CNAME  tca  →  <pages host>`. TLS is automatic. No server to run.
2. **Our own server** (when the public sandbox exists): Caddy serves `site/`
   next to the API under `tca.mtcodec.com`.
3. **Inside Wix**: a page with an "Embed HTML" element containing `index.html`
   (size-limited; fallback only).

The transcript on the page is the real session of 3 Sep 2026 against the test
VPS (command `cmd_01M1JY85A07NCXYZ`), lightly shortened.
