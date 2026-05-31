import { useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import { useSpliceGateway } from './hooks/useSpliceGateway';
import type { SemanticNode } from './hooks/useSpliceGateway';

function flattenTree(node: SemanticNode): SemanticNode[] {
  let nodes: SemanticNode[] = [];
  if (node.rect) {
    nodes.push(node);
  }
  if (node.children) {
    node.children.forEach(child => {
      nodes = nodes.concat(flattenTree(child));
    });
  }
  return nodes;
}

function App() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const {
    connected,
    sessionStatus,
    screenshot,
    semanticTree,
    diagnosis,
    navigate
  } = useSpliceGateway(18789);

  const handleNavigate = (e: FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      navigate(urlInput);
    }
  };

  const semanticNodes = semanticTree ? flattenTree(semanticTree) : [];
  const feed = sessionStatus?.liveFeed?.feed || [];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="logo-box">S</div>
          <div className="brand-text">
            <h1>Nexus Core</h1>
            <p>Mission Control for Splice Agents</p>
          </div>
        </div>
        <div className="header-status">
          <div className="status-badge" style={{ backgroundColor: connected ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)', color: connected ? 'var(--accent-green)' : 'var(--accent-red)', borderColor: connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
            <div className={`status-dot ${connected ? 'pulse-green' : ''}`} style={{ backgroundColor: connected ? 'var(--accent-green)' : 'var(--accent-red)' }}></div>
            {connected ? 'System Online • Gateway Connected' : 'Disconnected from Gateway'}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="main-content">
        
        {/* Left Sidebar: Timeline View */}
        <aside className="sidebar">
          <div className="panel-header">
            Live Telemetry
          </div>
          <div className="timeline-list">
            <div className="timeline-track">
              {feed.length > 0 ? feed.map((event: any, i: number) => (
                <div key={i} className={`timeline-event ${i === 0 ? 'active' : ''}`}>
                  <div className="event-time">{new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                  <div className="event-title">
                    {event.detail || event.type}
                  </div>
                  <div className="event-agent">
                    <span style={{width: 6, height: 6, borderRadius: '50%', background: 'currentColor'}}></span>
                    {event.type}
                  </div>
                </div>
              )) : (
                <div style={{color: 'var(--text-tertiary)', fontSize: 12, padding: 16}}>No telemetry data yet. Connect to a session.</div>
              )}
            </div>
          </div>
        </aside>

        {/* Center: Live Overlay & Heatmap */}
        <section className="center-view">
          <div className="browser-chrome">
            <div className="browser-controls">
              <div className="control-dot red"></div>
              <div className="control-dot yellow"></div>
              <div className="control-dot green"></div>
            </div>
            <form onSubmit={handleNavigate} style={{ flex: 1, display: 'flex' }}>
              <input 
                className="url-bar"
                style={{ width: '100%', outline: 'none' }}
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder={sessionStatus?.url || "Enter URL and press Enter..."}
              />
            </form>
          </div>
          
          <div className="viewport-container" style={{
            backgroundImage: screenshot ? `url(${screenshot})` : 'none',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            alignItems: 'flex-start'
          }}>
            {!screenshot && <div style={{marginTop: '20%', color: 'var(--text-tertiary)'}}>Waiting for vision feed...</div>}
            
            {showHeatmap && <div className="heatmap-canvas animate-fade-in"></div>}
            
            {showHighlights && semanticNodes.map((node) => {
              if (!node.rect) return null;
              
              // Scale coordinates assuming the screenshot is rendered at a specific scale or 1:1.
              // For a robust implementation, you'd calculate the scale factor based on viewport size vs screenshot size.
              // Here we assume absolute positioning over a 1:1 image container or top-left aligned container.
              const { x, y, width, height } = node.rect;
              const isRisky = node.securityFlags && node.securityFlags.length > 0;
              const typeClass = isRisky ? 'risky' : 'safe';

              return (
                <div 
                  key={node.id} 
                  className={`highlight-box ${typeClass} animate-fade-in`}
                  style={{
                    left: `${x}px`, 
                    top: `${y}px`,
                    width: `${width}px`, 
                    height: `${height}px`,
                    position: 'absolute'
                  }}
                  title={node.text || node.attributes?.['aria-label'] || node.type}
                >
                  <div className="highlight-tooltip">
                    {node.text ? node.text.substring(0, 15) : node.type} <span className="confidence high">100%</span>
                  </div>
                </div>
              );
            })}

            <div className="view-toggles glass-panel" style={{position: 'absolute', bottom: 20}}>
              <button 
                className={`toggle-btn ${showHighlights ? 'active' : ''}`}
                onClick={() => setShowHighlights(!showHighlights)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Vision
              </button>
              <button 
                className={`toggle-btn ${showHeatmap ? 'active' : ''}`}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Ghost Trails
              </button>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Predictions & Explanations */}
        <aside className="right-panel">
          <div className="panel-header">
            Intelligence
          </div>
          
          <div className="prediction-panel">
            {/* Live Diagnosis */}
            <div className="insight-card animate-fade-in">
              <div className="insight-header">
                <svg className="insight-icon" style={{color: 'var(--accent-green)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span className="insight-title">State Forensics</span>
              </div>
              <div className="insight-body">
                {diagnosis ? (
                  <>
                    State: <strong>{diagnosis.state}</strong><br />
                    {diagnosis.summary}
                  </>
                ) : 'Awaiting diagnostics...'}
              </div>
              
              <div className="action-grid">
                <button className="btn-secondary" onClick={() => setModalOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="21" x2="15" y2="15"></line><line x1="9" y1="8" x2="15" y2="14"></line><line x1="15" y1="8" x2="9" y2="14"></line></svg>
                  Analyze
                </button>
              </div>
            </div>

            {/* Explanations Trigger */}
            <div style={{marginTop: 'auto', paddingTop: '20px'}}>
              <button 
                className="btn-secondary" 
                style={{width: '100%', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: 'var(--accent-blue)'}}
                onClick={() => setModalOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Generate Audit Report
              </button>
            </div>
          </div>
        </aside>

      </main>

      {/* One-Click Explanations Modal */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={() => setModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Live Diagnostics</div>
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <h3 style={{marginBottom: 12, fontSize: 18}}>Current Session State</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14}}>
              {diagnosis?.summary || 'No recent diagnosis.'}
            </p>
            
            <div style={{background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)', marginBottom: 20, maxHeight: 300, overflowY: 'auto'}}>
              <pre style={{fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--accent-green)', margin: 0, whiteSpace: 'pre-wrap'}}>
                {JSON.stringify(diagnosis, null, 2)}
              </pre>
            </div>
            
            <button className="btn-primary" onClick={() => setModalOpen(false)}>Acknowledge & Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
