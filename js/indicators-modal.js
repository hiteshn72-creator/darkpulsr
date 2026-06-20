/**
 * DarkPulsr — Indicators modal (TradingView-style)
 */
(function () {
  const FAVORITES_KEY = 'darkpulsr-indicator-favorites';

  const SIDEBAR_ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 12h2"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 20V10M12 20V4M18 20v-6"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M7 4h10v16l-5-3-5 3V4z"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 16l5-5 4 3 7-8"/><path d="M17 6h3v3"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 22c4-2 6-5 6-9 0-3-2-5-3-7-1 2-2 3-3 3s-2-2-3-4c-2 3-5 6-5 10 0 4 2 6 8 7z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  };

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function debounce(fn, ms) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch (_) { /* ignore */ }
  }

  class IndicatorsModal {
    constructor({ onSelect } = {}) {
      this.onSelect = onSelect || (() => {});
      this.isOpen = false;
      this.activeSidebar = 'technicals';
      this.activeTab = 'indicators';
      this.query = '';
      this.favorites = loadFavorites();
      this.activeIndex = 0;
      this.displayItems = [];
      this._boundKeydown = this._onKeydown.bind(this);

      this.root = document.createElement('div');
      this.root.id = 'indicators-modal';
      this.root.className = 'indicators-modal hidden';
      this.root.setAttribute('role', 'dialog');
      this.root.setAttribute('aria-modal', 'true');
      this.root.setAttribute('aria-labelledby', 'indicators-modal-title');
      this.root.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.root);

      this._renderShell();
      this._bind();
    }

    _renderShell() {
      const catalog = window.IndicatorsCatalog || { sidebar: [], tabs: [] };

      this.root.innerHTML = `
        <div class="indicators-modal-backdrop" data-ind-close></div>
        <div class="indicators-modal-panel">
          <header class="indicators-modal-header">
            <h2 id="indicators-modal-title" class="indicators-modal-title">Indicators, metrics, and strategies</h2>
            <button type="button" class="indicators-modal-close" data-ind-close aria-label="Close">×</button>
          </header>

          <div class="indicators-modal-search-wrap">
            <svg class="indicators-modal-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-4-4"></path>
            </svg>
            <input type="search" class="indicators-modal-search" data-ind-search placeholder="Search" autocomplete="off" spellcheck="false" />
          </div>

          <div class="indicators-modal-body">
            <aside class="indicators-modal-sidebar" data-ind-sidebar>
              ${this._renderSidebar(catalog.sidebar)}
            </aside>

            <section class="indicators-modal-main">
              <div class="indicators-modal-tabs" data-ind-tabs>
                ${this._renderTabs(catalog.tabs)}
              </div>
              <div class="indicators-modal-list-head">Script name</div>
              <div class="indicators-modal-list" data-ind-list role="listbox"></div>
              <p class="indicators-modal-empty hidden" data-ind-empty>No indicators found</p>
            </section>
          </div>
        </div>
      `;

      this.els = {
        search: this.root.querySelector('[data-ind-search]'),
        list: this.root.querySelector('[data-ind-list]'),
        empty: this.root.querySelector('[data-ind-empty]'),
        sidebar: this.root.querySelector('[data-ind-sidebar]'),
        tabs: this.root.querySelector('[data-ind-tabs]'),
      };
    }

    _renderSidebar(items) {
      let html = '';
      let lastSection = '';
      items.forEach((item) => {
        if (item.section !== lastSection) {
          html += `<div class="ind-sidebar-section">${escapeHtml(item.section)}</div>`;
          lastSection = item.section;
        }
        const disabled = item.disabled ? ' is-disabled' : '';
        const active = item.id === this.activeSidebar ? ' is-active' : '';
        html += `
          <button type="button" class="ind-sidebar-item${active}${disabled}" data-sidebar="${item.id}"${item.disabled ? ' disabled' : ''}>
            <span class="ind-sidebar-icon">${SIDEBAR_ICONS[item.icon] || ''}</span>
            <span>${escapeHtml(item.label)}</span>
          </button>
        `;
      });
      return html;
    }

    _renderTabs(tabs) {
      if (this.activeSidebar !== 'technicals') return '';
      return tabs.map((tab) => (
        `<button type="button" class="ind-tab${tab.id === this.activeTab ? ' is-active' : ''}" data-tab="${tab.id}">${escapeHtml(tab.label)}</button>`
      )).join('');
    }

    _bind() {
      this.root.addEventListener('click', (event) => {
        const close = event.target.closest('[data-ind-close]');
        if (close) {
          this.close();
          return;
        }

        const sidebarBtn = event.target.closest('[data-sidebar]');
        if (sidebarBtn && !sidebarBtn.disabled) {
          this.activeSidebar = sidebarBtn.dataset.sidebar;
          this.activeTab = 'indicators';
          this.activeIndex = 0;
          this._refreshSidebarAndTabs();
          this._renderList();
          return;
        }

        const tabBtn = event.target.closest('[data-tab]');
        if (tabBtn) {
          this.activeTab = tabBtn.dataset.tab;
          this.activeIndex = 0;
          this._refreshTabs();
          this._renderList();
          return;
        }

        const starBtn = event.target.closest('[data-ind-star]');
        if (starBtn) {
          event.stopPropagation();
          this._toggleFavorite(starBtn.dataset.indStar);
          this._renderList();
          return;
        }

        const row = event.target.closest('[data-ind-id]');
        if (row && !row.classList.contains('is-disabled')) {
          this._selectItem(row.dataset.indId);
        }
      });

      this.els.search?.addEventListener('input', debounce(() => {
        this.query = this.els.search.value.trim();
        this.activeIndex = 0;
        this._renderList();
      }, 200));
    }

    _refreshSidebarAndTabs() {
      const catalog = window.IndicatorsCatalog || { sidebar: [], tabs: [] };
      if (this.els.sidebar) {
        this.els.sidebar.innerHTML = this._renderSidebar(catalog.sidebar);
      }
      if (this.els.tabs) {
        this.els.tabs.innerHTML = this._renderTabs(catalog.tabs);
      }
    }

    _refreshTabs() {
      const catalog = window.IndicatorsCatalog || { tabs: [] };
      if (this.els.tabs) {
        this.els.tabs.innerHTML = this._renderTabs(catalog.tabs);
      }
    }

    _getItems() {
      const catalog = window.IndicatorsCatalog;
      if (!catalog) return [];

      if (this.activeSidebar !== 'technicals') {
        return [];
      }

      return catalog.getItemsForTab(this.activeTab, this.activeSidebar);
    }

    _filterItems(items) {
      const q = this.query.toLowerCase();
      if (!q) return items;
      return items.filter((item) => item.name.toLowerCase().includes(q));
    }

    _renderList() {
      const items = this._filterItems(this._getItems());
      this.displayItems = items;

      if (this.activeSidebar !== 'technicals') {
        this.els.list.innerHTML = `
          <div class="indicators-modal-placeholder">
            <p>${escapeHtml(this._sidebarLabel(this.activeSidebar))} — coming soon</p>
          </div>
        `;
        this.els.empty?.classList.add('hidden');
        return;
      }

      if (!items.length) {
        this.els.list.innerHTML = '';
        this.els.empty?.classList.remove('hidden');
        return;
      }

      this.els.empty?.classList.add('hidden');
      this.els.list.innerHTML = items.map((item, index) => {
        const fav = this.favorites.includes(item.id);
        const badge = item.badge
          ? `<span class="ind-badge ind-badge-${item.badge.toLowerCase()}">${escapeHtml(item.badge)}</span>`
          : '';
        const active = index === this.activeIndex ? ' is-active' : '';
        return `
          <button type="button" class="ind-list-row${active}" data-ind-id="${escapeHtml(item.id)}" data-row-index="${index}" role="option">
            <span class="ind-star${fav ? ' is-fav' : ''}" data-ind-star="${escapeHtml(item.id)}" title="Favorite">${fav ? '★' : '☆'}</span>
            <span class="ind-list-name">${escapeHtml(item.name)}</span>
            ${badge}
          </button>
        `;
      }).join('');
    }

    _sidebarLabel(id) {
      const item = window.IndicatorsCatalog?.sidebar?.find((s) => s.id === id);
      return item?.label || id;
    }

    _toggleFavorite(id) {
      if (this.favorites.includes(id)) {
        this.favorites = this.favorites.filter((f) => f !== id);
      } else {
        this.favorites = [id, ...this.favorites].slice(0, 50);
      }
      saveFavorites(this.favorites);
    }

    _selectItem(id) {
      const item = this.displayItems.find((i) => i.id === id) || { id, name: id };
      this.onSelect(item);
      this.close();
    }

    open() {
      this.isOpen = true;
      this.query = '';
      this.activeSidebar = 'technicals';
      this.activeTab = 'indicators';
      this.activeIndex = 0;
      this.favorites = loadFavorites();
      this.root.classList.remove('hidden');
      this.root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('indicators-modal-open');
      document.addEventListener('keydown', this._boundKeydown);
      if (this.els.search) this.els.search.value = '';
      this._refreshSidebarAndTabs();
      this._renderList();
      setTimeout(() => this.els.search?.focus(), 30);
    }

    close() {
      this.isOpen = false;
      this.root.classList.add('hidden');
      this.root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('indicators-modal-open');
      document.removeEventListener('keydown', this._boundKeydown);
    }

    _onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }
      if (!this.displayItems.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.displayItems.length - 1);
        this._renderList();
        this._scrollActive();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this._renderList();
        this._scrollActive();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = this.displayItems[this.activeIndex];
        if (item) this._selectItem(item.id);
      }
    }

    _scrollActive() {
      const row = this.els.list?.querySelector('.ind-list-row.is-active');
      row?.scrollIntoView({ block: 'nearest' });
    }
  }

  window.IndicatorsModal = IndicatorsModal;
})();
