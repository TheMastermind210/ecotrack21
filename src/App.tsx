import { useEffect, useState, lazy, Suspense, FormEvent } from 'react';
import { Layout } from './components/Layout';
import { CommandBar } from './components/CommandBar';
import { DataStrip } from './components/DataStrip';
import { ActivityFeed } from './components/ActivityFeed';
import { useCarbonIntelligence } from './layers/ai/useCarbonIntelligence';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePersistentHistory } from './hooks/usePersistentHistory';
import { useEnvironmentalData } from './hooks/useEnvironmentalData';
import { useAttributionNarrative } from './hooks/useAttributionNarrative';
import init, { carbon_calc } from '../pkg/carbon_engine';
import type { HistoryEntry } from './types';
import { OnboardingModal } from './components/OnboardingModal';
import { getDemoData } from './constants/demoData';
import './index.css';

const Scope3Graph = lazy(() => import('./layers/ui/Scope3Graph').then(m => ({ default: m.Scope3Graph })));
const AttributionPanel = lazy(() => import('./components/AttributionPanel').then(m => ({ default: m.AttributionPanel })));

function App() {
  const [narrativesEnabled, setNarrativesEnabled] = useState(
    sessionStorage.getItem('ecotrack_narratives_enabled') === 'true',
  );
  const [inputText, setInputText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [wasmReady, setWasmReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { parseActivity, getAttributionNarrative, isProcessing } = useCarbonIntelligence();
  const { history, setHistory, storageError } = usePersistentHistory();
  const { supplyChainData, noaaPpm, dataError } = useEnvironmentalData();
  const { narrative, narrativeError } = useAttributionNarrative(
    history,
    narrativesEnabled,
    getAttributionNarrative,
  );

  useEffect(() => {
    let active = true;
    init()
      .then(() => {
        if (active) setWasmReady(true);
      })
      .catch(() => {
        if (active) setSubmitError('The calculation engine could not be initialized.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (history.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [history.length]);

  const handleDemoData = () => {
    setHistory(getDemoData());
    setShowOnboarding(false);
  };

  const handleSubmitActivity = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!inputText.trim()) {
      return;
    }
    if (!wasmReady) {
      setSubmitError('WASM engine not ready yet. Please wait a moment.');
      return;
    }
    
    try {
      const parsed = await parseActivity(inputText);
      if (parsed.clarification_needed || parsed.confidence < 0.7) {
        throw new Error('Please add a quantity and unit so the activity can be calculated reliably.');
      }
      const payload = JSON.stringify({ category: parsed.category, quantity: parsed.quantity });
      const co2_kg = carbon_calc(payload);
      
      if (!Number.isFinite(co2_kg) || co2_kg < 0) {
        throw new Error('The calculation engine rejected this activity.');
      }

      const entry: HistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        activity: parsed.activity,
        category: parsed.category,
        quantity: parsed.quantity,
        unit: parsed.unit,
        co2_kg: Number(co2_kg.toFixed(2))
      };
      setHistory(prev => [entry, ...prev]);
      setInputText('');
    } catch (err: unknown) {

      setSubmitError(err instanceof Error ? err.message : 'Failed to process activity.');
    }
  };

  const handleNarrativesEnabledChange = (enabled: boolean) => {
    setNarrativesEnabled(enabled);
    sessionStorage.setItem('ecotrack_narratives_enabled', String(enabled));
  };

  return (
    <>
      <OnboardingModal 
        show={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
        onDemoData={handleDemoData}
      />
      <Layout
        commandBar={
          <ErrorBoundary>
            <div className="app-layout-wrapper">
              <CommandBar 
                inputText={inputText}
                setInputText={setInputText}
                onSubmit={handleSubmitActivity}
                isProcessing={isProcessing}
                noaaPpm={noaaPpm}
              />
            {(submitError || storageError || dataError || narrativeError) && (
              <div className="app-error-banner" role="alert">
                {submitError || storageError || dataError || narrativeError}
              </div>
            )}
          </div>
          </ErrorBoundary>
        }
        dataStrip={<DataStrip history={history} noaaPpm={noaaPpm} />}
        intelligencePanelLeft={
          <ErrorBoundary>
            <Suspense fallback={
              <div className="app-loading-state">
                Loading supply chain graph...
              </div>
            }>
              {supplyChainData.length > 0 ? (
                <Scope3Graph data={supplyChainData} />
              ) : (
                <div className="app-loading-state">
                  Loading graph data...
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        }
        intelligencePanelRight={
          <>
            <ErrorBoundary>
              <ActivityFeed history={history} />
            </ErrorBoundary>
            <ErrorBoundary>
              <Suspense fallback={
                <div className="app-loading-state-small">
                  Loading insights...
                </div>
              }>
                <AttributionPanel
                  history={history}
                  narrative={narrative}
                  narrativesEnabled={narrativesEnabled}
                  onNarrativesEnabledChange={handleNarrativesEnabledChange}
                />
              </Suspense>
            </ErrorBoundary>
          </>
        }
      />

    </>
  );
}

export default App;
