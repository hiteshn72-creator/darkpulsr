/**

 * DarkPulsr Chart Engine — TradingView-style (Lightweight Charts v4+)

 */

const VISIBLE_BAR_COUNT = 120;



const INTERVAL_SECONDS = {

  '1m': 60,

  '5m': 300,

  '15m': 900,

  '1h': 3600,

  '4h': 14400,

  '1d': 86400,

  '1w': 604800,

};



const TV_CHART_THEME = {

  layout: {

    background: { type: 'solid', color: '#131722' },

    textColor: '#787b86',

    fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',

    fontSize: 12,

  },

  grid: {

    vertLines: { color: 'rgba(42, 46, 57, 0.6)' },

    horzLines: { color: 'rgba(42, 46, 57, 0.6)' },

  },

  crosshair: {

    mode: LightweightCharts?.CrosshairMode?.Normal ?? 0,

    vertLine: {

      color: '#758696',

      width: 1,

      style: LightweightCharts?.LineStyle?.Dashed ?? 2,

      labelBackgroundColor: '#363a45',

    },

    horzLine: {

      color: '#758696',

      width: 1,

      style: LightweightCharts?.LineStyle?.Dashed ?? 2,

      labelBackgroundColor: '#363a45',

    },

  },

  rightPriceScale: {

    visible: true,

    borderColor: '#2a2e39',

    autoScale: true,

    scaleMargins: { top: 0.05, bottom: 0.28 },

  },

  leftPriceScale: { visible: false },

  timeScale: {

    borderColor: '#2a2e39',

    timeVisible: true,

    secondsVisible: false,

    fixLeftEdge: false,

    fixRightEdge: true,

    rightOffset: 6,

    barSpacing: 8,

    minBarSpacing: 4,

    lockVisibleTimeRangeOnResize: true,

  },

};



const TV_CANDLE_COLORS = {

  upColor: '#26a69a',

  downColor: '#ef5350',

  borderUpColor: '#26a69a',

  borderDownColor: '#ef5350',

  wickUpColor: '#26a69a',

  wickDownColor: '#ef5350',

};



const COMPARE_LINE_COLORS = ['#2962ff', '#f7931a', '#9c27b0', '#00bcd4'];

const MAX_COMPARE_SYMBOLS = 4;



const CHART_TYPE_IDS = {

  BARS: 'bars',

  CANDLES: 'candles',

  HOLLOW: 'hollow',

  VOLUME_CANDLES: 'volume_candles',

  LINE: 'line',

  LINE_MARKERS: 'line_markers',

  STEP: 'step',

  AREA: 'area',

  HLC_AREA: 'hlc_area',

  BASELINE: 'baseline',

  COLUMNS: 'columns',

  HIGH_LOW: 'high_low',

  FOOTPRINT: 'footprint',

};



const LINE_TYPE = typeof LightweightCharts !== 'undefined'

  ? LightweightCharts.LineType

  : { Simple: 0, WithSteps: 1 };



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

  const volume = raw.volume != null ? Number(raw.volume) : null;

  const candle = { time, open, high, low, close };

  if (volume != null && Number.isFinite(volume) && volume >= 0) candle.volume = volume;

  return candle;

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



function formatPrice(value, digits = 2) {

  if (!Number.isFinite(value)) return '—';

  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: digits });

  if (value >= 1) return value.toFixed(Math.min(digits, 4));

  return value.toFixed(Math.max(digits, 6));

}



