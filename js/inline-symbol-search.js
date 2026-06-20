/**
 * DarkPulsr — Top-bar inline symbol search (catalog / toolbar symbols)
 */
(function () {
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  class InlineSymbolSearch {
    constructor(root, { onSelect, getActiveKey } = {}) {
      this.root = root;
      this.input = root.querySelector('[data-inline-search-input]');
      this.dropdown = root.querySelector('[data-inline-search-dropdown]');
      this.onSelect = onSelect || (() => {});
      this.getActiveKey = getActiveKey || (() => 'BTC');
      this.items = [];
      this.activeIndex = -1;
      this.isOpen = false;
      this.currentKey = 'BTC';

      if (!this.input || !this.dropdown) return;
      this._bindEvents();
    }

    setDisplay(symbolKey, label) {
      this.currentKey = symbolKey;
      if (document.activeElement !== this.input) {
        this.input.value = label || symbolKey;
        this.input.dataset.currentKey = symbolKey;
      }
    }

    _bindEvents() {
      this.input.addEventListener('focus', () => {
        this.isOpen = true;
        this.input.select();
        this._refreshResults();
        this.dropdown.classList.remove('hidden');
      });

      this.input.addEventListener('input', () => {
        this.isOpen = true;
        this.activeIndex = -1;
        this._refreshResults();
        this.dropdown.classList.remove('hidden');
      });

      this.input.addEventListener('keydown', (event) => this._onKeydown(event));

      document.addEventListener('mousedown', (event) => {
        if (!this.root.contains(event.target)) this._close();
      });
    }

    _searchApi() {
      return window.DarkPulsrSymbolSearch || {};
    }

    _refreshResults() {
      const q = this.input.value.trim();
      const api = this._searchApi();
      this.items = api.searchCatalog ? api.searchCatalog(q, 'all') : [];
      if (this.activeIndex < 0 && this.items.length) this.activeIndex = 0;
      this._renderResults(q);
    }

    _renderResults(query) {
      if (!this.items.length) {
        this.dropdown.innerHTML = '<div class="tv-inline-search-empty">No match — try NIFTY, CRUDE, NAT GAS, EURUSD</div>';
        return;
      }

      const max = query ? 40 : 60;
      const slice = this.items.slice(0, max);
      this.dropdown.innerHTML = slice.map((item, index) => {
        const active = index === this.activeIndex ? ' is-active' : '';
        const tag = item.shortLabel || item.chartKey;
        return `
          <button type="button" class="tv-inline-search-row${active}" data-row-index="${index}">
            <span class="tv-inline-search-code">${escapeHtml(tag)}</span>
            <span class="tv-inline-search-name">${escapeHtml(item.displayName || item.chartKey)}</span>
            <span class="tv-inline-search-exchange">${escapeHtml(item.exchange || '')}</span>
          </button>
        `;
      }).join('');

      this.dropdown.querySelectorAll('.tv-inline-search-row').forEach((row) => {
        row.addEventListener('mouseenter', () => {
          this.activeIndex = Number(row.dataset.rowIndex);
          this.dropdown.querySelectorAll('.tv-inline-search-row').forEach((r) => r.classList.remove('is-active'));
          row.classList.add('is-active');
        });
        row.addEventListener('mousedown', (event) => {
          event.preventDefault();
          const index = Number(row.dataset.rowIndex);
          const item = slice[index];
          if (item) this._pick(item);
        });
      });
    }

    _onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this._close();
        this.input.blur();
        return;
      }

      if (!this.isOpen || !this.items.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, Math.min(this.items.length, 40) - 1);
        this._refreshResults();
        this._scrollActive();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this._refreshResults();
        this._scrollActive();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const idx = this.activeIndex >= 0 ? this.activeIndex : 0;
        const item = this.items[idx];
        if (item) this._pick(item);
      }
    }

    _scrollActive() {
      const row = this.dropdown.querySelector('.tv-inline-search-row.is-active');
      row?.scrollIntoView({ block: 'nearest' });
    }

    _pick(item) {
      this.currentKey = item.chartKey;
      this.input.value = item.displayName || item.shortLabel || item.chartKey;
      this.input.dataset.currentKey = item.chartKey;
      this._close();
      this.onSelect(item);
    }

    _close() {
      this.isOpen = false;
      this.activeIndex = -1;
      this.dropdown.classList.add('hidden');
      const cfg = window.UniversalMarketData?.resolve(this.currentKey || this.getActiveKey());
      this.input.value = cfg?.label || cfg?.shortLabel || this.currentKey || '';
      this.input.dataset.currentKey = this.currentKey || this.getActiveKey();
    }
  }

  window.InlineSymbolSearch = InlineSymbolSearch;
})();
