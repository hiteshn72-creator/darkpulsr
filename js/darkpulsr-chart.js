/**
 * DarkPulsr Chart Engine — TradingView Lightweight Charts v4+
 * Guarded zoom/range/resize — no infinite loop.
 */
const VISIBLE_BAR_COUNT = 80;

const INTERVAL_SECONDS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

const DARKPULSR_CHART_THEME = {
  layout: {
    background: { type: 'solid', color: '#050505' },
    textColor: 'rgba(157, 78, 221, 0.9)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  grid: {
    vertLines: { color: 'rgba(0, 240, 255, 0.06)' },
    horzLines: { color: 'rgba(157, 78, 221, 0.08)' },
  },
  crosshair: {
    vertLine: { color: 'rgba(0, 240, 255, 0.55)', labelBackgroundColor: '#00f0ff' },
    horzLine: { color: 'rgba(255, 215, 0, 0.55)', labelBackgroundColor: '#FFD700' },
  },
  rightPriceScale: {
    visible: true,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    autoScale: true,
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
  leftPriceScale: { visible: false },
  timeScale: {
    borderColor: 'rgba(255, 215, 0, 0.2)',
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: false,
    fixRightEdge: true,
    rightOffset: 8,
    barSpacing: 10,
    minBarSpacing: 6,
    lockVisibleTimeRangeOnResize: true,
  },
};

/** All wheel/pinch zoom disabled — use +/- buttons only. */
const DARKPULSR_CHART_INTERACTION = {
  handleScroll: {
    mouseWheel: false,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: false,
  },
  handleScale: {
    axisPressedMouseMove: { time: false, price: false },
    axisDoubleClickReset: { time: false, price: false },
    mouseWheel: false,
    pinch: false,
  },
  kineticScroll: { touch: false, mouse: false },
};

function normalizeChartTime(raw) {
  let time = Math.floor(Number(raw));
  if (!Number.isFinite(time)) return null;
  if (time > 1e12) time = Math.floor(time / 1000);
  const now = Math.floor(Date.now() / 1000);
  if (time < now - 86400 * 365 * 10 || time > now + 86400 * 2) return null;
  return time;
}

function formatCandleTime(raw, interval) {
  const unix = normalizeChartTime(raw);
  if (unix == null) return null;
  if (interval === '1d') {
    const d = new Date(unix * 1000);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }
  return unix;
}

function normalizeCandle(raw, interval = '1h') {
  if (!raw || typeof raw !== 'object') return null;
  const time = formatCandleTime(raw.time, interval);
  if (time == null) return null;
  const open = Number(raw.open);
  const high = Number(raw.high);
  const low = Number(raw.low);
  const close = Number(raw.close);
  if (![open, high, low, close].every((n) => Number.isFinite(n))) return null;
  if (high < low) return null;
  return { time, open, high, low, close };
}

function candleTimeToUnix(time) {
  if (typeof time === 'number') return time;
  if (time && typeof time === 'object') {
    return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
  }
  return null;
}

function sanitizeCandles(raw, interval = '1h') {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const key = interval === '1d'
    ? (c) => `${c.time.year}-${c.time.month}-${c.time.day}`
    : (c) => String(c.time);
  const byTime = new Map();
  for (const row of raw) {
    const candle = normalizeCandle(row, interval);
    if (!candle) continue;
    byTime.set(key(candle), candle);
  }
  const sorted = Array.from(byTime.values());
  if (interval === '1d') return sorted;
  return sorted.sort((a, b) => a.time - b.time);
}

class DarkPulsrChart {
  constructor(hostId, options = {}) {
    this.host = document.getElementById(hostId);
    if (!this.host) throw new Error(`DarkPulsrChart: host #${hostId} not found`);

    this.feed = options.feed || window.MarketData;
    this.interval = options.interval || '1h';
    this.symbol = options.symbol || 'BTC';
    this.stream = null;
    this.statusEl = options.statusEl || null;
    this.spinnerEl = options.spinnerEl || null;
    this.loadRequestId = 0;
    this._resizeTimer = null;
    this._lastWidth = 0;
    this._lastHeight = 0;
    this._lastCandles = [];
    this._isAdjustingRange = false;
    this._isZooming = false;
    this._rangeLocked = false;

    this._buildChart();
    this.markerLayer = new AstroMarkerLayer(this.chart, this.host);
    this._bindWheelBlock();
    this._bindResize();
  }

  _setStatus(text, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle('error', isError);
  }

  _showSpinner(show) {
    if (!this.spinnerEl) return;
    this.spinnerEl.classList.toggle('active', show);
    this.spinnerEl.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  _hostSize() {
    const width = Math.max(this.host.clientWidth, 320);
    const height = Math.max(this.host.clientHeight, 400);
    return { width, height };
  }

  /** Block browser wheel from reaching the chart (prevents runaway zoom). */
  _bindWheelBlock() {
    this._blockWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const opts = { passive: false, capture: true };
    this.host.addEventListener('wheel', this._blockWheel, opts);
    this.host.addEventListener('gesturestart', this._blockWheel, opts);
    this.host.addEventListener('gesturechange', this._blockWheel, opts);
    const container = document.getElementById('darkpulsr-chart-container');
    if (container) container.addEventListener('wheel', this._blockWheel, opts);
  }

  _resizeChart() {
    if (!this.chart || this._isAdjustingRange || this._isZooming) return;
    const { width, height } = this._hostSize();
    if (width === this._lastWidth && height === this._lastHeight) return;
    this._lastWidth = width;
    this._lastHeight = height;
    this.chart.applyOptions({ width, height });
  }

  _withRangeLock(fn) {
    if (this._isAdjustingRange) return;
    this._isAdjustingRange = true;
    this.markerLayer?.setSuppressRedraw(true);
    try {
      fn();
    } finally {
      requestAnimationFrame(() => {
        this._isAdjustingRange = false;
        this.markerLayer?.setSuppressRedraw(false);
        this.markerLayer?.redraw();
      });
    }
  }

  _applyVisibleRange(candles) {
    if (!candles.length) return;
    const slice = candles.slice(-VISIBLE_BAR_COUNT);
    const from = slice[0].time;
    const to = slice[slice.length - 1].time;
    const timeScale = this.chart.timeScale();
    if (this.interval === '1d') {
      timeScale.setVisibleRange({ from, to });
    } else {
      const pad = Math.max(INTERVAL_SECONDS[this.interval] || 3600, 3600);
      timeScale.setVisibleRange({ from, to: to + pad });
    }
    this._rangeLocked = true;
  }

  _buildChart() {
    if (typeof LightweightCharts === 'undefined') {
      throw new Error('LightweightCharts library not loaded');
    }

    const { width, height } = this._hostSize();
    this._lastWidth = width;
    this._lastHeight = height;

    this.chart = LightweightCharts.createChart(this.host, {
      ...DARKPULSR_CHART_THEME,
      ...DARKPULSR_CHART_INTERACTION,
      width,
      height,
    });

    this.chart.priceScale('right').applyOptions({
      autoScale: true,
      borderColor: 'rgba(0, 240, 255, 0.25)',
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    this.chart.timeScale().applyOptions({
      fixLeftEdge: false,
      fixRightEdge: true,
      rightOffset: 8,
      barSpacing: 10,
      minBarSpacing: 6,
      lockVisibleTimeRangeOnResize: true,
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      borderUpColor: '#4ade80',
      borderDownColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
      priceScaleId: 'right',
    });
  }

  _bindResize() {
    this._resizeObserver = new ResizeObserver(() => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this._resizeChart(), 200);
    });
    this._resizeObserver.observe(this.host);
  }

  _closeStream() {
    if (this.stream) {
      this.stream.close?.();
      this.stream = null;
    }
  }

  _statusLabel(symbolKey) {
    if (typeof this.feed.statusLabel === 'function') return this.feed.statusLabel(symbolKey);
    const cfg = this.feed.getConfig?.(symbolKey);
    return cfg?.label || symbolKey;
  }

  _isStreamTimeValid(normalized) {
    if (!this._lastCandles.length) return true;
    const last = this._lastCandles[this._lastCandles.length - 1];
    const lastUnix = candleTimeToUnix(last.time);
    const newUnix = candleTimeToUnix(normalized.time);
    if (lastUnix == null || newUnix == null) return false;
    const window = (INTERVAL_SECONDS[this.interval] || 3600) * 3;
    return newUnix >= lastUnix - window && newUnix <= lastUnix + window;
  }

  _onStreamCandle(candle, requestId) {
    if (requestId !== this.loadRequestId || this._isAdjustingRange) return;
    const normalized = normalizeCandle(candle, this.interval);
    if (!normalized || !this._isStreamTimeValid(normalized)) return;
    this.candleSeries.update(normalized);
    const lastIdx = this._lastCandles.length - 1;
    if (lastIdx >= 0) {
      const lastUnix = candleTimeToUnix(this._lastCandles[lastIdx].time);
      const newUnix = candleTimeToUnix(normalized.time);
      if (newUnix != null && lastUnix != null && newUnix >= lastUnix) {
        this._lastCandles[lastIdx] = normalized;
      }
    }
  }

  async loadSymbol(symbolKey, interval = this.interval) {
    const requestId = ++this.loadRequestId;
    this._closeStream();
    this.symbol = symbolKey;
    this.interval = interval;
    this._lastCandles = [];
    this._rangeLocked = false;

    this._showSpinner(true);
    this._setStatus(`Fetching ${symbolKey}…`);

    try {
      const raw = await this.feed.fetchKlines(symbolKey, interval);
      if (requestId !== this.loadRequestId) return;

      const candles = sanitizeCandles(raw, interval);
      if (!candles.length) throw new Error(`No valid candle data for ${symbolKey}`);

      this._lastCandles = candles;

      this._withRangeLock(() => {
        this.candleSeries.setData(candles);
        this._applyVisibleRange(candles);
      });

      this._setStatus(this._statusLabel(symbolKey));

      this.stream = this.feed.subscribe(symbolKey, interval, (c) => {
        this._onStreamCandle(c, requestId);
      });
    } catch (error) {
      if (requestId !== this.loadRequestId) return;
      console.error('[DarkPulsrChart]', error);
      this.candleSeries.setData([]);
      const msg = window.YahooFeed?.userMessage?.(error)
        || error?.message
        || `Failed to load ${symbolKey}`;
      this._setStatus(msg, true);
      throw error;
    } finally {
      if (requestId === this.loadRequestId) this._showSpinner(false);
    }
  }

  getChart() { return this.chart; }
  getCandleSeries() { return this.candleSeries; }
  getMarkerLayer() { return this.markerLayer; }

  plotAstroIngressLine(datetime, eventName, options = {}) {
    return this.markerLayer.plotAstroIngressLine(datetime, eventName, options);
  }

  zoomIn() { this._applyZoom(0.75); }
  zoomOut() { this._applyZoom(1.33); }

  _applyZoom(factor) {
    if (this._isZooming || this._isAdjustingRange) return;

    const timeScale = this.chart.timeScale();
    const range = timeScale.getVisibleRange();
    if (!range || range.from == null || range.to == null) return;

    const fromSec = typeof range.from === 'number' ? range.from : null;
    const toSec = typeof range.to === 'number' ? range.to : null;
    if (fromSec == null || toSec == null) return;

    const span = toSec - fromSec;
    if (span <= 60) return;

    this._isZooming = true;
    const center = (fromSec + toSec) / 2;
    const half = Math.max(span * 0.25, 3600) * factor;

    this._withRangeLock(() => {
      timeScale.setVisibleRange({ from: center - half, to: center + half });
    });

    setTimeout(() => { this._isZooming = false; }, 150);
  }

  bindZoomControls(zoomInBtn, zoomOutBtn) {
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
  }

  destroy() {
    this._closeStream();
    clearTimeout(this._resizeTimer);
    this._resizeObserver?.disconnect();
    if (this._blockWheel) {
      this.host.removeEventListener('wheel', this._blockWheel, { capture: true });
    }
    this.markerLayer?.destroy();
    this.chart?.remove();
  }
}

window.DARKPULSR_CHART_THEME = DARKPULSR_CHART_THEME;
window.DARKPULSR_CHART_INTERACTION = DARKPULSR_CHART_INTERACTION;
window.sanitizeCandles = sanitizeCandles;
window.normalizeCandle = normalizeCandle;
window.DarkPulsrChart = DarkPulsrChart;
