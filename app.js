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
  const TOTAL_COUNTRIES = Object.values(DATA.summaries).filter(Boolean).length;
  const TOTAL_REMINDERS = Object.values(DATA.summaries).reduce((sum, item) => sum + (item?.total || 0), 0);
  const HOME_DESCRIPTION = `從世界地圖快速探索 ${TOTAL_COUNTRIES} 個國家與地區、${TOTAL_REMINDERS} 則習俗、禮儀、禁忌與重要旅遊法規提醒。`;
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
  let offsetY = 0;
  let minOffset = 0;
  let maxOffset = 0;
  let minOffsetY = 0;
  let maxOffsetY = 0;
  let dragging = false;
  let didDrag = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let velocity = 0;
  let velocityY = 0;
  let animationFrame = null;
  let previousFocus = null;
  let tooltipHideTimer = null;
  let zoom = 1;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 2.5;
  const ZOOM_STEP = .25;
  let pinching = false;
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  let pinchMapX = 0;
  let pinchMapY = 0;
  let pinchFocusX = 0;
  let pinchFocusY = 0;

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
    return `<div class="tooltip-title"><span class="flag">${meta.flag}</span><div><strong>${esc(zh)}</strong><small>${esc(meta.en)}</small></div></div><div class="tooltip-count">${sum.total} 則旅行文化提醒</div><div class="level-row">${levels}</div><button type="button" class="tooltip-cta" data-tooltip-open>點一下打開手札 →</button>`;
  }

  function showTooltip(evt, zh, fallbackName='') {
    clearTimeout(tooltipHideTimer);
    tooltip.dataset.country = zh || '';
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
    clearTimeout(tooltipHideTimer);
    tooltip.hidden = true;
    tooltip.removeAttribute('data-country');
    currentHover?.classList.remove('is-hovered');
    currentHover = null;
  }

  function scheduleTooltipHide() {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(hideTooltip, 180);
  }

  tooltip?.addEventListener('pointerenter', () => clearTimeout(tooltipHideTimer));
  tooltip?.addEventListener('pointerleave', scheduleTooltipHide);
  // The tooltip sits inside the draggable map viewport. Stop pointerdown here so
  // clicking its CTA does not start a map drag and hide the tooltip first.
  tooltip?.addEventListener('pointerdown', e => e.stopPropagation());
  tooltip?.addEventListener('click', e => {
    const button = e.target.closest('[data-tooltip-open]');
    if (!button) return;
    const zh = tooltip.dataset.country;
    if (zh && summaryFor(zh)) {
      openDrawer(zh);
      hideTooltip();
    }
  });

  function bindCountryNode(node, zh, fallbackName='') {
    const available = Boolean(zh && summaryFor(zh));
    node.addEventListener('pointerenter', e => {
      clearTimeout(tooltipHideTimer);
      if (dragging || pinching || e.pointerType === 'touch' || window.matchMedia('(hover: none)').matches) return;
      currentHover?.classList.remove('is-hovered');
      currentHover = node;
      node.classList.add('is-hovered');
      showTooltip(e, zh, fallbackName);
    });
    node.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') moveTooltip(e); });
    node.addEventListener('pointerleave', scheduleTooltipHide);
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
    const viewportH = viewport.clientHeight;
    const trackW = track.offsetWidth * zoom;
    const trackH = track.offsetHeight * zoom;
    maxOffset = 0;
    minOffset = Math.min(0, viewportW - trackW);
    maxOffsetY = 0;
    minOffsetY = Math.min(0, viewportH - trackH);
    offsetX = Math.min(maxOffset, Math.max(minOffset, offsetX));
    offsetY = Math.min(maxOffsetY, Math.max(minOffsetY, offsetY));
    viewport.classList.toggle('is-zoomed', zoom > MIN_ZOOM + .001);
    applyOffset();
  }

  function centerInitialMap() {
    const centerBias = window.innerWidth < 700 ? .52 : .38;
    offsetX = minOffset * centerBias;
    offsetY = 0;
    applyOffset();
  }

  function applyOffset() { track.style.transform = `translate3d(${offsetX}px,${offsetY}px,0) scale(${zoom})`; }

  function updateZoomUI() {
    const label = $('#map-zoom-label');
    const out = $('#map-zoom-out');
    const inn = $('#map-zoom-in');
    if (label) label.textContent = `${Math.round(zoom * 100)}%`;
    if (out) out.disabled = zoom <= MIN_ZOOM + .001;
    if (inn) inn.disabled = zoom >= MAX_ZOOM - .001;
  }

  function setZoom(nextZoom, focusX = viewport.clientWidth / 2, focusY = viewport.clientHeight / 2) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    if (Math.abs(clamped - zoom) < .001) return;
    cancelAnimationFrame(animationFrame);
    hideTooltip();
    const mapX = (focusX - offsetX) / zoom;
    const mapY = (focusY - offsetY) / zoom;
    zoom = clamped;
    offsetX = focusX - mapX * zoom;
    offsetY = focusY - mapY * zoom;
    updateBounds();
    updateZoomUI();
  }

  function resistedAxis(next, min, max) {
    const resistance = .24;
    if (next > max) return max + (next-max)*resistance;
    if (next < min) return min + (next-min)*resistance;
    return next;
  }

  function settle() {
    cancelAnimationFrame(animationFrame);
    const tick = () => {
      velocity *= .91;
      velocityY *= .91;
      let nextX = offsetX + velocity;
      let nextY = offsetY + velocityY;
      if (nextX > maxOffset || nextX < minOffset) velocity *= .65;
      if (nextY > maxOffsetY || nextY < minOffsetY) velocityY *= .65;
      offsetX = resistedAxis(nextX, minOffset, maxOffset);
      offsetY = resistedAxis(nextY, minOffsetY, maxOffsetY);
      if (Math.abs(velocity) < .12 && Math.abs(velocityY) < .12) {
        const targetX = Math.min(maxOffset, Math.max(minOffset, offsetX));
        const targetY = Math.min(maxOffsetY, Math.max(minOffsetY, offsetY));
        offsetX += (targetX - offsetX) * .2;
        offsetY += (targetY - offsetY) * .2;
        applyOffset();
        if (Math.abs(targetX-offsetX) > .25 || Math.abs(targetY-offsetY) > .25) animationFrame = requestAnimationFrame(tick);
        else { offsetX = targetX; offsetY = targetY; applyOffset(); }
        return;
      }
      applyOffset();
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }

  viewport.addEventListener('pointerdown', e => {
    if (pinching) return;
    if (e.target.closest?.('#country-tooltip, button, a, summary')) return;
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; didDrag = false; startX = lastX = e.clientX; startY = lastY = e.clientY; velocity = 0; velocityY = 0;
    viewport.classList.add('is-dragging'); viewport.setPointerCapture?.(e.pointerId); hideTooltip(); cancelAnimationFrame(animationFrame);
  });
  viewport.addEventListener('pointermove', e => {
    if (!dragging || pinching) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.hypot(e.clientX-startX, e.clientY-startY) > 5) didDrag = true;
    velocity = dx;
    velocityY = zoom > MIN_ZOOM + .001 ? dy : 0;
    offsetX = resistedAxis(offsetX + dx, minOffset, maxOffset);
    if (zoom > MIN_ZOOM + .001) offsetY = resistedAxis(offsetY + dy, minOffsetY, maxOffsetY);
    lastX = e.clientX;
    lastY = e.clientY;
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
  window.addEventListener('resize', () => { updateBounds(); updateZoomUI(); });

  const touchDistance = touches => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };
  viewport.addEventListener('touchstart', e => {
    if (e.touches.length !== 2) return;
    pinching = true;
    dragging = false;
    didDrag = true;
    viewport.classList.remove('is-dragging');
    cancelAnimationFrame(animationFrame);
    hideTooltip();
    pinchStartDistance = touchDistance(e.touches);
    pinchStartZoom = zoom;
    const rect = viewport.getBoundingClientRect();
    pinchFocusX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
    pinchFocusY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
    pinchMapX = (pinchFocusX - offsetX) / zoom;
    pinchMapY = (pinchFocusY - offsetY) / zoom;
  }, {passive:true});
  viewport.addEventListener('touchmove', e => {
    if (!pinching || e.touches.length !== 2) return;
    e.preventDefault();
    const distance = touchDistance(e.touches);
    if (!pinchStartDistance) return;
    const rect = viewport.getBoundingClientRect();
    const focusX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
    const focusY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (distance / pinchStartDistance)));
    offsetX = focusX - pinchMapX * zoom;
    offsetY = focusY - pinchMapY * zoom;
    updateBounds();
    updateZoomUI();
  }, {passive:false});
  viewport.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      pinching = false;
      pinchStartDistance = 0;
      setTimeout(() => { didDrag = false; }, 80);
    }
  }, {passive:true});

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
  $('#map-zoom-out')?.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
  $('#map-zoom-in')?.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
  updateZoomUI();
  viewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeMap(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudgeMap(-1); }
    if (zoom > MIN_ZOOM + .001 && e.key === 'ArrowUp') { e.preventDefault(); offsetY = Math.min(maxOffsetY, offsetY + 90); applyOffset(); }
    if (zoom > MIN_ZOOM + .001 && e.key === 'ArrowDown') { e.preventDefault(); offsetY = Math.max(minOffsetY, offsetY - 90); applyOffset(); }
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

  if ($('#stat-countries')) $('#stat-countries').textContent = TOTAL_COUNTRIES;
  if ($('#stat-reminders')) $('#stat-reminders').textContent = TOTAL_REMINDERS;

  renderPopular();
  renderThemes();
  handleRoute();
  initMap();
})();
