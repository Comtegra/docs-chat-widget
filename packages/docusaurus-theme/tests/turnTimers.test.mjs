import { test, mock } from "node:test";
import assert from "node:assert/strict";

import { createTurnTimers } from "../src/DocsChat/lib/turnTimers.mjs";

test("timer całej tury przeżywa rearm nieaktywności i odpala po turnMs mimo ciągłych chunków", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    let fired = 0;
    const timers = createTurnTimers({ inactivityMs: 30_000, turnMs: 300_000, onTimeout: () => (fired += 1) });
    timers.start();
    for (let t = 0; t < 300_000; t += 10_000) {
      mock.timers.tick(10_000);
      timers.activity(); // chunk co 10 s — nieaktywność nigdy nie odpali
    }
    assert.equal(fired, 1, "timer tury musi odpalić dokładnie raz");
    mock.timers.tick(60_000);
    assert.equal(fired, 1, "po timeoucie tury nic więcej nie strzela");
  } finally {
    mock.timers.reset();
  }
});

test("bez chunków odpala timer nieaktywności; clear() gasi oba", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    let fired = 0;
    const timers = createTurnTimers({ inactivityMs: 30_000, turnMs: 300_000, onTimeout: () => (fired += 1) });
    timers.start();
    mock.timers.tick(30_000);
    assert.equal(fired, 1);
    mock.timers.tick(300_000);
    assert.equal(fired, 1, "timer tury został zgaszony razem z nieaktywnością");

    const second = createTurnTimers({ inactivityMs: 30_000, turnMs: 300_000, onTimeout: () => (fired += 1) });
    second.start();
    second.clear();
    mock.timers.tick(400_000);
    assert.equal(fired, 1, "po clear() nic nie odpala");
  } finally {
    mock.timers.reset();
  }
});
