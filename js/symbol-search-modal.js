/**
 * DarkPulsr — Symbol Search Modal (TradingView-style)
 * CoinGecko (crypto) + Yahoo Finance · keyboard nav · recent · type-to-search
 */
(function () {
  const RECENT_KEY = 'darkpulsr-recent-symbols';
  const MAX_RECENT = 10;

  const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'stocks', label: 'Stocks' },
    { id: 'funds', label: 'Funds' },
    { id: 'futures', label: 'Futures' },
    { id: 'forex', label: 'Forex' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'indices', label: 'Indices' },
    { id: 'bonds', label: 'Bonds' },
    { id: 'economy', label: 'Economy' },
    { id: 'options', label: 'Options' },
  ];

  const YAHOO_TYPE_MAP = {
    stocks: ['EQUITY'],
    funds: ['ETF', 'MUTUALFUND'],
    futures: ['FUTURE'],
    forex: ['CURRENCY'],
    indices: ['INDEX'],
    bonds: ['BOND', 'MONEYMARKET'],
    economy: ['INDEX', 'FUTURE'],
    options: ['OPTION'],
  };

  const POPULAR = [
    { chartKey: 'BTC', symbol: 'BTCUSD', displayName: 'Bitcoin / U.S. dollar', exchange: 'Crypto', quoteType: 'CRYPTOCURRENCY', typeTags: ['spot', 'crypto'], source: 'catalog', category: 'crypto' },
    { chartKey: 'ETH', symbol: 'ETHUSD', displayName: 'Ethereum / U.S. dollar', exchange: 'Crypto', quoteType: 'CRYPTOCURRENCY', typeTags: ['spot', 'crypto'], source: 'catalog', category: 'crypto' },
    { chartKey: 'NIFTY', symbol: 'NSE:NIFTY', displayName: 'NIFTY 50 Index', exchange: 'NSE', quoteType: 'INDEX', typeTags: ['index', 'india'], source: 'catalog', category: 'index' },
    { chartKey: 'NASDAQ', symbol: 'NASDAQ:IXIC', displayName: 'NASDAQ Composite Index', exchange: 'NASDAQ', quoteType: 'INDEX', typeTags: ['index', 'usa'], source: 'catalog', category: 'index' },
    { chartKey: 'AAPL', symbol: 'NASDAQ:AAPL', displayName: 'Apple Inc.', exchange: 'NASDAQ', quoteType: 'EQUITY', typeTags: ['stock', 'equity'], source: 'yahoo', yahoo: 'AAPL', category: 'stock' },
    { chartKey: 'TSLA', symbol: 'NASDAQ:TSLA', displayName: 'Tesla, Inc.', exchange: 'NASDAQ', quoteType: 'EQUITY', typeTags: ['stock', 'equity'], source: 'yahoo', yahoo: 'TSLA', category: 'stock' },
    { chartKey: 'GOLD', symbol: 'COMEX:GC', displayName: 'Gold Futures', exchange: 'COMEX', quoteType: 'FUTURE', typeTags: ['future', 'commodity'], source: 'catalog', category: 'commodity' },
    { chartKey: 'CRUDE', symbol: 'NYMEX:CL', displayName: 'WTI Crude Oil', exchange: 'NYMEX', quoteType: 'FUTURE', typeTags: ['future', 'oil'], source: 'catalog', category: 'commodity' },
    { chartKey: 'NATGAS', symbol: 'NYMEX:NG', displayName: 'Natural Gas', exchange: 'NYMEX', quoteType: 'FUTURE', typeTags: ['future', 'energy'], source: 'catalog', category: 'commodity' },
    { chartKey: 'EURUSD=X', symbol: 'FX:EURUSD', displayName: 'Euro / U.S. Dollar', exchange: 'Forex', quoteType: 'CURRENCY', typeTags: ['forex', 'currency'], source: 'yahoo', yahoo: 'EURUSD=X', category: 'forex' },
  ];

  const ICON_COLORS = [
    '#9D4EDD', '#2962FF', '#FFD700', '#4ade80', '#f87171',
    '#60a5fa', '#fb923c', '#a78bfa', '#34d399', '#f472b6',
  ];

  function hashColor(text) {
    let hash = 0;
    const str = String(text || '');
    for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightMatch(text, query) {
    const safe = escapeHtml(text);
    const q = String(query || '').trim();
    if (!q) return safe;
    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
    return safe.replace(re, '<mark class="symbol-search-mark">$1</mark>');
  }

  function debounce(fn, ms) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function formatTvSymbol(exchange, symbol) {
    const ex = String(exchange || '').trim();
    const sym = String(symbol || '').trim();
    if (!sym) return '';
    if (ex && !sym.includes(':')) return `${ex}:${sym.replace(/^\^/, '')}`;
    return sym;
  }

  const PILL_CATALOG_CATEGORY = {
    crypto: 'crypto',
    indices: 'index',
    forex: 'forex',
    futures: 'commodity',
  };

  const API_ONLY_PILLS = new Set(['stocks', 'funds', 'bonds', 'options']);

  function catalogToSearchItem(key, cfg) {
    const quoteTypes = {
      crypto: 'CRYPTOCURRENCY',
      index: 'INDEX',
      commodity: 'FUTURE',
      forex: 'CURRENCY',
    };
    const tvSymbol = cfg.category === 'forex'
      ? (cfg.shortLabel || key)
      : formatTvSymbol(cfg.exchange, cfg.yahoo || cfg.shortLabel || key);

    return {
      source: 'catalog',
      chartKey: key,
      symbol: tvSymbol,
      displayName: cfg.label,
      shortLabel: cfg.shortLabel || key,
      quoteType: quoteTypes[cfg.category] || 'INDEX',
      typeTags: [cfg.category, String(cfg.exchange || '').toLowerCase()].filter(Boolean),
      exchange: cfg.exchange || 'Yahoo',
      iconText: String(cfg.shortLabel || key).slice(0, 2).toUpperCase(),
      yahoo: cfg.yahoo || key,
      binance: cfg.binance,
      category: cfg.category,
      live: !!cfg.live,
    };
  }

  function getAllCatalogItems() {
    const catalog = window.SYMBOL_CATALOG || {};
    return Object.keys(catalog).map((key) => catalogToSearchItem(key, catalog[key]));
  }

  function getCatalogItemsForPill(activeCategory) {
    if (API_ONLY_PILLS.has(activeCategory)) return [];
    const filterCat = PILL_CATALOG_CATEGORY[activeCategory];
    const items = getAllCatalogItems();
    if (!filterCat) return items;
    return items.filter((item) => item.category === filterCat);
  }

  function normalizeSearchText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchesCatalogQuery(item, query) {
    const q = String(query || '').trim();
    if (!q) return true;
    const hay = normalizeSearchText([
      item.chartKey,
      item.symbol,
      item.displayName,
      item.shortLabel,
      item.yahoo,
      item.exchange,
      ...(item.typeTags || []),
    ].join(' '));
    const compactHay = hay.replace(/\s+/g, '');
    const tokens = normalizeSearchText(q).split(' ').filter(Boolean);
    return tokens.every((token) => {
      const compactToken = token.replace(/\s+/g, '');
      return hay.includes(token) || (compactToken.length > 1 && compactHay.includes(compactToken));
    });
  }

  function searchCatalog(query, activeCategory) {
    return getCatalogItemsForPill(activeCategory).filter((item) => matchesCatalogQuery(item, query));
  }

  function getCatalogGroups(query, activeCategory) {
    const groups = window.TOOLBAR_GROUPS || [];
    const catalog = window.SYMBOL_CATALOG || {};
    const filterCat = PILL_CATALOG_CATEGORY[activeCategory];
    const q = String(query || '').trim();

    return groups.map((group) => {
      const items = group.keys
        .filter((key) => catalog[key])
        .map((key) => catalogToSearchItem(key, catalog[key]))
        .filter((item) => {
          if (filterCat && item.category !== filterCat) return false;
          return matchesCatalogQuery(item, q);
        });
      return { label: group.label, items };
    }).filter((group) => group.items.length > 0);
  }

  function mergeSearchResults(primary, secondary) {
    const seen = new Set();
    const merged = [];
    [...primary, ...secondary].forEach((item) => {
      const id = String(item.chartKey || '').toUpperCase();
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push(item);
    });
    return merged;
  }

  function shouldFetchRemote(activeCategory) {
    return !API_ONLY_PILLS.has(activeCategory) || activeCategory === 'all';
  }

  function loadRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveRecent(item) {
    const entry = {
      chartKey: item.chartKey,
      symbol: item.symbol,
      displayName: item.displayName,
      exchange: item.exchange,
      quoteType: item.quoteType,
      typeTags: item.typeTags,
      source: item.source,
      yahoo: item.yahoo,
      binance: item.binance,
      category: item.category,
      iconUrl: item.iconUrl,
      iconText: item.iconText,
    };

    let list = loadRecent().filter((r) => r.chartKey !== entry.chartKey);
    list.unshift(entry);
    list = list.slice(0, MAX_RECENT);

    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch (_) { /* ignore */ }
  }

  function mapQuoteTypeToCategory(quoteType) {
    if (quoteType === 'EQUITY') return 'stock';
    if (quoteType === 'ETF' || quoteType === 'MUTUALFUND') return 'fund';
    if (quoteType === 'FUTURE') return 'future';
    if (quoteType === 'CURRENCY') return 'forex';
    if (quoteType === 'INDEX') return 'index';
    if (quoteType === 'OPTION') return 'option';
    if (quoteType === 'BOND' || quoteType === 'MONEYMARKET') return 'bond';
    return 'custom';
  }

  function normalizeYahooQuote(quote) {
    const rawSymbol = quote.symbol || '';
    const quoteType = (quote.quoteType || quote.typeDisp || 'unknown').toUpperCase();
    const exchange = quote.exchDisp || quote.exchange || 'Yahoo';
    const name = quote.longname || quote.shortname || rawSymbol;
    const typeTag = (quote.typeDisp || quoteType).toLowerCase();
    const tvSymbol = formatTvSymbol(exchange, rawSymbol);

    return {
      source: 'yahoo',
      chartKey: rawSymbol,
      symbol: tvSymbol,
      name,
      displayName: name,
      quoteType,
      typeTags: [typeTag, exchange.toLowerCase()].filter(Boolean),
      exchange,
      iconUrl: quote.logoUrl || null,
      iconText: rawSymbol.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || '?',
      yahoo: rawSymbol,
      category: mapQuoteTypeToCategory(quoteType),
    };
  }

  function normalizeCoin(coin) {
    const symbol = String(coin.symbol || '').toUpperCase();
    const name = coin.name || symbol;
    const binance = `${symbol}USDT`;

    return {
      source: 'coingecko',
      chartKey: symbol,
      symbol: `${symbol}USD`,
      name,
      displayName: `${name} / U.S. dollar`,
      quoteType: 'CRYPTOCURRENCY',
      typeTags: ['spot', 'crypto'],
      exchange: 'Crypto',
      iconUrl: coin.thumb || coin.large || null,
      iconText: symbol.slice(0, 2) || '?',
      yahoo: `${symbol}-USD`,
      binance,
      category: 'crypto',
      live: true,
    };
  }

  async function fetchCoinGecko(query) {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`CoinGecko HTTP ${response.status}`);
    const payload = await response.json();
    return (payload.coins || []).slice(0, 30).map(normalizeCoin);
  }

  async function fetchYahoo(query, category) {
    const quotes = await window.YahooFeed.search(query, { quotesCount: 40 });
    const allowed = category === 'all' ? null : YAHOO_TYPE_MAP[category];
    const economySymbols = /^(GDP|CPI|UNRATE|DGS|FEDFUNDS|T10Y)/i;

    return quotes
      .map(normalizeYahooQuote)
      .filter((item) => {
        if (!allowed) {
          if (category === 'economy') {
            return economySymbols.test(item.chartKey) || item.quoteType === 'INDEX';
          }
          return true;
        }
        return allowed.includes(item.quoteType);
      });
  }

  class SymbolSearchModal {
    constructor(root, { onSelect, onSymbolBarUpdate } = {}) {
      this.root = root;
      this.onSelect = onSelect || (() => {});
      this.onSymbolBarUpdate = onSymbolBarUpdate || (() => {});
      this.activeCategory = 'all';
      this.sourceFilter = 'all';
      this.typeFilter = 'all';
      this.exchangeFilter = 'all';
      this.results = [];
      this.displayItems = [];
      this.activeIndex = -1;
      this.currentQuery = '';
      this.searchToken = 0;
      this.isOpen = false;
      this._boundKeydown = this._onKeydown.bind(this);
      this._boundTypeToSearch = this._onTypeToSearch.bind(this);

      this.els = {
        backdrop: root.querySelector('[data-search-backdrop]'),
        closeBtn: root.querySelector('[data-search-close]'),
        input: root.querySelector('[data-search-input]'),
        clearBtn: root.querySelector('[data-search-clear]'),
        pills: root.querySelector('[data-search-pills]'),
        sourceSelect: root.querySelector('[data-filter-source]'),
        typeSelect: root.querySelector('[data-filter-type]'),
        exchangeSelect: root.querySelector('[data-filter-exchange]'),
        results: root.querySelector('[data-search-results]'),
        status: root.querySelector('[data-search-status]'),
      };

      this._bindEvents();
      this._renderPills();
    }

    _bindEvents() {
      this.els.backdrop?.addEventListener('click', () => this.close());
      this.els.closeBtn?.addEventListener('click', () => this.close());

      this.els.input?.addEventListener('input', () => {
        const hasValue = !!this.els.input?.value?.trim();
        this.els.clearBtn?.classList.toggle('hidden', !hasValue);
      });

      this.els.input?.addEventListener('input', debounce(() => {
        this.activeIndex = -1;
        this._runSearch(this.els.input?.value || '');
      }, 300));

      this.els.clearBtn?.addEventListener('click', () => {
        if (!this.els.input) return;
        this.els.input.value = '';
        this.els.clearBtn.classList.add('hidden');
        this.activeIndex = -1;
        this._runSearch('');
        this.els.input.focus();
      });

      ['sourceSelect', 'typeSelect', 'exchangeSelect'].forEach((key) => {
        this.els[key]?.addEventListener('change', () => {
          this.sourceFilter = this.els.sourceSelect?.value || 'all';
          this.typeFilter = this.els.typeSelect?.value || 'all';
          this.exchangeFilter = this.els.exchangeSelect?.value || 'all';
          this.activeIndex = -1;
          this._renderResults();
        });
      });
    }

    enableTypeToSearch() {
      document.addEventListener('keydown', this._boundTypeToSearch);
    }

    _onTypeToSearch(event) {
      if (this.isOpen) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key.length !== 1) return;
      if (!/^[a-zA-Z0-9^./=]$/.test(event.key)) return;

      event.preventDefault();
      this.open(event.key);
    }

    _renderPills() {
      if (!this.els.pills) return;
      this.els.pills.innerHTML = CATEGORIES.map((cat) => (
        `<button type="button" class="symbol-search-pill${cat.id === this.activeCategory ? ' active' : ''}" data-category="${cat.id}">${cat.label}</button>`
      )).join('');

      this.els.pills.querySelectorAll('[data-category]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.activeCategory = btn.dataset.category;
          this.activeIndex = -1;
          this._renderPills();
          this._runSearch(this.els.input?.value || '');
        });
      });
    }

    open(initialQuery = '') {
      this.isOpen = true;
      this.root.classList.remove('hidden');
      this.root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('symbol-search-open');
      document.addEventListener('keydown', this._boundKeydown);

      if (this.els.input) {
        this.els.input.value = initialQuery;
        this.els.clearBtn?.classList.toggle('hidden', !initialQuery.trim());
        setTimeout(() => {
          this.els.input?.focus();
          if (initialQuery) {
            this.els.input?.setSelectionRange(initialQuery.length, initialQuery.length);
          }
        }, 30);
      }

      this.activeIndex = -1;
      this._runSearch(initialQuery);
    }

    close() {
      this.isOpen = false;
      this.root.classList.add('hidden');
      this.root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('symbol-search-open');
      document.removeEventListener('keydown', this._boundKeydown);
      this.activeIndex = -1;
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
        this._renderResults();
        this._scrollActiveIntoView();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this._renderResults();
        this._scrollActiveIntoView();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const idx = this.activeIndex >= 0 ? this.activeIndex : 0;
        const item = this.displayItems[idx];
        if (item) this._selectItem(item);
      }
    }

    _scrollActiveIntoView() {
      const row = this.els.results?.querySelector('.symbol-search-row.is-active');
      row?.scrollIntoView({ block: 'nearest' });
    }

    async _runSearch(query) {
      const q = String(query || '').trim();
      this.currentQuery = q;
      const token = ++this.searchToken;

      const catalogHits = searchCatalog(q, this.activeCategory);

      if (!q) {
        this.results = catalogHits;
        if (this.activeIndex < 0 && catalogHits.length) this.activeIndex = 0;
        this._updateExchangeOptions();
        this._renderResults();
        this._setStatus(`${catalogHits.length} DarkPulsr markets · type to filter`);
        return;
      }

      this.results = catalogHits;
      this._renderResults();
      this._setStatus(catalogHits.length ? `${catalogHits.length} local matches…` : 'Searching…');
      this.els.results?.classList.add('is-loading');

      try {
        let remoteItems = [];

        if (this.activeCategory === 'crypto') {
          remoteItems = await fetchCoinGecko(q);
        } else if (this.activeCategory === 'all') {
          const [yahooItems, cryptoItems] = await Promise.all([
            fetchYahoo(q, 'all').catch(() => []),
            fetchCoinGecko(q).catch(() => []),
          ]);
          remoteItems = mergeSearchResults(yahooItems, cryptoItems);
        } else if (!API_ONLY_PILLS.has(this.activeCategory)) {
          remoteItems = await fetchYahoo(q, this.activeCategory).catch(() => []);
        } else {
          remoteItems = await fetchYahoo(q, this.activeCategory).catch(() => []);
        }

        if (token !== this.searchToken) return;
        this.results = mergeSearchResults(catalogHits, remoteItems);
        if (this.activeIndex < 0 && this.results.length) this.activeIndex = 0;
        this._updateExchangeOptions();
        this._renderResults();
        this._setStatus(this.results.length ? `${this.results.length} symbols` : 'No matches — try NIFTY, CRUDE, EURUSD');
      } catch (error) {
        if (token !== this.searchToken) return;
        console.warn('[SymbolSearch]', error);
        this.results = catalogHits;
        this._renderResults();
        const msg = catalogHits.length
          ? `${catalogHits.length} local matches`
          : (window.YahooFeed?.userMessage?.(error) || 'Search failed — check connection');
        this._setStatus(msg);
      } finally {
        if (token === this.searchToken) {
          this.els.results?.classList.remove('is-loading');
        }
      }
    }

    _updateExchangeOptions() {
      const select = this.els.exchangeSelect;
      if (!select) return;

      const exchanges = [...new Set(this.results.map((r) => r.exchange).filter(Boolean))].sort();
      const current = this.exchangeFilter;
      select.innerHTML = [
        '<option value="all">All exchange types</option>',
        ...exchanges.map((ex) => `<option value="${escapeHtml(ex)}">${escapeHtml(ex)}</option>`),
      ].join('');

      if (current !== 'all' && exchanges.includes(current)) {
        select.value = current;
      } else {
        this.exchangeFilter = 'all';
        select.value = 'all';
      }
    }

    _filteredResults() {
      return this.results.filter((item) => {
        if (this.sourceFilter !== 'all') {
          const sourceLabel = item.source === 'coingecko'
            ? 'coingecko'
            : item.source === 'catalog'
              ? 'catalog'
              : 'yahoo';
          if (sourceLabel !== this.sourceFilter) return false;
        }
        if (this.typeFilter !== 'all' && item.quoteType !== this.typeFilter) return false;
        if (this.exchangeFilter !== 'all' && item.exchange !== this.exchangeFilter) return false;
        return true;
      });
    }

    _buildDisplayList() {
      if (this.currentQuery.trim()) {
        return { mode: 'flat', items: this._filteredResults() };
      }

      const recent = loadRecent();
      const recentKeys = new Set(recent.map((r) => r.chartKey));
      const catalogGroups = getCatalogGroups('', this.activeCategory)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !recentKeys.has(item.chartKey)),
        }))
        .filter((group) => group.items.length > 0);

      return { mode: 'grouped', recent, catalogGroups };
    }

    _renderRow(item, index, query) {
      const bg = hashColor(item.symbol || item.chartKey);
      const icon = item.iconUrl
        ? `<img src="${escapeHtml(item.iconUrl)}" alt="" class="symbol-search-row-icon-img" loading="lazy" />`
        : `<span class="symbol-search-row-icon-text">${escapeHtml(item.iconText || (item.chartKey || '').slice(0, 2))}</span>`;
      const tags = (item.typeTags || []).map((t) => `<span class="symbol-search-tag">${escapeHtml(t)}</span>`).join('');
      const exchangeInitial = escapeHtml((item.exchange || '?').slice(0, 1).toUpperCase());
      const isActive = index === this.activeIndex;

      return `
        <button type="button" class="symbol-search-row${isActive ? ' is-active' : ''}" data-item-key="${escapeHtml(`${item.source || 'item'}:${item.chartKey}`)}" data-row-index="${index}">
          <span class="symbol-search-row-icon" style="background:${bg}">${icon}</span>
          <span class="symbol-search-row-main">
            <span class="symbol-search-row-symbol">${highlightMatch(item.symbol || item.chartKey, query)}</span>
            <span class="symbol-search-row-name">${highlightMatch(item.displayName, query)}</span>
          </span>
          <span class="symbol-search-row-meta">
            <span class="symbol-search-row-tags">${tags}</span>
            <span class="symbol-search-row-exchange">
              <span class="symbol-search-exchange-icon">${exchangeInitial}</span>
              ${escapeHtml(item.exchange || '')}
            </span>
          </span>
        </button>
      `;
    }

    _renderResults() {
      const list = this.els.results;
      if (!list) return;

      const q = this.currentQuery.trim();
      let html = '';
      this.displayItems = [];

      if (q) {
        this.displayItems = this._filteredResults();
        if (!this.displayItems.length) {
          list.innerHTML = '<div class="symbol-search-empty">No symbols to show</div>';
          return;
        }
        html = this.displayItems.map((item, i) => this._renderRow(item, i, q)).join('');
      } else {
        const { recent, catalogGroups } = this._buildDisplayList();
        let idx = 0;

        if (recent.length) {
          html += '<div class="symbol-search-section"><div class="symbol-search-section-title">Recent</div>';
          recent.forEach((item) => {
            html += this._renderRow(item, idx, q);
            this.displayItems.push(item);
            idx += 1;
          });
          html += '</div>';
        }

        catalogGroups.forEach((group) => {
          html += `<div class="symbol-search-section"><div class="symbol-search-section-title">${escapeHtml(group.label)}</div>`;
          group.items.forEach((item) => {
            html += this._renderRow(item, idx, q);
            this.displayItems.push(item);
            idx += 1;
          });
          html += '</div>';
        });

        if (!html) {
          list.innerHTML = '<div class="symbol-search-empty">Type a symbol — e.g. NIFTY, CRUDE, NAT GAS, EURUSD</div>';
          return;
        }
      }

      list.innerHTML = html;

      list.querySelectorAll('.symbol-search-row').forEach((row) => {
        row.addEventListener('mouseenter', () => {
          this.activeIndex = Number(row.dataset.rowIndex);
          list.querySelectorAll('.symbol-search-row').forEach((r) => r.classList.remove('is-active'));
          row.classList.add('is-active');
        });

        row.addEventListener('click', () => {
          const index = Number(row.dataset.rowIndex);
          const item = this.displayItems[index];
          if (item) this._selectItem(item);
        });
      });
    }

    selectFromSearch(item) {
      this._selectItem(item);
    }

    _selectItem(item) {
      if (item.source === 'coingecko' && window.UniversalMarketData) {
        window.UniversalMarketData.registerDynamic({
          id: item.chartKey,
          label: item.displayName,
          yahoo: item.yahoo,
          binance: item.binance,
          category: 'crypto',
          live: true,
          icon: item.iconUrl,
          exchange: item.exchange,
        });
      } else if (item.source === 'catalog' || window.UniversalMarketData?.catalog?.[item.chartKey]) {
        /* catalog symbols already in SYMBOL_CATALOG — chartKey loads directly */
      } else if (item.source === 'yahoo' || item.yahoo) {
        window.UniversalMarketData?.registerDynamic({
          id: String(item.chartKey).toUpperCase(),
          label: item.displayName,
          yahoo: item.yahoo || item.chartKey,
          category: item.category || 'custom',
          live: false,
          exchange: item.exchange,
        });
      } else if (window.UniversalMarketData) {
        window.UniversalMarketData.registerDynamic({
          id: item.chartKey,
          label: item.displayName,
          yahoo: item.yahoo || item.chartKey,
          category: item.category || 'custom',
          live: false,
          exchange: item.exchange,
        });
      }

      saveRecent(item);
      this.onSymbolBarUpdate(item);
      this.onSelect(item.chartKey, item);
      this.close();
    }

    updateSymbolBar(item) {
      this.onSymbolBarUpdate(item);
    }

    _setStatus(text) {
      if (this.els.status) this.els.status.textContent = text;
    }
  }

  window.SymbolSearchModal = SymbolSearchModal;
  window.DarkPulsrSymbolSearch = {
    searchCatalog,
    getAllCatalogItems,
    getCatalogGroups,
    catalogToSearchItem,
    matchesCatalogQuery,
  };
})();
