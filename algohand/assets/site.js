/* AlgoHand site: nav toggle, transcript replay, lead forms → api.algohand.com/v1/leads */
(function () {
  const API = document.documentElement.dataset.api || 'https://api.algohand.com';

  const toggle = document.querySelector('.navtoggle');
  const nav = document.querySelector('nav.main');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));

  // transcript replay (recorded session)
  document.querySelectorAll('.replay[data-replay]').forEach(box => {
    const log = box.querySelector('.log'), btn = box.querySelector('button');
    if (!log || !btn) return;
    const items = Array.from(log.children);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;
    function replay() {
      if (reduced) return;
      if (timer) { clearTimeout(timer); timer = null; }
      items.forEach(m => m.classList.add('hidden'));
      log.scrollTop = 0;
      let i = 0;
      const step = () => {
        if (i >= items.length) { timer = null; return; }
        const m = items[i++];
        m.classList.remove('hidden');
        m.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        timer = setTimeout(step, m.classList.contains('tool') ? 700 : (m.classList.contains('user') ? 900 : 1600));
      };
      timer = setTimeout(step, 300);
    }
    btn.addEventListener('click', replay);
    if (box.dataset.replay === 'auto') {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { replay(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(box);
    }
  });

  // lead forms
  document.querySelectorAll('form.lead').forEach(form => {
    const msg = form.querySelector('.msg'), btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.kind = form.dataset.lead; data.source = form.dataset.source || location.pathname;
      msg.className = 'msg'; msg.textContent = 'Sending…'; btn.disabled = true;
      try {
        const r = await fetch(API + '/v1/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const body = await r.json().catch(() => ({}));
        if (r.ok) { msg.className = 'msg ok'; msg.textContent = form.dataset.thanks || 'Thank you — we will get back to you within one business day.'; form.reset(); }
        else { msg.className = 'msg err'; msg.textContent = (body.error && body.error.message) || 'Something went wrong. Please write to info@mtcodec.com.'; }
      } catch (err) { msg.className = 'msg err'; msg.textContent = 'Could not reach the server. Please write to info@mtcodec.com.'; }
      btn.disabled = false;
    });
  });
})();
