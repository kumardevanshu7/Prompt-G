import { useEffect, useRef } from 'react';
import { registerBackHandler } from '../utils/navigationHistory';

/**
 * Custom hook to register an active back handler.
 * When `isOpen` is true, a history state is pushed.
 * When the user performs a back swipe or hardware back button press,
 * `onBack` is called instead of navigating away or exiting the app.
 */
export function useBackHandler(
  isOpen: boolean,
  onBack: () => void,
  name = 'overlay'
) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isOpen) return;

    const id = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const unregister = registerBackHandler(
      id,
      () => {
        onBackRef.current();
      },
      name
    );

    return () => {
      unregister();
    };
  }, [isOpen, name]);
}
