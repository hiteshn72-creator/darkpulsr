/**
 * DarkPulsr — Astro overlay providers & toggle manager
 */
const MOON_DEG_PER_HOUR = 13.17639648 / 24;
const GURU_DEG_PER_DAY = 0.0830853001;

const OVERLAY_RASHIS = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

function overlayToJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function overlayLahiriAyanamsa(jd) {
  const t = (jd - 2451545.0) / 36525;
  return 23.85 + 1.396 * t;
}

function overlayMoonSiderealLongitude(date) {
  const jd = overlayToJulianDay(date);
  const d = jd - 2451545.0;
  let tropical = (218.3164477 + 13.17639648 * d) % 360;
  if (tropical < 0) tropical += 360;
  let sidereal = (tropical - overlayLahiriAyanamsa(jd)) % 360;
  if (sidereal < 0) sidereal += 360;
  return sidereal;
}

function overlayJupiterSiderealLongitude(date) {
  const jd = overlayToJulianDay(date);
  const d = jd - 2451545.0;
  let tropical = (34.351519 + GURU_DEG_PER_DAY * d) % 360;
  if (tropical < 0) tropical += 360;
  let sidereal = (tropical - overlayLahiriAyanamsa(jd)) % 360;
  if (sidereal < 0) sidereal += 360;
  return sidereal;
}

function getGuruSign(date = new Date()) {
  const lon = overlayJupiterSiderealLongitude(date);
  return OVERLAY_RASHIS[Math.floor(lon / 30)];
}

function getLastMoonSignChangeTime(date = new Date()) {
  const lon = overlayMoonSiderealLongitude(date);
  const boundary = Math.floor(lon / 30) * 30;
  const degreesSince = lon - boundary;
  const hoursSince = degreesSince / MOON_DEG_PER_HOUR;
  return new Date(date.getTime() - hoursSince * 3600000);
}

function getNextMoonSignChangeTime(date = new Date()) {
  const lon = overlayMoonSiderealLongitude(date);
  const nextBoundary = (Math.floor(lon / 30) + 1) * 30;
  let degreesToNext = nextBoundary - lon;
  if (degreesToNext <= 0) degreesToNext += 30;
  const hoursToNext = degreesToNext / MOON_DEG_PER_HOUR;
  return new Date(date.getTime() + hoursToNext * 3600000);
}

function getLastGuruIngressTime(date = new Date()) {
  const lon = overlayJupiterSiderealLongitude(date);
  const boundary = Math.floor(lon / 30) * 30;
  const degreesSince = lon - boundary;
  const daysSince = degreesSince / GURU_DEG_PER_DAY;
  return new Date(date.getTime() - daysSince * 86400000);
}

function getNextGuruIngressTime(date = new Date()) {
  const lon = overlayJupiterSiderealLongitude(date);
  const nextBoundary = (Math.floor(lon / 30) + 1) * 30;
  let degreesToNext = nextBoundary - lon;
  if (degreesToNext <= 0) degreesToNext += 30;
  const daysToNext = degreesToNext / GURU_DEG_PER_DAY;
  return new Date(date.getTime() + daysToNext * 86400000);
}

class OverlayManager {
  constructor(markerLayer) {
    this.markerLayer = markerLayer;
    this.providers = new Map();
    this.state = new Map();

    this.register('moonChange', {
      label: 'Moon Change',
      provider: () => {
        const when = getLastMoonSignChangeTime();
        return [{
          time: when,
          label: 'Moon Δ',
          title: 'Moon Sign Change',
          description: 'Chandra rashi transition — watch price reaction',
          color: '#00f0ff',
          width: 2,
          group: 'moonChange',
          eventType: 'lunar',
        }];
      },
    });

    this.register('nextMoonChange', {
      label: 'Next Moon Change',
      provider: () => {
        const when = getNextMoonSignChangeTime();
        return [{
          time: when,
          label: 'Next Moon',
          title: 'Upcoming Moon Sign Change',
          description: 'Next Chandra rashi transition',
          color: '#9D4EDD',
          width: 2,
          group: 'nextMoonChange',
          eventType: 'lunar',
        }];
      },
    });

    this.register('guruIngress', {
      label: 'Guru Ingress',
      provider: () => {
        const now = new Date();
        const sign = getGuruSign(now);
        const when = getLastGuruIngressTime(now);
        const next = getNextGuruIngressTime(now);
        const nextSign = OVERLAY_RASHIS[(OVERLAY_RASHIS.indexOf(sign) + 1) % 12];

        return [
          {
            time: when,
            label: `Guru · ${sign}`,
            title: `Guru in ${sign}`,
            description: `Jupiter ingress — Guru entered ${sign}. Hover for IST time.`,
            color: '#FFD700',
            width: 2,
            group: 'guruIngress',
            eventType: 'ingress',
          },
          {
            time: next,
            label: `→ ${nextSign}`,
            title: `Guru Ingress into ${nextSign}`,
            description: `Upcoming Jupiter sign change (approx.)`,
            color: '#FFA500',
            width: 2,
            group: 'guruIngress',
            eventType: 'ingress',
          },
        ];
      },
    });

    this.setEnabled('moonChange', true);
    this.setEnabled('guruIngress', true);
    this.setEnabled('nextMoonChange', false);
  }

  register(id, { label, provider }) {
    this.providers.set(id, { label, provider });
    if (!this.state.has(id)) this.state.set(id, false);
  }

  setEnabled(id, enabled) {
    if (!this.providers.has(id)) return;
    this.state.set(id, enabled);
    this.markerLayer.setOverlayEnabled(id, enabled);
    this.refresh();
  }

  toggle(id) {
    this.setEnabled(id, !this.state.get(id));
    return this.state.get(id);
  }

  isEnabled(id) {
    return !!this.state.get(id);
  }

  refresh() {
    this.markerLayer.clearMarkers();

    for (const [id, config] of this.providers.entries()) {
      if (!this.state.get(id)) continue;
      const markers = config.provider();
      markers.forEach((m) => {
        const date = m.time instanceof Date ? m.time : new Date(m.time);
        this.markerLayer.plotVerticalLine(date, m.title || m.label, m);
      });
    }
  }

  bindControlPanel(panelEl) {
    if (!panelEl) return;

    panelEl.querySelectorAll('[data-overlay]').forEach((btn) => {
      const id = btn.dataset.overlay;
      btn.classList.toggle('active', this.isEnabled(id));

      btn.addEventListener('click', () => {
        const enabled = this.toggle(id);
        btn.classList.toggle('active', enabled);
      });
    });
  }
}

window.OverlayManager = OverlayManager;
window.getLastMoonSignChangeTime = getLastMoonSignChangeTime;
window.getNextMoonSignChangeTime = getNextMoonSignChangeTime;
window.getLastGuruIngressTime = getLastGuruIngressTime;
window.getNextGuruIngressTime = getNextGuruIngressTime;
window.getGuruSign = getGuruSign;
