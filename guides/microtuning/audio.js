/*
 * Microtuning guide — interactive audio demonstrations.
 *
 * A tiny, dependency-free Web Audio layer. The core (`createAudioEngine`) is
 * pure enough to unit-test with a fake AudioContext: it owns exactly one voice
 * group at a time, so demos can never accumulate into unexpectedly loud audio.
 * The DOM wiring (`initGuideAudio`) runs only in the browser.
 *
 * Design rules enforced here:
 *  - Audio context is created lazily, on the first user gesture.
 *  - Starting any demo stops the previous one (single-voice-group invariant).
 *  - Short gain envelopes avoid clicks on start/stop.
 *  - A conservative, count-normalised master gain keeps output level steady.
 *  - Everything is torn down on stop, page hide, and unmount.
 */

const MASTER_LEVEL = 0.16; // conservative peak, normalised across voice count
const ATTACK = 0.015; // seconds — short fade-in to avoid clicks
const RELEASE = 0.05; // seconds — short fade-out to avoid clicks

// cents -> frequency ratio
export const centsToRatio = (cents) => Math.pow(2, cents / 1200);
// ratio -> cents (used for labels / tests)
export const ratioToCents = (ratio) => 1200 * Math.log2(ratio);

/**
 * @param {() => AudioContext} ctxFactory  Injectable so tests pass a fake.
 * @param {(state: {id: string|null, label: string|null}) => void} [onState]
 */
export function createAudioEngine(ctxFactory, onState = () => {}) {
  let ctx = null;
  let master = null;
  let group = null; // { id, label, gain, oscillators:[], voiceGains:[] }

  function ensureContext() {
    if (!ctx) {
      ctx = ctxFactory();
      master = ctx.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
    return ctx;
  }

  function tearDownGroup(g, when) {
    if (!g) return;
    const t = when ?? (ctx ? ctx.currentTime : 0);
    // ramp the group down, then stop + disconnect the nodes
    try {
      g.gain.gain.cancelScheduledValues(t);
      g.gain.gain.setValueAtTime(g.gain.gain.value, t);
      g.gain.gain.linearRampToValueAtTime(0.0001, t + RELEASE);
    } catch { /* fake/edge contexts */ }
    g.oscillators.forEach((osc) => {
      try { osc.stop(t + RELEASE + 0.02); } catch { /* already stopped */ }
    });
    // disconnect shortly after the ramp so the release is heard, not clicked off
    const cleanup = () => {
      g.oscillators.forEach((o) => { try { o.disconnect(); } catch { /* noop */ } });
      g.voiceGains.forEach((vg) => { try { vg.disconnect(); } catch { /* noop */ } });
      try { g.gain.disconnect(); } catch { /* noop */ }
    };
    if (typeof setTimeout === 'function') setTimeout(cleanup, (RELEASE + 0.05) * 1000);
    else cleanup();
  }

  /**
   * Play a set of sustained tones (an "interval" is just two frequencies).
   * @param {{id: string, label: string, freqs: number[]}} spec
   */
  function play(spec) {
    const context = ensureContext();
    // Single-group invariant: kill whatever is currently sounding first.
    if (group) { tearDownGroup(group); group = null; }

    const t = context.currentTime;
    const groupGain = context.createGain();
    groupGain.gain.value = 0.0001;
    groupGain.connect(master);

    const oscillators = [];
    const voiceGains = [];
    const n = spec.freqs.length || 1;
    spec.freqs.forEach((freq) => {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      // Warm timbre: roll off upper partials so tuning differences stay clear
      // without harshness.
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.6;
      const vg = context.createGain();
      vg.gain.value = 1 / n; // normalise so total level is independent of voice count
      osc.connect(filter);
      filter.connect(vg);
      vg.connect(groupGain);
      osc.start(t);
      oscillators.push(osc);
      voiceGains.push(vg);
    });

    // attack envelope
    try {
      groupGain.gain.cancelScheduledValues(t);
      groupGain.gain.setValueAtTime(0.0001, t);
      groupGain.gain.linearRampToValueAtTime(1, t + ATTACK);
    } catch { /* fake contexts */ }

    group = { id: spec.id, label: spec.label, gain: groupGain, oscillators, voiceGains };
    onState({ id: spec.id, label: spec.label });
    return group;
  }

  function stop() {
    if (group) { tearDownGroup(group); group = null; }
    onState({ id: null, label: null });
  }

  function currentId() { return group ? group.id : null; }

  function dispose() {
    stop();
    if (ctx && typeof ctx.close === 'function') { try { ctx.close(); } catch { /* noop */ } }
    ctx = null;
    master = null;
  }

  return { play, stop, currentId, dispose, ensureContext };
}

// --- DOM wiring (browser only) -------------------------------------------
export function initGuideAudio(root = document) {
  const prefersReduced = typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bar = root.querySelector('[data-audio-bar]');
  const nowPlaying = root.querySelector('[data-now-playing]');
  const liveRegion = root.querySelector('[data-audio-live]');
  const stopBtn = root.querySelector('[data-audio-stop]');
  const demoButtons = Array.from(root.querySelectorAll('[data-play]'));
  const markers = Array.from(root.querySelectorAll('[data-marker-for]'));

  const announce = (msg) => { if (liveRegion) liveRegion.textContent = msg; };
  const syncMarkers = (id) => markers.forEach((m) => {
    m.classList.toggle('is-active', m.dataset.markerFor === id);
  });

  const engine = createAudioEngine(
    () => new (window.AudioContext || window.webkitAudioContext)(),
    ({ id, label }) => {
      demoButtons.forEach((btn) => {
        const pressed = btn.dataset.play === id;
        btn.setAttribute('aria-pressed', String(pressed));
        const labelEl = btn.querySelector('[data-btn-label]');
        if (labelEl && btn.dataset.labelPlay && btn.dataset.labelStop) {
          labelEl.textContent = pressed ? btn.dataset.labelStop : btn.dataset.labelPlay;
        }
      });
      if (bar) bar.classList.toggle('is-visible', Boolean(id));
      if (nowPlaying) nowPlaying.textContent = label ? `Playing: ${label}` : '';
      stopBeatVisuals();
      syncMarkers(id);
      if (id) {
        announce(`Playing ${label}.`);
        startBeatVisualFor(id);
      } else {
        announce('Audio stopped.');
      }
    },
  );

  // Parse a demo button's frequency spec from data attributes.
  // data-base (Hz, default 220), and either data-cents="400,0" or data-ratio.
  function specFor(btn) {
    const base = Number(btn.dataset.base || 220);
    const id = btn.dataset.play;
    const label = btn.dataset.label || id;
    let freqs;
    if (btn.dataset.freqs != null) {
      freqs = btn.dataset.freqs.split(',').map((f) => Number(f.trim()));
    } else if (btn.dataset.cents != null) {
      freqs = btn.dataset.cents.split(',').map((c) => base * centsToRatio(Number(c.trim())));
    } else if (btn.dataset.ratio != null) {
      // ratios like "1,3/2" or "1,5/4"
      freqs = btn.dataset.ratio.split(',').map((r) => {
        const [a, b] = r.split('/').map(Number);
        return base * (b ? a / b : a);
      });
    } else {
      freqs = [base];
    }
    return { id, label, freqs };
  }

  demoButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (engine.currentId() === btn.dataset.play) {
        engine.stop();
      } else {
        engine.play(specFor(btn));
      }
    });
  });

  if (stopBtn) stopBtn.addEventListener('click', () => engine.stop());

  // --- Beating lamp visual (tied to the active demo) ---
  const beatLamps = Array.from(root.querySelectorAll('[data-beat-lamp]'));
  let beatTimer = null;

  function stopBeatVisuals() {
    beatLamps.forEach((l) => { l.classList.remove('is-on'); l.style.animation = ''; });
    if (beatTimer) { clearInterval(beatTimer); beatTimer = null; }
  }

  function startBeatVisualFor(id) {
    const lamp = beatLamps.find((l) => l.dataset.beatLamp === id);
    if (!lamp) return;
    const rate = Number(lamp.dataset.beatRate || 0); // beats per second
    if (!rate) return;
    if (prefersReduced) {
      // No motion: leave the caption to communicate the rate; light steady.
      lamp.classList.add('is-on');
      return;
    }
    const periodMs = 1000 / rate;
    let on = false;
    beatTimer = setInterval(() => {
      on = !on;
      lamp.classList.toggle('is-on', on);
    }, periodMs / 2);
  }

  // Clean up audio when the user leaves or hides the page.
  const teardown = () => engine.dispose();
  window.addEventListener('pagehide', teardown);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') engine.stop();
  });

  return engine;
}