function formatVolume(value) {

  if (!Number.isFinite(value)) return '—';

  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;

  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;

  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;

  return String(Math.round(value));

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

    this.legendEl = options.legendEl || null;

    this.loadRequestId = 0;

    this._resizeTimer = null;

    this._lastWidth = 0;

    this._lastHeight = 0;

    this._lastCandles = [];

    this._isAdjustingRange = false;

    this._isZooming = false;

    this._rangeLocked = false;

    this.compareEntries = [];

    this.chartType = CHART_TYPE_IDS.CANDLES;



    this._buildChart();

    this.markerLayer = new AstroMarkerLayer(this.chart, this.host);

    this._bindWheelBlock();

    this._bindResize();

    this._bindLegendCrosshair();

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

    const height = Math.max(this.host.clientHeight, 420);

    return { width, height };

  }



  _bindWheelBlock() {

    this._blockWheel = (event) => {

      event.preventDefault();

      event.stopPropagation();

    };

    const opts = { passive: false, capture: true };

    this.host.addEventListener('wheel', this._blockWheel, opts);

    this.host.addEventListener('gesturestart', this._blockWheel, opts);

    this.host.addEventListener('gesturechange', this._blockWheel, opts);

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



  _volumeBars(candles) {

    return candles

      .filter((c) => c.volume != null)

      .map((c) => ({

        time: c.time,

        value: c.volume,

        color: c.close >= c.open ? 'rgba(38, 166, 154, 0.55)' : 'rgba(239, 83, 80, 0.55)',

      }));

  }



  _setChartData(candles) {

    this.candleSeries.setData(this._seriesDataFromCandles(candles));

    const vol = this._volumeBars(candles);

    if (vol.length) this.volumeSeries.setData(vol);

    else this.volumeSeries.setData([]);

    this._updateLegendFromCandle(candles[candles.length - 1], candles);

  }



  _isOhlcChartType(type = this.chartType) {

    return [

      CHART_TYPE_IDS.BARS,

      CHART_TYPE_IDS.CANDLES,

      CHART_TYPE_IDS.HOLLOW,

      CHART_TYPE_IDS.VOLUME_CANDLES,

      CHART_TYPE_IDS.HIGH_LOW,

    ].includes(type);

  }



  _hollowCandle(c) {

    const up = c.close >= c.open;

    return {

      ...c,

      color: up ? 'rgba(38, 166, 154, 0.05)' : '#ef5350',

      borderColor: up ? '#26a69a' : '#ef5350',

      wickColor: up ? '#26a69a' : '#ef5350',

    };

  }



  _volumeCandle(c, maxVolume) {

    const up = c.close >= c.open;

    const vol = c.volume || 0;

    const intensity = maxVolume > 0 ? Math.min(1, vol / maxVolume) : 0.5;

    const alpha = 0.25 + intensity * 0.75;

    const upColor = `rgba(38, 166, 154, ${alpha.toFixed(2)})`;

    const downColor = `rgba(239, 83, 80, ${alpha.toFixed(2)})`;

    return {

      ...c,

      color: up ? upColor : downColor,

      borderColor: up ? '#26a69a' : '#ef5350',

      wickColor: up ? '#26a69a' : '#ef5350',

    };

  }



  _seriesDataFromCandles(candles) {

    if (!candles.length) return [];

    const maxVolume = Math.max(...candles.map((c) => c.volume || 0), 1);



    switch (this.chartType) {

      case CHART_TYPE_IDS.LINE:

      case CHART_TYPE_IDS.LINE_MARKERS:

      case CHART_TYPE_IDS.STEP:

      case CHART_TYPE_IDS.AREA:

        return candles.map((c) => ({ time: c.time, value: c.close }));

      case CHART_TYPE_IDS.HLC_AREA:

        return candles.map((c) => ({ time: c.time, value: (c.high + c.low + c.close) / 3 }));

      case CHART_TYPE_IDS.BASELINE:

        return candles.map((c) => ({ time: c.time, value: c.close }));

      case CHART_TYPE_IDS.COLUMNS:

        return candles.map((c) => ({

          time: c.time,

          value: c.close,

          color: c.close >= c.open ? 'rgba(38, 166, 154, 0.75)' : 'rgba(239, 83, 80, 0.75)',

        }));

      case CHART_TYPE_IDS.HIGH_LOW:

        return candles.map((c) => ({

          time: c.time,

          open: c.low,

          high: c.high,

          low: c.low,

          close: c.high,

        }));

      case CHART_TYPE_IDS.HOLLOW:

        return candles.map((c) => this._hollowCandle(c));

      case CHART_TYPE_IDS.VOLUME_CANDLES:

        return candles.map((c) => this._volumeCandle(c, maxVolume));

      case CHART_TYPE_IDS.BARS:

      case CHART_TYPE_IDS.CANDLES:

      default:

        return candles;

    }

  }



  _streamUpdateFromCandle(candle) {

    const maxVolume = Math.max(...this._lastCandles.map((c) => c.volume || 0), candle.volume || 1, 1);



    switch (this.chartType) {

      case CHART_TYPE_IDS.LINE:

      case CHART_TYPE_IDS.LINE_MARKERS:

      case CHART_TYPE_IDS.STEP:

      case CHART_TYPE_IDS.AREA:

      case CHART_TYPE_IDS.BASELINE:

        return { time: candle.time, value: candle.close };

      case CHART_TYPE_IDS.HLC_AREA:

        return { time: candle.time, value: (candle.high + candle.low + candle.close) / 3 };

      case CHART_TYPE_IDS.COLUMNS:

        return {

          time: candle.time,

          value: candle.close,

          color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.75)' : 'rgba(239, 83, 80, 0.75)',

        };

      case CHART_TYPE_IDS.HIGH_LOW:

        return {

          time: candle.time,

          open: candle.low,

          high: candle.high,

          low: candle.low,

          close: candle.high,

        };

      case CHART_TYPE_IDS.HOLLOW:

        return this._hollowCandle(candle);

      case CHART_TYPE_IDS.VOLUME_CANDLES:

        return this._volumeCandle(candle, maxVolume);

      default:

        return candle;

    }

  }



  _createMainSeries(type) {

    const priceScaleId = 'right';



    switch (type) {

      case CHART_TYPE_IDS.BARS:

        return this.chart.addBarSeries({

          upColor: TV_CANDLE_COLORS.upColor,

          downColor: TV_CANDLE_COLORS.downColor,

          thinBars: false,

          priceScaleId,

        });

      case CHART_TYPE_IDS.HOLLOW:

      case CHART_TYPE_IDS.VOLUME_CANDLES:

      case CHART_TYPE_IDS.CANDLES:

        return this.chart.addCandlestickSeries({

          ...TV_CANDLE_COLORS,

          priceScaleId,

        });

      case CHART_TYPE_IDS.LINE:

        return this.chart.addLineSeries({

          color: '#2962ff',

          lineWidth: 2,

          priceScaleId,

          crosshairMarkerVisible: true,

          lastValueVisible: true,

        });

      case CHART_TYPE_IDS.LINE_MARKERS:

        return this.chart.addLineSeries({

          color: '#2962ff',

          lineWidth: 2,

          priceScaleId,

          crosshairMarkerVisible: true,

          pointMarkersVisible: true,

          lastValueVisible: true,

        });

      case CHART_TYPE_IDS.STEP:

        return this.chart.addLineSeries({

          color: '#2962ff',

          lineWidth: 2,

          lineType: LINE_TYPE.WithSteps ?? 1,

          priceScaleId,

          crosshairMarkerVisible: true,

          lastValueVisible: true,

        });

      case CHART_TYPE_IDS.AREA:

        return this.chart.addAreaSeries({

          lineColor: '#2962ff',

          topColor: 'rgba(41, 98, 255, 0.35)',

          bottomColor: 'rgba(41, 98, 255, 0.02)',

          lineWidth: 2,

          priceScaleId,

        });

      case CHART_TYPE_IDS.HLC_AREA:

        return this.chart.addAreaSeries({

          lineColor: '#787b86',

          topColor: 'rgba(120, 123, 134, 0.35)',

          bottomColor: 'rgba(120, 123, 134, 0.05)',

          lineWidth: 1,

          priceScaleId,

        });

      case CHART_TYPE_IDS.BASELINE: {

        const base = this._lastCandles[0]?.close ?? 0;

        return this.chart.addBaselineSeries({

          baseValue: { type: 'price', price: base },

          topLineColor: '#26a69a',

          topFillColor1: 'rgba(38, 166, 154, 0.28)',

          topFillColor2: 'rgba(38, 166, 154, 0.05)',

          bottomLineColor: '#ef5350',

          bottomFillColor1: 'rgba(239, 83, 80, 0.28)',

          bottomFillColor2: 'rgba(239, 83, 80, 0.05)',

          lineWidth: 2,

          priceScaleId,

        });

      }

      case CHART_TYPE_IDS.COLUMNS:

        return this.chart.addHistogramSeries({

          priceFormat: { type: 'price' },

          priceScaleId,

        });

      case CHART_TYPE_IDS.HIGH_LOW:

        return this.chart.addBarSeries({

          upColor: '#787b86',

          downColor: '#787b86',

          thinBars: true,

          openVisible: false,

          priceScaleId,

        });

      default:

        return this.chart.addCandlestickSeries({

          ...TV_CANDLE_COLORS,

          priceScaleId,

        });

    }

  }



  getChartType() {

    return this.chartType;

  }



  setChartType(typeId) {

    const type = String(typeId || '').trim();

    if (!type || type === CHART_TYPE_IDS.FOOTPRINT) return this.chartType;

    if (type === this.chartType) return this.chartType;



    if (this.candleSeries) {

      this.chart.removeSeries(this.candleSeries);

    }



    this.chartType = type;

    this.candleSeries = this._createMainSeries(type);



    if (this._lastCandles.length) {

      this._withRangeLock(() => {

        this.candleSeries.setData(this._seriesDataFromCandles(this._lastCandles));

      });

    }



    return this.chartType;

  }



  _legendCandleFromSeriesData(seriesData, time) {

    if (!seriesData) return null;

    if (seriesData.open != null && seriesData.high != null) return seriesData;

    if (seriesData.value != null) {

      const match = this._lastCandles.find((c) => c.time === time);

      if (match) return match;

      const v = seriesData.value;

      return { open: v, high: v, low: v, close: v, volume: null };

    }

    return null;

  }



  _updateLegendFromCandle(candle, allCandles) {

    if (!this.legendEl || !candle) return;



    const o = this.legendEl.querySelector('[data-legend-o]');

    const h = this.legendEl.querySelector('[data-legend-h]');

    const l = this.legendEl.querySelector('[data-legend-l]');

    const c = this.legendEl.querySelector('[data-legend-c]');

    const ch = this.legendEl.querySelector('[data-legend-change]');

    const vol = this.legendEl.querySelector('[data-legend-vol]');

    const sym = this.legendEl.querySelector('[data-legend-symbol]');



    const cfg = this.feed.getConfig?.(this.symbol);

    if (sym) sym.textContent = cfg?.label || this.symbol;



    const digits = candle.close >= 100 ? 2 : candle.close >= 1 ? 4 : 6;

    if (o) o.textContent = formatPrice(candle.open, digits);

    if (h) h.textContent = formatPrice(candle.high, digits);

    if (l) l.textContent = formatPrice(candle.low, digits);

    if (c) c.textContent = formatPrice(candle.close, digits);

    if (vol) vol.textContent = candle.volume != null ? formatVolume(candle.volume) : '—';



    const prev = allCandles?.length > 1 ? allCandles[allCandles.length - 2] : null;

    if (ch && prev) {

      const delta = candle.close - prev.close;

      const pct = prev.close ? (delta / prev.close) * 100 : 0;

      const sign = delta >= 0 ? '+' : '';

      ch.textContent = `${sign}${formatPrice(delta, digits)} (${sign}${pct.toFixed(2)}%)`;

      ch.classList.toggle('tv-up', delta >= 0);

      ch.classList.toggle('tv-down', delta < 0);

    } else if (ch) {

      ch.textContent = '—';

      ch.classList.remove('tv-up', 'tv-down');

    }

  }



  _bindLegendCrosshair() {

    if (!this.legendEl) return;



    this.chart.subscribeCrosshairMove((param) => {

      if (!param.time) {

        this._updateLegendFromCandle(this._lastCandles[this._lastCandles.length - 1], this._lastCandles);

        return;

      }



      const candleData = this._legendCandleFromSeriesData(

        param.seriesData.get(this.candleSeries),

        param.time,

      );

      if (!candleData) return;



      const volData = param.seriesData.get(this.volumeSeries);

      const merged = {

        ...candleData,

        volume: volData?.value ?? null,

      };

      this._updateLegendFromCandle(merged, this._lastCandles);

    });

  }



  _buildChart() {

    if (typeof LightweightCharts === 'undefined') {

      throw new Error('LightweightCharts library not loaded');

    }



    const { width, height } = this._hostSize();

    this._lastWidth = width;

    this._lastHeight = height;



    this.chart = LightweightCharts.createChart(this.host, {

      ...TV_CHART_THEME,

      ...DARKPULSR_CHART_INTERACTION,

      width,

      height,

    });



    this.chart.priceScale('right').applyOptions({

      autoScale: true,

      borderColor: '#2a2e39',

      scaleMargins: { top: 0.05, bottom: 0.28 },

    });



    this.candleSeries = this._createMainSeries(this.chartType);



    this.volumeSeries = this.chart.addHistogramSeries({

      priceFormat: { type: 'volume' },

      priceScaleId: 'volume',

    });



    this.chart.priceScale('volume').applyOptions({

      scaleMargins: { top: 0.78, bottom: 0 },

      borderVisible: false,

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

    this.candleSeries.update(this._streamUpdateFromCandle(normalized));

    if (normalized.volume != null) {

      this.volumeSeries.update({

        time: normalized.time,

        value: normalized.volume,

        color: normalized.close >= normalized.open

          ? 'rgba(38, 166, 154, 0.55)'

          : 'rgba(239, 83, 80, 0.55)',

      });

    }

    const lastIdx = this._lastCandles.length - 1;

    if (lastIdx >= 0) {

      const lastUnix = candleTimeToUnix(this._lastCandles[lastIdx].time);

      const newUnix = candleTimeToUnix(normalized.time);

      if (newUnix != null && lastUnix != null && newUnix >= lastUnix) {

        this._lastCandles[lastIdx] = normalized;

        this._updateLegendFromCandle(normalized, this._lastCandles);

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

    this._setStatus(`Loading…`);



    try {

      const raw = await this.feed.fetchKlines(symbolKey, interval);

      if (requestId !== this.loadRequestId) return;



      const candles = sanitizeCandles(raw, interval);

      if (!candles.length) throw new Error(`No valid candle data for ${symbolKey}`);



      this._lastCandles = candles;



      this._withRangeLock(() => {

        this._setChartData(candles);

        this._applyVisibleRange(candles);

      });



      this._setStatus(this._statusLabel(symbolKey));



      if (this.compareEntries.length) {

        await this._refreshAllCompares();

      }



      this.stream = this.feed.subscribe(symbolKey, interval, (c) => {

        this._onStreamCandle(c, requestId);

      });

    } catch (error) {

      if (requestId !== this.loadRequestId) return;

      console.error('[DarkPulsrChart]', error);

      this.candleSeries.setData([]);

      this.volumeSeries.setData([]);

      const msg = window.YahooFeed?.userMessage?.(error)

        || error?.message

        || `Failed to load ${symbolKey}`;

      this._setStatus(msg, true);

      throw error;

    } finally {

      if (requestId === this.loadRequestId) this._showSpinner(false);

    }

  }



  _compareLabel(symbolKey) {

    const cfg = this.feed.getConfig?.(symbolKey);

    return cfg?.shortLabel || cfg?.label || symbolKey;

  }



  _compareLineData(candles) {

    return candles.map((c) => ({ time: c.time, value: c.close }));

  }



  _syncLeftPriceScale() {

    const visible = this.compareEntries.length > 0;

    this.chart.priceScale('left').applyOptions({

      visible,

      borderColor: '#2a2e39',

      autoScale: true,

    });

  }



  getCompareSymbols() {

    return this.compareEntries.map((entry) => ({

      key: entry.symbolKey,

      label: entry.label,

      color: entry.color,

    }));

  }



  hasCompare(symbolKey) {

    return this.compareEntries.some((e) => e.symbolKey === symbolKey);

  }



  async addCompare(symbolKey) {

    const key = String(symbolKey || '').trim().toUpperCase();

    if (!key) throw new Error('Compare symbol required');

    if (key === String(this.symbol).toUpperCase()) {

      throw new Error('Cannot compare with the main symbol');

    }

    if (this.hasCompare(key)) return this.getCompareSymbols();

    if (this.compareEntries.length >= MAX_COMPARE_SYMBOLS) {

      throw new Error(`Maximum ${MAX_COMPARE_SYMBOLS} compare symbols`);

    }



    const raw = await this.feed.fetchKlines(key, this.interval);

    const candles = sanitizeCandles(raw, this.interval);

    if (!candles.length) throw new Error(`No data for ${key}`);



    const label = this._compareLabel(key);

    const color = COMPARE_LINE_COLORS[this.compareEntries.length % COMPARE_LINE_COLORS.length];

    const series = this.chart.addLineSeries({

      color,

      lineWidth: 2,

      priceScaleId: 'left',

      title: label,

      crosshairMarkerVisible: true,

      lastValueVisible: true,

      priceLineVisible: false,

    });

    series.setData(this._compareLineData(candles));

    this.compareEntries.push({ symbolKey: key, series, label, color });

    this._syncLeftPriceScale();

    return this.getCompareSymbols();

  }



  removeCompare(symbolKey) {

    const key = String(symbolKey || '').trim().toUpperCase();

    const idx = this.compareEntries.findIndex((e) => e.symbolKey === key);

    if (idx < 0) return this.getCompareSymbols();

    const entry = this.compareEntries[idx];

    this.chart.removeSeries(entry.series);

    this.compareEntries.splice(idx, 1);

    this._syncLeftPriceScale();

    return this.getCompareSymbols();

  }



  clearCompare() {

    this.compareEntries.forEach((entry) => this.chart.removeSeries(entry.series));

    this.compareEntries = [];

    this._syncLeftPriceScale();

    return [];

  }



  async _refreshAllCompares() {

    const keys = this.compareEntries.map((e) => e.symbolKey);

    this.compareEntries.forEach((entry) => this.chart.removeSeries(entry.series));

    this.compareEntries = [];

    for (const key of keys) {

      if (key === String(this.symbol).toUpperCase()) continue;

      await this.addCompare(key);

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



window.DARKPULSR_CHART_THEME = TV_CHART_THEME;

window.DARKPULSR_CHART_INTERACTION = DARKPULSR_CHART_INTERACTION;

window.sanitizeCandles = sanitizeCandles;

window.normalizeCandle = normalizeCandle;

window.DarkPulsrChart = DarkPulsrChart;

window.CHART_TYPE_IDS = CHART_TYPE_IDS;


