(() => {
  'use strict';
  const DATA = window.CULTURE_DATA;
  const DETAIL = window.CULTURE_DETAIL_DATA || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const cleanSourceName = (v='') => String(v)
    .replace(/^\[([^\]]+)\]\(https?:\/\/[^)]+\)/, '$1')
    .replace(/^https?:\/\/(?=[A-Za-z0-9.-]+(?:｜|$))/, '');
  const safeUrl = (v='') => {
    try {
      const url = new URL(String(v), window.location.href);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const HOME_TITLE = '入境隨俗手札｜世界旅行文化地圖';
  const HOME_DESCRIPTION = '出國前 3 分鐘，搞懂當地習俗、禮儀、禁忌與重要旅遊法規。從世界地圖快速探索 35 個國家與地區的旅行文化提醒。';
  function setMetaContent(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  }
  function setPageMeta(title, description) {
    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
  }

  const popular = ['日本','韓國','泰國','新加坡','法國','美國'];
  const themes = ['小費','交通','宗教','拍照','吃飯','穿著','溫泉／洗浴','法規','作客','飲酒','打招呼','說話','男女互動','住宿'];
  const toneNames = Object.keys(DATA.countryMeta);
  const levelClass = (level) => level.startsWith('🟢')?'green':level.startsWith('🟡')?'yellow':level.startsWith('🔴')?'red':'law';
  const storageGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const storageSet = (key,value) => { try { localStorage.setItem(key,value); } catch {} };

  const drawer = $('#country-drawer');
  const scrim = $('#drawer-scrim');
  const viewport = $('#map-viewport');
  const track = $('#map-track');
  const tooltip = $('#country-tooltip');
  const hint = $('#drag-hint');
  const mapLoading = $('#map-loading');
  const mapError = $('#map-error');

  let currentHover = null;
  let offsetX = 0;
  let minOffset = 0;
  let maxOffset = 0;
  let dragging = false;
  let didDrag = false;
  let startX = 0;
  let lastX = 0;
  let velocity = 0;
  let animationFrame = null;
  let previousFocus = null;

  function getZhFromFeature(feature) {
    const iso2 = feature?.iso2 || '';
    if (iso2 && DATA.isoToName[iso2]) return DATA.isoToName[iso2];
    const name = feature?.name || feature?.properties?.name || '';
    return DATA.nameAliases[name] || null;
  }

  function getMeta(zh) {
    return DATA.countryMeta[zh] || null;
  }

  function summaryFor(zh) {
    return DATA.summaries[zh] || null;
  }

  function normalizeLegacyReminder(row) {
    return {
      category: row[0], level: row[1], nature: row[2], summary: row[3], advice: row[4],
      region: '', detail: '', sourceName: '', sourceUrl: '', updatedAt: '', title: row[3]
    };
  }

  function remindersFor(zh) {
    if (DETAIL[zh]?.length) return DETAIL[zh];
    return (DATA.reminders[zh] || []).map(normalizeLegacyReminder);
  }

  function hasFullSnapshot(zh) {
    return Boolean(DETAIL[zh]?.length);
  }

  function tooltipHtml(zh, fallbackName='') {
    const meta = getMeta(zh);
    const sum = summaryFor(zh);
    if (!zh || !meta || !sum) {
      const name = zh || fallbackName || '這個地方';
      return `<div class="tooltip-title"><div><strong>${esc(name)}</strong></div></div><div class="tooltip-empty">內容整理中</div>`;
    }
    const levels = [
      sum.green ? `🟢 ${sum.green}` : '', sum.yellow ? `🟡 ${sum.yellow}` : '', sum.red ? `🔴 ${sum.red}` : '', sum.law ? `⚖️ ${sum.law}` : ''
    ].filter(Boolean).join('　');
    return `<div class="tooltip-title"><span class="flag">${meta.flag}</span><div><strong>${esc(zh)}</strong><small>${esc(meta.en)}</small></div></div><div class="tooltip-count">${sum.total} 則旅行文化提醒</div><div class="level-row">${levels}</div><span class="tooltip-cta">點一下打開手札 →</span>`;
  }

  function showTooltip(evt, zh, fallbackName='') {
    tooltip.innerHTML = tooltipHtml(zh, fallbackName);
    tooltip.hidden = false;
    moveTooltip(evt);
  }

  function moveTooltip(evt) {
    if (tooltip.hidden) return;
    const rect = viewport.getBoundingClientRect();
    const tRect = tooltip.getBoundingClientRect();
    let x = evt.clientX - rect.left;
    let y = evt.clientY - rect.top;
    if (x + tRect.width + 28 > rect.width) x -= tRect.width + 28;
    if (y + tRect.height + 28 > rect.height) y -= tRect.height + 28;
    tooltip.style.left = `${Math.max(8,x)}px`;
    tooltip.style.top = `${Math.max(8,y)}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
    currentHover?.classList.remove('is-hovered');
    currentHover = null;
  }

  function bindCountryNode(node, zh, fallbackName='') {
    const available = Boolean(zh && summaryFor(zh));
    node.addEventListener('pointerenter', e => {
      if (dragging || e.pointerType === 'touch' || window.matchMedia('(hover: none)').matches) return;
      currentHover?.classList.remove('is-hovered');
      currentHover = node;
      node.classList.add('is-hovered');
      showTooltip(e, zh, fallbackName);
    });
    node.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') moveTooltip(e); });
    node.addEventListener('pointerleave', hideTooltip);
    node.addEventListener('click', () => {
      if (didDrag) return;
      if (available) openDrawer(zh);
    });
    if (available) {
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer(zh);
        }
      });
    }
  }

  function svgEl(name, attrs={}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([k,v]) => { if (v !== null && v !== undefined) el.setAttribute(k, v); });
    return el;
  }

  function initMap() {
    try {
      const features = window.WORLD_MAP_FEATURES || [];
      if (!features.length) throw new Error('Local world map data unavailable');
      const group = $('#map-countries');
      group.innerHTML = '';
      features.forEach((feature, i) => {
        const zh = getZhFromFeature(feature);
        const meta = zh ? getMeta(zh) : null;
        const available = zh && summaryFor(zh);
        const node = svgEl('path', {
          d: feature.d,
          class: `country-path ${available?'has-data':''} tone-${i%3}`,
          id: meta ? `country-${meta.iso}` : null,
          'data-iso': meta?.iso || '',
          'data-country': zh || feature.name || '',
          'fill-rule': 'evenodd',
          role: available && !DATA.smallCountries.some(item => item.zh === zh) ? 'button' : null,
          tabindex: available && !DATA.smallCountries.some(item => item.zh === zh) ? '0' : null,
          'aria-label': available && meta ? `${zh} ${meta.en}，${summaryFor(zh).total} 則旅行提醒` : null
        });
        group.appendChild(node);
        bindCountryNode(node, zh, feature.name || '');
      });
      drawSmallCountryHits();
      mapLoading.hidden = true;
      updateBounds();
      centerInitialMap();
    } catch (err) {
      console.error(err);
      mapLoading.hidden = true;
      mapError.hidden = false;
    }
  }

  function drawSmallCountryHits() {
    const points = window.WORLD_MAP_POINTS || {};
    const group = $('#map-small-countries');
    group.innerHTML = '';
    DATA.smallCountries.forEach(item => {
      const point = points[item.zh];
      if (!point) return;
      const [x,y] = point;
      const meta = getMeta(item.zh);
      const hit = svgEl('circle', {class:'small-country-hit','data-iso':meta?.iso||'','data-country':item.zh,cx:x,cy:y,r:item.r+7,role:'button',tabindex:'0','aria-label':`${item.zh} ${meta?.en||''}，${summaryFor(item.zh)?.total||0} 則旅行提醒`});
      const ring = svgEl('circle', {class:'small-country-ring',cx:x,cy:y,r:item.r});
      const dot = svgEl('circle', {class:'small-country-dot',cx:x,cy:y,r:3.2});
      group.append(hit, ring, dot);
      bindCountryNode(hit, item.zh, meta?.en || item.zh);
    });
  }

  function updateBounds() {
    const viewportW = viewport.clientWidth;
    const trackW = track.getBoundingClientRect().width;
    maxOffset = 0;
    minOffset = Math.min(0, viewportW - trackW);
    offsetX = Math.min(maxOffset, Math.max(minOffset, offsetX));
    applyOffset();
  }

  function centerInitialMap() {
    const centerBias = window.innerWidth < 700 ? .52 : .38;
    offsetX = minOffset * centerBias;
    applyOffset();
  }

  function applyOffset() { track.style.transform = `translate3d(${offsetX}px,0,0)`; }

  function resisted(next) {
    const resistance = .24;
    if (next > maxOffset) return maxOffset + (next-maxOffset)*resistance;
    if (next < minOffset) return minOffset + (next-minOffset)*resistance;
    return next;
  }

  function settle() {
    cancelAnimationFrame(animationFrame);
    const tick = () => {
      velocity *= .91;
      let next = offsetX + velocity;
      if (next > maxOffset || next < minOffset) velocity *= .65;
      offsetX = resisted(next);
      if (Math.abs(velocity) < .12) {
        const target = Math.min(maxOffset, Math.max(minOffset, offsetX));
        offsetX += (target - offsetX) * .2;
        applyOffset();
        if (Math.abs(target-offsetX) > .25) animationFrame = requestAnimationFrame(tick);
        else { offsetX = target; applyOffset(); }
        return;
      }
      applyOffset();
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }

  viewport.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; didDrag = false; startX = lastX = e.clientX; velocity = 0;
    viewport.classList.add('is-dragging'); viewport.setPointerCapture?.(e.pointerId); hideTooltip(); cancelAnimationFrame(animationFrame);
  });
  viewport.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    if (Math.abs(e.clientX-startX) > 5) didDrag = true;
    velocity = dx;
    offsetX = resisted(offsetX + dx);
    lastX = e.clientX;
    applyOffset();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; viewport.classList.remove('is-dragging');
    if (didDrag) {
      hint.classList.add('is-hidden');
      storageSet('culture-map-dragged','1');
    }
    settle();
    setTimeout(() => { didDrag = false; }, 0);
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('pointerleave', e => { if (dragging && e.buttons===0) endDrag(); });
  window.addEventListener('resize', updateBounds);

  if (storageGet('culture-map-dragged') === '1') hint.classList.add('is-hidden');

  function nudgeMap(direction) {
    cancelAnimationFrame(animationFrame);
    const start = offsetX;
    const distance = Math.max(180, viewport.clientWidth * .42) * direction;
    const target = Math.min(maxOffset, Math.max(minOffset, start + distance));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      offsetX = target;
      applyOffset();
      return;
    }
    const duration = 320;
    const startTime = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    const tick = now => {
      const t = Math.min(1, (now - startTime) / duration);
      offsetX = start + (target - start) * ease(t);
      applyOffset();
      if (t < 1) animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }

  $('#map-left')?.addEventListener('click', () => nudgeMap(1));
  $('#map-right')?.addEventListener('click', () => nudgeMap(-1));
  viewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeMap(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudgeMap(-1); }
  });

  function priorityScore(r) {
    return r.level.startsWith('⚖️') ? 4 : r.level.startsWith('🔴') ? 3 : r.level.startsWith('🟡') ? 2 : 1;
  }

  function quickItems(zh) {
    const rows = remindersFor(zh);
    if (!rows.length) return [];
    const sorted = [...rows].sort((a,b) => priorityScore(b) - priorityScore(a));
    const picked = [], used = new Set();
    sorted.forEach(r => {
      if (picked.length < 6 && !used.has(r.category)) {
        picked.push(r);
        used.add(r.category);
      }
    });
    sorted.forEach(r => { if (picked.length < 6 && !picked.includes(r)) picked.push(r); });
    return picked;
  }

  function openDrawer(zh) {
    const meta = getMeta(zh), sum = summaryFor(zh);
    if (!meta || !sum) return;
    previousFocus = document.activeElement;
    const items = quickItems(zh);
    const levels = [
      sum.green ? `🟢 ${sum.green}` : '',
      sum.yellow ? `🟡 ${sum.yellow}` : '',
      sum.red ? `🔴 ${sum.red}` : '',
      sum.law ? `⚖️ ${sum.law}` : ''
    ].filter(Boolean).join('　');
    const itemHtml = items.length ? items.map(r => `
      <div class="quick-item ${r.nature==='法規'||r.level.startsWith('⚖️')?'is-law':''}">
        <div class="quick-icon">${DATA.iconByCategory[r.category]||'✦'}</div>
        <div><small>${esc(r.category)} · ${esc(r.level)}</small><p>${esc(r.summary)}</p></div>
      </div>`).join('') : `<div class="drawer-empty"><strong>${sum.total} 則內容已整理</strong><br>內容快照正在同步。</div>`;

    $('#drawer-content').innerHTML = `<div class="drawer-inner">
      <div class="drawer-stamp">PASSPORT NOTE · ${esc(meta.iso)}</div>
      <div class="drawer-country"><span class="flag">${meta.flag}</span><div><h2 id="drawer-title">${esc(zh)}</h2><small>${esc(meta.en)}</small></div></div>
      <div class="drawer-summary-line"><span>${sum.total} 則旅行提醒</span><span>${levels}</span></div>
      <div class="drawer-intro"><strong>出發前先記住這 ${Math.min(6,sum.total)} 件事</strong><span class="snapshot-pill ${hasFullSnapshot(zh)?'is-ready':''}">${hasFullSnapshot(zh)?'完整內容已同步':'內容整理中'}</span></div>
      <div class="quick-list">${itemHtml}</div>
      <div class="drawer-actions">
        <button class="primary-btn" data-open-country="${esc(meta.slug)}">查看完整${esc(zh)}手札 →</button>
        <button class="secondary-btn" data-close-drawer>回世界地圖</button>
      </div>
    </div>`;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden','false');
    scrim.hidden = false;
    document.body.classList.add('drawer-open');
    $('[data-close-drawer]', drawer)?.addEventListener('click', closeDrawer);
    $('[data-open-country]', drawer)?.addEventListener('click', e => { location.hash = `#/country/${e.currentTarget.dataset.openCountry}`; closeDrawer(false); });
    requestAnimationFrame(() => $('#drawer-close')?.focus({preventScroll:true}));
  }

  function closeDrawer(restoreFocus=true) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden','true');
    scrim.hidden = true;
    document.body.classList.remove('drawer-open');
    document.documentElement.style.removeProperty('--scrollbar-compensation');
    if (restoreFocus && previousFocus?.focus) previousFocus.focus({preventScroll:true});
  }
  $('#drawer-close').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) { closeDrawer(); return; }
    if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
    const focusables = $$('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])', drawer).filter(el => !el.hidden);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function renderPopular() {
    $('#popular-destinations').innerHTML = popular.map(zh => {
      const m=getMeta(zh),s=summaryFor(zh); return `<button class="destination-card" data-country="${esc(zh)}"><span class="flag">${m.flag}</span><strong>${esc(zh)}</strong><small>${esc(m.en)}</small><div class="count">${s.total} 則旅行提醒</div></button>`;
    }).join('');
    $$('.destination-card').forEach(b => b.addEventListener('click',()=>openDrawer(b.dataset.country)));
  }

  function renderThemes() {
    $('#theme-grid').innerHTML = themes.map(t => `<button class="theme-chip" data-theme="${esc(t)}"><span>${DATA.iconByCategory[t]||'✦'}</span><strong>${esc(t)}</strong></button>`).join('');
    $$('.theme-chip').forEach(btn => btn.addEventListener('click',()=>showComparison(btn.dataset.theme,btn)));
  }

  function showComparison(theme, btn) {
    $$('.theme-chip').forEach(b=>b.classList.toggle('is-active',b===btn));
    const countryRows=[];
    Object.keys(DATA.countryMeta).forEach(zh => {
      const matches = remindersFor(zh).filter(r => r.category===theme || (theme==='法規'&&r.nature==='法規'));
      if (!matches.length) return;
      const sorted = [...matches].sort((a,b)=>priorityScore(b)-priorityScore(a));
      countryRows.push({zh, top: sorted[0], count: matches.length});
    });
    const panel=$('#comparison-panel');
    panel.hidden=false;
    panel.innerHTML=`<div class="comparison-head"><div><p class="eyebrow">CROSS-COUNTRY NOTE</p><h3>${DATA.iconByCategory[theme]||'✦'} ${esc(theme)}，不同國家怎麼做？</h3></div><span>${countryRows.length} 個國家／地區有相關提醒</span></div><div class="comparison-list">${countryRows.length?countryRows.map(({zh,top,count})=>`<button class="comparison-item comparison-button" data-country="${esc(zh)}"><div class="comparison-country"><strong>${getMeta(zh).flag} ${esc(zh)}</strong><small>${count} 則相關提醒</small></div><span class="comparison-level">${esc(top.level)}</span><p>${esc(top.summary)}</p><span class="comparison-more">打開快速手札 →</span></button>`).join(''):'<div class="country-placeholder">目前尚未整理這個情境。</div>'}</div>`;
    $$('.comparison-button',panel).forEach(x=>x.addEventListener('click',()=>openDrawer(x.dataset.country)));
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function renderCountryPage(slug) {
    const zh = DATA.slugToName[slug];
    if (!zh) { location.hash='#/'; return; }
    const meta=getMeta(zh), sum=summaryFor(zh), rows=remindersFor(zh);
    const featuredForMeta = quickItems(zh);
    const description = featuredForMeta[0]?.summary ? `${zh}旅行前先看：${featuredForMeta[0].summary} 共整理 ${sum.total} 則習俗、禮儀、禁忌與旅遊法規提醒。` : `${zh}旅行文化、禮儀、禁忌與旅遊法規快速手札。`;
    setPageMeta(`${zh}旅行文化手札｜入境隨俗手札`, description);
    $('#home-view').hidden=true; $('.site-footer').hidden=true;
    const page=$('#country-page'); page.hidden=false;
    const order = themes;
    const categories=[...new Set(rows.map(r=>r.category))].sort((a,b)=>{
      const ai=order.indexOf(a), bi=order.indexOf(b);
      return (ai<0?999:ai)-(bi<0?999:bi);
    });
    const featured = featuredForMeta;
    const lastUpdated = rows.map(r=>r.updatedAt).filter(Boolean).sort().at(-1) || '';
    const nav=categories.length?`<button data-scroll-id="country-essentials">✦ 精選 ${featured.length} 件</button>` + categories.map(c=>`<button data-scroll-cat="${esc(c)}">${DATA.iconByCategory[c]||'✦'} ${esc(c)}</button>`).join(''):'<span class="tooltip-empty">完整資料同步中</span>';

    const cardFor = (r,i) => `
      <article class="reminder-card level-${levelClass(r.level)} ${r.nature==='法規'?'is-law-card':''}" data-category="${esc(r.category)}" id="reminder-${i}">
        <div class="reminder-top"><span>${DATA.iconByCategory[r.category]||'✦'} ${esc(r.category)}${r.region?` · ${esc(r.region)}`:''}</span><span>${esc(r.level)} · ${esc(r.nature)}</span></div>
        <h3>${esc(r.summary)}</h3>
        <p class="reminder-advice"><strong>我應該怎麼做：</strong>${esc(r.advice)}</p>
        ${r.detail?`<details class="reminder-detail"><summary>為什麼？看完整說明</summary><p>${esc(r.detail)}</p>${safeUrl(r.sourceUrl)?`<div class="source-row"><a href="${esc(safeUrl(r.sourceUrl))}" target="_blank" rel="noopener noreferrer">官方／主要來源：${esc(cleanSourceName(r.sourceName||'查看來源'))} ↗</a>${r.updatedAt?`<span>更新 ${esc(r.updatedAt)}</span>`:''}</div>`:''}</details>`:''}
      </article>`;

    const featuredHtml = featured.length ? featured.map((r,n)=>{
      const i=rows.indexOf(r);
      return `<button class="essential-card level-${levelClass(r.level)}" data-target-reminder="reminder-${i}"><span class="essential-number">0${n+1}</span><span class="essential-meta">${DATA.iconByCategory[r.category]||'✦'} ${esc(r.category)} · ${esc(r.level)}</span><strong>${esc(r.summary)}</strong><small>${esc(r.advice)}</small><em>看詳細 →</em></button>`;
    }).join('') : '';

    const groupedHtml = categories.map(c=>{
      const indexed = rows.map((r,i)=>({r,i})).filter(x=>x.r.category===c);
      return `<section class="category-section" data-category-section="${esc(c)}"><div class="category-section-head"><div><span>${DATA.iconByCategory[c]||'✦'}</span><h3>${esc(c)}</h3></div><small>${indexed.length} 則</small></div><div class="reminder-stack">${indexed.map(x=>cardFor(x.r,x.i)).join('')}</div></section>`;
    }).join('');

    page.innerHTML=`<div class="country-page-inner">
      <button class="back-link" data-home>← 回世界地圖</button>
      <section class="country-cover">
        <div><span class="flag">${meta.flag}</span><h1>${esc(zh)}</h1><div class="english">${esc(meta.en)}</div></div>
        <div class="country-cover-meta"><span class="count-badge">${sum.total} 則已整理提醒${sum.law?` · ⚖️ ${sum.law} 則法規`:''}</span>${lastUpdated?`<span class="updated-badge">資料更新 ${esc(lastUpdated)}</span>`:''}</div>
      </section>
      <div class="country-main">
        <aside class="country-sidebar"><h3>這趟旅行想先看什麼？</h3><nav class="category-nav">${nav}</nav><p class="sidebar-note">文化習慣與法律規定會分開標示；「不禮貌」不等於「違法」。</p></aside>
        <section class="country-content">
          <section class="country-essentials" id="country-essentials"><p class="eyebrow">BEFORE YOU GO</p><h2>出發前先記住這 ${featured.length} 件事</h2><p class="content-order-note">先用 30 秒掃過重點；點「看詳細」會跳到完整手札裡的對應說明。</p><div class="essential-grid">${featuredHtml}</div></section>
          <section class="full-handbook"><div class="handbook-heading"><div><p class="eyebrow">FULL NOTEBOOK</p><h2>完整${esc(zh)}手札</h2></div><span>${rows.length} 則內容 · ${categories.length} 個情境</span></div>${groupedHtml}</section>
        </section>
      </div>
    </div>`;
    $('[data-home]',page).addEventListener('click',()=>{location.hash='#/';});
    $$('[data-scroll-id]',page).forEach(b=>b.addEventListener('click',()=>{$(`#${CSS.escape(b.dataset.scrollId)}`,page)?.scrollIntoView({behavior:'smooth',block:'start'});}));
    $$('[data-scroll-cat]',page).forEach(b=>b.addEventListener('click',()=>{$(`[data-category-section="${CSS.escape(b.dataset.scrollCat)}"]`,page)?.scrollIntoView({behavior:'smooth',block:'start'});}));
    $$('[data-target-reminder]',page).forEach(b=>b.addEventListener('click',()=>{$(`#${CSS.escape(b.dataset.targetReminder)}`,page)?.scrollIntoView({behavior:'smooth',block:'center'});}));
    window.scrollTo({top:0,behavior:'auto'});
  }

  function renderHome() {
    setPageMeta(HOME_TITLE, HOME_DESCRIPTION);
    $('#home-view').hidden=false; $('.site-footer').hidden=false; $('#country-page').hidden=true; $('#country-page').innerHTML='';
  }
  function handleRoute() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/country\/(.+)$/);
    if (m) { renderCountryPage(m[1]); return; }
    renderHome();
    const anchor = hash.match(/^#(explore|themes|about)$/)?.[1];
    if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({behavior:'auto',block:'start'}));
    else if (hash === '#/' || hash === '#') window.scrollTo({top:0,behavior:'auto'});
  }
  window.addEventListener('hashchange',handleRoute);
  $('.brand')?.addEventListener('click', () => { if ((location.hash || '#/') === '#/') window.scrollTo({top:0,behavior:'smooth'}); });

  const totalCountries = Object.values(DATA.summaries).filter(Boolean).length;
  const totalReminders = Object.values(DATA.summaries).reduce((sum, item) => sum + (item?.total || 0), 0);
  if ($('#stat-countries')) $('#stat-countries').textContent = totalCountries;
  if ($('#stat-reminders')) $('#stat-reminders').textContent = totalReminders;

  renderPopular();
  renderThemes();
  handleRoute();
  initMap();
})();
