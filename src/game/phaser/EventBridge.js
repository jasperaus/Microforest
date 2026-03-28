/**
 * EventBridge: thin relay between Phaser and React.
 * Phaser calls bridge.emit(...) → React setState updates → HUD re-renders.
 */
const EventBridge = {
  _listener: null,

  /** Register the React setState callback. Called from index.jsx. */
  setListener(fn) {
    this._listener = fn;
  },

  clearListener() {
    this._listener = null;
  },

  /** Emit a named event with a data payload to React. */
  emit(event, data) {
    if (this._listener) {
      this._listener({ event, data });
    }
  },
};

export default EventBridge;
