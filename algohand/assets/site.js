/* AlgoHand site: nav toggle, transcript replay, lead forms → api.algohand.com/v1/leads */
(function () {
  const API = document.documentElement.dataset.api || 'https://api.algohand.com';
  const RU = (document.documentElement.lang || 'en').toLowerCase().startsWith('ru');
  const T = RU
    ? { sending: 'Отправляем…', thanks: 'Спасибо! Ответим в течение одного рабочего дня.', wrong: 'Что-то пошло не так. Напишите нам на info@algohand.com.', offline: 'Не удалось связаться с сервером. Напишите нам на info@algohand.com.' }
    : { sending: 'Sending…', thanks: 'Thank you — we will get back to you within one business day.', wrong: 'Something went wrong. Please write to info@algohand.com.', offline: 'Could not reach the server. Please write to info@algohand.com.' };

  const toggle = document.querySelector('.navtoggle');
  const nav = document.querySelector('nav.main');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));

  // language dropdown
  const menus = Array.from(document.querySelectorAll('.langmenu'));
  const setOpen = (m, open) => { m.classList.toggle('open', open); m.querySelector('button').setAttribute('aria-expanded', open ? 'true' : 'false'); };
  menus.forEach(m => {
    m.querySelector('button').addEventListener('click', e => { e.stopPropagation(); const open = !m.classList.contains('open'); menus.forEach(x => setOpen(x, false)); setOpen(m, open); });
    m.addEventListener('click', e => e.stopPropagation());
  });
  document.addEventListener('click', () => menus.forEach(m => setOpen(m, false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') menus.forEach(m => setOpen(m, false)); });
  if (location.hash === '#lang' && menus[0]) { setOpen(menus[0], true); if (nav) nav.classList.add('open'); }

  // transcript replay (recorded session): one orchestrated animation — typing before bot bubbles, dry-run / done chips
  // that run for a moment, quick replies that get pressed, a verification stepper that fills in, a progress bar
  document.querySelectorAll('.replay[data-replay]').forEach(box => {
    const log = box.querySelector('.log'), btn = box.querySelector('.bar button'), bar = box.querySelector('.progress');
    if (!log || !btn) return;
    const items = Array.from(log.children).filter(el => !el.classList.contains('note'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timers = [], run = 0;
    const wait = ms => new Promise(r => timers.push(setTimeout(r, ms)));
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const scrollDown = () => log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    function typing(on) {
      let t = log.querySelector('.typing');
      if (on && !t) { t = document.createElement('div'); t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); scrollDown(); }
      else if (!on && t) t.remove();
    }
    function reset() {
      clear(); typing(false);
      items.forEach(el => { el.classList.add('hidden'); el.classList.remove('gone'); });
      box.querySelectorAll('.qr span.pressed').forEach(s => s.classList.remove('pressed'));
      box.querySelectorAll('.vs.on').forEach(s => s.classList.remove('on'));
      box.querySelectorAll('.chip[data-run]').forEach(c => c.classList.add('running'));
      if (bar) bar.style.width = '0';
      log.scrollTop = 0;
    }
    function showAllStatic() {
      items.forEach(el => el.classList.remove('hidden'));
      box.querySelectorAll('.qr [data-yes]').forEach(s => s.classList.add('pressed'));
      box.querySelectorAll('.vs').forEach(s => s.classList.add('on'));
      box.querySelectorAll('.chip[data-run]').forEach(c => c.classList.remove('running'));
      if (bar) bar.style.width = '100%';
    }
    async function play() {
      const mine = ++run;
      reset();
      let done = 0;
      for (const el of items) {
        if (mine !== run) return;
        const isBot = el.classList.contains('bot'), isUser = el.classList.contains('user');
        const isChip = el.classList.contains('chip') || el.classList.contains('tool'), isQR = el.classList.contains('qr');
        if (isBot) { typing(true); await wait(Math.min(500 + el.textContent.length * 3, 1400)); typing(false); }
        else if (isUser) await wait(700);
        else if (isChip) await wait(350);
        else if (isQR) await wait(500);
        if (mine !== run) return;
        log.appendChild(el);
        el.classList.remove('hidden');
        scrollDown();
        if (isChip && el.dataset.run) { await wait(+el.dataset.run); el.classList.remove('running'); }
        if (isQR) {
          await wait(1200);
          const yes = el.querySelector('[data-yes]'); if (yes) yes.classList.add('pressed');
          await wait(420);
          el.classList.add('gone');
        }
        const steps = el.querySelectorAll ? el.querySelectorAll('.vs') : [];
        for (const s of steps) { await wait(170); s.classList.add('on'); }
        done++; if (bar) bar.style.width = (done / items.length * 100) + '%';
        await wait(isBot ? 900 : 300);
      }
      await wait(600); if (bar && mine === run) bar.style.width = '0';
    }
    if (reduced) { showAllStatic(); return; }
    reset();
    btn.addEventListener('click', play);
    if (box.dataset.replay === 'auto') {
      let started = false;
      const io = new IntersectionObserver(es => { if (!started && es.some(e => e.isIntersecting && e.intersectionRatio > .35)) { started = true; io.disconnect(); play(); } }, { threshold: [.35] });
      io.observe(log);
    }
  });

  // lead forms
  document.querySelectorAll('form.lead').forEach(form => {
    const msg = form.querySelector('.msg'), btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.kind = form.dataset.lead; data.source = form.dataset.source || location.pathname;
      msg.className = 'msg'; msg.textContent = T.sending; btn.disabled = true;
      try {
        const r = await fetch(API + '/v1/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const body = await r.json().catch(() => ({}));
        if (r.ok) { msg.className = 'msg ok'; msg.textContent = form.dataset.thanks || T.thanks; form.reset(); }
        else { msg.className = 'msg err'; msg.textContent = (body.error && body.error.message) || T.wrong; }
      } catch (err) { msg.className = 'msg err'; msg.textContent = T.offline; }
      btn.disabled = false;
    });
  });
})();
