"""Generate the home page (index.html in every language) from one structure and per-language strings.

    python site/algohand/home.py          (build.py runs it too)

The page chrome (head, header, footer) is taken from the existing index.html of that language so navigation and
the language menu stay in one place; title/description/og tags are rewritten from T. Structure and English copy
follow the AlgoHand copy deck v1.0 (Sep 2026): hero (control by chat, without RDP) with the recorded session →
the RDP problem → what you can do from chat → Ask · Preview · Confirm · Execute · Verify → compatibility →
safety → who it is for → backtests → final CTA → FAQ. Example EAs are functional placeholders (Gold Scalper,
EURUSD Trend, London Breakout, BTC Grid), never real products. RU/ES are translations of the same deck.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent
PREFIX = {"en": "", "ru": "ru/", "es": "es/"}

T: dict[str, dict] = {}

# ------------------------------------------------------------------------------------------------------------ EN
T["en"] = dict(
    title="AlgoHand — Control MetaTrader EAs by Chat",
    desc="Control your MetaTrader 5 Expert Advisors by chat on your own VPS. Start, pause, change risk, backtest — without RDP. Preview, confirm, execute, verify.",
    og_title="AlgoHand — Control MetaTrader EAs by Chat",
    og_desc="Control MetaTrader 5 Expert Advisors by chat — without RDP.",
    eyebrow="MetaTrader 5 · Expert Advisors · your VPS",
    h1="Control your trading robots <em>by chat.</em>",
    lead="Start or pause an EA. Change risk. Adjust a setting. Check performance. Run a backtest. <b>From your phone, without opening RDP.</b>",
    proof="AlgoHand executes every command on your own VPS, shows you exactly what will change, and verifies the result in MetaTrader.",
    brand="Your trading robots, in good hands.",
    cta_demo="Try the demo", cta_biz="For Businesses",
    trust=["Works with your existing EAs", "No trading passwords stored", "Nothing changes without your confirmation", "Every command verified in MT5"],
    replay_label="Recorded transcript of a session",
    replay_bar="Recorded session · <b>demo setup</b> · account details changed", replay_btn="Replay",
    replay="""        <div class="note">Recorded session · demo setup · account details changed</div>
        <div class="m user">How did last week go?</div>
        <div class="chip done"><span class="st"><span>✓</span></span><span class="tag">done</span><span>get_pnl · group=ea · 7 days · <b>41 deals</b></span></div>
        <div class="m bot"><p class="lead-line">Week of 31 Aug – 6 Sep · account ••••4471 · USD</p><p class="big"><span class="pos">+612.40</span> <span class="pos" style="font-size:14px;font-weight:600">+2.1%</span></p><div class="rows"><div class="row"><span class="nm">Gold Scalper</span><b class="pos">+488.10</b><small>26 trades · 73% winners</small></div><div class="row"><span class="nm">BTC Grid</span><b class="pos">+124.30</b><small>15 trades · 67% winners</small></div></div><p class="meta">Max drawdown <b>1.4%</b> · Information, not advice.</p></div>
        <div class="m user">NFP is at 14:30. Pause Gold Scalper and switch BTC Grid to low risk until Monday.</div>
        <div class="chip preview"><span class="tag">dry run</span><span>stop_ea · <b>Gold Scalper</b> (XAUUSD M5) · soft stop · 0 open positions</span></div>
        <div class="chip preview"><span class="tag">dry run</span><span>set_risk · <b>BTC Grid</b> (BTCUSD M15) · medium → low · 3 inputs · EA restarts · 2 open positions, recovery verified</span></div>
        <div class="m bot"><p>Two changes:</p><div class="chg"><b>Gold Scalper</b><span>soft stop — no new trades; nothing open right now.</span></div><div class="chg"><b>BTC Grid <span class="arrow">medium → low</span></b><span>risk per trade 2% → 1%, max grid orders 8 → 5. The EA restarts and picks its 2 positions up by magic number.</span></div></div>
        <div class="qr" aria-hidden="true"><span data-yes>Apply both</span><span class="ghost">Only Gold Scalper</span><span class="ghost">Cancel</span></div>
        <div class="m user">Apply both</div>
        <div class="chip done" data-run="1100"><span class="st"><span>✓</span></span><span class="tag">done</span><span>stop_ea · 13:52:41 · set_risk · 13:52:44 · <b>verified in MT5</b></span></div>
        <div class="m bot"><p><b>Gold Scalper paused, BTC Grid on low; both positions still managed.</b></p><div class="vsteps"><div class="vs"><i></i><em>Requested</em><b>13:52:39</b></div><div class="vs"><i></i><em>Confirmed</em><b>13:52:40</b></div><div class="vs"><i></i><em>Happened</em><b>13:52:44</b></div><div class="vs"><i></i><em>Verified</em><b>13:52:44</b></div></div><p>Want a reminder on Monday to switch back? And a 6-month backtest of Gold Scalper on the low preset, real ticks?</p></div>
        <div class="m user">Both.</div>
        <div class="chip done" data-run="1400"><span class="st"><span>✓</span></span><span class="tag">done</span><span>run_backtest · XAUUSD M5 · Mar–Aug 2026 · real ticks · on your VPS · <b>4 min 12 s</b></span></div>
        <div class="m bot"><p class="lead-line">Backtest · Gold Scalper · XAUUSD M5 · 1 Mar – 31 Aug 2026 · preset low · real ticks</p><div class="rows"><div class="row"><span class="lbl">Net profit</span><b class="pos">+1,842.60 · +18.4%</b></div><div class="row"><span class="lbl">Max drawdown</span><b>4.9%</b></div><div class="row"><span class="lbl">Profit factor</span><b>1.62</b></div><div class="row"><span class="lbl">Trades</span><b>143 · 71% winners</b></div></div><p class="meta">Full report in your dashboard. Reminder set for Monday 08:00.</p></div>""", replay_status="connected · VPS ••••4471 · 2 terminals", replay_foot_l="Every command: preview → <b>your yes</b> → execute → verified in MT5", replay_foot_r="<b>1–3 s</b>",
    rdp_eyebrow="Without RDP", rdp_h2="Stop managing MT5 through a tiny remote desktop.",
    rdp_sub="No RDP. No squinting at a terminal on a phone. One message, a preview, your yes.",
    asks=["Pause Gold Scalper.", "Lower risk on all EURUSD EAs.", "Which robot lost money today?"], thatsit="That's it.",
    before_cap="RDP on a phone", after_cap="One message",
    phone_chat=[("user", ["Pause Gold Scalper."]), ("bot", ["Preview: soft stop,", "0 open positions. Apply?"]), ("user", ["yes"]), ("bot", ["Done ✓ verified in MT5"])],
    proof_strip="{n} EAs in the pilot catalog · real MT5 terminals in the pilot · outbound-only agent · 1–3 s to verify",
    feat_eyebrow="What you can do", feat_h2="What you can do from chat", feat_sub="Everything you used to do over RDP — without RDP.",
    features=[
        ("▶", "Start and stop", "Start an EA on the right chart with a risk preset. Soft-stop it so it keeps managing open trades, or hard-stop it. Positions are never closed behind your back."),
        ("⚖", "Change risk", "Low, medium, high — defined per EA. Applied as a set. No hunting through 90 inputs for “the risk one.”"),
        ("⚙", "Adjust a setting", "Only allowed inputs, only inside their ranges. “MaxSpread 15” is resolved to the exact input name and checked before anything runs."),
        ("◉", "See live state", "Balance, equity, floating P&amp;L, every running EA with its effective settings, open positions and pending orders — attributed to the robot that made them."),
        ("📈", "Charts and P&amp;L", "Equity curve, profit and win rate by EA, symbol, day, hour or weekday. Drawn in the chat."),
        ("⏱", "Backtest", "Run the Strategy Tester on your VPS in a second terminal, at low priority, while live robots keep trading. Compare presets, then apply the winner with the same confirmation flow."),
        ("⟳", "Keep the setup running", "Terminal closed? VPS rebooted? MT5 disconnected? AlgoHand detects it, restores what it can, and tells you exactly what happened."),
        ("≡", "Audit trail", "Who asked, what was requested, what was applied, what MT5 showed — with timestamps."),
    ],
    how_eyebrow="How it works", how_h2="Ask. Preview. Confirm. Execute. Verify.", how_sub="Nothing happens behind your back.",
    steps=[
        ("Ask", "“Pause Gold Scalper.” “Set EURUSD Trend risk to 0.5%.” “How did last week go?”"),
        ("Preview", "AlgoHand resolves the exact change: which EA, which inputs, from what to what, whether the EA restarts, whether open positions are safe."),
        ("Confirm", "You see the dry run. Nothing is sent to MT5 until you say yes."),
        ("Execute", "A small agent on your VPS applies the change to your logged-in terminals."),
        ("Verify", "AlgoHand reads the settings back from the running EA. Requested, applied and observed must match — or the command fails."),
    ],
    stats=[("1–3 s", "from command to confirmed result"), ("0", "inbound ports on the VPS"), ("0", "passwords stored"), ("90 days", "of equity samples")],
    compat_eyebrow="Compatibility", compat_h2="Keep your EAs. Keep your broker. Keep your VPS.",
    compat_p="AlgoHand works with the MetaTrader 5 setup you already use. We do not replace your robots, your broker or your machine. We give you a safer way to control them.",
    sec_eyebrow="Safety", sec_h2="You approve it. MT5 confirms it.",
    sec_note="AlgoHand operates your robots. It does not place trades and it does not act without confirmation. Performance figures in chat are information, not advice.",
    flow=["Every change is previewed.", "You approve it.", "AlgoHand executes it on your VPS.", "MT5 confirms it.", "You can see the audit trail."],
    flow_note='Architecture, key handling and certificate pinning: see <a href="/business">Business</a> and the <a href="/docs/">API docs</a>.',
    who_eyebrow="Who it is for", who_h2="Who is AlgoHand for?",
    trader_pill="Traders", trader_h3="I trade with EAs",
    trader_p="Control your robots without opening RDP. From your phone: start, pause, change risk, check P&amp;L, run a backtest.",
    trader_btn="For Traders",
    biz_pill="Business", biz_h3="I run a trading platform",
    biz_p="Add safe EA control to your AI assistant through one API. Start, stop and reconfigure customers' EAs on their VPS — with validation and verified execution.",
    biz_btn="For Businesses",
    bt_eyebrow="Backtests", bt_h2="Backtests by chat, on your own VPS",
    bt_sub="“Would the low preset have done better last year?” Ask. The Strategy Tester runs in a second terminal on your VPS at low priority. Your live robots keep trading. Compare two settings, then apply the winner the usual way: preview, confirm, verify.",
    bt_li=["Any period, symbol and timeframe", "Real ticks, every tick, 1-minute OHLC or open prices", "Your EA licence and your broker's history stay on the machine", "Metrics in the chat; full report one click away"],
    bt_box_eyebrow="How a request flows",
    bt_box="""chat: "backtest Gold Scalper, medium vs low,
       XAUUSD M5, Jan–Aug 2026, real ticks"
  → you accept the "runs on your VPS" note, once
  → a second terminal runs the tester, low priority
  → two runs side by side in the chat
  → "apply the low preset?" — preview, yes, verified""",
    try_eyebrow="Try it", try_h2="Drive real terminals from a chat.",
    try_sub="A simulated VPS with demo accounts and example EAs that resets every night. Get a code by email and you are driving EAs within a minute; or create an account and connect your own VPS, 14 days free.",
    try_btn="Try the demo", try_btn2="Start free",
    form_source="", form_thanks="Thanks! Your access code is on its way — usually within a few hours.",
    f_name="Name", f_email="Email", f_company="Company (optional)", f_msg="What would you like to try?",
    f_ph="e.g. our own EAs on a demo account, or the sandbox first", f_btn="Request access",
    f_note='By sending this form you agree to our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.',
    faq_eyebrow="Questions", faq_h2="Straight answers",
    faq=[
        ("Does AlgoHand need my account password?", "No. The agent attaches to terminals that are already logged in on your VPS. Trading and investor passwords never leave the terminal and are never stored by us."),
        ("Which brokers and EAs does it work with?", "Any MetaTrader 5 broker. The EAs you already run show up as they are. Changing settings by chat needs a short onboarding so names, ranges and restart behaviour are known."),
        ("Where does it run?", "On your Windows VPS, next to your terminals. Outbound HTTPS only. No cloud copy of your terminal. No inbound port."),
        ("Can the AI trade on its own?", "No. AlgoHand operates the robots you chose. It does not place trades and it does not act without your confirmation."),
        ("What if the VPS reboots or a terminal closes?", "AlgoHand detects it, restores what it can, and tells you what happened in plain language — instead of a silent failure."),
        ("How much does it cost?", "Private traders: Starter $19 a month for one account, Trader $39 for three, Desk $79 for eight; 15% off when paid yearly; extra accounts from $8. Unlimited EAs on every account, price locked for a year, monthly plans cancel any month, 14-day free trial. Business: API Start $199 a month with 20 accounts, Platform $599 with 100, Enterprise from $1,500 by agreement; non-exclusive licence, no source-code transfer."),
    ],
)

# ------------------------------------------------------------------------------------------------------------ RU
T["ru"] = dict(
    title="AlgoHand — управление советниками MetaTrader через чат",
    desc="Управляйте советниками MetaTrader 5 через чат на своём VPS. Запуск, пауза, смена риска, бэктесты — без RDP. Предпросмотр, подтверждение, выполнение, сверка.",
    og_title="AlgoHand — управление советниками MetaTrader через чат",
    og_desc="Управляйте советниками MetaTrader 5 через чат — без RDP.",
    eyebrow="MetaTrader 5 · советники · ваш VPS",
    h1="Управляйте торговыми роботами <em>через чат.</em>",
    lead="Запустить или поставить советник на паузу. Сменить риск. Изменить параметр. Посмотреть результаты. Прогнать бэктест. <b>С телефона, не открывая RDP.</b>",
    proof="AlgoHand выполняет каждую команду на вашем VPS, показывает, что именно изменится, и сверяет результат в MetaTrader.",
    brand="Ваши торговые роботы в надёжных руках.",
    cta_demo="Попробовать демо", cta_biz="Для бизнеса",
    trust=["Работает с вашими советниками", "Торговые пароли не хранятся", "Ничего не меняется без вашего подтверждения", "Каждая команда сверена в MT5"],
    replay_label="Запись сессии",
    replay_bar="Запись сессии · <b>демо-набор</b> · данные счёта изменены, диалог переведён", replay_btn="Повторить",
    replay="""        <div class="note">Запись сессии · демо-набор · данные счёта изменены, диалог переведён</div>
        <div class="m user">Как прошла прошлая неделя?</div>
        <div class="chip done"><span class="st"><span>✓</span></span><span class="tag">готово</span><span>get_pnl · group=ea · 7 дней · <b>41 сделка</b></span></div>
        <div class="m bot"><p class="lead-line">Неделя 31 августа – 6 сентября · счёт ••••4471 · USD</p><p class="big"><span class="pos">+612,40</span> <span class="pos" style="font-size:14px;font-weight:600">+2,1%</span></p><div class="rows"><div class="row"><span class="nm">Gold Scalper</span><b class="pos">+488,10</b><small>26 сделок · 73% прибыльных</small></div><div class="row"><span class="nm">BTC Grid</span><b class="pos">+124,30</b><small>15 сделок · 67% прибыльных</small></div></div><p class="meta">Максимальная просадка <b>1,4%</b> · Это информация, а не рекомендация.</p></div>
        <div class="m user">В 14:30 NFP. Поставь Gold Scalper на паузу и переключи BTC Grid на низкий риск до понедельника.</div>
        <div class="chip preview"><span class="tag">предпросмотр</span><span>stop_ea · <b>Gold Scalper</b> (XAUUSD M5) · мягкая остановка · открытых позиций 0</span></div>
        <div class="chip preview"><span class="tag">предпросмотр</span><span>set_risk · <b>BTC Grid</b> (BTCUSD M15) · medium → low · 3 параметра · перезапуск · 2 открытые позиции, восстановление проверено</span></div>
        <div class="m bot"><p>Два изменения:</p><div class="chg"><b>Gold Scalper</b><span>мягкая остановка — новых сделок нет, открытых сейчас тоже нет.</span></div><div class="chg"><b>BTC Grid <span class="arrow">medium → low</span></b><span>риск на сделку 2% → 1%, макс. ордеров в сетке 8 → 5. Советник перезапустится и подхватит свои 2 позиции по magic number.</span></div></div>
        <div class="qr" aria-hidden="true"><span data-yes>Применить оба</span><span class="ghost">Только Gold Scalper</span><span class="ghost">Отмена</span></div>
        <div class="m user">Применить оба</div>
        <div class="chip done" data-run="1100"><span class="st"><span>✓</span></span><span class="tag">готово</span><span>stop_ea · 13:52:41 · set_risk · 13:52:44 · <b>сверено в MT5</b></span></div>
        <div class="m bot"><p><b>Gold Scalper на паузе, BTC Grid на low; обе позиции по-прежнему под управлением.</b></p><div class="vsteps"><div class="vs"><i></i><em>Запрошено</em><b>13:52:39</b></div><div class="vs"><i></i><em>Подтверждено</em><b>13:52:40</b></div><div class="vs"><i></i><em>Выполнено</em><b>13:52:44</b></div><div class="vs"><i></i><em>Сверено</em><b>13:52:44</b></div></div><p>Напомнить в понедельник переключить обратно? И прогнать бэктест Gold Scalper на пресете low за 6 месяцев, реальные тики?</p></div>
        <div class="m user">И то, и другое.</div>
        <div class="chip done" data-run="1400"><span class="st"><span>✓</span></span><span class="tag">готово</span><span>run_backtest · XAUUSD M5 · март–август 2026 · реальные тики · на вашем VPS · <b>4 мин 12 с</b></span></div>
        <div class="m bot"><p class="lead-line">Бэктест · Gold Scalper · XAUUSD M5 · 1 марта – 31 августа 2026 · пресет low · реальные тики</p><div class="rows"><div class="row"><span class="lbl">Чистая прибыль</span><b class="pos">+1 842,60 · +18,4%</b></div><div class="row"><span class="lbl">Максимальная просадка</span><b>4,9%</b></div><div class="row"><span class="lbl">Профит-фактор</span><b>1,62</b></div><div class="row"><span class="lbl">Сделок</span><b>143 · 71% прибыльных</b></div></div><p class="meta">Полный отчёт в вашем кабинете. Напоминание поставлено на понедельник, 08:00.</p></div>""", replay_status="подключено · VPS ••••4471 · 2 терминала", replay_foot_l="Каждая команда: предпросмотр → <b>ваше «да»</b> → выполнение → сверка в MT5", replay_foot_r="<b>1–3 с</b>",
    rdp_eyebrow="Без RDP", rdp_h2="Хватит управлять MT5 через крошечный удалённый рабочий стол.",
    rdp_sub="Без RDP. Без разглядывания терминала на телефоне. Одно сообщение, предпросмотр, ваше «да».",
    asks=["Поставь Gold Scalper на паузу.", "Снизь риск на всех советниках EURUSD.", "Какой робот сегодня в минусе?"], thatsit="Вот и всё.",
    before_cap="RDP на телефоне", after_cap="Одно сообщение",
    phone_chat=[("user", ["Поставь Gold Scalper", "на паузу."]), ("bot", ["Предпросмотр: мягкая", "остановка, 0 позиций.", "Применить?"]), ("user", ["да"]), ("bot", ["Готово ✓ сверено в MT5"])],
    proof_strip="{n} EA в пилотном каталоге · настоящие терминалы MT5 в пилоте · агент только с исходящими соединениями · 1–3 с до сверки",
    feat_eyebrow="Что можно делать", feat_h2="Что можно делать из чата", feat_sub="Всё, что вы делали через RDP — без RDP.",
    features=[
        ("▶", "Запуск и остановка", "Запустите советник на нужном графике с пресетом риска. Остановите мягко, чтобы он довёл открытые сделки, или жёстко. Позиции никогда не закрываются у вас за спиной."),
        ("⚖", "Смена риска", "Низкий, средний, высокий — заданы для каждого советника. Применяются целиком. Не нужно искать среди 90 параметров «тот, что про риск»."),
        ("⚙", "Изменение параметра", "Только разрешённые параметры, только в своих диапазонах. «MaxSpread 15» превращается в точное имя параметра и проверяется до того, как что-то запустится."),
        ("◉", "Живое состояние", "Баланс, средства, плавающая прибыль, каждый работающий советник с фактическими настройками, открытые позиции и отложенные ордера — с привязкой к роботу, который их создал."),
        ("📈", "Графики и прибыль", "Кривая эквити, прибыль и винрейт по советникам, символам, дням, часам и дням недели. Прямо в чате."),
        ("⏱", "Бэктест", "Strategy Tester на вашем VPS во втором терминале, с низким приоритетом, пока живые роботы продолжают торговать. Сравните пресеты и примените лучший с тем же подтверждением."),
        ("⟳", "Всё продолжает работать", "Терминал закрыт? VPS перезагрузился? MT5 отключился? AlgoHand замечает, восстанавливает что может и точно рассказывает, что произошло."),
        ("≡", "Журнал действий", "Кто просил, что запрошено, что применено, что показал MT5 — с отметками времени."),
    ],
    how_eyebrow="Как это работает", how_h2="Спросите. Посмотрите. Подтвердите. Выполнено. Сверено.", how_sub="Ничего не происходит у вас за спиной.",
    steps=[
        ("Спросите", "«Поставь Gold Scalper на паузу». «Поставь EURUSD Trend риск 0,5%». «Как прошла неделя?»"),
        ("Предпросмотр", "AlgoHand определяет точное изменение: какой советник, какие параметры, с какого значения на какое, будет ли перезапуск, безопасно ли для открытых позиций."),
        ("Подтвердите", "Вы видите пробный прогон. В MT5 ничего не отправляется, пока вы не скажете «да»."),
        ("Выполнение", "Небольшой агент на вашем VPS применяет изменение в залогиненных терминалах."),
        ("Сверка", "AlgoHand читает настройки обратно из работающего советника. Запрошенное, применённое и наблюдаемое должны совпасть — иначе команда считается неудачной."),
    ],
    stats=[("1–3 с", "от команды до подтверждённого результата"), ("0", "входящих портов на VPS"), ("0", "сохранённых паролей"), ("90 дней", "замеров эквити")],
    compat_eyebrow="Совместимость", compat_h2="Советники — ваши. Брокер — ваш. VPS — ваш.",
    compat_p="AlgoHand работает с той установкой MetaTrader 5, которая у вас уже есть. Мы не заменяем ваших роботов, брокера или машину. Мы даём более безопасный способ ими управлять.",
    sec_eyebrow="Безопасность", sec_h2="Вы одобряете. MT5 подтверждает.",
    sec_note="AlgoHand управляет вашими роботами. Он не открывает сделки и не действует без подтверждения. Цифры результатов в чате — информация, а не рекомендация.",
    flow=["Каждое изменение показывается заранее.", "Вы его одобряете.", "AlgoHand выполняет его на вашем VPS.", "MT5 подтверждает.", "Журнал действий всегда под рукой."],
    flow_note='Архитектура, ключи и закрепление сертификатов: см. <a href="/ru/business">Для бизнеса</a> и <a href="/docs/">документацию API</a>.',
    who_eyebrow="Для кого", who_h2="Для кого AlgoHand?",
    trader_pill="Трейдерам", trader_h3="Я торгую советниками",
    trader_p="Управляйте роботами, не открывая RDP. С телефона: запуск, пауза, смена риска, прибыль, бэктест.",
    trader_btn="Трейдерам",
    biz_pill="Бизнесу", biz_h3="У меня торговая платформа",
    biz_p="Добавьте своему AI-ассистенту безопасное управление советниками через один API. Запуск, остановка и перенастройка советников клиентов на их VPS — с проверкой и сверенным выполнением.",
    biz_btn="Для бизнеса",
    bt_eyebrow="Бэктесты", bt_h2="Бэктесты через чат, на вашем VPS",
    bt_sub="«А пресет low за прошлый год вышел бы лучше?» Спросите. Strategy Tester запустится во втором терминале на вашем VPS с низким приоритетом. Живые роботы продолжают торговать. Сравните две настройки и примените лучшую как обычно: предпросмотр, подтверждение, сверка.",
    bt_li=["Любой период, символ и таймфрейм", "Реальные тики, каждый тик, OHLC минутных баров или цены открытия", "Лицензия советника и история брокера не покидают машину", "Метрики в чате; полный отчёт в одном клике"],
    bt_box_eyebrow="Как идёт запрос",
    bt_box="""чат: «протестируй Gold Scalper, medium и low,
      XAUUSD M5, янв–авг 2026, реальные тики»
  → один раз принимаете «работает на вашем VPS»
  → второй терминал, тестер с низким приоритетом
  → два прогона рядом в чате
  → «применить пресет low?» — предпросмотр, да, сверено""",
    try_eyebrow="Попробуйте", try_h2="Управляйте настоящими терминалами из чата.",
    try_sub="Настоящие терминалы MetaTrader 5 с демо-счетами плюс симулированный VPS, который сбрасывается каждую ночь. Запросите код — и через минуту вы управляете советниками.",
    try_btn="Попробовать демо", try_btn2="Начать бесплатно",
    form_source="ru", form_thanks="Спасибо! Код доступа уже в пути — обычно в течение нескольких часов.",
    f_name="Имя", f_email="Email", f_company="Компания (необязательно)", f_msg="Что хотите попробовать?",
    f_ph="например, свои советники на демо-счёте или сначала песочницу", f_btn="Запросить доступ",
    f_note='Отправляя форму, вы соглашаетесь с нашей <a href="/privacy">Политикой конфиденциальности</a> и <a href="/terms">Условиями использования</a> (на английском языке).',
    faq_eyebrow="Вопросы", faq_h2="Прямые ответы",
    faq=[
        ("Нужен ли AlgoHand пароль от моего счёта?", "Нет. Агент подключается к терминалам, которые уже залогинены на вашем VPS. Торговые и инвесторские пароли никогда не покидают терминал и не хранятся у нас."),
        ("С какими брокерами и советниками это работает?", "С любым брокером MetaTrader 5. Советники, которые у вас уже работают, появляются как есть. Чтобы менять настройки через чат, нужно короткое подключение, чтобы имена, диапазоны и поведение при перезапуске были известны."),
        ("Где это работает?", "На вашем Windows VPS, рядом с терминалами. Только исходящий HTTPS. Нет облачной копии терминала. Нет входящего порта."),
        ("Может ли AI торговать сам?", "Нет. AlgoHand управляет роботами, которых выбрали вы. Он не открывает сделки и не действует без вашего подтверждения."),
        ("Что, если VPS перезагрузится или терминал закроется?", "AlgoHand замечает это, восстанавливает что может и понятным языком рассказывает, что произошло — вместо тихого сбоя."),
        ("Сколько это стоит?", "Частным трейдерам: Starter 19 USD в месяц за один счёт, Trader 39 USD за три, Desk 79 USD за восемь; при оплате за год на 15% дешевле; дополнительные счета от 8 USD. Советников на каждом счёте без ограничений, цена фиксируется на год, помесячную подписку можно отменить в любой месяц, 14 дней бесплатно. Бизнес: API Start 199 USD в месяц с 20 счетами, Platform 599 USD со 100, Enterprise от 1 500 USD по договору; неисключительная лицензия, без передачи исходного кода."),
    ],
)

# ------------------------------------------------------------------------------------------------------------ ES
T["es"] = dict(
    title="AlgoHand — Controla tus EA de MetaTrader por chat",
    desc="Controla tus Expert Advisors de MetaTrader 5 por chat en tu propio VPS. Inicia, pausa, cambia el riesgo, haz backtests — sin RDP. Previsualiza, confirma, ejecuta, verifica.",
    og_title="AlgoHand — Controla tus EA de MetaTrader por chat",
    og_desc="Controla Expert Advisors de MetaTrader 5 por chat — sin RDP.",
    eyebrow="MetaTrader 5 · Expert Advisors · tu VPS",
    h1="Controla tus robots de trading <em>por chat.</em>",
    lead="Inicia o pausa un EA. Cambia el riesgo. Ajusta un parámetro. Revisa el rendimiento. Lanza un backtest. <b>Desde el móvil, sin abrir RDP.</b>",
    proof="AlgoHand ejecuta cada comando en tu propio VPS, te muestra exactamente qué va a cambiar y verifica el resultado en MetaTrader.",
    brand="Tus robots de trading, en buenas manos.",
    cta_demo="Probar la demo", cta_biz="Para empresas",
    trust=["Funciona con los EA que ya tienes", "Sin contraseñas de trading almacenadas", "Nada cambia sin tu confirmación", "Cada comando verificado en MT5"],
    replay_label="Transcripción grabada de una sesión",
    replay_bar="Sesión grabada · <b>configuración demo</b> · datos de la cuenta cambiados, diálogo traducido", replay_btn="Repetir",
    replay="""        <div class="note">Sesión grabada · configuración demo · datos de la cuenta cambiados, diálogo traducido</div>
        <div class="m user">¿Cómo fue la semana pasada?</div>
        <div class="chip done"><span class="st"><span>✓</span></span><span class="tag">hecho</span><span>get_pnl · group=ea · 7 días · <b>41 operaciones</b></span></div>
        <div class="m bot"><p class="lead-line">Semana del 31 ago al 6 sep · cuenta ••••4471 · USD</p><p class="big"><span class="pos">+612,40</span> <span class="pos" style="font-size:14px;font-weight:600">+2,1 %</span></p><div class="rows"><div class="row"><span class="nm">Gold Scalper</span><b class="pos">+488,10</b><small>26 operaciones · 73 % ganadoras</small></div><div class="row"><span class="nm">BTC Grid</span><b class="pos">+124,30</b><small>15 operaciones · 67 % ganadoras</small></div></div><p class="meta">Drawdown máximo <b>1,4 %</b> · Información, no asesoramiento.</p></div>
        <div class="m user">El NFP es a las 14:30. Pausa Gold Scalper y pon BTC Grid en riesgo bajo hasta el lunes.</div>
        <div class="chip preview"><span class="tag">vista previa</span><span>stop_ea · <b>Gold Scalper</b> (XAUUSD M5) · parada suave · 0 posiciones abiertas</span></div>
        <div class="chip preview"><span class="tag">vista previa</span><span>set_risk · <b>BTC Grid</b> (BTCUSD M15) · medium → low · 3 parámetros · el EA se reinicia · 2 posiciones abiertas, recuperación verificada</span></div>
        <div class="m bot"><p>Dos cambios:</p><div class="chg"><b>Gold Scalper</b><span>parada suave — sin operaciones nuevas; nada abierto ahora mismo.</span></div><div class="chg"><b>BTC Grid <span class="arrow">medium → low</span></b><span>riesgo por operación 2 % → 1 %, máximo de órdenes del grid 8 → 5. El EA se reinicia y recoge sus 2 posiciones por magic number.</span></div></div>
        <div class="qr" aria-hidden="true"><span data-yes>Aplicar los dos</span><span class="ghost">Solo Gold Scalper</span><span class="ghost">Cancelar</span></div>
        <div class="m user">Aplicar los dos</div>
        <div class="chip done" data-run="1100"><span class="st"><span>✓</span></span><span class="tag">hecho</span><span>stop_ea · 13:52:41 · set_risk · 13:52:44 · <b>verificado en MT5</b></span></div>
        <div class="m bot"><p><b>Gold Scalper en pausa, BTC Grid en low; las dos posiciones siguen gestionadas.</b></p><div class="vsteps"><div class="vs"><i></i><em>Solicitado</em><b>13:52:39</b></div><div class="vs"><i></i><em>Confirmado</em><b>13:52:40</b></div><div class="vs"><i></i><em>Ejecutado</em><b>13:52:44</b></div><div class="vs"><i></i><em>Verificado</em><b>13:52:44</b></div></div><p>¿Quieres un recordatorio el lunes para volver a cambiarlo? ¿Y un backtest de 6 meses de Gold Scalper con el preset low, ticks reales?</p></div>
        <div class="m user">Las dos cosas.</div>
        <div class="chip done" data-run="1400"><span class="st"><span>✓</span></span><span class="tag">hecho</span><span>run_backtest · XAUUSD M5 · mar–ago 2026 · ticks reales · en tu VPS · <b>4 min 12 s</b></span></div>
        <div class="m bot"><p class="lead-line">Backtest · Gold Scalper · XAUUSD M5 · 1 mar – 31 ago 2026 · preset low · ticks reales</p><div class="rows"><div class="row"><span class="lbl">Beneficio neto</span><b class="pos">+1.842,60 · +18,4 %</b></div><div class="row"><span class="lbl">Drawdown máximo</span><b>4,9 %</b></div><div class="row"><span class="lbl">Profit factor</span><b>1,62</b></div><div class="row"><span class="lbl">Operaciones</span><b>143 · 71 % ganadoras</b></div></div><p class="meta">Informe completo en tu panel. Recordatorio programado para el lunes a las 08:00.</p></div>""", replay_status="conectado · VPS ••••4471 · 2 terminales", replay_foot_l="Cada comando: vista previa → <b>tu sí</b> → ejecución → verificado en MT5", replay_foot_r="<b>1–3 s</b>",
    rdp_eyebrow="Sin RDP", rdp_h2="Deja de manejar MT5 desde un escritorio remoto diminuto.",
    rdp_sub="Sin RDP. Sin forzar la vista en un terminal desde el móvil. Un mensaje, una vista previa, tu sí.",
    asks=["Pausa Gold Scalper.", "Baja el riesgo en todos los EA de EURUSD.", "¿Qué robot perdió dinero hoy?"], thatsit="Eso es todo.",
    before_cap="RDP en el móvil", after_cap="Un mensaje",
    phone_chat=[("user", ["Pausa Gold Scalper."]), ("bot", ["Vista previa: parada", "suave, 0 posiciones.", "¿Aplico?"]), ("user", ["sí"]), ("bot", ["Hecho ✓ verificado en MT5"])],
    proof_strip="{n} EA en el catálogo piloto · terminales MT5 reales en el piloto · agente solo saliente · 1–3 s hasta verificar",
    feat_eyebrow="Qué puedes hacer", feat_h2="Qué puedes hacer desde el chat", feat_sub="Todo lo que hacías por RDP — sin RDP.",
    features=[
        ("▶", "Iniciar y detener", "Inicia un EA en el gráfico correcto con un preset de riesgo. Deténlo de forma suave para que siga gestionando las operaciones abiertas, o de forma dura. Las posiciones nunca se cierran a tus espaldas."),
        ("⚖", "Cambiar el riesgo", "Bajo, medio, alto — definidos por EA. Aplicados como un conjunto. Sin buscar entre 90 parámetros «el del riesgo»."),
        ("⚙", "Ajustar un parámetro", "Solo parámetros permitidos, solo dentro de sus rangos. «MaxSpread 15» se resuelve al nombre exacto del parámetro y se comprueba antes de ejecutar nada."),
        ("◉", "Ver el estado en vivo", "Balance, equidad, P&amp;L flotante, cada EA en marcha con sus ajustes efectivos, posiciones abiertas y órdenes pendientes — atribuidas al robot que las creó."),
        ("📈", "Gráficos y P&amp;L", "Curva de equidad, beneficio y tasa de acierto por EA, símbolo, día, hora o día de la semana. Dibujados en el chat."),
        ("⏱", "Backtest", "Ejecuta el Strategy Tester en tu VPS en un segundo terminal, con prioridad baja, mientras los robots en vivo siguen operando. Compara presets y aplica el ganador con el mismo flujo de confirmación."),
        ("⟳", "Mantener todo en marcha", "¿Terminal cerrado? ¿VPS reiniciado? ¿MT5 desconectado? AlgoHand lo detecta, restaura lo que puede y te cuenta exactamente qué pasó."),
        ("≡", "Registro de auditoría", "Quién lo pidió, qué se solicitó, qué se aplicó, qué mostró MT5 — con marcas de tiempo."),
    ],
    how_eyebrow="Cómo funciona", how_h2="Pide. Previsualiza. Confirma. Ejecuta. Verifica.", how_sub="Nada pasa a tus espaldas.",
    steps=[
        ("Pide", "«Pausa Gold Scalper». «Pon el riesgo de EURUSD Trend en 0,5 %». «¿Cómo fue la semana pasada?»"),
        ("Previsualiza", "AlgoHand resuelve el cambio exacto: qué EA, qué parámetros, de qué valor a cuál, si el EA se reinicia, si las posiciones abiertas están a salvo."),
        ("Confirma", "Ves la simulación. Nada se envía a MT5 hasta que dices que sí."),
        ("Ejecuta", "Un pequeño agente en tu VPS aplica el cambio en tus terminales autenticados."),
        ("Verifica", "AlgoHand lee los ajustes de vuelta desde el EA en marcha. Lo solicitado, lo aplicado y lo observado deben coincidir — o el comando falla."),
    ],
    stats=[("1–3 s", "del comando al resultado confirmado"), ("0", "puertos entrantes en el VPS"), ("0", "contraseñas almacenadas"), ("90 días", "de muestras de equidad")],
    compat_eyebrow="Compatibilidad", compat_h2="Conserva tus EA. Conserva tu bróker. Conserva tu VPS.",
    compat_p="AlgoHand funciona con la configuración de MetaTrader 5 que ya usas. No sustituimos tus robots, tu bróker ni tu máquina. Te damos una forma más segura de controlarlos.",
    sec_eyebrow="Seguridad", sec_h2="Tú lo apruebas. MT5 lo confirma.",
    sec_note="AlgoHand maneja tus robots. No abre operaciones y no actúa sin confirmación. Las cifras de rendimiento en el chat son información, no asesoramiento.",
    flow=["Cada cambio se previsualiza.", "Tú lo apruebas.", "AlgoHand lo ejecuta en tu VPS.", "MT5 lo confirma.", "Puedes ver el registro de auditoría."],
    flow_note='Arquitectura, manejo de claves y fijación de certificados: ver <a href="/es/business">Empresas</a> y la <a href="/docs/">documentación de la API</a>.',
    who_eyebrow="Para quién es", who_h2="¿Para quién es AlgoHand?",
    trader_pill="Traders", trader_h3="Opero con EA",
    trader_p="Controla tus robots sin abrir RDP. Desde el móvil: iniciar, pausar, cambiar el riesgo, revisar el P&amp;L, lanzar un backtest.",
    trader_btn="Para traders",
    biz_pill="Empresas", biz_h3="Tengo una plataforma de trading",
    biz_p="Añade control seguro de EA a tu asistente de IA a través de una API. Inicia, detén y reconfigura los EA de tus clientes en sus VPS — con validación y ejecución verificada.",
    biz_btn="Para empresas",
    bt_eyebrow="Backtests", bt_h2="Backtests por chat, en tu propio VPS",
    bt_sub="«¿Habría ido mejor el preset low el año pasado?» Pregunta. El Strategy Tester se ejecuta en un segundo terminal de tu VPS con prioridad baja. Tus robots en vivo siguen operando. Compara dos ajustes y aplica el ganador como siempre: vista previa, confirmación, verificación.",
    bt_li=["Cualquier periodo, símbolo y marco temporal", "Ticks reales, cada tick, OHLC de 1 minuto o precios de apertura", "La licencia de tu EA y el historial de tu bróker no salen de la máquina", "Métricas en el chat; el informe completo a un clic"],
    bt_box_eyebrow="Cómo fluye una petición",
    bt_box="""chat: «backtest Gold Scalper, medium vs low,
       XAUUSD M5, ene–ago 2026, ticks reales»
  → aceptas una vez el aviso «se ejecuta en tu VPS»
  → un segundo terminal, tester con prioridad baja
  → dos ejecuciones lado a lado en el chat
  → «¿aplicar el preset low?» — vista previa, sí, verificado""",
    try_eyebrow="Pruébalo", try_h2="Maneja terminales reales desde un chat.",
    try_sub="Terminales reales de MetaTrader 5 con cuentas demo, más un VPS simulado que se reinicia cada noche. Pide un código y en un minuto estás manejando EA.",
    try_btn="Probar la demo", try_btn2="Empieza gratis",
    form_source="es", form_thanks="¡Gracias! Tu código de acceso va en camino — normalmente en pocas horas.",
    f_name="Nombre", f_email="E-mail", f_company="Empresa (opcional)", f_msg="¿Qué te gustaría probar?",
    f_ph="p. ej. nuestros propios EA en una cuenta demo, o primero el sandbox", f_btn="Solicitar acceso",
    f_note='Al enviar este formulario aceptas nuestra <a href="/privacy">Política de privacidad</a> y los <a href="/terms">Términos del servicio</a> (en inglés).',
    faq_eyebrow="Preguntas", faq_h2="Respuestas directas",
    faq=[
        ("¿AlgoHand necesita la contraseña de mi cuenta?", "No. El agente se conecta a terminales que ya están autenticados en tu VPS. Las contraseñas de trading y de inversor nunca salen del terminal y nosotros nunca las almacenamos."),
        ("¿Con qué brókers y EA funciona?", "Con cualquier bróker de MetaTrader 5. Los EA que ya ejecutas aparecen tal cual. Cambiar ajustes por chat requiere una breve incorporación para que se conozcan nombres, rangos y comportamiento al reiniciar."),
        ("¿Dónde se ejecuta?", "En tu VPS de Windows, junto a tus terminales. Solo HTTPS saliente. Sin copia en la nube de tu terminal. Sin puerto entrante."),
        ("¿Puede la IA operar por su cuenta?", "No. AlgoHand maneja los robots que tú elegiste. No abre operaciones y no actúa sin tu confirmación."),
        ("¿Qué pasa si el VPS se reinicia o un terminal se cierra?", "AlgoHand lo detecta, restaura lo que puede y te cuenta qué pasó en lenguaje claro — en lugar de un fallo silencioso."),
        ("¿Cuánto cuesta?", "Traders particulares: Starter 19 USD al mes por una cuenta, Trader 39 USD por tres, Desk 79 USD por ocho; un 15% menos pagando por año; cuentas extra desde 8 USD. EA ilimitados en cada cuenta, precio fijado durante un año, el plan mensual se cancela cualquier mes, 14 días gratis. Empresas: API Start 199 USD al mes con 20 cuentas, Platform 599 USD con 100, Enterprise desde 1.500 USD según acuerdo; licencia no exclusiva, sin transferencia de código fuente."),
    ],
)


def lis(items: list[str], indent: str = "          ") -> str:
    return "\n".join(f"{indent}<li>{i}</li>" for i in items)


def reviewed_eas() -> int:
    """How many EAs the public catalog lists (registry entries in status reviewed/approved) — the proof strip quotes it."""
    import yaml
    n = 0
    for p in (SITE.parents[1] / "registry" / "eas").glob("*.yaml"):
        if yaml.safe_load(p.read_text(encoding="utf-8")).get("status") in ("reviewed", "approved"):
            n += 1
    return n


def rdp_visual(t: dict) -> str:
    """The one picture the brain keeps (site review, Sep 2026): a whole MT5 desktop squeezed into a phone over
    RDP, next to the same action as one chat message. Inline SVG, theme colours via CSS variables."""
    import random
    rnd = random.Random(7)
    W, H = 150, 300

    def frame(inner: str) -> str:
        return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-hidden="true">'
                f'<rect x="1" y="1" width="{W - 2}" height="{H - 2}" rx="22" fill="var(--bg3)" stroke="var(--line)"/>'
                f'<rect x="8" y="12" width="{W - 16}" height="{H - 24}" rx="12" fill="var(--bg)"/>'
                f'<rect x="{W / 2 - 18}" y="5" width="36" height="4" rx="2" fill="var(--line)"/>{inner}</svg>')

    left = ['<rect x="8" y="12" width="134" height="7" rx="6" fill="var(--bg3)"/>']                       # menu bar
    left += [f'<rect x="{11 + i * 9}" y="14" width="6" height="3" rx=".5" fill="var(--ink3)"/>' for i in range(14)]
    left.append('<rect x="8" y="20" width="30" height="176" fill="var(--bg2)"/>')                       # market watch + navigator
    left += [f'<rect x="10" y="{24 + i * 6}" width="{rnd.randint(14, 26)}" height="1.6" fill="var(--ink3)"/>' for i in range(28)]
    left.append('<rect x="39" y="20" width="103" height="176" fill="var(--bg2)"/>')                     # chart
    left += [f'<line x1="39" y1="{30 + i * 24}" x2="142" y2="{30 + i * 24}" stroke="var(--line)" stroke-width=".4"/>' for i in range(7)]
    x, y = 43.0, 110
    for _ in range(23):
        o = y
        c = o + rnd.randint(-14, 14)
        hi, lo = min(o, c) - rnd.randint(1, 6), max(o, c) + rnd.randint(1, 6)
        col = "var(--ok)" if c <= o else "var(--bad)"
        left.append(f'<line x1="{x}" y1="{hi}" x2="{x}" y2="{lo}" stroke="{col}" stroke-width=".7"/>'
                    f'<rect x="{x - 1.4}" y="{min(o, c)}" width="2.8" height="{max(1.2, abs(c - o))}" fill="{col}"/>')
        x += 4.2
        y = max(40, min(180, c))
    left.append('<rect x="8" y="197" width="134" height="91" rx="0" fill="var(--bg2)"/>')               # toolbox / terminal
    left += [f'<rect x="{11 + j * 22}" y="199" width="18" height="4" rx=".6" fill="var(--bg3)"/>' for j in range(6)]
    for i in range(12):
        left += [f'<rect x="{11 + j * 22}" y="{207 + i * 6.5}" width="{rnd.randint(8, 17)}" height="1.6" fill="var(--ink3)"/>' for j in range(6)]
    left.append('<path d="M96 150 l0 14 l3.5-3 l2.5 6 l2-1 l-2.5-6 l4.5-.5 z" fill="#fff" stroke="#000" stroke-width=".6"/>')  # the cursor

    right, yy = [], 30.0
    for who, lines in t["phone_chat"]:
        h = 8 + 9.5 * len(lines)
        w = min(118.0, 10 + 4.0 * max(len(line) for line in lines))
        xx = W - 8 - 6 - w if who == "user" else 16
        fill = "var(--chat-user)" if who == "user" else "var(--chat-bot)"
        stroke = "" if who == "user" else ' stroke="var(--line)" stroke-width=".8"'
        right.append(f'<rect x="{xx}" y="{yy}" width="{w}" height="{h}" rx="7" fill="{fill}"{stroke}/>')
        for i, line in enumerate(lines):
            right.append(f'<text x="{xx + 5}" y="{yy + 11 + i * 9.5}" font-size="7" font-family="Inter, sans-serif" fill="var(--ink)">{html.escape(line)}</text>')
        yy += h + 8
    right.append(f'<rect x="16" y="{H - 36}" width="118" height="16" rx="8" fill="var(--bg2)" stroke="var(--line)" stroke-width=".8"/>')
    right.append(f'<text x="24" y="{H - 25}" font-size="7" font-family="Inter, sans-serif" fill="var(--ink3)">…</text>')
    return (f'<div class="compare"><figure>{frame("".join(left))}<figcaption>{t["before_cap"]}</figcaption></figure>'
            f'<span class="vs" aria-hidden="true">→</span>'
            f'<figure>{frame("".join(right))}<figcaption>{t["after_cap"]}</figcaption></figure></div>')


def main_html(lang: str) -> str:
    t = T[lang]
    p = PREFIX[lang]
    e = html.escape
    features = "\n".join(f'      <div class="card"><div class="ic">{ic}</div><h3>{h}</h3><p>{body}</p></div>' for ic, h, body in t["features"])
    steps = "\n".join(f'      <div class="step"><h3>{h}</h3><p>{body}</p></div>' for h, body in t["steps"])
    stats = "\n".join(f'      <div class="stat"><b>{b}</b><span>{s}</span></div>' for b, s in t["stats"])
    asks = "\n".join(f'        <div class="m user">{a}</div>' for a in t["asks"])
    faq = "\n".join(f"    <details><summary>{q}</summary><p>{a}</p></details>" for q, a in t["faq"])
    trust = "\n".join(f"        <span>{s}</span>" for s in t["trust"])
    src = f' data-source="{t["form_source"]}"' if t["form_source"] else ""
    return f'''<main class="wrap">

  <div class="hero">
    <div>
      <div class="eyebrow">{t["eyebrow"]}</div>
      <h1 style="margin-top:14px">{t["h1"]}</h1>
      <p class="lead">{t["lead"]}</p>
      <p class="lead">{t["proof"]}</p>
      <p class="brandline">{t["brand"]}</p>
      <div class="cta">
        <a class="btn primary" href="/{p}demo">{t["cta_demo"]}</a>
        <a class="btn" href="/{p}business">{t["cta_biz"]}</a>
      </div>
      <div class="trust">
{trust}
      </div>
    </div>

    <div class="replay v2" data-replay="auto" aria-label="{e(t["replay_label"])}">
      <div class="progress" aria-hidden="true"></div>
      <div class="bar">
        <div class="avatar" aria-hidden="true">AH</div>
        <div class="who"><b>AlgoHand</b><span><i></i>{t["replay_status"]}</span></div>
        <button type="button"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.5v3h-3"/></svg>{t["replay_btn"]}</button>
      </div>
      <div class="log">
{t["replay"]}
      </div>
      <div class="footer-note"><span>{t["replay_foot_l"]}</span><span>{t["replay_foot_r"]}</span></div>
    </div>
  </div>
  <div class="proof">{t["proof_strip"].format(n=reviewed_eas())}</div>

  <section id="rdp">
    <div class="grid2" style="align-items:center">
      <div>
        <div class="eyebrow">{t["rdp_eyebrow"]}</div>
        <h2>{t["rdp_h2"]}</h2>
        <p class="sub">{t["rdp_sub"]}</p>
        <div class="asks inline">
{asks}
          <p class="thatsit">{t["thatsit"]}</p>
        </div>
      </div>
      {rdp_visual(t)}
    </div>
  </section>

  <section id="features">
    <div class="eyebrow">{t["feat_eyebrow"]}</div>
    <h2>{t["feat_h2"]}</h2>
    <p class="sub">{t["feat_sub"]}</p>
    <div class="grid4" style="margin-top:26px">
{features}
    </div>
  </section>

  <section id="how">
    <div class="eyebrow">{t["how_eyebrow"]}</div>
    <h2>{t["how_h2"]}</h2>
    <p class="sub">{t["how_sub"]}</p>
    <div class="steps five" style="margin-top:26px">
{steps}
    </div>
    <div class="stats">
{stats}
    </div>
  </section>

  <section id="compat" class="compat">
    <div class="eyebrow">{t["compat_eyebrow"]}</div>
    <h2>{t["compat_h2"]}</h2>
    <p class="sub">{t["compat_p"]}</p>
  </section>

  <section id="security">
    <div class="band">
      <div>
        <div class="eyebrow">{t["sec_eyebrow"]}</div>
        <h2>{t["sec_h2"]}</h2>
        <p class="sub">{t["sec_note"]}</p>
        <p class="small muted" style="margin-top:14px">{t["flow_note"]}</p>
      </div>
      <div class="card">
        <ul class="checks big" style="margin:0">
{lis(t["flow"])}
        </ul>
      </div>
    </div>
  </section>

  <section id="who">
    <div class="eyebrow">{t["who_eyebrow"]}</div>
    <h2>{t["who_h2"]}</h2>
    <div class="grid2" style="margin-top:26px">
      <div class="card audience">
        <span class="pill">{t["trader_pill"]}</span>
        <h3 style="margin-top:12px">{t["trader_h3"]}</h3>
        <p>{t["trader_p"]}</p>
        <a class="btn primary" href="/{p}traders">{t["trader_btn"]}</a>
      </div>
      <div class="card audience">
        <span class="pill">{t["biz_pill"]}</span>
        <h3 style="margin-top:12px">{t["biz_h3"]}</h3>
        <p>{t["biz_p"]}</p>
        <a class="btn primary" href="/{p}business">{t["biz_btn"]}</a>
      </div>
    </div>
  </section>

  <section id="backtests">
    <div class="band">
      <div>
        <div class="eyebrow">{t["bt_eyebrow"]}</div>
        <h2>{t["bt_h2"]}</h2>
        <p class="sub">{t["bt_sub"]}</p>
        <ul class="checks">
{lis(t["bt_li"])}
        </ul>
      </div>
      <div class="card" style="background:var(--tool)">
        <div class="eyebrow">{t["bt_box_eyebrow"]}</div>
        <pre style="margin:10px 0 0;border:0;padding:0;background:none">{t["bt_box"]}</pre>
      </div>
    </div>
  </section>

  <section id="demo">
    <div class="band" style="grid-template-columns:1fr">
      <div>
        <div class="eyebrow">{t["try_eyebrow"]}</div>
        <h2>{t["try_h2"]}</h2>
        <p class="sub">{t["try_sub"]}</p>
        <div class="cta"><a class="btn primary" href="/{p}demo">{t["try_btn"]}</a><a class="btn" href="https://app.algohand.com/{('?lang=' + p.rstrip('/')) if p else ''}#register">{t["try_btn2"]}</a></div>
      </div>
    </div>
  </section>

  <section id="faq" class="faq">
    <div class="eyebrow">{t["faq_eyebrow"]}</div>
    <h2 style="margin-bottom:18px">{t["faq_h2"]}</h2>
{faq}
  </section>

</main>

'''


def page(lang: str) -> str:
    t = T[lang]
    path = SITE / PREFIX[lang] / "index.html"
    src = path.read_text(encoding="utf-8")
    top = src[:src.index('<main class="wrap">')]
    footer = src[src.index("<footer>"):]
    top = re.sub(r"<title>.*?</title>", f"<title>{t['title']}</title>", top, count=1, flags=re.S)
    top = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(t["desc"], quote=True)}">', top, count=1)
    top = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(t["og_title"], quote=True)}">', top, count=1)
    top = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(t["og_desc"], quote=True)}">', top, count=1)
    return top + main_html(lang) + footer


def main() -> int:
    for lang in T:
        out = SITE / PREFIX[lang] / "index.html"
        out.write_text(page(lang), encoding="utf-8")
    return len(T)


if __name__ == "__main__":
    print(f"home page written in {main()} languages")
