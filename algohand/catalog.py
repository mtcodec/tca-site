"""Generate the public EA catalog pages (eas.html in every language) from the registry.

    python site/algohand/catalog.py          (build.py runs it too)

The page chrome (head, header, footer) is taken from the language's authors.html so the navigation stays in one
place; only the catalog content is generated here. Facts come from registry/eas/*.yaml: what the EA is, what the
chat can change, the review state, restart safety, and whether the author's licence is needed.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
SITE = Path(__file__).resolve().parent
REGISTRY = ROOT / "registry" / "eas"

T = {
    "en": {
        "title": "AlgoHand — EA catalog: verified Expert Advisors you can run by chat",
        "desc": "The Expert Advisors AlgoHand has reviewed and parametrised: what the chat can change, risk presets, restart safety, and whether the author's licence is needed.",
        "nav": "EA catalog", "eyebrow": "Catalog", "h1": "Expert Advisors you can run <em>by chat</em>.",
        "lead": "Every EA here was installed on a test terminal, its inputs discovered, its presets and safe ranges reviewed by a person, its restart behaviour checked. That is what lets the assistant change a setting without guessing. EAs and licences are bought from their authors; AlgoHand only operates them.",
        "licence_badge": "Author's licence required", "free_badge": "No licence needed", "reviewed": "Reviewed by AlgoHand", "approved": "Approved", "draft": "In review",
        "cat": {"scalper": "Scalper", "grid": "Grid", "news": "News", "trend": "Trend", "breakout": "Breakout", "other": "Other"},
        "rs": {"verified": ("verified", "recovers its trades after a restart; tested on a demo account"),
               "conditional": ("conditional", "safe per the author as long as the locked inputs stay unchanged; our own test run is pending"),
               "untested": ("not yet tested", "changes with open positions are refused until it is")},
        "l_presets": "Risk presets", "l_change": "Changeable by chat", "l_change_v": "{n} inputs, each within a reviewed range", "l_softstop": "Soft stop",
        "yes": "yes", "no": "no (hard stop only)", "l_symbols": "Symbols", "l_chart": "Chart", "l_instances": "Instances per account", "l_restart": "Restart safety",
        "l_licence": "Licence", "l_licence_v": "Bought from the author (activated by account number on the author's server). AlgoHand does not sell, host or include it.",
        "l_page": "Author's page", "l_version": "version",
        "more_h2": "Your EA is not here?", "more_p": "Two ways in: send us the EAs you already run and we onboard them for you, or list your own product as an author.",
        "btn_traders": "Early access for traders", "btn_authors": "For EA authors",
        "note": "Names of Expert Advisors are trademarks of their respective authors. AlgoHand is not affiliated with them and makes no claim about their performance; the catalog states what the AlgoHand assistant can operate and how it was verified. Trading involves risk.",
    },
    "ru": {
        "title": "AlgoHand — каталог EA: проверенные советники, которыми можно управлять через чат",
        "desc": "Советники, которые AlgoHand проверил и параметризировал: что может менять чат, пресеты риска, безопасность перезапуска и нужна ли лицензия автора.",
        "nav": "Каталог EA", "eyebrow": "Каталог", "h1": "Советники, которыми можно управлять <em>через чат</em>.",
        "lead": "Каждый советник здесь был установлен на тестовый терминал, его параметры считаны, пресеты риска и безопасные диапазоны просмотрены человеком, поведение при перезапуске проверено. Именно это позволяет ассистенту менять настройку, не гадая. Советники и лицензии покупаются у авторов; AlgoHand только управляет ими.",
        "licence_badge": "Нужна лицензия автора", "free_badge": "Лицензия не нужна", "reviewed": "Проверен AlgoHand", "approved": "Одобрен", "draft": "На проверке",
        "cat": {"scalper": "Скальпер", "grid": "Сетка", "news": "Новости", "trend": "Тренд", "breakout": "Пробой", "other": "Другое"},
        "rs": {"verified": ("проверена", "восстанавливает свои сделки после перезапуска; проверено на демо-счёте"),
               "conditional": ("условная", "безопасно по заявлению автора при неизменных заблокированных параметрах; наш собственный прогон на стенде впереди"),
               "untested": ("не проверена", "изменения при открытых позициях отклоняются, пока не проверим")},
        "l_presets": "Пресеты риска", "l_change": "Можно менять через чат", "l_change_v": "{n} параметров, каждый в проверенном диапазоне", "l_softstop": "Мягкая остановка",
        "yes": "да", "no": "нет (только жёсткая)", "l_symbols": "Символы", "l_chart": "График", "l_instances": "Экземпляров на счёт", "l_restart": "Безопасность перезапуска",
        "l_licence": "Лицензия", "l_licence_v": "Покупается у автора (активируется по номеру счёта на сервере автора). AlgoHand её не продаёт, не хостит и не включает в тариф.",
        "l_page": "Страница автора", "l_version": "версия",
        "more_h2": "Вашего советника здесь нет?", "more_p": "Два пути: пришлите нам советники, которые вы уже используете, и мы подключим их для вас, или разместите свой продукт как автор.",
        "btn_traders": "Ранний доступ для трейдеров", "btn_authors": "Авторам EA",
        "note": "Названия советников — товарные знаки их авторов. AlgoHand не связан с ними и не делает заявлений об их доходности; каталог описывает, чем может управлять ассистент AlgoHand и как это было проверено. Торговля сопряжена с риском.",
    },
    "es": {
        "title": "AlgoHand — catálogo de EA: Expert Advisors verificados que puedes manejar por chat",
        "desc": "Los Expert Advisors que AlgoHand ha revisado y parametrizado: qué puede cambiar el chat, presets de riesgo, reinicio seguro y si hace falta la licencia del autor.",
        "nav": "Catálogo de EA", "eyebrow": "Catálogo", "h1": "Expert Advisors que puedes manejar <em>por chat</em>.",
        "lead": "Cada EA de esta lista se instaló en un terminal de pruebas, sus parámetros se descubrieron, una persona revisó sus presets de riesgo y rangos seguros, y se comprobó su comportamiento al reiniciar. Eso es lo que permite al asistente cambiar un ajuste sin adivinar. Los EA y sus licencias se compran a sus autores; AlgoHand solo los maneja.",
        "licence_badge": "Requiere licencia del autor", "free_badge": "Sin licencia", "reviewed": "Revisado por AlgoHand", "approved": "Aprobado", "draft": "En revisión",
        "cat": {"scalper": "Scalper", "grid": "Grid", "news": "Noticias", "trend": "Tendencia", "breakout": "Ruptura", "other": "Otro"},
        "rs": {"verified": ("verificado", "recupera sus operaciones tras un reinicio; probado en una cuenta demo"),
               "conditional": ("condicional", "seguro según el autor mientras los parámetros bloqueados no cambien; nuestra propia prueba está pendiente"),
               "untested": ("sin probar", "los cambios con posiciones abiertas se rechazan hasta probarlo")},
        "l_presets": "Presets de riesgo", "l_change": "Modificable por chat", "l_change_v": "{n} parámetros, cada uno dentro de un rango revisado", "l_softstop": "Parada suave",
        "yes": "sí", "no": "no (solo parada dura)", "l_symbols": "Símbolos", "l_chart": "Gráfico", "l_instances": "Instancias por cuenta", "l_restart": "Reinicio seguro",
        "l_licence": "Licencia", "l_licence_v": "Se compra al autor (se activa por número de cuenta en el servidor del autor). AlgoHand no la vende, ni la aloja, ni la incluye.",
        "l_page": "Página del autor", "l_version": "versión",
        "more_h2": "¿Tu EA no está aquí?", "more_p": "Dos caminos: envíanos los EA que ya usas y los incorporamos por ti, o publica tu propio producto como autor.",
        "btn_traders": "Acceso anticipado para traders", "btn_authors": "Para autores de EA",
        "note": "Los nombres de los Expert Advisors son marcas de sus respectivos autores. AlgoHand no está afiliado a ellos ni afirma nada sobre su rendimiento; el catálogo indica qué puede manejar el asistente de AlgoHand y cómo se verificó. Operar implica riesgo.",
    },
}

# short descriptions per language (the registry keeps English); fallback is the registry text
DESC = {
    "ru": {"night_hunter_pro": "Ночной скальпер. Отложенные ордера, без сетки. Торгует список символов с одного графика.",
           "news_catcher_pro": "Советник на новостях с необязательной сеткой. Торгует список символов с одного графика.",
           "perceptrader_ai": "Сеточный советник с нейросетевым фильтром входов. Торгует список символов с одного графика.",
           "waka_waka": "Сеточный советник для AUDCAD и AUDNZD. Один график M15."},
    "es": {"night_hunter_pro": "Scalper nocturno. Órdenes pendientes, sin grid. Opera una lista de símbolos desde un solo gráfico.",
           "news_catcher_pro": "EA de noticias con grid opcional. Opera una lista de símbolos desde un solo gráfico.",
           "perceptrader_ai": "EA de grid con filtro de entradas por red neuronal. Opera una lista de símbolos desde un solo gráfico.",
           "waka_waka": "EA de grid para AUDCAD y AUDNZD. Un solo gráfico M15."},
}
PREFIX = {"en": "", "ru": "ru/", "es": "es/"}


def load_eas() -> list[dict]:
    out = []
    for p in sorted(REGISTRY.glob("*.yaml")):
        d = yaml.safe_load(p.read_text(encoding="utf-8"))
        if d.get("status") in ("reviewed", "approved"):
            out.append(d)
    return out


def icon_for(ea: dict) -> str:
    """The EA's logo: `icon` from the registry (URL or path under assets/eas), else <id>.png/.svg if present, else the
    default EX5 icon. Authors will upload their own through the author portal."""
    icon = ea.get("icon")
    if icon:
        return icon if icon.startswith(("http://", "https://", "/")) else f"/assets/eas/{icon}"
    for ext in ("png", "svg", "webp"):
        if (SITE / "assets" / "eas" / f"{ea['id']}.{ext}").is_file():
            return f"/assets/eas/{ea['id']}.{ext}"
    return "/assets/eas/default-ex5.svg"


def card(ea: dict, lang: str) -> str:
    t = T[lang]
    e = html.escape
    pol = ea.get("policy") or {}
    presets = [p.get("id") for p in pol.get("presets", [])]
    changeable = len(pol.get("changeable") or {})
    soft = bool(pol.get("kill_switch"))
    rs = (ea.get("restart_safety") or {}).get("status", "untested")
    rs_label, rs_text = t["rs"].get(rs, t["rs"]["untested"])
    lic = ea.get("licence") or {}
    badge = t["licence_badge"] if lic.get("required", True) else t["free_badge"]
    status = t.get(ea.get("status", "draft"), t["draft"])
    chart = ea.get("chart") or {}
    symbols = ea.get("symbols_allowed") or []
    desc = DESC.get(lang, {}).get(ea["id"]) or ea.get("description", "")
    version = f' <span class="small muted">· {t["l_version"]} {e(str(ea["version"]))}</span>' if ea.get("version") else ""
    url = ea.get("url")
    link = f'<a href="{e(url)}" target="_blank" rel="noopener nofollow">{t["l_page"]}&nbsp;↗</a>' if url else ""
    return f'''    <div class="card ea-card" id="{e(ea["id"])}">
      <div class="ea-head">
        <div><span class="pill">{t["cat"].get(ea.get("category", "other"), t["cat"]["other"])}</span> <span class="pill ok">{status}</span> <span class="pill warn">{badge}</span></div>
      </div>
      <div class="ea-title"><img class="ea-icon" src="{e(icon_for(ea))}" alt="" width="48" height="48"><h3>{e(ea["name"])}{version}</h3></div>
      <p class="muted" style="margin:6px 0 12px">{e(desc)}</p>
      <table>
        <tr><td class="muted">{t["l_presets"]}</td><td>{" · ".join(f"<code>{e(p)}</code>" for p in presets) or "—"}</td></tr>
        <tr><td class="muted">{t["l_change"]}</td><td>{t["l_change_v"].format(n=changeable)}</td></tr>
        <tr><td class="muted">{t["l_softstop"]}</td><td>{t["yes"] if soft else t["no"]}</td></tr>
        <tr><td class="muted">{t["l_symbols"]}</td><td>{e(", ".join(symbols)) if symbols else "—"}</td></tr>
        <tr><td class="muted">{t["l_chart"]}</td><td>{e(chart.get("default_symbol", ""))} {e(chart.get("default_timeframe", ""))}</td></tr>
        <tr><td class="muted">{t["l_instances"]}</td><td>{int((ea.get("instance") or {}).get("max_instances_per_account", 1))}</td></tr>
        <tr><td class="muted">{t["l_restart"]}</td><td><b>{rs_label}</b> — {rs_text}</td></tr>
        <tr><td class="muted">{t["l_licence"]}</td><td>{t["l_licence_v"]} {link}</td></tr>
      </table>
    </div>'''


def page(lang: str, eas: list[dict]) -> str:
    t = T[lang]
    prefix = PREFIX[lang]
    src = (SITE / prefix / "authors.html").read_text(encoding="utf-8")
    head_end = src.index("<main class=\"wrap\">")
    chrome_top = src[:head_end]
    footer = src[src.index("<footer>"):]
    # head: title, description, canonical + hreflang for /eas; nav: current page marker
    chrome_top = re.sub(r"<title>.*?</title>", f"<title>{t['title']}</title>", chrome_top, count=1, flags=re.S)
    chrome_top = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(t["desc"])}">', chrome_top, count=1)
    chrome_top = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="https://algohand.com/{prefix}eas">', chrome_top, count=1)
    chrome_top = re.sub(r'<link rel="alternate" hreflang="(\w+|x-default)" href="https://algohand.com/(ru/|es/)?authors">',
                        lambda m: f'<link rel="alternate" hreflang="{m.group(1)}" href="https://algohand.com/{m.group(2) or ""}eas">', chrome_top)
    chrome_top = chrome_top.replace(' aria-current="page"', "")
    chrome_top = chrome_top.replace(f'href="/{prefix}eas">', f'href="/{prefix}eas" aria-current="page">')
    cards = "\n".join(card(ea, lang) for ea in eas)
    body = f'''<main class="wrap">
  <div class="hero" style="padding-bottom:10px">
    <div>
      <div class="eyebrow">{t["eyebrow"]}</div>
      <h1 style="margin-top:14px">{t["h1"]}</h1>
      <p class="lead">{t["lead"]}</p>
    </div>
  </div>
  <style>
    .ea-grid {{ display:grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap:18px; margin-top:8px; }}
    @media (max-width: 520px) {{ .ea-grid {{ grid-template-columns: 1fr; }} }}
    .ea-card table {{ margin-top:4px; }} .ea-card td {{ vertical-align:top; padding-right:10px; }} .ea-card td.muted {{ width:30%; }}
    .ea-card code {{ white-space:nowrap; }} .ea-head {{ display:flex; flex-wrap:wrap; gap:6px; }}
    .ea-title {{ display:flex; align-items:center; gap:14px; margin-top:14px; }} .ea-title h3 {{ margin:0; }}
    .ea-icon {{ width:48px; height:48px; flex:0 0 48px; border-radius:12px; background:var(--bg3); object-fit:contain; padding:5px; box-sizing:border-box; }}
    .pill.ok {{ background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }}
    .pill.warn {{ background: color-mix(in srgb, var(--warn) 18%, transparent); color: var(--warn); }}
  </style>
  <section style="padding-top:8px">
    <div class="ea-grid">
{cards}
    </div>
    <p class="small muted" style="margin-top:18px">{t["note"]}</p>
  </section>
  <section>
    <div class="band">
      <div>
        <h2>{t["more_h2"]}</h2>
        <p class="sub">{t["more_p"]}</p>
        <div class="cta"><a class="btn primary" href="/{prefix}traders#join">{t["btn_traders"]}</a><a class="btn" href="/{prefix}authors">{t["btn_authors"]}</a></div>
      </div>
    </div>
  </section>
</main>

'''
    return chrome_top + body + footer


def main() -> int:
    eas = load_eas()
    for lang, prefix in PREFIX.items():
        out = SITE / prefix / "eas.html"
        out.write_text(page(lang, eas), encoding="utf-8")
    return len(eas)


if __name__ == "__main__":
    print(f"catalog pages written for {main()} EAs")
