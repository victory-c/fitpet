/* Capture-only bridge: no Electron, filesystem, CLI or real pet state. */
(() => {
  const epoch = 1792497600000;
  let elapsed = 0;
  let nextId = 1;
  const queue = new Map();
  const RealDate = Date;
  class CaptureDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [epoch + elapsed])); }
    static now() { return epoch + elapsed; }
  }
  window.Date = CaptureDate;
  Object.defineProperty(performance, 'now', { value: () => elapsed });
  Object.defineProperty(performance, 'timeOrigin', { value: epoch });
  window.requestAnimationFrame = callback => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = id => queue.delete(id);
  const state = fetch('./fixture.json').then(response => {
    if (!response.ok) throw new Error('Fixture unavailable');
    return response.json();
  });
  window.fitpet = {
    getState: () => state.then(s => { window.__capture.loaded = true; return structuredClone(s); }),
    onState: callback => { state.then(s => callback(structuredClone(s))); return () => {}; },
  };
  window.__capture = {
    loaded: false,
    step(ms = 33.34) {
      if (ms < 33.34) throw new Error('Renderer needs >=33.34ms per step');
      elapsed += ms;
      const batch = [...queue.values()];
      queue.clear();
      for (const callback of batch) callback(elapsed);
      return { elapsed, epoch: Date.now(), performance: performance.now(), queued: queue.size };
    },
  };
})();