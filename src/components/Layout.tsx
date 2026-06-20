import React from 'react';

/** Three-zone responsive layout: sticky command bar, data strip, and split intelligence panels. */
export const Layout: React.FC<{
  commandBar: React.ReactNode;
  dataStrip: React.ReactNode;
  intelligencePanelLeft: React.ReactNode;
  intelligencePanelRight: React.ReactNode;
}> = ({ commandBar, dataStrip, intelligencePanelLeft, intelligencePanelRight }) => {
  return (
    <div className="layout-root">
      {/* Zone 1: Command Bar */}
      <div className="layout-command-bar-zone">
        {commandBar}
      </div>

      {/* Zone 2: Data Strip */}
      <div className="layout-data-strip-zone">
        {dataStrip}
      </div>

      {/* Zone 3: Intelligence Panel */}
      <div className="layout-intelligence-grid responsive-grid">
        <div className="glass-panel layout-graph-panel">
          <h3 className="text-section-header layout-graph-title">Scope 3 Supply Chain Network</h3>
          <div className="layout-graph-body">
            {intelligencePanelLeft}
          </div>
        </div>

        <div className="layout-right-panel">
          {intelligencePanelRight}
        </div>
      </div>
    </div>
  );
};
