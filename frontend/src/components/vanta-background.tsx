"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type VantaEffect = { destroy: () => void };

declare global {
  interface Window {
    VANTA?: {
      FOG: (options: Record<string, unknown>) => VantaEffect;
    };
  }
}

export function VantaBackground() {
  const effectRef = useRef<VantaEffect | null>(null);
  const [threeReady, setThreeReady] = useState(false);
  const [vantaReady, setVantaReady] = useState(false);

  const startEffect = useCallback(() => {
    if (effectRef.current || !threeReady || !vantaReady || !window.VANTA?.FOG) return;

    effectRef.current = window.VANTA.FOG({
      el: "#vanta-background",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      highlightColor: 0x1c1c43,
      midtoneColor: 0x00137d,
      lowlightColor: 0x1c1c4d,
      baseColor: 0x000000,
      blurFactor: 0.78,
      speed: 2.8,
    });
  }, [threeReady, vantaReady]);

  useEffect(() => {
    startEffect();
    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [startEffect]);

  return (
    <>
      <div id="vanta-background" className="vanta-background" aria-hidden="true" />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setThreeReady(true)}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js"
        strategy="afterInteractive"
        onLoad={() => setVantaReady(true)}
      />
    </>
  );
}
