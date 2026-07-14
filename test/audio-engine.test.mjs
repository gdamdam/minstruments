import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudioEngine, centsToRatio, ratioToCents } from '../guides/microtuning/audio.js';

// --- Fake Web Audio graph -------------------------------------------------
// Minimal stand-ins that record the calls the engine makes, so we can assert
// that nodes are created, started, stopped, and disconnected correctly.
function makeParam() {
  return {
    value: 0,
    setValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    cancelScheduledValues() { return this; },
  };
}

function makeFakeContext() {
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    resumed: 0,
    closed: 0,
    oscillators: [],
    gains: [],
    filters: [],
    destination: { id: 'destination' },
    resume() { this.resumed += 1; this.state = 'running'; },
    close() { this.closed += 1; this.state = 'closed'; },
    createGain() {
      const node = { gain: makeParam(), connections: 0, disconnected: 0,
        connect() { this.connections += 1; }, disconnect() { this.disconnected += 1; } };
      this.gains.push(node);
      return node;
    },
    createBiquadFilter() {
      const node = { type: '', frequency: makeParam(), Q: makeParam(),
        connect() {}, disconnect() {} };
      this.filters.push(node);
      return node;
    },
    createOscillator() {
      const node = { type: '', frequency: makeParam(), started: 0, stopped: 0, disconnected: 0,
        connect() {}, start() { this.started += 1; }, stop() { this.stopped += 1; }, disconnect() { this.disconnected += 1; } };
      this.oscillators.push(node);
      return node;
    },
  };
  return ctx;
}

test('centsToRatio / ratioToCents are inverses for known intervals', () => {
  assert.ok(Math.abs(centsToRatio(1200) - 2) < 1e-9);
  assert.ok(Math.abs(ratioToCents(3 / 2) - 701.955) < 0.01);
  assert.ok(Math.abs(ratioToCents(5 / 4) - 386.314) < 0.01);
});

test('context is created lazily and resumed on first play', () => {
  let created = 0;
  let ctx;
  const engine = createAudioEngine(() => { created += 1; ctx = makeFakeContext(); return ctx; });
  assert.equal(created, 0, 'no context before first play');
  engine.play({ id: 'x', label: 'x', freqs: [220, 330] });
  assert.equal(created, 1, 'context created on first play');
  assert.equal(ctx.resumed, 1, 'suspended context resumed');
});

test('an interval creates and starts one oscillator per frequency', () => {
  const ctx = makeFakeContext();
  const engine = createAudioEngine(() => ctx);
  engine.play({ id: 'third', label: 'third', freqs: [220, 277] });
  assert.equal(ctx.oscillators.length, 2);
  assert.ok(ctx.oscillators.every((o) => o.started === 1));
  assert.equal(engine.currentId(), 'third');
});

test('starting a new demo stops the previous one (single-group invariant)', () => {
  const ctx = makeFakeContext();
  const engine = createAudioEngine(() => ctx);
  engine.play({ id: 'a', label: 'a', freqs: [220, 330] });
  const first = ctx.oscillators.slice();
  engine.play({ id: 'b', label: 'b', freqs: [220, 440] });
  // the first group's oscillators must have been stopped
  assert.ok(first.every((o) => o.stopped >= 1), 'previous oscillators stopped');
  assert.equal(engine.currentId(), 'b');
  // total oscillators = 2 (first) + 2 (second); never accumulating live groups
  assert.equal(ctx.oscillators.length, 4);
});

test('stop() tears down and reports idle state', () => {
  const ctx = makeFakeContext();
  const states = [];
  const engine = createAudioEngine(() => ctx, (s) => states.push(s));
  engine.play({ id: 'a', label: 'A demo', freqs: [220, 330] });
  engine.stop();
  assert.equal(engine.currentId(), null);
  assert.ok(ctx.oscillators.every((o) => o.stopped >= 1));
  assert.deepEqual(states.at(-1), { id: null, label: null });
  assert.deepEqual(states.at(0), { id: 'a', label: 'A demo' });
});

test('dispose() stops audio and closes the context', () => {
  const ctx = makeFakeContext();
  const engine = createAudioEngine(() => ctx);
  engine.play({ id: 'a', label: 'a', freqs: [220] });
  engine.dispose();
  assert.equal(ctx.closed, 1);
  assert.equal(engine.currentId(), null);
});
