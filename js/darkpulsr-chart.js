/**
 * DarkPulsr Chart Engine — TradingView Lightweight Charts v4+
 * Modular entry point for astro-financial overlays.
 */
const DARKPULSR_CHART_THEME = {
  layout: {
    background: { type: 'solid', color: 'transparent' },
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
  },
  timeScale: {
    borderColor: 'rgba(255, 215, 0, 0.2)',
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: false,
    fixRightEdge: false,
    rightOffset: 8,
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
    mouse: true,
  },
};

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

    this._buildChart();
    this.markerLayer = new AstroMarkerLayer(this.chart, this.host);
    this._bindResize();
  }

  _setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  _buildChart() {
    this.chart = LightweightCharts.createChart(this.host, {
      ...DARKPULSR_CHART_THEME,
      ...DARKPULSR_CHART_INTERACTION,
      width: this.host.clientWidth,
      height: this.host.clientHeight,
    });

    this.chart.timeScale().applyOptions({
      barSpacing: 8,
      minBarSpacing: 2,
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#4ade80',
      downColor: '#f87171',
      borderUpColor: '#4ade80',
      borderDownColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
    });
  }

  _bindResize() {
    this._resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this.chart.applyOptions({ width, height });
      this.markerLayer.redraw();
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
    const cfg = this.feed.getConfig?.(symbolKey);
    if (!cfg) return symbolKey;
    if (cfg.live) return `${cfg.label} · Live`;
    return `${cfg.label} · Yahoo (last session)`;
  }

  async loadSymbol(symbolKey, interval = this.interval) {
    this._closeStream();
    this.symbol = symbolKey;
    this.interval = interval;
    this._setStatus(`Loading ${symbolKey}…`);

    try {
      const candles = await this.feed.fetchKlines(symbolKey, interval);
      this.candleSeries.setData(candles);
      this.chart.timeScale().fitContent();
      this._setStatus(this._statusLabel(symbolKey));

      this.stream = this.feed.subscribe(symbolKey, interval, (candle) => {
        this.candleSeries.update(candle);
      });

      if (window.OverlayManager && this.markerLayer) {
        this.markerLayer.redraw();
      }
    } catch (error) {
      console.error('[DarkPulsrChart]', error);
      this._setStatus(`Error loading ${symbolKey}`);
      throw error;
    }
  }

  /** Hook for your astro logic — plot directly on the chart. */
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
    if (!range) return;

    const center = (range.from + range.to) / 2;
    const halfSpan = (range.to - range.from) / 2;
    const newHalfSpan = Math.max(5, halfSpan * factor);

    timeScale.setVisibleLogicalRange({
      from: center - newHalfSpan,
      to: center + newHalfSpan,
    });
    this.markerLayer.redraw();
  }

  bindZoomControls(zoomInBtn, zoomOutBtn) {
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomIn());
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomOut());
    }
  }

  destroy() {
    this._closeStream();
    this._resizeObserver?.disconnect();
    this.markerLayer?.destroy();
    this.chart?.remove();
  }
}

window.DARKPULSR_CHART_THEME = DARKPULSR_CHART_THEME;
window.DARKPULSR_CHART_INTERACTION = DARKPULSR_CHART_INTERACTION;
window.DarkPulsrChart = DarkPulsrChart;
