/* AlgoHand customer portal — talks to /portal/* on the same origin (cookie session); strings come from i18n.js */
const Portal = (() => {
  const t = (k, v) => I18N.t(k, v);
  const api = async (path, opts = {}) => {
    const r = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, ...opts });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((body.error && body.error.message) || `HTTP ${r.status}`); e.status = r.status; e.code = body.error && body.error.code; e.details = body.error && body.error.details; throw e; }
    return body;
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (v, cur) => v == null ? '—' : Number(v).toLocaleString(I18N.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (cur ? ' ' + cur : '');
  const ago = iso => { if (!iso) return t('ago.never'); const s = Math.max(0, (Date.now() - new Date(iso)) / 1000); return s < 90 ? t('ago.s', { n: Math.round(s) }) : s < 5400 ? t('ago.m', { n: Math.round(s / 60) }) : t('ago.h', { n: Math.round(s / 3600) }); };
  const status = code => code ? t('status.' + code) : '';

  function form(el, onSubmit) {
    const msg = el.querySelector('.msg'), btn = el.querySelector('button[type=submit]');
    el.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(el).entries());
      el.querySelectorAll('input[type=checkbox]').forEach(c => { data[c.name] = c.checked; });
      msg.className = 'msg'; msg.textContent = t('working'); btn.disabled = true;
      try { await onSubmit(data, msg); } catch (err) { msg.className = 'msg err'; msg.textContent = I18N.errorText(err); }
      btn.disabled = false;
    });
  }

  function authPage() {
    api('/portal/me').then(() => { location.replace('/app'); }).catch(() => {});
    const tabs = document.querySelectorAll('.tabs button');
    const show = which => {
      tabs.forEach(x => x.classList.toggle('on', x.dataset.tab === which));
      ['login', 'register', 'forgot'].forEach(id => { document.getElementById(id).hidden = id !== which; });
    };
    tabs.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    document.getElementById('forgotlink').addEventListener('click', e => { e.preventDefault(); show('forgot'); });
    document.getElementById('backlink').addEventListener('click', e => { e.preventDefault(); show('login'); });
    if (location.hash === '#register') show('register');
    const kind = new URLSearchParams(location.search).get('kind'); const ksel = document.querySelector('#register select[name=kind]');
    if (kind && ksel) { ksel.value = kind; show('register'); }
    if (location.hash === '#forgot') show('forgot');
    form(document.getElementById('login'), async d => { await api('/portal/login', { method: 'POST', body: JSON.stringify(d) }); location.href = '/app'; });
    form(document.getElementById('register'), async d => { await api('/portal/register', { method: 'POST', body: JSON.stringify(d) }); location.href = '/app'; });
    form(document.getElementById('forgot'), async (d, msg) => { await api('/portal/forgot', { method: 'POST', body: JSON.stringify(d) }); msg.className = 'msg ok'; msg.textContent = t('forgot.sent'); });
  }

  function resetPage() {
    const token = new URLSearchParams(location.search).get('token') || '';
    form(document.getElementById('reset'), async (d, msg) => {
      await api('/portal/reset', { method: 'POST', body: JSON.stringify({ token, new_password: d.new_password }) });
      msg.className = 'msg ok'; msg.textContent = t('reset.done');
      setTimeout(() => { location.href = '/'; }, 1500);
    });
  }

  // why an online VPS shows no terminal: the agent's last discovery scan (host.discovery, agent 0.2.22+)
  function noTerminalText(d) {
    if (!d || !d.summary) return t('js.noterminals');
    const procs = d.processes || [];
    const skipped = procs.filter(p => p.status === 'skipped'), managed = procs.filter(p => p.status === 'managed'), fresh = procs.filter(p => p.status === 'new');
    if (!procs.length && !d.denied) return t('js.noterminals.none');
    if (skipped.length) return t('js.noterminals.skipped', { path: skipped.map(p => p.exe).join(', ') });
    if (d.denied && !managed.length && !fresh.length) return t('js.noterminals.denied');
    return t('js.noterminals');
  }

  function vpsCard(v, accounts) {
    const accs = accounts.filter(a => a.vps_id === v.vps_id);
    const host = v.host || {};
    const name = v.external_ref || host.hostname || host.computer || v.vps_id;
    const meta = [v.agent_version ? `${t('js.agent')} ${v.agent_version}` : null, host.terminals != null ? t('js.terminals', { n: host.terminals }) : null,
                  v.last_seen ? t('js.seen', { ago: ago(v.last_seen) }) : t('js.notconnected'), host.os].filter(Boolean).join(' · ');
    const accHtml = accs.length ? accs.map(a => `
      <div class="acct">
        <div class="line"><span><b>${esc(a.mt5_login)}</b> <span class="muted">${esc(a.broker || a.mt5_server || '')}</span></span><span class="status ${a.status === 'ok' ? 'online' : (a.status === 'degraded' ? 'degraded' : 'offline')}">${esc(status(a.status))}</span></div>
        <div class="nums">${t('js.balance')} ${money(a.balance, a.currency)} · ${t('js.equity')} ${money(a.equity, a.currency)} · ${t('js.floating')} ${money(a.floating_pnl)}</div>
        ${a.status_reason ? `<div class="muted small">${esc(a.status_reason)}</div>` : ''}
        ${(a.instances || []).map(i => `<div class="ea"><span><span class="dot ${esc(i.status)}"></span>${esc(i.ea_name || i.ea_id)}</span><span>${esc(i.symbol || '')} ${esc(i.timeframe || '')}${i.preset ? ' · ' + esc(i.preset) : ''} · ${esc(status(i.status))}</span></div>`).join('')}
        ${(a.instances || []).length ? '' : `<div class="muted small">${t('js.noeas')}</div>`}
      </div>`).join('') : `<div class="acct"><span class="muted small">${v.status === 'online' ? noTerminalText(host.discovery) : t('js.waiting')}</span></div>`;
    return `<div class="card vps" data-vps="${esc(v.vps_id)}">
      <div class="head"><h3>${esc(name)}</h3><span class="status ${esc(v.status)}">${esc(status(v.status))}</span></div>
      <div class="meta">${esc(meta)}</div>
      ${accHtml}
      <div class="cta" style="margin-top:12px"><button class="kill" type="button" data-del="${esc(v.vps_id)}">${t('js.disconnect')}</button></div>
    </div>`;
  }

  async function refresh() {
    try {
      const st = await api('/portal/state');
      const list = document.getElementById('vpslist');
      const vps = (st.vps || []).filter(v => v.status !== 'decommissioned');
      list.innerHTML = vps.length ? vps.map(v => vpsCard(v, st.accounts || [])).join('') : `<div class="card empty">${t('js.novps')}</div>`;
      list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm(t('js.confirmDisconnect'))) return;
        await api('/portal/vps/' + b.dataset.del, { method: 'DELETE' }); refresh();
      }));
    } catch (e) { if (e.status === 401) location.replace('/'); }
  }

  async function refreshEas() {
    const box = document.getElementById('ealist'), vpsbox = document.getElementById('eavps');
    if (!box) return;
    const { eas, on_vps } = await api('/portal/eas');
    const eaError = e => !e.error ? '' : (e.error.startsWith('No MetaTrader 5 terminal is running') ? t('js.ea.waitterminal') : (e.error.startsWith('The terminal of this account was not reachable') ? t('js.ea.waitdiscover') : e.error));
    box.innerHTML = eas.length ? eas.map(e => `<div class="keyrow"><span><b>${esc(e.name)}</b> <span class="muted mono small">${esc(e.file)}</span>${e.error ? `<div class="muted small">${esc(eaError(e))}</div>` : ''}</span><span class="status ${e.status === 'confirmed' ? 'online' : (e.status === 'failed' ? 'offline' : 'degraded')}">${esc(t('eas.status.' + e.status))}</span><span class="muted small">${e.status === 'drafted' ? t('js.ea.chatnext') : ''}</span>${['failed', 'installed'].includes(e.status) ? `<button class="btn sm" data-retry="${esc(e.custom_id)}" type="button">${t('js.ea.retry')}</button> ` : ''}${e.inputs_count ? `<a class="btn sm" href="/ea?id=${encodeURIComponent(e.custom_id)}">${t('js.ea.describe')}</a> ` : ''}<button class="kill" data-ea="${esc(e.custom_id)}" type="button">${t('js.ea.remove')}</button></div>`).join('') : `<span class="muted">${t('eas.none')}</span>`;
    box.querySelectorAll('[data-retry]').forEach(b => b.addEventListener('click', async () => { b.disabled = true; try { await api(`/portal/eas/${b.dataset.retry}/discover`, { method: 'POST' }); refreshEas(); } catch (e) { const m = document.getElementById('eamsg'); m.className = 'msg err'; m.textContent = I18N.errorText(e); b.disabled = false; } }));
    box.querySelectorAll('[data-ea]').forEach(b => b.addEventListener('click', async () => { if (confirm(t('js.confirmRemoveEa'))) { await api('/portal/eas/' + b.dataset.ea, { method: 'DELETE' }); refreshEas(); } }));
    const fresh = (on_vps || []).filter(x => !x.catalog_ea_id && !x.custom_id);
    // folders of MQL5\Experts as a tree: files at the root first, sub-folders collapsible (state remembered per folder)
    const root = { dirs: {}, files: [] };
    for (const x of fresh) {
      const parts = String(x.path || '').replace(/^Experts[\\/]?/i, '').split(/[\\/]/).filter(Boolean);
      if (parts.length && parts[parts.length - 1].toLowerCase() === String(x.file).toLowerCase()) parts.pop();
      let node = root;
      for (const d of parts) node = node.dirs[d] || (node.dirs[d] = { dirs: {}, files: [] });
      node.files.push(x);
    }
    const count = n => n.files.length + Object.values(n.dirs).reduce((k, d) => k + count(d), 0);
    const opened = key => { try { return localStorage.getItem('ah.eatree:' + key) === '1'; } catch (e) { return false; } };
    const fileRow = x => `<div class="keyrow"><span><b>${esc(x.file)}</b> <span class="muted mono small">${esc((x.path || '').replace(/^Experts[\\/]?/i, ''))}</span></span><button class="btn sm" data-vpsfile="${esc(x.file)}" data-vpspath="${esc(x.path || '')}" type="button">${t('js.ea.onboard')}</button></div>`;
    const render = (node, prefix) => node.files.map(fileRow).join('') + Object.keys(node.dirs).sort((p, q) => p.localeCompare(q)).map(d => {
      const key = prefix + d;
      return `<details class="tree" data-key="${esc(key)}"${opened(key) ? ' open' : ''}><summary><b>${esc(d)}</b> <span class="muted small">· ${count(node.dirs[d])}</span></summary><div class="treebody">${render(node.dirs[d], key + '\\')}</div></details>`;
    }).join('');
    vpsbox.innerHTML = fresh.length ? `<div class="card"><b class="small">${t('eas.onvps')}</b> <span class="muted small">· ${fresh.length}</span><div class="treeroot">${render(root, '')}</div></div>` : '';
    vpsbox.querySelectorAll('details.tree').forEach(d => d.addEventListener('toggle', () => { try { localStorage.setItem('ah.eatree:' + d.dataset.key, d.open ? '1' : '0'); } catch (e) {} }));
    vpsbox.querySelectorAll('[data-vpsfile]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await api('/portal/eas/from-vps', { method: 'POST', body: JSON.stringify({ file: b.dataset.vpsfile, path: b.dataset.vpspath || null }) }); refreshEas(); }
      catch (e) { const m = document.getElementById('eamsg'); m.className = 'msg err'; m.textContent = I18N.errorText(e); b.disabled = false; }
    }));
  }

  async function uploadEa(file) {
    const m = document.getElementById('eamsg');
    m.className = 'msg'; m.textContent = t('js.ea.uploading', { name: file.name });
    try {
      const r = await fetch('/portal/eas?filename=' + encodeURIComponent(file.name), { method: 'POST', credentials: 'same-origin', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error((body.error && body.error.message) || `HTTP ${r.status}`); e.code = body.error && body.error.code; throw e; }
      m.className = 'msg ok'; m.textContent = t('js.ea.uploaded', { name: body.name || file.name });
      refreshEas();
    } catch (e) { m.className = 'msg err'; m.textContent = I18N.errorText(e); }
  }

  // ---- support tickets
  const tcls = s => (s === 'answered' || s === 'human_answered') ? 'online' : (s === 'closed' ? '' : 'degraded');
  const when = iso => iso ? new Date(iso).toLocaleString(I18N.locale, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  async function refreshTickets() {
    const box = document.getElementById('ticketlist');
    if (!box) return;
    const { tickets } = await api('/portal/support');
    box.innerHTML = tickets.length ? tickets.map(x => `<a class="keyrow" href="/support?id=${encodeURIComponent(x.ticket_id)}"><span><b>${esc(x.subject)}</b></span><span class="status ${tcls(x.status)}">${esc(t('sup.status.' + x.status))}</span><span class="muted small">${esc(when(x.updated_at))}</span></a>`).join('') : `<span class="muted">${t('sup.none')}</span>`;
  }

  function renderThread(d, mode) {
    const $ = id => document.getElementById(id);
    $('subject').textContent = d.subject;
    $('tstatus').className = 'status ' + tcls(d.status); $('tstatus').textContent = t('sup.status.' + d.status);
    $('tmeta').innerHTML = esc(when(d.created_at));
    if (mode === 'admin') {
      const conf = d.ai_confidence == null ? '—' : Math.round(d.ai_confidence * 100) + '%';
      $('admininfo').hidden = false;
      $('admininfo').innerHTML = `<b>${t('sup.admin.info')}</b><div class="muted" style="margin-top:6px">${t('sup.admin.customer')}: <b>${esc(d.name || '')}</b> &lt;${esc(d.email)}&gt; · ${esc(d.source)} · ${esc(d.lang)}${d.client_id ? ` · client_id <span class="mono">${esc(d.client_id)}</span>` : ` · ${t('sup.admin.noaccount')}`}</div>` +
        `<div class="muted">${t('sup.admin.category')}: ${esc(d.category || '—')} · ${t('sup.admin.conf')}: ${conf}</div>` + (d.escalation_reason ? `<div style="margin-top:4px">${t('sup.admin.reason')}: ${esc(d.escalation_reason)}</div>` : '') +
        (d.context && d.context.summary ? `<div class="muted" style="margin-top:4px">${t('sup.admin.context')}: ${esc(d.context.summary)}</div>` : '');
    }
    const who = m => m.draft ? t('sup.who.draft') : (m.author === 'customer' ? (mode === 'admin' ? t('sup.who.customer_admin') : t('sup.who.customer')) : t('sup.who.' + m.author));
    $('messages').innerHTML = d.messages.map(m => `<div class="tmsg ${esc(m.author)}${m.draft ? ' draft' : ''}"><div class="who"><span>${esc(who(m))}</span><span>${esc(when(m.created_at))}</span></div><div class="body">${esc(m.text)}</div>${m.draft ? `<div class="cta" style="margin-top:8px"><button class="btn sm" type="button" data-usedraft="${esc(m.id)}">${t('sup.usedraft')}</button></div>` : ''}</div>`).join('');
    $('messages').querySelectorAll('[data-usedraft]').forEach(b => b.addEventListener('click', () => {
      const m = d.messages.find(x => String(x.id) === b.dataset.usedraft); const ta = document.querySelector('#replyform textarea'); ta.value = m ? m.text : ''; ta.focus();
    }));
    $('closednote').hidden = d.status !== 'closed';
    $('sendclose').hidden = mode !== 'admin' || d.status === 'closed'; $('closebtn').hidden = mode !== 'admin' || d.status === 'closed';
    if (mode === 'admin') document.querySelector('#replyform textarea').placeholder = t('sup.replyph.admin');
  }

  function supportPage() {
    const q = new URLSearchParams(location.search);
    const id = q.get('id'), ctoken = q.get('c'), atoken = q.get('t');
    const $ = x => document.getElementById(x);
    let me = null;
    const whoami = api('/portal/me').then(m => { me = m; $('dashlink').hidden = false; $('signinlink').hidden = true; }).catch(() => {});
    if (!id) {
      whoami.finally(() => {
        $('new').hidden = false;
        if (me) { $('whorow').hidden = true; $('whorow').querySelector('[name=email]').required = false; }
        form($('newticket'), async (d, msg) => {
          const r = me ? await api('/portal/support', { method: 'POST', body: JSON.stringify({ subject: d.subject || null, message: d.message, lang: I18N.lang }) })
                       : await api('/v1/support/tickets', { method: 'POST', body: JSON.stringify({ name: d.name || null, email: d.email, subject: d.subject || null, message: d.message, lang: I18N.lang, website: d.website || null }) });
          msg.className = 'msg'; msg.textContent = '';
          $('newticket').hidden = true;
          $('sentbox').hidden = false;
          $('sentbox').innerHTML = `<b>${t('sup.sent', { id: r.ticket_id })}</b><p class="muted small" style="margin-top:6px">${t(me ? 'sup.sentdash' : 'sup.sentmail', { email: esc(me ? me.user.email : d.email) })}</p><p class="cta" style="margin-top:10px"><a class="btn primary" href="${esc(r.link)}">${t('sup.open')}</a></p>`;
        });
      });
      return;
    }
    const enc = encodeURIComponent;
    const adminFlag = q.get('admin') === '1';
    const mode = (atoken || adminFlag) ? 'admin' : (ctoken ? 'visitor' : 'owner');
    const tq = atoken ? `?t=${enc(atoken)}` : '';
    const url = mode === 'admin' ? `/portal/support/admin/${enc(id)}${tq}` : mode === 'visitor' ? `/v1/support/tickets/${enc(id)}?c=${enc(ctoken)}` : `/portal/support/${enc(id)}`;
    const replyUrl = mode === 'admin' ? `/portal/support/admin/${enc(id)}/reply${tq}` : mode === 'visitor' ? `/v1/support/tickets/${enc(id)}/reply?c=${enc(ctoken)}` : `/portal/support/${enc(id)}/reply`;
    const load = () => api(url).then(d => { $('thread').hidden = false; renderThread(d, mode); }).catch(() => { $('thread').hidden = true; $('notfound').hidden = false; });
    load();
    form($('replyform'), async (d, msg) => {
      const r = await api(replyUrl, { method: 'POST', body: JSON.stringify({ message: d.message, close: !!d.close }) });
      $('replyform').reset(); msg.className = 'msg ok'; msg.textContent = t('sup.replied'); renderThread(r, mode);
    });
    $('sendclose').addEventListener('click', async () => {
      const ta = $('replyform').querySelector('textarea'); if (!ta.value.trim()) { ta.focus(); return; }
      const msg = $('replyform').querySelector('.msg');
      try { const r = await api(replyUrl, { method: 'POST', body: JSON.stringify({ message: ta.value, close: true }) }); $('replyform').reset(); msg.className = 'msg ok'; msg.textContent = t('sup.replied'); renderThread(r, mode); }
      catch (e) { msg.className = 'msg err'; msg.textContent = I18N.errorText(e); }
    });
    $('closebtn').addEventListener('click', async () => {
      if (!confirm(t('sup.confirmClose'))) return;
      try { const r = await api(`/portal/support/admin/${enc(id)}/close${tq}`, { method: 'POST' }); renderThread(r, mode); } catch (e) { alert(I18N.errorText(e)); }
    });
    if (mode !== 'admin') setInterval(() => api(url).then(d => renderThread(d, mode)).catch(() => {}), 20000);
  }

  // ---- billing (Paddle)
  let paddleReady = false;
  const usd = cents => '$' + (cents / 100).toLocaleString(I18N.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const dateOf = iso => iso ? new Date(iso).toLocaleDateString(I18N.locale, { dateStyle: 'medium' }) : '';

  function initPaddle(b) {
    if (paddleReady || !window.Paddle || !b.client_token) return;
    try {
      if (b.environment === 'sandbox') Paddle.Environment.set('sandbox');
      Paddle.Initialize({ token: b.client_token, checkout: { settings: { displayMode: 'overlay', theme: 'dark', locale: I18N.lang } },
                          eventCallback: ev => { if (ev.name === 'checkout.completed') { setTimeout(refreshBilling, 3000); setTimeout(refreshBilling, 15000); } } });
      paddleReady = true;
    } catch (e) { console.warn('paddle', e); }
  }

  let billCycle = 'month';
  async function refreshBilling() {
    const box = document.getElementById('billing'), btns = document.getElementById('billbtns'), plansBox = document.getElementById('plans');
    if (!box) return;
    const b = await api('/portal/billing');
    initPaddle(b);
    const n = b.accounts_connected;
    const line = (k, v) => `<div class="kv small" style="display:flex;justify-content:space-between;gap:12px;padding:4px 0"><span class="muted">${k}</span><b>${v}</b></div>`;
    const cls = b.entitled ? (b.status === 'past_due' ? 'degraded' : 'online') : 'offline';
    const label = t('bill.status.' + (b.status === 'none' ? (b.reason === 'trial' ? 'trial' : 'none') : b.status));
    let html = `<div class="line" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><span class="status ${cls}">${esc(label)}${b.plan_name ? ' · ' + esc(b.plan_name) : ''}</span><span class="muted small">${!b.enabled ? t('bill.unavailable') : ''}</span></div>`;
    if (b.reason === 'trial' && b.trial_ends_at) html += line(t('bill.trialuntil'), esc(dateOf(b.trial_ends_at)) + ' · ' + t('bill.trialplan', { plan: b.trial_plan === 'trader' ? 'Trader' : b.trial_plan }));
    if (b.status === 'trialing' && b.next_billed_at) html += line(t('bill.trialuntil'), esc(dateOf(b.next_billed_at)));
    if (b.status === 'past_due') html += `<div class="msg err" style="margin-top:8px">${t('bill.pastdue')}</div>`;
    if (b.status === 'canceled' && b.current_period_end) html += line(t('bill.accessuntil'), esc(dateOf(b.current_period_end)));
    if (b.status === 'active' || b.status === 'trialing') {
      html += line(t('bill.plan'), esc(b.plan_name || '') + ' · ' + esc(t(b.cycle === 'year' ? 'bill.cycle.year' : 'bill.cycle.month')));
      html += line(t('bill.billed'), esc(t('bill.accounts', { n: b.included })) + (b.quantity > 1 ? ' + ' + esc(t('bill.extra', { n: b.quantity - 1 })) : ''));
      if (b.next_billed_at) html += line(t('bill.next'), esc(dateOf(b.next_billed_at)));
      if (b.scheduled_change && b.scheduled_change.action) html += line(t('bill.scheduled'), esc(b.scheduled_change.action + ' · ' + dateOf(b.scheduled_change.effective_at)));
      if (b.over_limit) html += `<div class="msg err" style="margin-top:8px">${t('bill.overlimit')}</div>`;
    }
    html += line(t('bill.connected'), n ? esc(b.accounts.map(a => a.mt5_login + (a.broker ? ' · ' + a.broker : '')).join(', ')) : esc(t('bill.noaccounts')));
    if (b.status === 'none' || b.status === 'canceled') html += `<p class="muted small" style="margin-top:8px">${t('bill.trialoffer', { n: b.paddle_trial_days })}</p>`;
    box.innerHTML = html;
    btns.hidden = !b.enabled;
    document.getElementById('managesub').hidden = !(b.enabled && b.manage);
    btns.querySelectorAll('[data-cycle]').forEach(x => { x.classList.toggle('on', x.dataset.cycle === billCycle); x.onclick = () => { billCycle = x.dataset.cycle; refreshBilling(); }; });
    const active = b.status === 'active' || b.status === 'trialing';
    plansBox.innerHTML = b.plans.map(p => {
      const q = billCycle === 'year' && p.year_cents ? b.quotes[p.plan].yearly : b.quotes[p.plan];
      const per = billCycle === 'year' && p.year_cents ? t('bill.peryear') : t('bill.permonth');
      const price = billCycle === 'year' && p.year_cents ? p.year_cents : p.month_cents;
      const extra = (billCycle === 'year' && p.year_cents ? p.extra_year_cents : p.extra_month_cents);
      const current = active && b.plan === p.plan && (b.cycle || 'month') === (p.year_cents ? billCycle : 'month');
      const feats = p.features.map(f => t('bill.f.' + f)).join(' · ');
      const btn = !b.enabled ? '' : current ? `<span class="status online">${t('bill.current')}</span>` : `<button class="btn ${p.plan === (b.audience === 'business' ? 'api_start' : 'trader') ? 'primary' : ''} sm" data-plan="${esc(p.plan)}" type="button">${active ? t('bill.switch') : t('bill.choose')}</button>`;
      return `<div class="card" style="${current ? 'border-color:var(--accent)' : ''}"><div class="eyebrow">${esc(p.name)}</div><div style="font-size:28px;font-weight:800;margin-top:6px">${usd(price)} <span class="muted small" style="font-weight:400">${per}</span></div><div class="muted small">${t('bill.included', { n: p.accounts })}${extra ? ' · ' + t('bill.extraunit', { price: usd(extra) }) : ' · ' + t('bill.noextra')}</div><div class="small" style="margin-top:8px;color:var(--ink2)">${esc(feats)}</div>${q && q.extra ? `<div class="muted small" style="margin-top:6px">${t('bill.yours', { n: q.accounts, total: usd(q.total_cents) })}${q.over_limit ? ' · ' + t('bill.overlimit.short') : ''}</div>` : ''}${!active && b.paddle_trial_days ? `<div class="muted small" style="margin-top:6px">${t('bill.trialthen', { n: b.paddle_trial_days, price: usd(price) })}</div>` : ''}<div class="cta">${btn}</div></div>`;
    }).join('');
    plansBox.querySelectorAll('[data-plan]').forEach(x => x.addEventListener('click', () => (active ? changePlan : subscribe)(x.dataset.plan, billCycle)));
  }

  async function subscribe(plan, cycle) {
    const box = document.getElementById('billing');
    try {
      const ck = await api('/portal/billing/checkout', { method: 'POST', body: JSON.stringify({ plan, cycle }) });
      initPaddle(ck);
      if (!window.Paddle || !paddleReady) throw new Error(t('bill.unavailable'));
      Paddle.Checkout.open({ items: ck.items, customer: ck.customer, customData: ck.customData, settings: { successUrl: location.origin + '/app?paid=1#billing-section' } });
    } catch (e) { const m = document.createElement('div'); m.className = 'msg err'; m.textContent = I18N.errorText(e); box.appendChild(m); }
  }

  async function changePlan(plan, cycle) {
    if (!confirm(t('bill.confirmSwitch'))) return;
    const box = document.getElementById('billing');
    try { await api('/portal/billing/change', { method: 'POST', body: JSON.stringify({ plan, cycle }) }); refreshBilling(); }
    catch (e) { const m = document.createElement('div'); m.className = 'msg err'; m.textContent = I18N.errorText(e); box.appendChild(m); }
  }

  async function refreshAlerts() {
    const box = document.getElementById('alertlist'), rec = document.getElementById('alertrecent');
    if (!box) return;
    const d = await api('/portal/alerts');
    const cls = s => s === 'armed' ? 'online' : (s === 'paused' ? '' : 'degraded');
    box.innerHTML = d.alerts.length ? d.alerts.map(a => `<div class="keyrow"><span><b>${esc(a.text)}</b> <span class="muted small">${esc(t('al.kind.' + a.kind))}${a.fired_count ? ' · ' + t('al.fired', { n: a.fired_count }) : ''}${a.last_value != null ? ' · ' + esc(String(a.last_value)) : ''}</span></span><span class="status ${cls(a.status)}">${esc(t('al.status.' + a.status))}</span><span><button class="kill" data-altoggle="${esc(a.alert_id)}" data-alstatus="${esc(a.status)}" type="button">${t(a.status === 'paused' ? 'al.resume' : 'al.pause')}</button> <button class="kill" data-aldel="${esc(a.alert_id)}" type="button">${t('al.delete')}</button></span></div>`).join('') : `<span class="muted">${t('al.none')}</span>`;
    box.querySelectorAll('[data-altoggle]').forEach(b => b.addEventListener('click', async () => { await api(`/portal/alerts/${b.dataset.altoggle}/${b.dataset.alstatus === 'paused' ? 'resume' : 'pause'}`, { method: 'POST' }); refreshAlerts(); }));
    box.querySelectorAll('[data-aldel]').forEach(b => b.addEventListener('click', async () => { if (confirm(t('al.confirmDelete'))) { await api('/portal/alerts/' + b.dataset.aldel, { method: 'DELETE' }); refreshAlerts(); } }));
    const newsHtml = d.news_next && d.news_next.length ? `<div class="card" style="margin-bottom:12px"><b class="small">${t('al.news')}</b>${d.news_next.map(e => `<div class="keyrow"><span class="small"><b>${esc(e.currency)}</b> ${esc(e.title)}</span><span class="muted small">${esc(when(e.at))}</span></div>`).join('')}</div>` : '';
    rec.innerHTML = newsHtml + (d.recent && d.recent.length ? `<div class="card"><b class="small">${t('al.recent')}</b>${d.recent.map(e => `<div class="keyrow"><span class="small" style="white-space:pre-wrap">${esc(e.message)}</span><span class="muted small">${esc(when(e.fired_at))}</span></div>`).join('')}</div>` : '');
  }

  const urlB64ToU8 = s => { const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  async function refreshPush() {
    const box = document.getElementById('pushbox');
    if (!box) return;
    const cfg = await api('/portal/push');
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    let sub = null;
    if (supported) { try { const reg = await navigator.serviceWorker.ready; sub = await reg.pushManager.getSubscription(); } catch (e) {} }
    const on = !!sub && Notification.permission === 'granted';
    const parts = [`<b>${t('al.push')}</b>`, `<p class="muted small" style="margin:6px 0 10px">${t('al.push.intro')}</p>`];
    let cta = '';
    if (!cfg.enabled) parts.push(`<span class="muted small">${t('al.push.unavailable')}</span>`);
    else if (!supported) parts.push(`<span class="muted small">${t('al.push.unsupported')}</span>${ios && !standalone ? `<div class="muted small" style="margin-top:6px">${t('al.push.ios')}</div>` : ''}`);
    else if (Notification.permission === 'denied') parts.push(`<span class="status offline">${t('al.push.denied')}</span>`);
    else {
      parts.push(`<span class="status ${on ? 'online' : ''}">${t(on ? 'al.push.on' : 'al.push.off')}</span> <span class="muted small">· ${t('al.push.devices', { n: cfg.subscriptions.length })}</span>`);
      if (ios && !standalone && !on) parts.push(`<div class="muted small" style="margin-top:6px">${t('al.push.ios')}</div>`);
      cta = `<div class="cta" style="margin-top:10px"><button class="btn sm" id="pushtoggle" type="button">${t(on ? 'al.push.disable' : 'al.push.enable')}</button>${cfg.subscriptions.length ? `<button class="btn sm" id="pushtest" type="button">${t('al.push.test')}</button>` : ''}<span class="muted small" id="pushmsg"></span></div>`;
    }
    box.innerHTML = parts.join('') + cta;
    const toggle = document.getElementById('pushtoggle');
    if (toggle) toggle.addEventListener('click', async () => {
      toggle.disabled = true; const msg = document.getElementById('pushmsg');
      try {
        const reg = await navigator.serviceWorker.ready;
        if (on) {
          const s = await reg.pushManager.getSubscription();
          if (s) { await api('/portal/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: s.endpoint }) }); await s.unsubscribe(); }
        } else {
          const perm = await Notification.requestPermission();            // only here, on the customer's own click
          if (perm !== 'granted') { msg.textContent = t('al.push.denied'); toggle.disabled = false; return; }
          const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(cfg.public_key) });
          await api('/portal/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: s.toJSON(), ua: navigator.userAgent.slice(0, 200), lang: I18N.lang }) });
        }
      } catch (e) { msg.textContent = I18N.errorText(e); }
      refreshPush();
    });
    const test = document.getElementById('pushtest');
    if (test) test.addEventListener('click', async () => { test.disabled = true; try { await api('/portal/push/test', { method: 'POST' }); test.textContent = t('js.sent'); } catch (e) { test.textContent = I18N.errorText(e); } });
  }

  async function refreshTelegram() {
    const box = document.getElementById('tgstatus');
    if (!box) return;
    const s = await api('/portal/telegram');
    const linkBtn = document.getElementById('tglink'); linkBtn.hidden = !s.enabled; linkBtn.textContent = s.linked ? t('tg.connectMore') : t('tg.connect');
    document.getElementById('tgtest').hidden = !s.linked; document.getElementById('tgunlink').hidden = !s.linked || (s.chats || []).length < 2;
    document.getElementById('pinform').hidden = !s.enabled;
    const req = document.getElementById('pinreq'), cb = document.getElementById('pinrequired');
    req.hidden = !s.enabled || !s.pin_set; cb.checked = !!s.pin_required;
    if (!s.enabled) { box.innerHTML = `<span class="muted">${t('tg.unavailable')}</span>`; return; }
    const chats = s.chats || [];
    box.innerHTML = s.linked ? chats.map(c => `<div class="keyrow"><span><span class="status online">${t('tg.linked')}</span> <b>${c.tg_username ? '@' + esc(c.tg_username) : esc(c.tg_name || '')}</b> ${c.tg_username ? esc(c.tg_name || '') : ''} <span class="muted small">· ${esc(String(c.lang || 'en').toUpperCase())}${c.last_message_at ? ' · ' + esc(c.last_message_at.slice(0, 16).replace('T', ' ')) : ''}</span></span><button class="kill" data-tgchat="${esc(String(c.chat_id))}" type="button">${t('tg.disconnect')}</button></div>`).join('')
                               + `<div class="muted small" style="margin-top:6px">${s.pin_set ? (s.pin_required ? t('tg.pinon') : t('tg.pinset')) : t('tg.nopin')}</div>`
                             : `<span class="status">${t('tg.notlinked')}</span><div class="muted small" style="margin-top:6px">${t('tg.how', { bot: '@' + esc(s.bot) })}</div>`;
    box.querySelectorAll('[data-tgchat]').forEach(b => b.addEventListener('click', async () => { if (confirm(t('tg.confirmUnlink'))) { await api('/portal/telegram/chats/' + b.dataset.tgchat, { method: 'DELETE' }); refreshTelegram(); } }));
  }


  // ---- Author studio
  const STAGES = ['uploaded', 'installed', 'discovered', 'drafted', 'submitted', 'confirmed'];
  function studioPage() {
    const $ = x => document.getElementById(x);
    let me = null, current = null, presets = [];
    api('/portal/me').then(m => { me = m; $('who').textContent = m.user.name ? `${m.user.name} · ${m.user.email}` : m.user.email; }).catch(() => location.replace('/'));
    $('logout').addEventListener('click', async e => { e.preventDefault(); await api('/portal/logout', { method: 'POST' }); location.replace('/'); });
    $('newea').addEventListener('click', () => { const f = $('uploadform'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input[name=file]').focus(); });
    $('back').addEventListener('click', () => { current = null; $('edit-section').hidden = true; $('list-section').hidden = false; refreshList(); });
    $('specimport').addEventListener('click', async () => {
      const m = $('specmsg'); m.className = 'msg'; m.textContent = '';
      let spec; try { spec = JSON.parse($('spectext').value); } catch (e) { m.className = 'msg err'; m.textContent = t('st.spec.badjson'); return; }
      $('specimport').disabled = true;
      try {
        const r = await api(`/portal/studio/eas/${encodeURIComponent(current)}/spec`, { method: 'POST', body: JSON.stringify({ spec }) });
        m.className = 'msg ok'; m.textContent = t('st.spec.done', { described: r.progress.described, total: r.progress.total, writable: r.progress.writable, rejected: r.rejected.length })
          + (r.rejected.length ? ' ' + r.rejected.map(x => `${x.key}: ${x.reason}`).join('; ') : '');
        $('spectext').value = '';
        openEa(current, true);
      } catch (e) {
        m.className = 'msg err'; m.textContent = I18N.errorText(e) + (e.details && e.details.errors ? ' ' + e.details.errors.slice(0, 5).map(x => `${x.path}: ${x.message}`).join('; ') : '');
      }
      $('specimport').disabled = false;
    });

    async function refreshList() {
      const st = await api('/portal/studio');
      $('disabled').hidden = st.enabled; $('newea').hidden = !st.enabled;
      $('demoaccounts').textContent = st.demo_accounts.length ? t('st.demo', { accounts: st.demo_accounts.map(a => `${a.mt5_login} @ ${a.mt5_server}`).join(', ') }) : t('st.demo.none');
      const box = $('ealist');
      box.innerHTML = st.eas.length ? st.eas.map(e => `<div class="keyrow"><span><b>${esc(e.name)}</b> <span class="muted mono small">${esc(e.file)}</span>${e.error ? `<div class="muted small">${esc(e.error)}</div>` : ''}${e.published ? `<div class="muted small">${t('st.publishedas', { id: esc(e.public_ea_id) })}</div>` : ''}</span><span class="status ${e.published ? 'online' : (e.status === 'failed' ? 'offline' : 'degraded')}">${esc(t('st.status.' + e.status))}</span><button class="btn sm" data-open="${esc(e.custom_id)}" type="button">${t('st.open')}</button></div>`).join('') : `<span class="muted">${t('st.none')}</span>`;
      box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openEa(b.dataset.open)));
    }
    refreshList().catch(e => { $('ealist').innerHTML = `<span class="muted">${esc(I18N.errorText(e))}</span>`; });
    setInterval(() => { if (!current) refreshList().catch(() => {}); else if (['uploaded', 'installed', 'discovered'].includes(current.status)) openEa(current.custom_id, true); }, 10000);

    form($('uploadform'), async (d, msg) => {
      const file = $('uploadform').querySelector('input[name=file]').files[0];
      if (!file) throw new Error(t('st.nofile'));
      const q = new URLSearchParams({ filename: file.name, name: d.name || '', vendor: d.vendor || '', version: d.version || '', website: d.website || '', licence_required: d.licence_required, licence_note: d.licence_note || '', description: d.description || '' });
      const r = await fetch('/portal/studio/eas?' + q.toString(), { method: 'POST', credentials: 'same-origin', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error((body.error && body.error.message) || `HTTP ${r.status}`); e.code = body.error && body.error.code; throw e; }
      msg.className = 'msg ok'; msg.textContent = body.note ? body.note : t('st.uploaded');
      $('uploadform').reset(); $('uploadform').hidden = true;
      refreshList();
    });

    async function openEa(id, quiet) {
      const d = await api('/portal/studio/eas/' + id);
      current = d;
      $('list-section').hidden = true; $('edit-section').hidden = false;
      $('edname').textContent = d.name;
      $('timeline').innerHTML = STAGES.map(s => `<span class="${s === d.status ? 'on' : (STAGES.indexOf(s) < STAGES.indexOf(d.status === 'failed' ? 'installed' : d.status) ? 'done' : '')}">${esc(t('st.status.' + s))}</span>`).join('');
      const rv = d.review || {};
      $('edstatus').innerHTML = `<span class="status ${d.published ? 'online' : (d.status === 'failed' ? 'offline' : 'degraded')}">${esc(t('st.status.' + d.status))}</span> <span class="muted">${esc(d.next || '')}</span>` +
        (d.error ? `<div class="msg err" style="margin-top:6px">${esc(d.error)}</div>` : '') +
        (rv.notes ? `<div style="margin-top:6px"><b>${t('st.reviewnotes')}</b> ${esc(rv.notes)}</div>` : '') +
        (d.published ? `<div style="margin-top:6px">${t('st.publishedas', { id: esc(d.public_ea_id) })} · <a href="https://algohand.com/eas#${esc(d.public_ea_id)}" target="_blank">algohand.com/eas</a></div>` : '');
      const jb = $('journalbox'); jb.hidden = !(d.journal && d.journal.length) && d.status !== 'failed';
      $('journal').textContent = (d.journal || []).join('\n') || '—';
      $('retry').hidden = !['failed', 'installed', 'uploaded'].includes(d.status);
      const editable = !d.published && ['drafted', 'discovered', 'submitted', 'failed', 'installed', 'uploaded'].includes(d.status);
      const hasParams = (d.parameters || []).length > 0;
      $('metaform').hidden = false; $('inputsbox').hidden = !hasParams; $('specbox').hidden = !hasParams; api(`/portal/studio/eas/${encodeURIComponent(id)}/spec`).then(sp => { $('specstatus').textContent = sp.stored ? t('st.spec.status', { described: sp.progress.described, total: sp.progress.total, writable: sp.progress.writable }) : ''; }).catch(() => {}); $('presetsbox').hidden = !hasParams; $('editbtns').hidden = !editable;
      $('submit').hidden = !hasParams || d.published; $('save').hidden = d.published;
      if (quiet && $('edmsg').textContent) return;
      fillForms(d);
    }

    function fillForms(d) {
      const dr = d.draft || {}, meta = d.author_meta || {}, f = $('metaform');
      f.name.value = dr.name || d.name || ''; f.category.value = dr.category || 'other'; f.description.value = dr.description || meta.description || '';
      f.vendor.value = meta.vendor || ''; f.version.value = meta.version || ''; f.website.value = meta.website || ''; f.licence_required.value = String(meta.licence_required !== false);
      f.symbols_allowed.value = (dr.symbols_allowed || []).join(', '); f.default_symbol.value = dr.default_symbol || ''; f.default_timeframe.value = dr.default_timeframe || 'M15';
      const names = (d.parameters || []).map(p => p.name);
      const opts = names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
      f.kill_switch.innerHTML = `<option value="">${t('st.nokill')}</option>` + opts; f.kill_switch.value = (dr.kill_switch && dr.kill_switch.input) || '';
      f.magic_input.innerHTML = `<option value="">—</option>` + opts; f.magic_input.value = dr.magic_input || '';
      const inputs = dr.inputs || {};
      $('inputs').innerHTML = `<tr><th>${t('st.col.name')}</th><th>${t('st.col.label')}</th><th>${t('st.col.desc')}</th><th>${t('st.col.cat')}</th><th>${t('st.col.change')}</th><th>${t('st.col.risk')}</th><th>${t('st.col.min')}</th><th>${t('st.col.max')}</th><th>${t('st.col.enum')}</th><th>${t('st.col.hidden')}</th></tr>` +
        (d.parameters || []).map(p => { const i = inputs[p.name] || {}; const en = i.enum_labels ? Object.entries(i.enum_labels).map(([k, v]) => `${k} = ${v}`).join(', ') : '';
          return `<tr data-name="${esc(p.name)}" class="${i.hidden ? 'hidden-row' : ''}"><td><span class="name">${esc(p.name)}</span><br><span class="def">${esc(p.type)} = ${esc(String(p.default))}</span></td>
            <td><input type="text" name="label" value="${esc(i.label || '')}"></td><td><input type="text" name="description" value="${esc(i.description || '')}"></td>
            <td><select name="category">${['risk', 'entry', 'exit', 'filters', 'news', 'time', 'display', 'licence', 'magic', 'other'].map(c => `<option${(i.category || 'other') === c ? ' selected' : ''}>${c}</option>`).join('')}</select></td>
            <td><input type="checkbox" name="changeable"${i.changeable ? ' checked' : ''}></td><td><input type="checkbox" name="is_risk"${i.is_risk ? ' checked' : ''}></td>
            <td><input type="number" step="any" name="min" value="${i.min != null ? esc(String(i.min)) : ''}"></td><td><input type="number" step="any" name="max" value="${i.max != null ? esc(String(i.max)) : ''}"></td>
            <td><input type="text" name="enum_labels" value="${esc(en)}" placeholder="${p.enum_candidate ? '0 = Fixed, 1 = Percent' : ''}"></td><td><input type="checkbox" name="hidden"${i.hidden ? ' checked' : ''}></td></tr>`; }).join('');
      presets = (dr.presets || []).map(p => ({ id: p.id, label: p.label || p.id, description: p.description || '', inputs: p.inputs || {} }));
      renderPresets(dr.default_preset);
    }

    function renderPresets(def) {
      $('presets').innerHTML = presets.map((p, i) => `<div class="row3" data-i="${i}"><input type="text" name="id" value="${esc(p.id)}" placeholder="low"><input type="text" name="label" value="${esc(p.label)}" placeholder="Low risk"><input type="text" name="inputs" value="${esc(Object.entries(p.inputs).map(([k, v]) => `${k}=${v}`).join(', '))}" placeholder="RiskPercent=0.5, MaxOrders=3"><input type="text" name="description" value="${esc(p.description)}" placeholder="${t('st.preset.desc')}" style="grid-column:1/3"><label class="check small"><input type="radio" name="default_preset" value="${esc(p.id)}"${def === p.id ? ' checked' : ''}> ${t('st.preset.default')}</label></div>`).join('');
    }
    $('addpreset').addEventListener('click', () => { collectPresets(); presets.push({ id: '', label: '', description: '', inputs: {} }); renderPresets(); });
    function collectPresets() {
      const rows = [...$('presets').querySelectorAll('.row3')];
      presets = rows.map(r => { const g = n => r.querySelector(`[name=${n}]`).value.trim(); const inputs = {}; g('inputs').split(',').map(x => x.trim()).filter(Boolean).forEach(x => { const [k, v] = x.split('=').map(y => y.trim()); if (k) inputs[k] = isNaN(Number(v)) ? (v === 'true' ? true : v === 'false' ? false : v) : Number(v); }); return { id: g('id'), label: g('label'), description: g('description'), inputs }; }).filter(p => p.id);
      const def = $('presets').querySelector('input[name=default_preset]:checked');
      return def ? def.value : (presets[0] && presets[0].id);
    }

    function collectPatch() {
      const f = $('metaform');
      const num = v => (v === '' || v == null) ? undefined : Number(v);
      const inputs = {};
      $('inputs').querySelectorAll('tr[data-name]').forEach(r => {
        const g = n => r.querySelector(`[name=${n}]`);
        const en = g('enum_labels').value.trim(); const labels = {};
        en.split(',').map(x => x.trim()).filter(Boolean).forEach(x => { const [k, v] = x.split('=').map(y => y.trim()); if (k !== '' && v) labels[k] = v; });
        const o = { label: g('label').value.trim() || undefined, description: g('description').value.trim() || undefined, category: g('category').value, changeable: g('changeable').checked, is_risk: g('is_risk').checked, hidden: g('hidden').checked, min: num(g('min').value), max: num(g('max').value) };
        if (Object.keys(labels).length) o.enum_labels = labels;
        Object.keys(o).forEach(k => o[k] === undefined && delete o[k]);
        inputs[r.dataset.name] = o;
      });
      const def = collectPresets();
      const patch = { name: f.name.value.trim() || undefined, category: f.category.value, description: f.description.value.trim() || undefined,
        symbols_allowed: f.symbols_allowed.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean), default_symbol: f.default_symbol.value.trim().toUpperCase() || undefined, default_timeframe: f.default_timeframe.value,
        magic_input: f.magic_input.value || undefined, presets, default_preset: def || undefined, inputs: Object.keys(inputs).length ? inputs : undefined,
        meta: { vendor: f.vendor.value.trim(), version: f.version.value.trim(), website: f.website.value.trim(), licence_required: f.licence_required.value === 'true' } };
      if (f.kill_switch.value) patch.kill_switch = { input: f.kill_switch.value, on_value: true, off_value: false }; else patch.clear_kill_switch = true;
      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
      return patch;
    }
    async function save() {
      const msg = $('edmsg'); msg.className = 'msg'; msg.textContent = t('working');
      try { current = await api('/portal/studio/eas/' + current.custom_id, { method: 'PATCH', body: JSON.stringify(collectPatch()) }); msg.className = 'msg ok'; msg.textContent = t('st.saved'); return true; }
      catch (e) { msg.className = 'msg err'; msg.textContent = I18N.errorText(e); return false; }
    }
    $('save').addEventListener('click', save);
    $('submit').addEventListener('click', async () => {
      if (!(await save())) return;
      if (!confirm(t('st.confirmSubmit'))) return;
      const msg = $('edmsg');
      try { const d = await api(`/portal/studio/eas/${current.custom_id}/submit`, { method: 'POST' }); msg.className = 'msg ok'; msg.textContent = t('st.submitted'); openEa(d.custom_id); }
      catch (e) { msg.className = 'msg err'; msg.textContent = I18N.errorText(e); }
    });
    $('retry').addEventListener('click', async () => { try { await api(`/portal/studio/eas/${current.custom_id}/discover`, { method: 'POST' }); openEa(current.custom_id); } catch (e) { alert(I18N.errorText(e)); } });
    $('delete').addEventListener('click', async () => { if (!confirm(t('st.confirmDelete'))) return; try { await api('/portal/studio/eas/' + current.custom_id, { method: 'DELETE' }); $('back').click(); } catch (e) { alert(I18N.errorText(e)); } });
  }

  // ---- the team's review page (token link from the e-mail)
  function reviewPage() {
    const q = new URLSearchParams(location.search), id = q.get('id'), token = q.get('t') || '';
    const $ = x => document.getElementById(x);
    const url = `/portal/review/${encodeURIComponent(id)}${token ? '?t=' + encodeURIComponent(token) : ''}`;
    function render(d) {
      $('rvname').textContent = `${d.name} · ${d.file}`;
      $('rvstatus').className = 'status ' + (d.published ? 'online' : 'degraded'); $('rvstatus').textContent = d.status + (d.review && d.review.status ? ' · ' + d.review.status : '');
      const m = d.author_meta || {}, a = d.author || {};
      $('rvinfo').innerHTML = `<div class="kv2"><span class="k">${t('rv.author')}</span><span>${esc(a.name || '')} &lt;${esc(a.email || '')}&gt;</span><span class="k">${t('rv.vendor')}</span><span>${esc(m.vendor || '')} · ${esc(m.version || '')} · ${m.website ? `<a href="${esc(m.website)}" target="_blank">${esc(m.website)}</a>` : ''}</span><span class="k">${t('rv.licence')}</span><span>${m.licence_required === false ? t('st.lic.no') : t('st.lic.yes')} — ${esc(m.licence_note || '')}</span><span class="k">${t('rv.inputs')}</span><span>${(d.parameters || []).length}</span><span class="k">${t('rv.journal')}</span><span class="small mono" style="white-space:pre-wrap">${esc((d.journal || []).slice(-8).join('\n') || '—')}</span></div>`;
      const doc = d.document_preview;
      const pol = (doc && doc.policy) || {};
      $('rvdoc').innerHTML = doc ? `<b class="small">${t('rv.doc')}</b><div class="small" style="margin:6px 0">${esc(doc.description || '')}</div><table class="rv"><tr><th>${t('st.col.name')}</th><th>${t('st.col.label')}</th><th>${t('st.col.change')}</th><th>${t('rv.range')}</th><th>${t('st.col.enum')}</th></tr>${(doc.parameters || []).filter(p => !(pol.hidden || []).includes(p.name)).map(p => { const c = (pol.changeable || {})[p.name]; const en = (pol.enum_labels || {})[p.name]; return `<tr><td class="mono">${esc(p.name)}</td><td>${esc((pol.labels || {})[p.name] || '')}</td><td>${c ? (pol.risk_inputs || []).includes(p.name) ? '✓ risk' : '✓' : '—'}</td><td>${c ? esc([c.min != null ? c.min : '', c.max != null ? c.max : ''].join(' … ')) : ''}</td><td>${en ? esc(Object.entries(en.values).map(([k, v]) => k + '=' + v).join(', ')) : ''}</td></tr>`; }).join('')}</table><div class="small" style="margin-top:8px">${t('rv.presets')}: ${(pol.presets || []).map(p => `<b>${esc(p.id)}</b> ${esc(Object.entries(p.inputs || {}).map(([k, v]) => k + '=' + v).join(', '))}`).join(' · ')} · ${t('rv.symbols')}: ${esc((doc.symbols_allowed || []).join(', '))} · ${t('rv.kill')}: ${pol.kill_switch ? esc(pol.kill_switch.input) : '—'}</div>`
                                : `<div class="msg err">${esc(d.document_error || 'invalid')}</div>`;
      const f = $('rvform');
      if (!f.ea_id.value) f.ea_id.value = d.public_ea_id || (d.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
      if (!f.category.value && doc) f.category.value = doc.category || '';
      f.hidden = !!d.published;
    }
    api(url).then(render).catch(e => { $('rvinfo').innerHTML = `<div class="msg err">${esc(I18N.errorText(e))}</div>`; });
    const act = async action => {
      const f = $('rvform'), msg = f.querySelector('.msg'); msg.className = 'msg'; msg.textContent = t('working');
      try { const d = await api(url, { method: 'POST', body: JSON.stringify({ action, ea_id: f.ea_id.value.trim() || null, category: f.category.value || null, restart_safe: f.restart_safe.checked, notes: f.notes.value.trim() || null }) }); msg.className = 'msg ok'; msg.textContent = t('rv.done.' + action); render(d); }
      catch (e) { msg.className = 'msg err'; msg.textContent = I18N.errorText(e); }
    };
    $('rvform').addEventListener('submit', e => { e.preventDefault(); if (confirm(t('rv.confirmApprove'))) act('approve'); });
    $('changes').addEventListener('click', () => act('changes'));
    $('reject').addEventListener('click', () => { if (confirm(t('rv.confirmReject'))) act('reject'); });
  }


  // ---- the team's view: every ticket and every author submission
  function adminPage() {
    const $ = x => document.getElementById(x);
    let filter = 'open_any', q = '';
    api('/portal/me').then(m => { if (!m.is_admin) { location.replace('/app'); return; } $('who').textContent = m.user.email; loadTickets(); loadAuthors(); }).catch(() => location.replace('/'));
    $('logout').addEventListener('click', async e => { e.preventDefault(); await api('/portal/logout', { method: 'POST' }); location.replace('/'); });
    const scls = s => (s === 'answered' || s === 'human_answered') ? 'online' : (s === 'closed' ? '' : 'degraded');
    async function loadTickets() {
      const d = await api(`/portal/admin/support?status=${encodeURIComponent(filter)}&q=${encodeURIComponent(q)}`);
      const c = d.counts;
      $('counts').innerHTML = [['escalated', c.escalated], ['open', c.open], ['answered', c.answered], ['human_answered', c.human_answered], ['closed', c.closed]]
        .map(([s, n]) => `<button class="chip${filter === s ? ' on' : ''}" data-f="${s}" type="button">${esc(t('sup.status.' + s))} · ${n}</button>`).join('') + `<button class="chip${filter === 'open_any' ? ' on' : ''}" data-f="open_any" type="button">${t('ad.notclosed')}</button>`;
      $('counts').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; loadTickets(); }));
      $('tickets').innerHTML = d.tickets.length ? d.tickets.map(x => `<a class="keyrow" href="/support?id=${encodeURIComponent(x.ticket_id)}&admin=1&lang=${I18N.lang}"><span><b>${esc(x.subject)}</b> <span class="muted small">${esc(x.name || '')} &lt;${esc(x.email)}&gt; · ${esc(x.source)}${x.client_id ? '' : ' · ' + t('sup.admin.noaccount')}</span><div class="muted small">${esc(x.last_author || '')}: ${esc(x.last_text || '')}</div></span><span class="status ${scls(x.status)}">${esc(t('sup.status.' + x.status))}</span><span class="muted small">${esc(when(x.updated_at))}</span></a>`).join('') : `<span class="muted">${t('ad.none')}</span>`;
    }
    $('search').addEventListener('input', e => { q = e.target.value; clearTimeout($('search')._t); $('search')._t = setTimeout(loadTickets, 300); });
    async function loadAuthors() {
      const d = await api('/portal/admin/authors');
      $('authors').innerHTML = d.eas.length ? d.eas.map(e => `<a class="keyrow" href="/review?id=${encodeURIComponent(e.custom_id)}&lang=${I18N.lang}"><span><b>${esc(e.name)}</b> <span class="muted mono small">${esc(e.file)}</span><div class="muted small">${esc((e.author && e.author.email) || '')} · ${esc((e.author_meta && e.author_meta.vendor) || '')}${e.published ? ' · ' + t('st.publishedas', { id: esc(e.public_ea_id) }) : ''}${e.review && e.review.status ? ' · ' + esc(e.review.status) : ''}</div></span><span class="status ${e.published ? 'online' : (e.status === 'submitted' ? 'degraded' : '')}">${esc(t('st.status.' + e.status))}</span><span class="muted small">${esc(when(e.updated_at))}</span></a>`).join('') : `<span class="muted">${t('ad.noauthors')}</span>`;
    }
    async function loadUsage() {
      const u = await api('/portal/admin/usage?days=7');
      const tt = u.totals, usd = c => '$' + (c / 100).toFixed(2), k = n => (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k';
      const row = (a, b, cls) => `<tr><td${cls ? ` class="${cls}"` : ''}>${a}</td><td style="text-align:right">${b}</td></tr>`;
      const table = (title, rows) => `<div style="margin-top:12px"><b>${title}</b><table class="small" style="width:100%;margin-top:6px">${rows}</table></div>`;
      const agg = d => `${d.turns} · ${d.calls} · ${k(d.input_tokens)} / ${k(d.output_tokens)} · ${usd(d.cost_cents)}${d.byok_turns ? ` · ${t('ad.u.byok')} ${d.byok_turns}` : ''}`;
      $('usage').innerHTML = `<div>${t('ad.u.totals', { turns: tt.turns, calls: tt.calls, tin: k(tt.input_tokens), tcache: k(tt.cache_read_tokens), tout: k(tt.output_tokens), cost: usd(tt.cost_cents), byok: tt.byok_turns })}</div>` +
        table(t('ad.u.byday'), u.by_day.map(d => row(esc(d.key), agg(d))).join('')) +
        table(t('ad.u.bychannel'), u.by_channel.map(d => row(esc(d.key), agg(d))).join('')) +
        table(t('ad.u.bymodel'), u.by_model.map(d => row(esc(d.key), agg(d))).join('')) +
        table(t('ad.u.clients'), u.clients.map(d => row(esc(d.email || d.key) + (d.kind ? ` <span class="muted">· ${esc(d.kind)}</span>` : ''), agg(d))).join('') || row(t('ad.u.none'), ''));
    }
    loadUsage().catch(e => { $('usage').textContent = I18N.errorText(e); });
    setInterval(() => { loadTickets().catch(() => {}); }, 60000);
  }

  async function refreshLlmKey() {
    const box = document.getElementById('llmstatus');
    if (!box) return;
    const k = await api('/portal/llm-key');
    const c = k.chat || {};
    const line = (a, b) => `<div class="small" style="display:flex;justify-content:space-between;gap:12px;padding:4px 0"><span class="muted">${a}</span><b>${b}</b></div>`;
    let html = `<div><span class="status ${k.configured ? 'online' : ''}">${k.configured ? t('llm.configured', { hint: esc(k.hint) }) : t('llm.none')}</span></div>`;
    if (k.configured && k.added_at) html += line(t('llm.added'), esc(dateOf(k.added_at)) + (k.last_used_at ? ' · ' + t('llm.lastused') + ' ' + esc(dateOf(k.last_used_at)) : ''));
    html += line(t('llm.model'), t(c.policy === 'opus' ? 'llm.model.opus' : 'llm.model.auto'));
    html += line(t('llm.thismonth'), c.limit ? t('llm.usage', { used: c.used, limit: c.limit }) : t('llm.usage.unlimited', { used: c.used }));
    if (c.over) html += `<div class="msg err" style="margin-top:8px">${t('llm.over')}</div>`;
    box.innerHTML = html;
    document.getElementById('llmdelete').hidden = !k.configured;
  }

  async function refreshKeys() {
    const { keys } = await api('/portal/keys');
    const box = document.getElementById('keylist');
    const live = keys.filter(k => !k.revoked_at);
    box.innerHTML = live.length ? live.map(k => `<div class="keyrow"><span><b>${esc(k.label)}</b> <span class="muted mono">${esc(k.key_id)}…</span></span><span class="muted">${esc((k.created_at || '').slice(0, 10))}</span><button class="kill" data-key="${esc(k.key_id)}" type="button">${t('js.revoke')}</button></div>`).join('') : `<span class="muted">${t('keys.none')}</span>`;
    box.querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', async () => { if (confirm(t('js.confirmRevoke'))) { await api('/portal/keys/' + b.dataset.key, { method: 'DELETE' }); refreshKeys(); } }));
  }

  function appPage() {
    // the dashboard is installable: the service worker gives an honest offline page and carries push notifications
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const source = new URLSearchParams(location.search).get('source') || ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true ? 'standalone' : '');
    api('/portal/me' + (source ? '?source=' + encodeURIComponent(source) : '')).then(me => {
      document.getElementById('who').textContent = me.user.name ? `${me.user.name} · ${me.user.email}` : me.user.email;
      const cid = document.getElementById('cid'); if (cid) cid.textContent = me.user.client_id;
      if (!me.has_vps) { document.getElementById('connect').hidden = false; }
      document.getElementById('studiolink').hidden = me.user.kind !== 'author';
      document.getElementById('adminlink').hidden = !me.is_admin;
      document.getElementById('unverified').hidden = me.user.verified !== false;
    }).catch(() => location.replace('/'));
    document.getElementById('resend').addEventListener('click', async () => {
      const b = document.getElementById('resend'); b.disabled = true;
      try { await api('/portal/resend-verification', { method: 'POST' }); b.textContent = t('js.sent'); } catch (e) { b.textContent = I18N.errorText(e); }
    });
    refresh(); refreshKeys(); refreshEas().catch(() => {}); refreshTickets().catch(() => {}); refreshBilling().catch(() => {}); refreshAlerts().catch(() => {}); refreshTelegram().catch(() => {}); refreshLlmKey().catch(() => {}); refreshPush().catch(() => {});
    setInterval(() => refreshAlerts().catch(() => {}), 30000);
    form(document.getElementById('llmform'), async (d, msg) => { await api('/portal/llm-key', { method: 'PUT', body: JSON.stringify(d) }); msg.className = 'msg ok'; msg.textContent = t('llm.saved'); document.getElementById('llmform').reset(); refreshLlmKey(); });
    document.getElementById('llmdelete').addEventListener('click', async () => { if (confirm(t('llm.confirmRemove'))) { await api('/portal/llm-key', { method: 'DELETE' }); refreshLlmKey(); } });
    document.getElementById('tglink').addEventListener('click', async () => {
      try { const r = await api('/portal/telegram/link', { method: 'POST' }); window.open(r.url, '_blank', 'noopener'); let n = 0; const before = (await api('/portal/telegram')).chats.length; const poll = setInterval(async () => { const s = await api('/portal/telegram'); if ((s.chats || []).length > before || ++n > 60) { clearInterval(poll); refreshTelegram(); } }, 3000); }
      catch (e) { alert(I18N.errorText(e)); }
    });
    document.getElementById('tgunlink').addEventListener('click', async () => { if (confirm(t('tg.confirmUnlink'))) { await api('/portal/telegram', { method: 'DELETE' }); refreshTelegram(); } });
    document.getElementById('pinrequired').addEventListener('change', async e => { try { await api('/portal/telegram/settings', { method: 'POST', body: JSON.stringify({ pin_required: e.target.checked }) }); } catch (err) { alert(I18N.errorText(err)); } refreshTelegram(); });
    document.getElementById('tgtest').addEventListener('click', async () => { const b = document.getElementById('tgtest'); b.disabled = true; try { await api('/portal/telegram/test', { method: 'POST' }); b.textContent = t('js.sent'); } catch (e) { b.textContent = I18N.errorText(e); } });
    form(document.getElementById('pinform'), async (d, msg) => { await api('/portal/telegram/pin', { method: 'POST', body: JSON.stringify(d) }); msg.className = 'msg ok'; msg.textContent = t('tg.pinsaved'); document.getElementById('pinform').reset(); refreshTelegram(); });
    document.getElementById('managesub').addEventListener('click', async () => {
      const b = document.getElementById('managesub'); b.disabled = true;
      try { const r = await api('/portal/billing/portal', { method: 'POST' }); if (r.url) window.open(r.url, '_blank', 'noopener'); } catch (e) { alert(I18N.errorText(e)); }
      b.disabled = false;
    });
    if (new URLSearchParams(location.search).get('paid')) { setTimeout(refreshBilling, 4000); setTimeout(refreshBilling, 20000); }
    setInterval(refresh, 20000);
    setInterval(() => refreshEas().catch(() => {}), 15000);
    setInterval(() => refreshTickets().catch(() => {}), 30000);
    document.getElementById('newticketbtn').addEventListener('click', () => { const f = document.getElementById('ticketform'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input').focus(); });
    form(document.getElementById('ticketform'), async (d, msg) => {
      const r = await api('/portal/support', { method: 'POST', body: JSON.stringify({ subject: d.subject || null, message: d.message, lang: I18N.lang }) });
      document.getElementById('ticketform').reset();
      msg.className = 'msg ok'; msg.innerHTML = `${t('sup.sent', { id: esc(r.ticket_id) })} ${t('sup.sentdash')} <a href="${esc(r.link)}">${t('sup.open')}</a>`;
      refreshTickets();
    });
    document.getElementById('eafile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) uploadEa(f); e.target.value = ''; });
    document.getElementById('logout').addEventListener('click', async e => { e.preventDefault(); await api('/portal/logout', { method: 'POST' }); location.replace('/'); });
    // the assistant lives in the dashboard: the chat page is embedded with a personal 30-day code
    api('/portal/chat-code', { method: 'POST' }).then(c => {
      const frame = document.getElementById('chatframe');
      frame.addEventListener('load', () => document.querySelector('.chatframe').classList.add('ready'), { once: true });
      frame.src = c.url + '&embed=1&lang=' + I18N.lang;
      document.getElementById('chatnewtab').href = c.url;
    }).catch(e => { document.getElementById('chatwait').textContent = t('js.chatdown') + I18N.errorText(e); });
    document.getElementById('openchat').addEventListener('click', e => { e.preventDefault(); document.getElementById('chat-section').scrollIntoView({ behavior: 'smooth' }); });
    document.getElementById('addvps').addEventListener('click', () => { const c = document.getElementById('connect'); c.hidden = !c.hidden; if (!c.hidden) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    form(document.getElementById('vpsform'), async (d, msg) => {
      const v = await api('/portal/vps', { method: 'POST', body: JSON.stringify({ label: d.label || null }) });
      msg.className = 'msg ok'; msg.textContent = t('js.tokencreated', { name: d.label || v.vps_id });
      document.getElementById('cmd').textContent = v.install_command;
      document.getElementById('tokenbox').hidden = false;
      refresh();
    });
    document.getElementById('copycmd').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.getElementById('cmd').textContent); document.getElementById('copycmd').textContent = t('copied'); } catch (e) {} });
    document.getElementById('addkey').addEventListener('click', async () => {
      const label = prompt(t('js.keylabel'), t('js.keydefault')); if (label == null) return;
      const k = await api('/portal/keys', { method: 'POST', body: JSON.stringify({ label }) });
      const box = document.getElementById('newkey'); box.hidden = false;
      box.innerHTML = `<b>${t('js.newkey')}</b><pre class="cmd" style="margin-top:8px">${esc(k.api_key)}</pre><p class="muted small">client_id: <code>${esc(k.client_id)}</code> · ${t('js.example')}: <code>curl -H "Authorization: Bearer ${esc(k.api_key)}" https://api.algohand.com/v1/clients/${esc(k.client_id)}/state</code></p>`;
      refreshKeys();
    });
    form(document.getElementById('pwform'), async (d, msg) => { await api('/portal/password', { method: 'POST', body: JSON.stringify(d) }); msg.className = 'msg ok'; msg.textContent = t('js.pwchanged'); document.getElementById('pwform').reset(); });
  }

  function eaPage() {
    const $ = x => document.getElementById(x);
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { location.replace('/app'); return; }
    api('/portal/me').then(m => { $('who').textContent = m.user.name ? `${m.user.name} · ${m.user.email}` : m.user.email; }).catch(() => location.replace('/'));
    $('logout').addEventListener('click', async e => { e.preventDefault(); await api('/portal/logout', { method: 'POST' }); location.replace('/'); });
    let data = null;
    const badge = key => {
      const pm = (data.permissions.parameters || {})[key] || {};
      return `<span class="status ${pm.write ? 'online' : ''}">${pm.write ? t('ea.yes') : t('ea.no')}</span><span class="why">${esc(pm.reason || '')}</span>`;
    };
    const rangeCell = p => {
      const sr = p.safe_range || {}; const isEnum = p.type === 'enum' || (p.terminal && p.terminal.enum_labels);
      if (isEnum || (p.type === 'int' && p.enum_labels)) {
        const el = p.enum_labels || (p.terminal && p.terminal.enum_labels) || {};
        return `<textarea data-f="enum" placeholder="${esc(t('ea.enumhint'))}">${esc(Object.entries(el).map(([k, v]) => `${k}=${v}`).join('\n'))}</textarea>`;
      }
      if (p.type === 'bool' || p.type === 'string' || p.type === 'csv') return `<span class="muted small">—</span>`;
      return `<input type="number" step="any" data-f="min" placeholder="min" value="${sr.min != null ? esc(String(sr.min)) : ''}"> – <input type="number" step="any" data-f="max" placeholder="max" value="${sr.max != null ? esc(String(sr.max)) : ''}">`;
    };
    function render() {
      $('eaname').textContent = data.ea.name;
      const pr = data.progress;
      $('progress').textContent = t('ea.progress', { described: pr.described, total: pr.total, writable: pr.writable });
      $('progressbar').style.width = (pr.total ? Math.round(100 * pr.described / pr.total) : 0) + '%';
      $('specnote').textContent = data.stored ? '' : t('ea.nospec');
      const tb = $('rows').querySelector('tbody');
      tb.innerHTML = data.spec.parameters.map(p => `<tr data-key="${esc(p.key)}" id="row-${esc(p.key)}" class="${p.hidden ? 'hidden-row' : ''}">
        <td class="name">${esc(p.key)}<br><span class="muted small">${esc(p.type)}</span></td>
        <td class="def">${esc(String(p.terminal && p.terminal.default != null ? p.terminal.default : ''))}</td>
        <td><input type="text" data-f="meaning" maxlength="400" value="${esc(p.meaning || '')}" placeholder="${esc(t('ea.meaningph'))}"></td>
        <td><input type="text" data-f="unit" maxlength="24" value="${esc(p.unit || '')}" style="width:74px"></td>
        <td><label class="small"><input type="checkbox" data-f="risk" ${p.risk_relevant ? 'checked' : ''}> ${t('ea.risk')}</label><br><label class="small muted"><input type="checkbox" data-f="hidden" ${p.hidden ? 'checked' : ''}> ${t('ea.hide')}</label></td>
        <td>${rangeCell(p)}</td>
        <td data-badge>${badge(p.key)}</td>
        <td><button class="btn sm icon" data-save type="button" title="${esc(t('ea.save'))}" aria-label="${esc(t('ea.save'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></button></td></tr>`).join('');
      tb.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () => saveRow(b.closest('tr'))));
      const target = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
      if (target) { const row = document.getElementById('row-' + target); if (row) { row.classList.add('flash'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = row.querySelector('[data-f=meaning]'); if (inp) inp.focus(); } }
    }
    async function saveRow(tr) {
      const key = tr.dataset.key, g = f => tr.querySelector(`[data-f=${f}]`);
      const row = { key, meaning: g('meaning').value, unit: g('unit').value, risk_relevant: g('risk').checked, hidden: g('hidden').checked };
      if (g('min') || g('max')) row.safe_range = { min: g('min').value === '' ? null : Number(g('min').value), max: g('max').value === '' ? null : Number(g('max').value) };
      if (g('enum')) { const el = {}; g('enum').value.split('\n').forEach(l => { const m = l.match(/^\s*(-?\d+)\s*=\s*(.+)$/); if (m) el[m[1]] = m[2].trim(); }); if (Object.keys(el).length) row.enum_labels = el; }
      const b = tr.querySelector('[data-save]'); b.disabled = true; const m = $('eamsg'); m.className = 'msg'; m.textContent = '';
      try {
        const r = await api(`/portal/eas/${encodeURIComponent(id)}/spec/rows`, { method: 'POST', body: JSON.stringify({ rows: [row] }) });
        data = { ...data, spec: r.spec, permissions: r.permissions, progress: r.progress, stored: r.stored };
        tr.querySelector('[data-badge]').innerHTML = badge(key);
        const pr = r.progress; $('progress').textContent = t('ea.progress', { described: pr.described, total: pr.total, writable: pr.writable });
        $('progressbar').style.width = (pr.total ? Math.round(100 * pr.described / pr.total) : 0) + '%';
        m.className = 'msg ok'; m.textContent = t('ea.saved', { key }) + (r.rejected.length ? ' ' + r.rejected.map(x => `${x.key}: ${x.reason}`).join('; ') : '');
      } catch (e) { m.className = 'msg err'; m.textContent = I18N.errorText(e); }
      b.disabled = false;
    }
    // Path A: the prompt with this EA's inputs → the customer's own AI → the JSON pasted or picked as a file
    const promptUrl = `/portal/eas/${encodeURIComponent(id)}/prompt`;
    $('dlprompt').href = promptUrl + '?download=1';
    $('copyprompt').addEventListener('click', async () => {
      const st = $('copystatus'); st.textContent = '';
      try {
        const r = await fetch(promptUrl, { credentials: 'same-origin' }); if (!r.ok) throw new Error(String(r.status));
        await navigator.clipboard.writeText(await r.text()); st.textContent = t('ea.ai.copied');
      } catch (e) { st.textContent = t('ea.ai.copyfail'); }
      setTimeout(() => { st.textContent = ''; }, 4000);
    });
    async function importSpec(text) {
      const m = $('specmsg'); m.className = 'msg'; m.textContent = '';
      let spec; try { spec = JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')); } catch (e) { m.className = 'msg err'; m.textContent = t('ea.ai.badjson'); return; }
      $('specimport').disabled = true;
      try {
        const r = await api(`/portal/eas/${encodeURIComponent(id)}/spec`, { method: 'POST', body: JSON.stringify({ spec }) });
        data = { ...data, spec: r.spec, permissions: r.permissions, progress: r.progress, stored: r.stored };
        render(); $('spectext').value = '';
        m.className = 'msg ok'; m.textContent = t('ea.ai.done', { described: r.progress.described, total: r.progress.total, writable: r.progress.writable, rejected: r.rejected.length })
          + (r.rejected.length ? ' ' + r.rejected.map(x => `${x.key}: ${x.reason}`).join('; ') : '');
      } catch (e) {
        const errs = (e && e.details && e.details.errors) || [];
        m.className = 'msg err'; m.textContent = I18N.errorText(e) + (errs.length ? ' ' + errs.slice(0, 6).map(x => `${x.path}: ${x.message}`).join('; ') : '');
      }
      $('specimport').disabled = false;
    }
    $('specimport').addEventListener('click', () => importSpec($('spectext').value));
    $('specfile').addEventListener('change', () => { const f = $('specfile').files[0]; if (!f) return; f.text().then(txt => { $('spectext').value = txt; importSpec(txt); $('specfile').value = ''; }); });
    api(`/portal/eas/${encodeURIComponent(id)}/spec`).then(d => { data = d; render(); }).catch(e => { $('eamsg').className = 'msg err'; $('eamsg').textContent = I18N.errorText(e); });
  }

  return { authPage, appPage, resetPage, supportPage, studioPage, reviewPage, adminPage, eaPage };
})();
