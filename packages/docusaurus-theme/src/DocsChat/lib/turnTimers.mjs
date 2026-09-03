// @ts-check
// Dwa niezależne timery jednej tury czatu:
//  - nieaktywności (zerowany każdym chunkiem) — zawieszony strumień,
//  - całej tury (armowany raz) — backend strumieniujący bez końca.
// Wydzielone z hooka, bo pierwsza wersja kasowała timer tury przy każdym chunku (no-op) —
// test poniżej pilnuje, że rearm nieaktywności NIE dotyka timera tury.
/**
 * @param {{
 *   inactivityMs: number,
 *   turnMs: number,
 *   onTimeout: () => void,
 *   setTimeoutImpl?: typeof setTimeout,
 *   clearTimeoutImpl?: typeof clearTimeout,
 * }} options
 */
export function createTurnTimers({ inactivityMs, turnMs, onTimeout, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout }) {
  /** @type {ReturnType<typeof setTimeout>|null} */
  let inactivity = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let turn = null;
  let active = false; // między start() a clear()/timeoutem — spóźniony activity() nic nie armuje
  const clearInactivity = () => {
    if (inactivity) {
      clearTimeoutImpl(inactivity);
      inactivity = null;
    }
  };
  const clearAll = () => {
    active = false;
    clearInactivity();
    if (turn) {
      clearTimeoutImpl(turn);
      turn = null;
    }
  };
  return {
    /** start tury: oba timery */
    start() {
      clearAll();
      active = true;
      turn = setTimeoutImpl(() => {
        clearAll();
        onTimeout();
      }, turnMs);
      this.activity();
    },
    /** chunk przyszedł: TYLKO timer nieaktywności od nowa */
    activity() {
      if (!active) return;
      clearInactivity();
      inactivity = setTimeoutImpl(() => {
        clearAll();
        onTimeout();
      }, inactivityMs);
    },
    clear: clearAll,
  };
}
