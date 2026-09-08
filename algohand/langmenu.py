"""Regenerate the language dropdown in every page of the site (all languages, legal pages included).

    python site/algohand/langmenu.py

The menu lives between <!-- langmenu --> and <!-- /langmenu --> inside <nav class="main">; the script replaces
whatever is there (or the old `a.lang` chips) with a dropdown listing LANGS, marking the page's own language.
Adding a language = translate the pages into site/algohand/<code>/, add the code here, run this script.
"""
from pathlib import Path
import re

SITE = Path(__file__).resolve().parent
LANGS = [("en", "English", ""), ("ru", "Русский", "ru/"), ("es", "Español", "es/")]
PAGES = ["", "business", "traders", "pricing", "authors", "eas", "demo", "guide"]
LEGAL = ["terms", "privacy", "risk"]     # English only: the menu points at the home page of the other languages


def menu(current: str, slug: str, translated: bool) -> str:
    cur_name = dict((c, n) for c, n, _ in LANGS)[current]
    items = []
    for code, name, prefix in LANGS:
        href = f"/{prefix}{slug}" if (translated or code == "en") else f"/{prefix}"
        cur = ' aria-current="true"' if code == current else ""
        items.append(f'      <li><a href="{href}" hreflang="{code}" lang="{code}"{cur}><span>{name}</span><small>{code.upper()}</small></a></li>')
    return ("<!-- langmenu -->\n"
            f'    <div class="langmenu"><button type="button" class="lang" aria-haspopup="true" aria-expanded="false" aria-label="Language: {cur_name}">{current.upper()}<i></i></button>\n'
            "    <ul>\n" + "\n".join(items) + "\n    </ul></div>\n"
            "    <!-- /langmenu -->")


BLOCK = re.compile(r"<!-- langmenu -->.*?<!-- /langmenu -->", re.S)
CHIPS = re.compile(r'(?:[ \t]*<a class="lang" [^>]*>[A-Z]{2}</a>\r?\n)+')


def rewrite(path: Path, current: str, slug: str, translated: bool) -> bool:
    s = path.read_text(encoding="utf-8")
    m = menu(current, slug, translated)
    if BLOCK.search(s):
        s2 = BLOCK.sub(lambda _: m, s, count=1)
    elif CHIPS.search(s):
        s2 = CHIPS.sub(lambda _: "    " + m + "\n", s, count=1)
    else:
        s2 = s.replace("\n  </nav>", "\n    " + m + "\n  </nav>", 1)
    if s2 != s:
        path.write_text(s2, encoding="utf-8")
    return s2 != s


if __name__ == "__main__":
    n = 0
    for code, _, prefix in LANGS:
        for slug in PAGES:
            p = SITE / prefix / f"{slug or 'index'}.html"
            if p.exists():
                n += rewrite(p, code, slug, True)
    for slug in LEGAL:
        n += rewrite(SITE / f"{slug}.html", "en", slug, False)
    print(f"language menu written into {n} pages")
