import { useState } from 'react';
import './App.css';

// Mock Data
const MOCK_HIGHLIGHTS = [
  { id: 'btn-1', type: 'safe', x: 75, y: 30, w: 120, h: 40, label: 'Safe Click', confidence: '99%' },
  { id: 'input-email', type: 'risky', x: 40, y: 50, w: 300, h: 45, label: 'Form Input', confidence: '82%' },
  { id: 'modal-overlay', type: 'blocker', x: 50, y: 50, w: 400, h: 300, isCenter: true, label: 'Obstruction', confidence: '94%' },
];

const MOCK_TIMELINE = [
  { id: 't1', time: '10:42:01', title: 'Navigation started', agent: 'Explorer', status: 'past' },
  { id: 't2', time: '10:42:04', title: 'Page stabilized', agent: 'Verifier', status: 'past' },
  { id: 't3', time: '10:42:05', title: 'Modal detected', agent: 'Auditor', status: 'past', isAlert: true },
  { id: 't4', time: '10:42:07', title: 'Evaluating dismiss paths', agent: 'Executor', status: 'active' },
  { id: 't5', time: '10:42:08', title: 'Alternative: Fill modal', agent: 'Executor', status: 'parallel' },
];

function App() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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
          <div className="status-badge">
            <div className="status-dot pulse-green"></div>
            System Online • 5 Agents Active
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="main-content">
        
        {/* Left Sidebar: Timeline View */}
        <aside className="sidebar">
          <div className="panel-header">
            Parallel Timeline
          </div>
          <div className="timeline-list">
            <div className="timeline-track">
              {MOCK_TIMELINE.map(event => (
                <div key={event.id} className={`timeline-event ${event.status === 'active' ? 'active' : ''}`} style={{ opacity: event.status === 'parallel' ? 0.7 : 1 }}>
                  <div className="event-time">{event.time}</div>
                  <div className="event-title" style={{ color: event.isAlert ? 'var(--accent-red)' : 'inherit' }}>
                    {event.title}
                  </div>
                  <div className="event-agent">
                    <span style={{width: 6, height: 6, borderRadius: '50%', background: 'currentColor'}}></span>
                    {event.agent}
                  </div>
                </div>
              ))}
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
            <div className="url-bar">
              https://demo.acmecorp.com/dashboard
            </div>
          </div>
          
          <div className="viewport-container">
            {showHeatmap && <div className="heatmap-canvas animate-fade-in"></div>}
            
            {showHighlights && MOCK_HIGHLIGHTS.map(hl => (
              <div 
                key={hl.id} 
                className={`highlight-box ${hl.type} animate-fade-in`}
                style={hl.isCenter ? {
                  left: '50%', top: '50%', 
                  width: hl.w, height: hl.h,
                  transform: 'translate(-50%, -50%)'
                } : {
                  left: `${hl.x}%`, top: `${hl.y}%`,
                  width: hl.w, height: hl.h
                }}
              >
                <div className="highlight-tooltip">
                  {hl.label} <span className="confidence high">{hl.confidence}</span>
                </div>
              </div>
            ))}

            <div className="view-toggles glass-panel">
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
            {/* Memory & Prediction */}
            <div className="insight-card animate-fade-in">
              <div className="insight-header">
                <svg className="insight-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <span className="insight-title">Prediction Engine</span>
              </div>
              <div className="insight-body">
                "87% chance a subscription modal appears after filling email — pre-computing dismiss sequence."
              </div>
              <div className="insight-metric">
                <span className="metric-value">87%</span>
                <span className="metric-label">Confidence</span>
              </div>
            </div>

            <div className="insight-card animate-fade-in" style={{animationDelay: '0.1s'}}>
              <div className="insight-header">
                <svg className="insight-icon" style={{color: 'var(--accent-green)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span className="insight-title">State Forensics</span>
              </div>
              <div className="insight-body">
                Agent execution is currently blocked by a UI obstruction (z-index: 9999).
              </div>
              
              <div className="action-grid">
                <button className="btn-secondary" onClick={() => setModalOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="21" x2="15" y2="15"></line><line x1="9" y1="8" x2="15" y2="14"></line><line x1="15" y1="8" x2="9" y2="14"></line></svg>
                  Analyze
                </button>
                <button className="btn-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Dismiss
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
            <div className="modal-title">Action Audit Report</div>
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <h3 style={{marginBottom: 12, fontSize: 18}}>Obstruction Detected</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14}}>
              The agent was attempting to input text into the email field, but a promotional modal intercepted the click. 
              The system successfully halted the action and prepared a dismiss sequence.
            </p>
            
            <div style={{background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)', marginBottom: 20}}>
              <div style={{fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--accent-green)', marginBottom: 8}}>{`{ "state": "ui_obstruction", "confidence": 0.94 }`}</div>
              <div style={{fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-tertiary)'}}>// Recommended recovery action: compile_verified_action ("close/dismiss control")</div>
            </div>
            
            <button className="btn-primary" onClick={() => setModalOpen(false)}>Acknowledge & Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
