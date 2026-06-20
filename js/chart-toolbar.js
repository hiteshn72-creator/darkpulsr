/**
 * DarkPulsr — Custom Chart Toolbar (Lightweight Charts companion)
 * TradingView-style horizontal toolbar · UI shell with placeholder handlers
 */
(function () {
  const TIMEFRAMES = [
    { id: '1m', label: '1m' },
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
    { id: '1h', label: '1H' },
    { id: '4h', label: '4H' },
    { id: '1d', label: 'D' },
    { id: '1w', label: 'W' },
    { id: '1M', label: 'M' },
  ];

  const INDICATORS = [
    { id: 'sma', name: 'Moving Average (SMA)', category: 'Popular' },
    { id: 'ema', name: 'Moving Average (EMA)', category: 'Popular' },
    { id: 'rsi', name: 'Relative Strength Index', category: 'Popular' },
    { id: 'macd', name: 'MACD', category: 'Popular' },
    { id: 'bb', name: 'Bollinger Bands', category: 'Popular' },
    { id: 'vwap', name: 'VWAP', category: 'Volume' },
    { id: 'atr', name: 'Average True Range', category: 'Volatility' },
    { id: 'stoch', name: 'Stochastic', category: 'Momentum' },
  ];

  const LAYOUTS = [
    { id: '1', label: '1 chart' },
    { id: '2h', label: '2 charts · horizontal' },
    { id: '2v', label: '2 charts · vertical' },
    { id: '4', label: '4 charts · grid' },
  ];

  const ICONS = {
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M12 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M20 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M6 12h2M16 12h2"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 109-9v4"/><path d="M3 7v5h5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 14H4V9"/><path d="M4 9a8 8 0 0113.5 5"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14h5v-5"/><path d="M20 9a8 8 0 00-13.5 5"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 4h10a1 1 0 011 1v15l-6-3-6 3V5a1 1 0 011-1z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>',
  };

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tfLabel(id) {
    return TIMEFRAMES.find((t) => t.id === id)?.label || id;
  }

  class ChartToolbar {
    constructor(root, options = {}) {
      if (!root) return;
      this.root = root;
      this.handlers = {
        onSymbolSelect: options.onSymbolSelect || (() => {}),
        onCompare: options.onCompare || (() => {}),
        onCompareRemove: options.onCompareRemove || (() => {}),
        onTimeframeChange: options.onTimeframeChange || (() => {}),
        onSettings: options.onSettings || (() => {}),
        onIndicatorAdd: options.onIndicatorAdd || (() => {}),
        onLayoutChange: options.onLayoutChange || (() => {}),
        onAlert: options.onAlert || (() => {}),
        onReplay: options.onReplay || (() => {}),
        onUndo: options.onUndo || (() => {}),
        onRedo: options.onRedo || (() => {}),
        onSave: options.onSave || (() => {}),
      };

      this.state = {
        symbol: 'BTC',
        symbolLabel: 'BTC/USDT',
        timeframe: '1h',
        layout: '1',
        indicators: [],
        compareSymbols: [],
        replayActive: false,
        canUndo: false,
        canRedo: false,
        statusText: 'Connecting…',
        ...(options.initialState || {}),
      };

      this.openMenu = null;
      this._render();
      this._bind();
      this._syncUi();
    }

    getState() {
      return { ...this.state };
    }

    setState(partial) {
      this.state = { ...this.state, ...partial };
      this._syncUi();
    }

    _render() {
      this.root.innerHTML = `
        <div class="dp-chart-toolbar" role="toolbar" aria-label="Chart toolbar">
          <div class="dp-toolbar-section dp-toolbar-left">
            <button type="button" class="dp-toolbar-symbol" data-action="symbol" title="Change symbol">
              <span class="dp-toolbar-symbol-label" data-tb-symbol-label>BTC/USDT</span>
              <span class="dp-toolbar-icon dp-toolbar-icon-sm">${ICONS.chevronDown}</span>
            </button>
            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-icon" data-action="compare" title="Compare symbol — overlay on chart">
              <span class="dp-toolbar-icon">${ICONS.plus}</span>
            </button>
            <div class="dp-toolbar-compare-wrap hidden" data-tb-compare-wrap aria-label="Compare symbols"></div>
          </div>

          <div class="dp-toolbar-section dp-toolbar-center">
            <div class="dp-toolbar-dropdown-wrap" data-dropdown="timeframe">
              <button type="button" class="dp-toolbar-btn dp-toolbar-btn-pill" data-action="timeframe-toggle" title="Timeframe">
                <span data-tb-timeframe>1H</span>
                <span class="dp-toolbar-icon dp-toolbar-icon-sm">${ICONS.chevronDown}</span>
              </button>
              <div class="dp-toolbar-menu hidden" data-menu="timeframe" role="menu">
                ${TIMEFRAMES.map((tf) => (
                  `<button type="button" class="dp-toolbar-menu-item" data-tf="${tf.id}" role="menuitem">${tf.label}</button>`
                )).join('')}
              </div>
            </div>

            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-icon" data-action="settings" title="Chart settings">
              <span class="dp-toolbar-icon">${ICONS.settings}</span>
            </button>

            <div class="dp-toolbar-dropdown-wrap" data-dropdown="indicators">
              <button type="button" class="dp-toolbar-btn dp-toolbar-btn-text" data-action="indicators-toggle" title="Indicators">
                <span class="dp-toolbar-icon dp-toolbar-icon-sm">${ICONS.chart}</span>
                <span>Indicators</span>
              </button>
              <div class="dp-toolbar-menu dp-toolbar-menu-wide hidden" data-menu="indicators" role="menu">
                <input type="search" class="dp-toolbar-menu-search" data-indicator-search placeholder="Search indicators…" />
                <div class="dp-toolbar-menu-list" data-indicator-list>
                  ${INDICATORS.map((ind) => (
                    `<button type="button" class="dp-toolbar-menu-item" data-indicator="${ind.id}" role="menuitem">
                      <span>${escapeHtml(ind.name)}</span>
                      <span class="dp-toolbar-menu-meta">${escapeHtml(ind.category)}</span>
                    </button>`
                  )).join('')}
                </div>
              </div>
            </div>

            <div class="dp-toolbar-dropdown-wrap" data-dropdown="layout">
              <button type="button" class="dp-toolbar-btn dp-toolbar-btn-icon" data-action="layout-toggle" title="Layout">
                <span class="dp-toolbar-icon">${ICONS.grid}</span>
              </button>
              <div class="dp-toolbar-menu hidden" data-menu="layout" role="menu">
                ${LAYOUTS.map((lay) => (
                  `<button type="button" class="dp-toolbar-menu-item" data-layout="${lay.id}" role="menuitem">${escapeHtml(lay.label)}</button>`
                )).join('')}
              </div>
            </div>

            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-text" data-action="alert" title="Add alert">
              <span class="dp-toolbar-icon dp-toolbar-icon-sm">${ICONS.bell}</span>
              <span>Alert</span>
            </button>

            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-text dp-toolbar-collapse" data-action="replay" title="Bar replay">
              <span class="dp-toolbar-icon dp-toolbar-icon-sm">${ICONS.replay}</span>
              <span>Replay</span>
            </button>
          </div>

          <div class="dp-toolbar-section dp-toolbar-right">
            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-icon dp-toolbar-collapse" data-action="undo" title="Undo" disabled>
              <span class="dp-toolbar-icon">${ICONS.undo}</span>
            </button>
            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-icon dp-toolbar-collapse" data-action="redo" title="Redo" disabled>
              <span class="dp-toolbar-icon">${ICONS.redo}</span>
            </button>

            <button type="button" class="dp-toolbar-btn dp-toolbar-btn-save" data-action="save" title="Save chart layout">
              <span class="dp-toolbar-icon dp-toolbar-icon-sm">${ICONS.bookmark}</span>
              <span>Save</span>
            </button>

            <div class="dp-toolbar-dropdown-wrap dp-toolbar-overflow" data-dropdown="overflow">
              <button type="button" class="dp-toolbar-btn dp-toolbar-btn-icon" data-action="overflow-toggle" title="More tools">
                <span class="dp-toolbar-icon">${ICONS.more}</span>
              </button>
              <div class="dp-toolbar-menu hidden" data-menu="overflow" role="menu">
                <button type="button" class="dp-toolbar-menu-item" data-overflow="replay" role="menuitem">Replay</button>
                <button type="button" class="dp-toolbar-menu-item" data-overflow="undo" role="menuitem">Undo</button>
                <button type="button" class="dp-toolbar-menu-item" data-overflow="redo" role="menuitem">Redo</button>
              </div>
            </div>

            <span class="dp-toolbar-status" data-tb-status>Connecting…</span>
          </div>
        </div>

        <div class="dp-toolbar-panel hidden" data-panel="settings" role="dialog" aria-label="Chart settings">
          <div class="dp-toolbar-panel-head">
            <strong>Chart settings</strong>
            <button type="button" class="dp-toolbar-panel-close" data-panel-close="settings" aria-label="Close">×</button>
          </div>
          <div class="dp-toolbar-panel-body">
            <p class="dp-toolbar-panel-note">Appearance options (candle colors, grid, background) — coming soon.</p>
            <label class="dp-toolbar-field"><span>Up candle</span><input type="color" value="#26a69a" disabled /></label>
            <label class="dp-toolbar-field"><span>Down candle</span><input type="color" value="#ef5350" disabled /></label>
            <label class="dp-toolbar-field"><span>Show grid</span><input type="checkbox" checked disabled /></label>
          </div>
        </div>

        <div class="dp-toolbar-panel hidden" data-panel="alert" role="dialog" aria-label="Price alert">
          <div class="dp-toolbar-panel-head">
            <strong>Price alert</strong>
            <button type="button" class="dp-toolbar-panel-close" data-panel-close="alert" aria-label="Close">×</button>
          </div>
          <div class="dp-toolbar-panel-body">
            <p class="dp-toolbar-panel-note">Set alert when price crosses a level — coming soon.</p>
            <label class="dp-toolbar-field"><span>Price</span><input type="number" placeholder="0.00" disabled /></label>
            <label class="dp-toolbar-field"><span>Condition</span>
              <select disabled><option>Crossing above</option><option>Crossing below</option></select>
            </label>
            <button type="button" class="dp-toolbar-panel-action" disabled>Create alert</button>
          </div>
        </div>
      `;

      this.els = {
        symbolLabel: this.root.querySelector('[data-tb-symbol-label]'),
        timeframe: this.root.querySelector('[data-tb-timeframe]'),
        status: this.root.querySelector('[data-tb-status]'),
        replayBtn: this.root.querySelector('[data-action="replay"]'),
        undoBtn: this.root.querySelector('[data-action="undo"]'),
        redoBtn: this.root.querySelector('[data-action="redo"]'),
        indicatorSearch: this.root.querySelector('[data-indicator-search]'),
        indicatorList: this.root.querySelector('[data-indicator-list]'),
        compareList: this.root.querySelector('[data-tb-compare-wrap]'),
      };
    }

    _bind() {
      this.root.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action], [data-tf], [data-indicator], [data-layout], [data-overflow], [data-panel-close]');
        if (!target) return;

        if (target.dataset.panelClose) {
          this._closePanel(target.dataset.panelClose);
          return;
        }

        const action = target.dataset.action;
        if (action === 'symbol') {
          this.handlers.onSymbolSelect(this.state);
          return;
        }
        if (action === 'compare') {
          this.handlers.onCompare(this.state);
          return;
        }
        if (action === 'compare-remove') {
          const key = target.dataset.compareKey;
          if (key) this.handlers.onCompareRemove(key, this.state);
          return;
        }
        if (action === 'timeframe-toggle') {
          this._toggleMenu('timeframe');
          return;
        }
        if (action === 'settings') {
          this._closeMenus();
          this.handlers.onSettings(this.state);
          this._openPanel('settings');
          return;
        }
        if (action === 'indicators-toggle') {
          this._toggleMenu('indicators');
          return;
        }
        if (action === 'layout-toggle') {
          this._toggleMenu('layout');
          return;
        }
        if (action === 'alert') {
          this._closeMenus();
          this.handlers.onAlert(this.state);
          this._openPanel('alert');
          return;
        }
        if (action === 'replay') {
          this._closeMenus();
          this.handlers.onReplay(this.state);
          this.setState({ replayActive: !this.state.replayActive });
          return;
        }
        if (action === 'undo') {
          this.handlers.onUndo(this.state);
          return;
        }
        if (action === 'redo') {
          this.handlers.onRedo(this.state);
          return;
        }
        if (action === 'save') {
          this.handlers.onSave(this.state);
          return;
        }
        if (action === 'overflow-toggle') {
          this._toggleMenu('overflow');
          return;
        }

        if (target.dataset.tf) {
          this._closeMenus();
          const tf = target.dataset.tf;
          this.setState({ timeframe: tf });
          this.handlers.onTimeframeChange(tf, this.state);
          return;
        }
        if (target.dataset.indicator) {
          this._closeMenus();
          this.handlers.onIndicatorAdd(target.dataset.indicator, this.state);
          return;
        }
        if (target.dataset.layout) {
          this._closeMenus();
          this.setState({ layout: target.dataset.layout });
          this.handlers.onLayoutChange(target.dataset.layout, this.state);
          return;
        }
        if (target.dataset.overflow) {
          this._closeMenus();
          const key = target.dataset.overflow;
          if (key === 'replay') this.handlers.onReplay(this.state);
          if (key === 'undo') this.handlers.onUndo(this.state);
          if (key === 'redo') this.handlers.onRedo(this.state);
        }
      });

      this.els.indicatorSearch?.addEventListener('input', () => {
        const q = this.els.indicatorSearch.value.trim().toLowerCase();
        this.els.indicatorList?.querySelectorAll('[data-indicator]').forEach((row) => {
          const name = row.textContent.toLowerCase();
          row.classList.toggle('hidden', q && !name.includes(q));
        });
      });

      document.addEventListener('mousedown', (event) => {
        if (!this.root.contains(event.target)) {
          this._closeMenus();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this._closeMenus();
          this._closePanel('settings');
          this._closePanel('alert');
        }
      });
    }

    _syncUi() {
      if (this.els.symbolLabel) {
        this.els.symbolLabel.textContent = this.state.symbolLabel || this.state.symbol;
      }
      if (this.els.timeframe) {
        this.els.timeframe.textContent = tfLabel(this.state.timeframe);
      }
      if (this.els.status) {
        this.els.status.textContent = this.state.statusText || '';
      }
      if (this.els.replayBtn) {
        this.els.replayBtn.classList.toggle('is-active', !!this.state.replayActive);
      }
      if (this.els.undoBtn) {
        this.els.undoBtn.disabled = !this.state.canUndo;
      }
      if (this.els.redoBtn) {
        this.els.redoBtn.disabled = !this.state.canRedo;
      }

      this.root.querySelectorAll('[data-tf]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.tf === this.state.timeframe);
      });
      this.root.querySelectorAll('[data-layout]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.layout === this.state.layout);
      });

      this._renderCompareChips();
    }

    _renderCompareChips() {
      const wrap = this.els.compareList;
      if (!wrap) return;

      const list = this.state.compareSymbols || [];
      if (!list.length) {
        wrap.classList.add('hidden');
        wrap.innerHTML = '';
        return;
      }

      wrap.classList.remove('hidden');
      wrap.innerHTML = list.map((item) => (
        `<span class="dp-toolbar-compare-chip" style="--chip-color:${escapeHtml(item.color || '#2962ff')}">
          <span class="dp-toolbar-compare-dot"></span>
          <span class="dp-toolbar-compare-label">${escapeHtml(item.label || item.key)}</span>
          <button type="button" class="dp-toolbar-compare-remove" data-action="compare-remove" data-compare-key="${escapeHtml(item.key)}" title="Remove compare">×</button>
        </span>`
      )).join('');
    }

    _toggleMenu(name) {
      const wrap = this.root.querySelector(`[data-dropdown="${name}"]`);
      const menu = wrap?.querySelector('[data-menu]');
      if (!menu) return;
      const willOpen = menu.classList.contains('hidden');
      this._closeMenus();
      if (willOpen) {
        menu.classList.remove('hidden');
        this.openMenu = name;
      }
    }

    _closeMenus() {
      this.root.querySelectorAll('[data-menu]').forEach((menu) => menu.classList.add('hidden'));
      this.openMenu = null;
    }

    _openPanel(name) {
      const panel = this.root.querySelector(`[data-panel="${name}"]`);
      panel?.classList.remove('hidden');
    }

    _closePanel(name) {
      const panel = this.root.querySelector(`[data-panel="${name}"]`);
      panel?.classList.add('hidden');
    }
  }

  window.ChartToolbar = ChartToolbar;
})();
