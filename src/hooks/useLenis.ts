import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Custom hook to initialize Lenis smooth scrolling.
 * Automatically pauses smooth scrolling when modals are open so internal modal scrolling is 100% native and smooth.
 */
export function useLenis(isModalOpen = false) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.3,
      infinite: false,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Pause page smooth scroll and lock background scroll when a modal dialog is open
  useEffect(() => {
    if (isModalOpen) {
      if (lenisRef.current) {
        lenisRef.current.stop();
      }
      const prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.documentElement.style.overflow = prevOverflow;
        if (lenisRef.current) {
          lenisRef.current.start();
        }
      };
    } else {
      if (lenisRef.current) {
        lenisRef.current.start();
      }
    }
  }, [isModalOpen]);

  return lenisRef;
}
