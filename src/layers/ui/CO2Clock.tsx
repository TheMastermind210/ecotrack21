import React, { useEffect, useRef, useState } from 'react';

// Hardcoded fallback baseline as per error-handling specs
const FALLBACK_PPM = 421.08; 

/** Real-time atmospheric CO₂ counter using requestAnimationFrame for smooth PPM increments. */
export const CO2Clock: React.FC<{ initialPpm?: number; compact?: boolean }> = ({ initialPpm, compact }) => {
  const [ppm, setPpm] = useState(initialPpm || FALLBACK_PPM);
  const [announcedPpm, setAnnouncedPpm] = useState(initialPpm || FALLBACK_PPM);
  const [tick, setTick] = useState(false);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    const interval = setInterval(() => setAnnouncedPpm(ppm), 5000);
    return () => clearInterval(interval);
  }, [ppm]);

  useEffect(() => {
    let isVisible = document.visibilityState === 'visible';
    let tickTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animate);
      } else if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (time: number) => {
      if (!isVisible) return;
      const delta = time - lastTimeRef.current;
      if (delta > 150) { // Update visually every 150ms
        setPpm(prev => prev + 0.000005);
        setTick(true);
        if (tickTimeout) clearTimeout(tickTimeout);
        tickTimeout = setTimeout(() => setTick(false), 50);
        lastTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isVisible) {
      requestRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (tickTimeout) clearTimeout(tickTimeout);
    };
  }, []);

  const hiddenAriaLabel = (
    <div 
      aria-live="polite" 
      className="sr-only"
    >
      {`Current atmospheric CO2 is ${announcedPpm.toFixed(3)} parts per million`}
    </div>
  );

  if (compact) {
    return (
      <div className="co2clock-compact">
        {hiddenAriaLabel}
        <div className="co2clock-compact-display" aria-hidden="true">
          <span className="text-caption">LIVE CO₂</span>
          <span className={`text-hero-number co2clock-compact-value ${tick ? 'animate-tick' : ''}`}>
            {ppm.toFixed(4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel co2clock-full">
      {hiddenAriaLabel}
      <div aria-hidden="true">
        <h3 className="text-caption co2clock-label">
          Live Atmospheric CO₂
        </h3>
        <div className={`text-hero-number co2clock-value ${tick ? 'animate-tick' : ''}`}>
          {ppm.toFixed(4)} <span className="text-body">ppm</span>
        </div>
        <p className="text-caption co2clock-source">
          Baseline: NOAA Global Monitoring
        </p>
      </div>
    </div>
  );
};
