/**
 * DarkPulsr — Custom overlay canvas (vertical astro markers)
 * Debounced redraw — does not trigger chart resize loops.
 */
class AstroMarkerLayer {
  constructor(chart, hostEl) {
    this.chart = chart;
    this.hostEl = hostEl;
    this.markers = [];
    this.overlayEnabled = {};
    this._redrawTimer = null;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'astro-marker-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    hostEl.appendChild(this.canvas);

    this._onRangeChange = () => this.redrawDebounced();
    this._unsubscribeTimeRange = chart.timeScale().subscribeVisibleTimeRangeChange(this._onRangeChange);
  }

  redrawDebounced() {
    clearTimeout(this._redrawTimer);
    this._redrawTimer = setTimeout(() => this.redraw(), 32);
  }

  setOverlayEnabled(group, enabled) {
    this.overlayEnabled[group] = enabled;
    this.redrawDebounced();
  }

  addMarker(unixSeconds, options = {}) {
    const marker = {
      id: this.markers.length,
      time: unixSeconds,
      color: options.color || '#FFD700',
      label: options.label || '',
      width: options.width || 2,
      group: options.group || 'default',
      glow: options.glow !== false,
    };
    this.markers.push(marker);
    this.redrawDebounced();
    return marker.id;
  }

  addMarkerFromDate(dateInput, options = {}) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return this.addMarker(Math.floor(date.getTime() / 1000), options);
  }

  clearMarkers() {
    this.markers = [];
    this.redrawDebounced();
  }

  redraw() {
    const width = this.hostEl.clientWidth;
    const height = this.hostEl.clientHeight;
    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const timeScale = this.chart.timeScale();

    for (const marker of this.markers) {
      if (marker.group && this.overlayEnabled[marker.group] === false) continue;

      const x = timeScale.timeToCoordinate(marker.time);
      if (x === null || !Number.isFinite(x)) continue;

      ctx.save();
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = marker.width;
      if (marker.glow) {
        ctx.shadowColor = marker.color;
        ctx.shadowBlur = 14;
      }
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.restore();

      if (marker.label) {
        ctx.save();
        ctx.font = '700 10px ui-monospace, monospace';
        const textWidth = ctx.measureText(marker.label).width;
        ctx.fillStyle = 'rgba(5, 5, 5, 0.8)';
        ctx.fillRect(x + 4, 6, textWidth + 8, 14);
        ctx.fillStyle = marker.color;
        ctx.shadowColor = marker.color;
        ctx.shadowBlur = marker.glow ? 10 : 0;
        ctx.fillText(marker.label, x + 8, 17);
        ctx.restore();
      }
    }
  }

  destroy() {
    clearTimeout(this._redrawTimer);
    if (this._unsubscribeTimeRange) this._unsubscribeTimeRange();
    this.canvas.remove();
    this.markers = [];
  }
}

window.AstroMarkerLayer = AstroMarkerLayer;
