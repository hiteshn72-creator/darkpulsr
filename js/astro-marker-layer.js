/**
 * DarkPulsr — Interactive astro vertical-line overlay for Lightweight Charts.
 * plotAstroIngressLine() — unique DarkPulsr feature (not in TradingView widgets).
 */
class AstroMarkerLayer {
  constructor(chart, hostEl) {
    this.chart = chart;
    this.hostEl = hostEl;
    this.markers = [];
    this.overlayEnabled = {};
    this._redrawTimer = null;
    this._hoveredId = null;
    this._hitRadius = 12;
    this._suppressRedraw = false;
    this._lastRedrawAt = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'astro-marker-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    hostEl.appendChild(this.canvas);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'astro-marker-tooltip hidden';
    this.tooltip.innerHTML = '<strong class="astro-tooltip-title"></strong><span class="astro-tooltip-desc"></span><time class="astro-tooltip-time"></time>';
    hostEl.appendChild(this.tooltip);

    this._onRangeChange = () => {
      if (this._suppressRedraw) return;
      if (this.chart._isAdjustingRange || this.chart._isZooming) return;
      this.redrawDebounced();
    };
    this._unsubscribeTimeRange = chart.timeScale().subscribeVisibleTimeRangeChange(this._onRangeChange);

    this._onMouseMove = (event) => this._handleMouseMove(event);
    this._onMouseLeave = () => this._clearHover();
    hostEl.addEventListener('mousemove', this._onMouseMove);
    hostEl.addEventListener('mouseleave', this._onMouseLeave);
  }

  /**
   * Plot a vertical line at a specific datetime for an Astro Ingress event.
   * @param {Date|string|number} datetime
   * @param {string} eventName e.g. "Guru in Mithun"
   * @param {object} options
   * @returns {number} marker id
   */
  plotVerticalLine(datetime, eventName, options = {}) {
    const date = datetime instanceof Date ? datetime : new Date(datetime);
    const unix = Math.floor(date.getTime() / 1000);

    const marker = {
      id: this.markers.length,
      time: unix,
      label: options.shortLabel || eventName,
      title: options.title || eventName,
      description: options.description || eventName,
      color: options.color || '#FFD700',
      width: options.width || 2,
      group: options.group || 'ingress',
      glow: options.glow !== false,
      eventType: options.eventType || 'ingress',
    };

    this.markers.push(marker);
    this.redrawDebounced();
    return marker.id;
  }

  /** Alias — primary API for planetary ingress overlays. */
  plotAstroIngressLine(datetime, eventName, options = {}) {
    return this.plotVerticalLine(datetime, eventName, {
      color: '#FFD700',
      eventType: 'ingress',
      group: options.group || 'ingress',
      ...options,
    });
  }

  setSuppressRedraw(suppress) {
    this._suppressRedraw = suppress;
  }

  redrawDebounced() {
    if (this._suppressRedraw) return;
    clearTimeout(this._redrawTimer);
    this._redrawTimer = setTimeout(() => {
      const now = Date.now();
      if (now - this._lastRedrawAt < 48) return;
      this._lastRedrawAt = now;
      this.redraw();
    }, 64);
  }

  setOverlayEnabled(group, enabled) {
    this.overlayEnabled[group] = enabled;
    this.redrawDebounced();
  }

  addMarker(unixSeconds, options = {}) {
    return this.plotVerticalLine(new Date(unixSeconds * 1000), options.label || options.title || 'Event', options);
  }

