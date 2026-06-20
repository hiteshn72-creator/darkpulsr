/**
 * DarkPulsr Chart Engine — TradingView Lightweight Charts v4+
 * Stable scales, validated data, bounded visible range.
 */
const VISIBLE_BAR_COUNT = 96;

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
    borderColor: 'rgba(0, 240, 255, 0.25)',
    autoScale: true,
    scaleMargins: {
      top: 0.12,
      bottom: 0.12,
    },
  },
  leftPriceScale: {
    visible: false,
  },
  timeScale: {
    borderColor: 'rgba(255, 215, 0, 0.2)',
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: true,
    fixRightEdge: true,
    rightOffset: 12,
    barSpacing: 8,
    minBarSpacing: 2,
  },
};

const DARKPULSR_CHART_INTERACTION = {
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    axisPressedMouseMove: {
      time: true,
      price: true,
    },
    axisDoubleClickReset: {
      time: true,
      price: true,
    },
    mouseWheel: true,
    pinch: true,
  },
  kineticScroll: {
    touch: true,
    mouse: false,
  },
};

function isValidCandle(candle) {
  if (!candle || typeof candle !== 'object') return false;

  const { time, open, high, low, close } = candle;
  if (![time, open, high, low, close].every((n) => Number.isFinite(n))) return false;
  if (time <= 0) return false;
  if (high < low) return false;

  return true;
}

function sanitizeCandles(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const byTime = new Map();

  for (const candle of raw) {
    if (!isValidCandle(candle)) continue;
    byTime.set(candle.time, {
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
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
    this.chart.applyOptions({ width, height });
    this.markerLayer?.redraw();
  }

  _setInitialVisibleRange(candles) {
    if (!candles.length) return;

    const total = candles.length;
    const visible = Math.min(VISIBLE_BAR_COUNT, total);
    const from = Math.max(0, total - visible);
    const to = total - 1;

    this.chart.timeScale().setVisibleLogicalRange({ from, to });
  }

  _buildChart() {
    if (typeof LightweightCharts === 'undefined') {
      throw new Error('LightweightCharts library not loaded');
    }

    const { width, height } = this._hostSize();

    this.chart = LightweightCharts.createChart(this.host, {
      ...DARKPULSR_CHART_THEME,
      ...DARKPULSR_CHART_INTERACTION,
      width,
      height,
    });

    this.chart.priceScale('right').applyOptions({
      autoScale: true,
      borderColor: 'rgba(0, 240, 255, 0.25)',
      scaleMargins: { top: 0.12, bottom: 0.12 },
    });

    this.chart.timeScale().applyOptions({
      fixLeftEdge: true,
      fixRightEdge: true,
      rightOffset: 12,
      barSpacing: 8,
      minBarSpacing: 2,
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
    });

    requestAnimationFrame(() => this._resizeChart());
  }

  _bindResize() {
    this._resizeObserver = new ResizeObserver(() => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this._resizeChart(), 120);
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

  async loadSymbol(symbolKey, interval = this.interval) {
    const requestId = ++this.loadRequestId;

    this._closeStream();
    this.symbol = symbolKey;
    this.interval = interval;

    this.candleSeries.setData([]);
    this._showSpinner(true);
    this._setStatus(`Fetching ${symbolKey}…`);

    try {
      const raw = await this.feed.fetchKlines(symbolKey, interval);
      if (requestId !== this.loadRequestId) return;

      const candles = sanitizeCandles(raw);
      if (!candles.length) {
        throw new Error(`No valid candle data for ${symbolKey}`);
      }

      this.candleSeries.setData(candles);
      this._setInitialVisibleRange(candles);
      this.chart.priceScale('right').applyOptions({ autoScale: true });
      this._setStatus(this._statusLabel(symbolKey));

      this.stream = this.feed.subscribe(symbolKey, interval, (candle) => {
        if (requestId !== this.loadRequestId) return;
        if (!isValidCandle(candle)) return;
        this.candleSeries.update(candle);
      });

      this.markerLayer?.redraw();
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
    this._applyZoom(0.72);
  }

  zoomOut() {
    this._applyZoom(1.38);
  }

  _applyZoom(factor) {
    const timeScale = this.chart.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to)) return;

    const span = range.to - range.from;
    if (span <= 5) return;

    const center = (range.from + range.to) / 2;
    const newHalfSpan = Math.max(5, (span / 2) * factor);

    timeScale.setVisibleLogicalRange({
      from: center - newHalfSpan,
      to: center + newHalfSpan,
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
window.DarkPulsrChart = DarkPulsrChart;
