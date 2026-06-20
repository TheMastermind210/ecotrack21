import { useEffect, useState } from 'react';
import type { SupplyChainNode } from '../types';
import { FALLBACK_PPM, parseNoaaText } from '../utils/parseNoaa';
import { validateSupplyChainData } from '../utils/supplyChain';

const isValidPpm = (value: number) =>
  Number.isFinite(value) && value >= 380 && value <= 450;

/** Loads NOAA atmospheric CO₂ data and supply chain graph nodes on mount. Validates all external data. */
export function useEnvironmentalData() {
  const [supplyChainData, setSupplyChainData] = useState<SupplyChainNode[]>([]);
  const [noaaPpm, setNoaaPpm] = useState<number>();
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const [supplyResult, noaaResult] = await Promise.allSettled([
        fetch('/supply-chain.json', { signal: controller.signal })
          .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json() as Promise<unknown>;
          })
          .then(validateSupplyChainData),
        (async () => {
          const cached = Number(sessionStorage.getItem('noaa_ppm'));
          if (isValidPpm(cached)) return cached;

          const response = await fetch(
            'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_trend_gl.txt',
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const ppm = parseNoaaText(await response.text());
          sessionStorage.setItem('noaa_ppm', String(ppm));
          return ppm;
        })(),
      ]);

      if (supplyResult.status === 'fulfilled') {
        setSupplyChainData(supplyResult.value);
      } else if (supplyResult.reason?.name !== 'AbortError') {
        setDataError('Supply-chain visualization data could not be loaded.');
      }

      if (noaaResult.status === 'fulfilled') {
        setNoaaPpm(noaaResult.value);
      } else if (noaaResult.reason?.name !== 'AbortError') {
        setNoaaPpm(FALLBACK_PPM);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  return { supplyChainData, noaaPpm, dataError };
}
