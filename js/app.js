/**
 * AI Hub · 主交互
 *  - 一级 Tab 切换 / 搜索筛选 / 卡片渲染
 *  - 学术板块支持二级 Tab（搜索/追踪/门户/期刊）
 *  - 卡片点击 → 打开官网
 *  - 期刊卡片 → IF 徽章 + 直达最新文章
 *  - "安装方法"按钮 → 弹出安装/订阅说明
 *  - 安装说明一键复制
 */
(function () {
  'use strict';

  const DATA = window.AI_HUB_DATA;
  if (!DATA) {
    console.error('[AI Hub] data.js 未加载');
    return;
  }

  // ===== 状态 =====
  const state = {
    activeCategory: 'models',
    activeSubTab: 'all',
    keyword: '',
    activeTag: null,
  };

  // ===== DOM 引用 =====
  const $tabs         = document.getElementById('tabs');
  const $subTabs      = document.getElementById('subTabs');
  const $grid         = document.getElementById('grid');
  const $search       = document.getElementById('searchInput');
  const $clearBtn     = document.getElementById('clearSearch');
  const $empty        = document.getElementById('emptyState');
  const $stats        = document.getElementById('headerStats');
  const $modal        = document.getElementById('modal');
  const $modalBack    = document.getElementById('modalBackdrop');
  const $modalClose   = document.getElementById('modalClose');
  const $modalEmoji   = document.getElementById('modalEmoji');
  const $modalName    = document.getElementById('modalName');
  const $modalDesc    = document.getElementById('modalDesc');
  const $modalUrl     = document.getElementById('modalUrl');
  const $modalInstall = document.getElementById('modalInstall');
  const $modalOpen    = document.getElementById('modalOpen');
  const $modalCopy    = document.getElementById('modalCopy');

  // ===== 工具 =====
  function fmtNumber(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getList(category, subTab) {
    let list = (DATA[category] || []).slice();
    // 学术板块：按 type 过滤
    if (category === 'academic' && subTab && subTab !== 'all') {
      list = list.filter(it => it.type === subTab);
    }
    return list.sort((a, b) => {
      // 期刊按 IF 降序
      if (category === 'academic') {
        const va = parseFloat(a.if) || 0;
        const vb = parseFloat(b.if) || 0;
        if (vb !== va) return vb - va;
      }
      const da = a.downloads != null ? a.downloads : a.hot != null ? a.hot : 0;
      const db = b.downloads != null ? b.downloads : b.hot != null ? b.hot : 0;
      return db - da;
    });
  }

  function matchKeyword(item, kw) {
    if (!kw) return true;
    const haystack = [
      item.name, item.nameEn, item.desc, item.url, item.publisher, item.issn,
      ...(item.tags || []),
    ].join(' ').toLowerCase();
    return haystack.includes(kw.toLowerCase());
  }

  // ===== 头部统计 =====
  function renderStats() {
    const total = Object.keys(DATA.categories).reduce(
      (s, k) => s + (DATA[k]?.length || 0), 0
    );
    $stats.innerHTML = `
      <div class="stat-pill"><span class="num">${total}</span><span class="lbl">资源总数</span></div>
      <div class="stat-pill"><span class="num">${DATA.categories.length}</span><span class="lbl">分类</span></div>
    `;
  }

  // ===== 一级 Tabs =====
  function renderTabs() {
    $tabs.innerHTML = Object.values(DATA.categories)
      .map(cat => {
        const count = (DATA[cat.key] || []).length;
        const isActive = state.activeCategory === cat.key;
        return `
          <button class="tab ${isActive ? 'active' : ''}" data-cat="${cat.key}" role="tab">
            <span>${cat.icon}</span>
            <span>${cat.label}</span>
            <span class="count">${count}</span>
          </button>
        `;
      })
      .join('');

    $tabs.querySelectorAll('.tab').forEach(el => {
      el.addEventListener('click', () => {
        state.activeCategory = el.dataset.cat;
        state.activeTag = null;
        state.activeSubTab = 'all';
        renderTabs();
        renderSubTabs();
        renderGrid();
      });
    });
  }

  // ===== 二级 Sub Tabs（学术板块专用） =====
  function renderSubTabs() {
    const cat = DATA.categories[state.activeCategory];
    if (!cat || !cat.hasSubTabs || !cat.subTabs) {
      $subTabs.classList.add('hidden');
      $subTabs.innerHTML = '';
      return;
    }
    $subTabs.classList.remove('hidden');
    $subTabs.innerHTML = cat.subTabs
      .map(st => {
        const isActive = state.activeSubTab === st.key;
        const count = st.key === 'all'
          ? (DATA[cat.key] || []).length
          : (DATA[cat.key] || []).filter(it => it.type === st.key).length;
        return `
          <button class="sub-tab ${isActive ? 'active' : ''}" data-sub="${st.key}">
            <span>${st.icon}</span>
            <span>${st.label}</span>
            <span class="count">${count}</span>
          </button>
        `;
      })
      .join('');

    $subTabs.querySelectorAll('.sub-tab').forEach(el => {
      el.addEventListener('click', () => {
        state.activeSubTab = el.dataset.sub;
        state.activeTag = null;
        renderSubTabs();
        renderGrid();
      });
    });
  }

  // ===== 卡片 =====
  function renderGrid() {
    const list = getList(state.activeCategory, state.activeSubTab).filter(item => {
      if (!matchKeyword(item, state.keyword)) return false;
      if (state.activeTag && !(item.tags || []).includes(state.activeTag)) return false;
      return true;
    });

    if (list.length === 0) {
      $grid.innerHTML = '';
      $empty.classList.remove('hidden');
      return;
    }
    $empty.classList.add('hidden');

    $grid.innerHTML = list
      .map((item, idx) => renderCard(item, idx))
      .join('');

    bindCardEvents();
  }

  function renderCard(item, idx) {
    const rank = idx + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const tags = (item.tags || [])
      .map(t => `<span class="tag ${state.activeTag === t ? 'tag-active' : ''}" data-tag="${escapeHTML(t)}">${escapeHTML(t)}</span>`)
      .join('');
    const isJournal = item.type === 'journal';
    const cardClass = `card ${rankClass} ${isJournal ? 'card-journal' : ''}`;

    // 期刊专属：IF 徽章 / 出版方 / 直达最新
    let metaHTML = '';
    if (isJournal) {
      const ifBadge = item.if
        ? `<span class="if-badge" title="影响影子 (IF)">IF ${escapeHTML(item.if)}</span>`
        : '';
      const jcrBadge = item.jcr
        ? `<span class="jcr-badge jcr-${escapeHTML(item.jcr.toLowerCase())}">${escapeHTML(item.jcr)}</span>`
        : '';
      const publisher = item.publisher
        ? `<span class="pub">${escapeHTML(item.publisher)}</span>`
        : '';
      metaHTML = `<div class="journal-meta">${ifBadge}${jcrBadge}${publisher}</div>`;
    }

    // 底部统计
    let count = '';
    if (item.downloads != null) {
      count = '⬇ ' + fmtNumber(item.downloads) + ' 下载';
    } else if (item.hot != null) {
      count = '🔥 热门';
    } else if (isJournal && item.if) {
      count = '📊 IF ' + escapeHTML(item.if);
    }

    // 按钮文本：期刊 = "最新文章 →"，其他 = "安装方法 →"
    const btnText = isJournal ? '📰 最新文章' : '安装方法 →';
    const btnClass = isJournal ? 'btn-install btn-latest' : 'btn-install';

    return `
      <article class="${cardClass}" style="--card-bg:${escapeHTML(item.color || '#7c5cff')}22; --card-glow:${escapeHTML(item.color || '#7c5cff')}">
        <span class="rank">#${rank}</span>
        <div class="icon" style="background:${escapeHTML(item.color || '#7c5cff')}33">${escapeHTML(item.icon || '📦')}</div>
        <h3 class="card-name">${escapeHTML(item.name)}</h3>
        <p class="card-name-en">${escapeHTML(item.nameEn || '')}</p>
        ${metaHTML}
        <p class="card-desc">${escapeHTML(item.desc || '')}</p>
        <div class="tags">${tags}</div>
        <div class="card-foot">
          <span class="dl">${count || '&nbsp;'}</span>
          <button class="${btnClass}" data-install="${escapeHTML(item.name)}">${btnText}</button>
        </div>
      </article>
    `;
  }

  function bindCardEvents() {
    // 点击卡片（除按钮和标签）→ 期刊跳最新，其他跳官网
    $grid.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-install')) return;
        if (e.target.closest('.tag')) return;
        const name = card.querySelector('.card-name').textContent;
        const item = findItem(state.activeCategory, name);
        if (!item) return;
        const target = item.type === 'journal' && item.latestUrl ? item.latestUrl : item.url;
        if (target) window.open(target, '_blank', 'noopener,noreferrer');
      });
    });

    // 按钮：期刊 → 跳最新，其他 → 弹窗
    $grid.querySelectorAll('.btn-install').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = findItem(state.activeCategory, btn.dataset.install);
        if (!item) return;
        if (item.type === 'journal') {
          const target = item.latestUrl || item.url;
          if (target) window.open(target, '_blank', 'noopener,noreferrer');
        } else {
          openModal(item);
        }
      });
    });

    // 标签筛选
    $grid.querySelectorAll('.tag').forEach(t => {
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = t.dataset.tag;
        state.activeTag = state.activeTag === tag ? null : tag;
        renderGrid();
      });
    });
  }

  function findItem(category, name) {
    return (DATA[category] || []).find(it => it.name === name);
  }

  // ===== 搜索 =====
  function bindSearch() {
    let timer = null;
    $search.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.keyword = e.target.value.trim();
        $clearBtn.classList.toggle('visible', !!state.keyword);
        renderGrid();
      }, 120);
    });

    $clearBtn.addEventListener('click', () => {
      $search.value = '';
      state.keyword = '';
      $clearBtn.classList.remove('visible');
      renderGrid();
      $search.focus();
    });
  }

  // ===== Modal =====
  function openModal(item) {
    if (!item) return;
    $modalEmoji.textContent = item.icon || '📦';
    $modalName.textContent  = item.name;
    $modalDesc.textContent  = item.desc || '';
    $modalUrl.href          = item.url;
    $modalUrl.textContent   = item.url;
    $modalOpen.href         = item.url;
    $modalInstall.textContent = item.install || '暂无说明';
    $modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function bindModal() {
    $modalClose.addEventListener('click', closeModal);
    $modalBack.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$modal.classList.contains('hidden')) closeModal();
    });
    $modalCopy.addEventListener('click', async () => {
      const text = $modalInstall.textContent;
      try {
        await navigator.clipboard.writeText(text);
        const original = $modalCopy.textContent;
        $modalCopy.textContent = '✓ 已复制';
        setTimeout(() => { $modalCopy.textContent = original; }, 1500);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta);
        $modalCopy.textContent = '✓ 已复制';
        setTimeout(() => { $modalCopy.textContent = '复制说明'; }, 1500);
      }
    });
  }

  // ===== 启动 =====
  function init() {
    renderStats();
    renderTabs();
    renderSubTabs();
    renderGrid();
    bindSearch();
    bindModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
