"""sitemap.xml with hreflang alternates for every translated page (run by build.py)."""
from pathlib import Path

SITE = Path(__file__).resolve().parent
LANGS = {"en": "", "ru": "ru/", "es": "es/"}
PAGES = ["", "business", "traders", "pricing", "authors", "eas", "demo", "guide"]
ENGLISH_ONLY = ["terms", "privacy", "risk", "refund", "docs/"]


def entry(loc: str, slug: str) -> str:
    alts = "".join(f'<xhtml:link rel="alternate" hreflang="{code}" href="https://algohand.com/{prefix}{slug}"/>' for code, prefix in LANGS.items())
    alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="https://algohand.com/{slug}"/>'
    return f"  <url><loc>https://algohand.com/{loc}</loc>{alts}</url>"


def main() -> None:
    body = "\n".join(entry(f"{prefix}{slug}", slug) for slug in PAGES for prefix in LANGS.values())
    body += "\n" + "\n".join(f"  <url><loc>https://algohand.com/{x}</loc></url>" for x in ENGLISH_ONLY)
    (SITE / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + body + "\n</urlset>\n", encoding="utf-8")


if __name__ == "__main__":
    main()
    print("sitemap written")
