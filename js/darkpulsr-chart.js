/**
 * DarkPulsr Chart Engine — TradingView Lightweight Charts v4+
 * Stable scales, no runaway wheel zoom, validated timestamps.
 */
const VISIBLE_BAR_COUNT = 80;

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
  leftPriceScale: {
    visible: false,
  },
  timeScale: {
    borderColor: 'rgba(255, 215, 0, 0.2)',
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: false,
    fixRightEdge: true,
    rightOffset: 8,
    barSpacing: 10,
    minBarSpacing: 6,
  },
};

/** Wheel zoom OFF — stops infinite zoom loop. Use +/- buttons only. */
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
  kineticScroll: {
    touch: false,
    mouse: false,
  },
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
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    };
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

function isValidCandle(candle) {
  return normalizeCandle(candle, '1h') !== null || normalizeCandle(candle, '1d') !== null;
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
    if (!this.host) {
      throw new Error(`DarkPulsrChart: host #${hostId} not found`);
    }

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

    this._buildChart();
    this.markerLayer = new AstroMarkerLayer(this.chart, this.host);
    this._bindResize();
  }

  _setStatus(text, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle('error', isError);
  }

  _showSpinner(show) {
    if (this.spinnerEl) {
      this.spinnerEl.classList.toggle('active', show);
      this.spinnerEl.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
  }

  _hostSize() {
    const parent = this.host.parentElement;
    const width = Math.max(this.host.clientWidth, parent?.clientWidth || 0, 320);
    const height = Math.max(this.host.clientHeight, parent?.clientHeight || 0, 400);
    return { width, height };
  }

  _resizeChart() {
    if (!this.chart) return;
    const { width, height } = this._hostSize();
    if (width === this._lastWidth && height === this._lastHeight) return;
    this._lastWidth = width;
    this._lastHeight = height;
    this.chart.applyOptions({ width, height });
    this.markerLayer?.redraw();
  }

  _setInitialVisibleRange(candles) {
    if (!candles.length) return;

    const slice = candles.slice(-VISIBLE_BAR_COUNT);
    const from = slice[0].time;
    const to = slice[slice.length - 1].time;
    const timeScale = this.chart.timeScale();

    timeScale.applyOptions({
      fixLeftEdge: false,
      fixRightEdge: true,
      barSpacing: 10,
      minBarSpacing: 6,
      rightOffset: 8,
    });

    if (this.interval === '1d') {
      timeScale.setVisibleRange({ from, to });
    } else {
      const pad = Math.max(3600, Math.floor((to - from) / slice.length));
      timeScale.setVisibleRange({ from, to: to + pad });
    }
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
      timeVisible: true,
      secondsVisible: false,
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      borderUpColor: '#4ade80',
      borderDownColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
      priceScaleId: 'right',
      autoscaleInfoProvider: (original) => {
        const info = original();
        if (!info || !info.priceRange) return info;
        const { minValue, maxValue } = info.priceRange;
        const pad = (maxValue - minValue) * 0.06 || 1;
        return {
          priceRange: {
            minValue: minValue - pad,
            maxValue: maxValue + pad,
          },
        };
      },
    });
  }

  _bindResize() {
    this._resizeObserver = new ResizeObserver(() => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this._resizeChart(), 150);
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
    if (typeof this.feed.statusLabel === 'function') {
      return this.feed.statusLabel(symbolKey);
    }
    const cfg = this.feed.getConfig?.(symbolKey);
    if (!cfg) return symbolKey;
    return cfg.label || symbolKey;
  }

  _onStreamCandle(candle, requestId) {
    if (requestId !== this.loadRequestId) return;

    const normalized = normalizeCandle(candle, this.interval);
    if (!normalized) return;

    this.candleSeries.update(normalized);
  }

  async loadSymbol(symbolKey, interval = this.interval) {
    const requestId = ++this.loadRequestId;

    this._closeStream();
    this.symbol = symbolKey;
    this.interval = interval;
    this._lastCandles = [];

    this._showSpinner(true);
    this._setStatus(`Fetching ${symbolKey}…`);

    try {
      const raw = await this.feed.fetchKlines(symbolKey, interval);
      if (requestId !== this.loadRequestId) return;

      const candles = sanitizeCandles(raw, interval);
      if (!candles.length) {
        throw new Error(`No valid candle data for ${symbolKey}`);
      }

      this._lastCandles = candles;
      this.candleSeries.setData(candles);
      this._setInitialVisibleRange(candles);
      this.chart.priceScale('right').applyOptions({ autoScale: true });
      this._setStatus(this._statusLabel(symbolKey));

      this.stream = this.feed.subscribe(symbolKey, interval, (candle) => {
        this._onStreamCandle(candle, requestId);
      });

      requestAnimationFrame(() => this.markerLayer?.redraw());
    } catch (error) {
      if (requestId !== this.loadRequestId) return;
      console.error('[DarkPulsrChart]', error);
      this.candleSeries.setData([]);
      this._setStatus(`Failed: ${symbolKey} — try BTC or refresh`, true);
      throw error;
    } finally {
      if (requestId === this.loadRequestId) {
        this._showSpinner(false);
      }
    }
  }

  getChart() {
    return this.chart;
  }

  getCandleSeries() {
    return this.candleSeries;
  }

  getMarkerLayer() {
    return this.markerLayer;
  }

  zoomIn() {
    this._applyZoom(0.75);
  }

  zoomOut() {
    this._applyZoom(1.33);
  }

  _applyZoom(factor) {
    const timeScale = this.chart.timeScale();
    const range = timeScale.getVisibleRange();
    if (!range || range.from == null || range.to == null) return;

    const fromSec = typeof range.from === 'number' ? range.from : null;
    const toSec = typeof range.to === 'number' ? range.to : null;
    if (fromSec == null || toSec == null) return;

    const span = toSec - fromSec;
    if (span <= 60) return;

    const center = (fromSec + toSec) / 2;
    const half = Math.max(span * 0.25, 3600) * factor;

    timeScale.setVisibleRange({
      from: center - half,
      to: center + half,
    });
    this.markerLayer?.redraw();
  }

  bindZoomControls(zoomInBtn, zoomOutBtn) {
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
  }

  destroy() {
    this._closeStream();
    clearTimeout(this._resizeTimer);
    this._resizeObserver?.disconnect();
    this.markerLayer?.destroy();
    this.chart?.remove();
  }
}

window.DARKPULSR_CHART_THEME = DARKPULSR_CHART_THEME;
window.DARKPULSR_CHART_INTERACTION = DARKPULSR_CHART_INTERACTION;
window.sanitizeCandles = sanitizeCandles;
window.normalizeCandle = normalizeCandle;
window.DarkPulsrChart = DarkPulsrChart;
