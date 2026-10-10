/**
 * Navigation History Manager for PromptG
 * Intercepts mobile edge swipe gestures, Android back button,
 * and browser navigation so overlays, modals, and sub-views close
 * one step at a time instead of closing or exiting the entire web app.
 */

interface BackEntry {
  id: string;
  name: string;
  onBack: () => void;
}

const stack: BackEntry[] = [];
let internalBackCount = 0;
let isInitialized = false;

function ensureInitialized() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  try {
    if (!window.history.state?.promptg_root) {
      window.history.replaceState({ promptg_root: true }, '');
    }
  } catch (err) {
    console.warn('Failed to initialize history state:', err);
  }

  window.addEventListener('popstate', () => {
    // If popstate was triggered by programmatic history.back(), consume and ignore
    if (internalBackCount > 0) {
      internalBackCount--;
      return;
    }

    // User performed a hardware back / swipe back gesture
    if (stack.length > 0) {
      const top = stack.pop()!;
      try {
        top.onBack();
      } catch (err) {
        console.error('Error executing back handler for', top.name, err);
      }
    }
  });
}

/**
 * Register a back handler. Pushes a history state so back gestures are trapped.
 * Returns an unregister function to call when closing programmatically.
 */
export function registerBackHandler(
  id: string,
  onBack: () => void,
  name = 'overlay'
): () => void {
  if (typeof window === 'undefined') return () => {};
  ensureInitialized();

  try {
    window.history.pushState({ promptg_id: id, name }, '');
  } catch (err) {
    console.warn('Failed to push state for', name, err);
  }

  stack.push({ id, name, onBack });

  return () => {
    const idx = stack.findIndex((item) => item.id === id);
    if (idx !== -1) {
      stack.splice(idx, 1);
      try {
        internalBackCount++;
        window.history.back();
        // Failsafe timer to reset internalBackCount if popstate is swallowed
        setTimeout(() => {
          if (internalBackCount > 0) internalBackCount = 0;
        }, 300);
      } catch (err) {
        console.warn('Failed to pop history for', name, err);
      }
    }
  };
}
