/**
 * EventBridge: thin relay between game systems and React.
 * Supports multiple listeners so HUDOverlay and BattleScene3D cleanup
 * cannot accidentally stomp each other.
 */
const EventBridge = {
  _listeners: [],

  /** Register a React setState callback. Returns an unsubscribe function. */
  setListener(fn) {
    if (!this._listeners.includes(fn)) {
      this._listeners.push(fn);
    }
    // Return an unsubscribe handle for convenience
    return () => this.removeListener(fn);
  },

  /** Remove a specific listener. */
  removeListener(fn) {
    this._listeners = this._listeners.filter(l => l !== fn);
  },

  /** Remove ALL listeners (used on full scene teardown). */
  clearListener() {
    this._listeners = [];
  },

  /** Emit a named event with a data payload to all registered listeners. */
  emit(event, data) {
    for (const fn of this._listeners) {
      try {
        fn({ event, data });
      } catch (err) {
        console.error('EventBridge: listener error for event', event, err);
      }
    }
  },
};

export default EventBridge;
