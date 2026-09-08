"""Prepare site/algohand for deployment: copy the API artifacts into docs/, and render the raster icons and
the social-sharing image from the logo (assets/logo.svg, original colours, is the source of truth).

Rasterising goes through headless Chrome (Windows path below) because the logo is a traced SVG with a
gradient — Pillow cannot draw it. Run from the repository root:  python site/algohand/build.py
"""
from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SITE = Path(__file__).resolve().parent
DOCS = SITE / "docs"
ASSETS = SITE / "assets"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

DOCS.mkdir(exist_ok=True)
shutil.copy(ROOT / "api" / "openapi.yaml", DOCS / "openapi.yaml")
shutil.copy(ROOT / "api" / "tools" / "claude_tools.json", DOCS / "claude_tools.json")
shutil.copy(ROOT / "api" / "esp.schema.json", DOCS / "esp.schema.json")
shutil.copy(ROOT / "api" / "esp_prompt_v1.md", DOCS / "algohand-prompt-v1.txt")
# downloads for the customer installer (site/algohand/dl/install.ps1 fetches these); the exe is added by the release step
DL = SITE / "dl"
DL.mkdir(exist_ok=True)
for name in ("install-agent.ps1", "run-agent.ps1", "start-terminals.ps1"):
    shutil.copy(ROOT / "deploy" / "windows" / name, DL / name)


def render(html: str, width: int, height: int) -> Image.Image:
    """Screenshot an HTML snippet with headless Chrome."""
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "page.html"
        src.write_text(html, encoding="utf-8")
        png = Path(td) / "shot.png"
        subprocess.run([str(CHROME), "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                        f"--window-size={width},{height}", f"--screenshot={png}", src.as_uri()],
                       capture_output=True, timeout=120)
        return Image.open(png).convert("RGBA").copy()


MARK = ASSETS / "logo-mark.png"          # Eli's mark (assets/brand/v5-hand/logo-icon.png, never modified), navy on transparent


def plate(size: int, radius_ratio: float = 0.22, fill: float = 0.74) -> Image.Image:
    """App-icon style: the mark centred on a white rounded tile (the navy needs a light ground; readable at 16 px)."""
    big = 1024
    tile_img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * radius_ratio), fill=255)
    tile_img.paste((255, 255, 255, 255), (0, 0, big, big), mask)
    mark = Image.open(MARK).convert("RGBA")
    w = int(big * fill)
    h = int(w * mark.height / mark.width)
    mark = mark.resize((w, h), Image.LANCZOS)
    tile_img.alpha_composite(mark, ((big - w) // 2, (big - h) // 2))
    return tile_img.resize((size, size), Image.LANCZOS)


def tile(size: int) -> Image.Image:
    return plate(size)


def mono_mark(size: int) -> Image.Image:
    """Favicon version (Eli, 6 Sep 2026): the mark's silhouette in white with a black outline, transparent
    background — readable on light and dark tab bars alike. Rendered at 8x and downsampled; the outline is
    about 1 px at 16 px and grows a little with the size."""
    from PIL import ImageFilter
    big = size * 8
    alpha = Image.open(MARK).convert("RGBA").getchannel("A")
    w = int(big * 0.94)
    h = int(w * alpha.height / alpha.width)
    alpha = alpha.resize((w, h), Image.LANCZOS)
    canvas = Image.new("L", (big, big), 0)
    canvas.paste(alpha, ((big - w) // 2, (big - h) // 2))
    outline_px = max(3, int(round(size * 8 * (0.075 if size <= 16 else 0.055))))   # ~1.2 px at 16, thinner above so the gaps stay open
    dilated = canvas.filter(ImageFilter.MaxFilter(outline_px * 2 + 1))
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    img.paste((0, 0, 0, 255), (0, 0, big, big), dilated)      # black outline underneath
    img.paste((255, 255, 255, 255), (0, 0, big, big), canvas)  # white silhouette on top
    return img.resize((size, size), Image.LANCZOS)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    for name in (["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]):
        p = Path(r"C:\Windows\Fonts") / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def og_image() -> Image.Image:
    W, H = 1200, 630
    mark = Image.open(MARK).convert("RGBA")
    mark = mark.resize((220, int(220 * mark.height / mark.width)), Image.LANCZOS)   # the gradient mark sits on the dark ground directly
    img = Image.new("RGB", (W, H), (11, 15, 22))
    img.paste(mark, (96, 96), mark)
    d = ImageDraw.Draw(img)
    d.text((330, 150), "AlgoHand", font=font(72), fill=(232, 236, 243))
    d.text((96, 330), "Control your trading", font=font(64), fill=(232, 236, 243))
    d.text((96, 406), "robots by chat.", font=font(64), fill=(159, 184, 255))
    d.text((96, 510), "Start, pause, change risk and backtest MetaTrader 5 EAs on your own VPS, without RDP.",
           font=font(27, bold=False), fill=(152, 163, 184))
    d.text((96, 570), "algohand.com", font=font(24, bold=False), fill=(107, 118, 137))
    return img


def bust_caches() -> int:
    """Stamp /assets/site.css and /assets/site.js references with a content hash (?v=…) in every page, site and
    portal, so a deploy never leaves a browser with new markup and hour-old cached styles."""
    import hashlib
    import re
    stamps = {name: hashlib.sha1((ASSETS / name).read_bytes()).hexdigest()[:8] for name in ("site.css", "site.js")}
    pages = [*SITE.glob("*.html"), *SITE.glob("*/*.html"), *(ROOT / "site" / "portal").glob("*.html")]
    n = 0
    for p in pages:
        if p.parent.name == "docs":
            continue
        s = p.read_text(encoding="utf-8")
        s2 = s
        for name, h in stamps.items():
            s2 = re.sub(rf'(/assets/{re.escape(name)})(\?v=[0-9a-f]+)?', rf'\g<1>?v={h}', s2)
        if s2 != s:
            p.write_text(s2, encoding="utf-8")
            n += 1
    return n


if __name__ == "__main__":
    import runpy
    runpy.run_path(str(SITE / "home.py"))["main"]()                     # index.html per language from the copy deck strings
    n_eas = runpy.run_path(str(SITE / "catalog.py"))["main"]()          # eas.html per language from the registry
    runpy.run_path(str(SITE / "langmenu.py"), run_name="__main__")      # language dropdown on every page (catalog included)
    runpy.run_path(str(SITE / "sitemap.py"))["main"]()
    print(f"catalog: {n_eas} EAs; cache stamps updated in", bust_caches(), "pages")
    t = tile(1024)
    t.resize((512, 512), Image.LANCZOS).save(ASSETS / "icon-512.png")
    t.resize((192, 192), Image.LANCZOS).save(ASSETS / "icon-192.png")
    t.resize((180, 180), Image.LANCZOS).save(ASSETS / "apple-touch-icon.png")
    # favicon: white silhouette with a black outline (not the gradient tile) — one .ico with three sizes + a PNG
    mono_mark(48).save(SITE / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)],
                       append_images=[mono_mark(32), mono_mark(16)])
    mono_mark(64).save(ASSETS / "favicon-64.png")
    og_image().save(ASSETS / "og.png", optimize=True)
    print("docs:", sorted(p.name for p in DOCS.iterdir()), "| icons rendered from", MARK.name)
