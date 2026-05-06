"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  /** Wat er moet gebeuren bij refresh — async function. */
  onRefresh: () => Promise<void> | void;
  /** Threshold in px voordat release een refresh triggert. Default 70. */
  threshold?: number;
  /** Maximale pull-distance (visueel begrensd). Default 120. */
  maxPull?: number;
  /** Selector voor elementen die de pull NIET mogen triggeren (bv. swipe-cards). */
  ignoreSelector?: string;
}

/**
 * Pull-to-refresh op het hele document. Negeert touches die starten in
 * elementen die matchen op `ignoreSelector` (bv. de drag-cards), zodat het
 * niet conflicteert met de bestaande swipe-mechaniek.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 120,
  ignoreSelector
}: Options) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armedRef = useRef(false);

  useEffect(() => {
    function isInIgnoreZone(target: EventTarget | null): boolean {
      if (!ignoreSelector || !target) return false;
      const el = target as HTMLElement;
      return !!el.closest?.(ignoreSelector);
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (isInIgnoreZone(e.target)) {
        armedRef.current = false;
        return;
      }
      armedRef.current = true;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!armedRef.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        // Resistance: kwadratische dempingsfunctie zodat de pull "zwaarder"
        // wordt naarmate je verder trekt.
        const damped = Math.min(maxPull, dy * 0.55);
        setPullDistance(damped);
      } else if (dy < 0) {
        // Bij omhoog-bewegen: reset (gebruiker wil niet refreshen)
        setPullDistance(0);
        armedRef.current = false;
        startY.current = null;
      }
    }

    async function onTouchEnd() {
      if (!armedRef.current) return;
      armedRef.current = false;
      const should = pullDistance >= threshold;
      startY.current = null;
      if (should) {
        setRefreshing(true);
        setPullDistance(threshold * 0.6);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [refreshing, threshold, maxPull, onRefresh, pullDistance, ignoreSelector]);

  return {
    pullDistance,
    refreshing,
    progress: Math.min(1, pullDistance / threshold),
    armed: pullDistance >= threshold
  };
}
