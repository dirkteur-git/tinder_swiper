"use client";

import { useEffect, useState } from "react";

const KEY = "vondr-handedness";
export type Handedness = "right" | "left";

export function getHandedness(): Handedness {
  if (typeof window === "undefined") return "right";
  const v = window.localStorage.getItem(KEY);
  return v === "left" ? "left" : "right";
}

export function setHandedness(h: Handedness): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, h);
  // Trigger our own event zodat alle componenten in dezelfde tab updaten
  window.dispatchEvent(new CustomEvent("vondr-handedness-change"));
}

export function useHandedness(): Handedness {
  const [h, setH] = useState<Handedness>("right");

  useEffect(() => {
    setH(getHandedness());
    function refresh() {
      setH(getHandedness());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) refresh();
    }
    window.addEventListener("vondr-handedness-change", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("vondr-handedness-change", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return h;
}