// --- Reading progress + ToC scrollspy (browser only) ---------------------
export function initGuideNav(root = document) {
  const progress = root.querySelector('[data-reading-progress]');
  const chapters = Array.from(root.querySelectorAll('.guide-chapter[id]'));

  // The ToC is a <details> so it collapses on narrow screens (its summary is
  // hidden on wide screens, where the list is always shown in the sticky rail).
  // It ships `open` so it works without JS; here we collapse it on small screens.
  const toc = root.querySelector('[data-toc]');
  if (toc && typeof matchMedia !== 'undefined') {
    const mq = matchMedia('(max-width: 939px)');
    const applyToc = () => { toc.open = !mq.matches; };
    applyToc();
    mq.addEventListener('change', applyToc);
    // Collapse the mobile menu after picking a chapter.
    toc.addEventListener('click', (e) => {
      if (e.target.closest('a') && mq.matches) toc.open = false;
    });
  }
  const tocLinks = Array.from(root.querySelectorAll('[data-toc] a'));
  const linkById = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));

  const onScroll = () => {
    if (progress) {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0;
      progress.style.width = `${pct}%`;
    }
  };

  if ('IntersectionObserver' in window && chapters.length) {
    const seen = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) seen.add(entry.target.id);
        else seen.delete(entry.target.id);
      });
      // highlight the topmost visible chapter
      const current = chapters.find((c) => seen.has(c.id));
      tocLinks.forEach((a) => a.classList.remove('is-current'));
      if (current && linkById.has(current.id)) {
        linkById.get(current.id).classList.add('is-current');
      }
    }, { rootMargin: '-72px 0px -60% 0px', threshold: 0 });
    chapters.forEach((c) => observer.observe(c));
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

if (typeof document !== 'undefined') {
  const start = () => { initGuideAudio(); initGuideNav(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