  addMarkerFromDate(dateInput, options = {}) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return this.plotVerticalLine(date, options.label || options.title || 'Event', options);
  }

  clearMarkers() {
    this.markers = [];
    this._clearHover();
    this.redrawDebounced();
  }

  removeMarker(id) {
    this.markers = this.markers.filter((m) => m.id !== id);
    if (this._hoveredId === id) this._clearHover();
    this.redrawDebounced();
  }

  _visibleMarkers() {
    return this.markers.filter((m) => {
      if (m.group && this.overlayEnabled[m.group] === false) return false;
      return true;
    });
  }

  _markerAtX(x) {
    const timeScale = this.chart.timeScale();
    let closest = null;
    let minDist = this._hitRadius;

    for (const marker of this._visibleMarkers()) {
      const mx = timeScale.timeToCoordinate(marker.time);
      if (mx == null || !Number.isFinite(mx)) continue;
      const dist = Math.abs(mx - x);
      if (dist <= minDist) {
        minDist = dist;
        closest = marker;
      }
    }

    return closest;
  }

  _handleMouseMove(event) {
    const rect = this.hostEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const hit = this._markerAtX(x);

    if (!hit) {
      this._clearHover();
      return;
    }

    if (this._hoveredId !== hit.id) {
      this._hoveredId = hit.id;
      this.redrawDebounced();
    }

    this.tooltip.querySelector('.astro-tooltip-title').textContent = hit.title || hit.label;
    this.tooltip.querySelector('.astro-tooltip-desc').textContent = hit.description || hit.eventType || 'Astro Event';
    this.tooltip.querySelector('.astro-tooltip-time').textContent = new Date(hit.time * 1000).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' IST';

    this.tooltip.classList.remove('hidden');
    const tipW = this.tooltip.offsetWidth || 180;
    const tipH = this.tooltip.offsetHeight || 60;
    const left = Math.min(Math.max(x - tipW / 2, 8), rect.width - tipW - 8);
    const top = Math.max(12, event.clientY - rect.top - tipH - 14);
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.hostEl.style.cursor = 'pointer';
  }

  _clearHover() {
    if (this._hoveredId != null) {
      this._hoveredId = null;
      this.redrawDebounced();
    }
    this.tooltip.classList.add('hidden');
    this.hostEl.style.cursor = '';
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

    for (const marker of this._visibleMarkers()) {
      const x = timeScale.timeToCoordinate(marker.time);
      if (x === null || !Number.isFinite(x)) continue;

      const isHovered = marker.id === this._hoveredId;
      const lineWidth = isHovered ? marker.width + 2 : marker.width;
      const color = isHovered ? '#FFD700' : marker.color;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (marker.glow || isHovered) {
        ctx.shadowColor = color;
        ctx.shadowBlur = isHovered ? 22 : 14;
      }
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.restore();

      const label = marker.label;
      if (label) {
        ctx.save();
        ctx.font = isHovered ? '700 11px ui-monospace, monospace' : '700 10px ui-monospace, monospace';
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = isHovered ? 'rgba(255, 215, 0, 0.15)' : 'rgba(5, 5, 5, 0.8)';
        ctx.fillRect(x + 4, 6, textWidth + 8, isHovered ? 16 : 14);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHovered ? 14 : (marker.glow ? 10 : 0);
        ctx.fillText(label, x + 8, isHovered ? 18 : 17);
        ctx.restore();
      }
    }
  }

  destroy() {
    clearTimeout(this._redrawTimer);
    this.hostEl.removeEventListener('mousemove', this._onMouseMove);
    this.hostEl.removeEventListener('mouseleave', this._onMouseLeave);
    if (this._unsubscribeTimeRange) this._unsubscribeTimeRange();
    this.tooltip.remove();
    this.canvas.remove();
    this.markers = [];
  }
}

/**
 * Global helper — plot an Astro Ingress vertical line on a DarkPulsr chart.
 * @example plotAstroIngressLine(darkPulsrChart, new Date(), 'Guru in Mithun');
 */
function plotAstroIngressLine(chartOrLayer, datetime, eventName, options = {}) {
  const layer = chartOrLayer?.getMarkerLayer?.() || chartOrLayer;
  if (!layer?.plotAstroIngressLine) {
    throw new Error('plotAstroIngressLine: invalid chart or marker layer');
  }
  return layer.plotAstroIngressLine(datetime, eventName, options);
}

window.AstroMarkerLayer = AstroMarkerLayer;
window.plotAstroIngressLine = plotAstroIngressLine;
