"use client";

import { useEffect, type RefObject } from "react";
import { underwater } from "./store";

/**
 * Unified pointer + touch tracking for the underwater scene.
 *
 * A single set of PointerEvent listeners handles mouse, touch and pen:
 *  - mouse: `pointermove` marks the target active, `pointerleave` releases it
 *  - touch: `pointerdown` engages, `pointermove` steers, `pointerup`/`pointercancel` releases
 *
 * The hero container uses `touch-action: pan-y`, so vertical drags scroll the
 * page normally while horizontal / stationary touches drive the koi.
 */
export function usePointerTarget(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const setFromEvent = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      underwater.pointer.ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      underwater.pointer.ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      underwater.pointer.active = true;
      underwater.pointer.lastMoveAt = performance.now();
      if (!underwater.pointer.hasInteracted) {
        underwater.pointer.hasInteracted = true;
        underwater.onFirstInteraction?.();
      }
    };

    const onMove = (e: PointerEvent) => setFromEvent(e);
    const onDown = (e: PointerEvent) => setFromEvent(e);
    const release = () => {
      underwater.pointer.active = false;
      underwater.pointer.lastMoveAt = performance.now();
    };
    const onLeave = release;
    const onCancel = release;

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerdown", onDown, { passive: true });
    el.addEventListener("pointerup", release, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    el.addEventListener("pointercancel", onCancel, { passive: true });

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [containerRef]);
}
