import { useState, useRef, useEffect } from 'react';
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);

  const {
    connected,
    demoMode,
    sessionStatus,
    screenshot,
    previewUrl,
    semanticTree,
    diagnosis,
    analysis,
    analyzePage
  } = useSpliceGateway();

  // Calculate scale factor when screenshot / viewport size changes
  useEffect(() => {
    if (!viewportRef.current || !imgRef.current) return;
    const updateScale = () => {
      if (imgRef.current && imgRef.current.naturalWidth > 0) {
        const s = imgRef.current.clientWidth / imgRef.current.naturalWidth;
        setScale(s);
      }
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewportRef.current);
    const image = imgRef.current;
    image.addEventListener('load', updateScale);
    return () => {
      observer.disconnect();
      image.removeEventListener('load', updateScale);
    };
  }, [screenshot]);

  const handleNavigate = (event: FormEvent) => {
    event.preventDefault();
    if (urlInput) {
      analyzePage(urlInput, 'Analyze this application and produce concrete coding-agent feedback');
    }
  };

  const semanticNodes = semanticTree ? flattenTree(semanticTree) : [];
  const feed = sessionStatus?.liveFeed?.feed || [];
  const actionItems = analysis?.actionItems || [];
  const score = analysis?.score;

  const isOnline = connected && !demoMode;
  const statusLabel = isOnline
    ? 'System Online • Gateway Connected'
    : demoMode
    ? previewUrl
      ? 'Preview Mode • Gateway Offline'
      : 'Gateway Offline • Enter Target'
    : 'Connecting to Gateway…';
  const statusColor = isOnline ? 'var(--accent-green)' : demoMode ? 'var(--accent-purple)' : 'var(--accent-yellow)';
  const statusBg = isOnline ? 'var(--accent-green-bg)' : demoMode ? 'rgba(139,92,246,0.1)' : 'var(--accent-yellow-bg)';

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
          <div
            className="status-badge"
            style={{
              backgroundColor: statusBg,
              color: statusColor,
              borderColor: `${statusColor}33`,
            }}
          >
            <div
              className={`status-dot ${isOnline ? 'pulse-green' : demoMode ? 'pulse-purple' : ''}`}
              style={{ backgroundColor: statusColor }}
            ></div>
            {statusLabel}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="main-content">

        {/* Left Sidebar: Timeline View */}
        <aside className="sidebar">
          <div className="panel-header">
            Live Telemetry
            {demoMode && <span className="demo-tag">OFFLINE</span>}
          </div>
          <div className="timeline-list">
            <div className="timeline-track">
              {feed.length > 0 ? feed.map((event: any, i: number) => (
                <div key={i} className={`timeline-event ${i === 0 ? 'active' : ''} animate-fade-in`}>
                  <div className="event-time">{new Date(event.timestamp || Date.now()).toLocaleTimeString()}</div>
                  <div className="event-title">
                    {event.detail || event.type}
                  </div>
                  <div className="event-agent">
                    <span style={{width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block'}}></span>
                    {event.type}
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{demoMode ? 'Initializing simulation…' : 'Waiting for backend connection…'}</span>
                </div>
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
                onChange={event => setUrlInput(event.target.value)}
                placeholder={sessionStatus?.url || "localhost, 8080, or https://your-app.com"}
              />
            </form>
            <button
              className="analyze-button"
              onClick={() => analyzePage(urlInput || sessionStatus?.url, 'Analyze this application and produce concrete coding-agent feedback')}
            >
              Analyze
            </button>
            {demoMode && (
              <div className="demo-indicator">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                PREVIEW
              </div>
            )}
          </div>

          <div className="viewport-container" ref={viewportRef}>
            {screenshot ? (
              <img
                ref={imgRef}
                src={screenshot}
                alt="Live viewport capture"
                className="viewport-screenshot"
              />
            ) : previewUrl ? (
              <iframe
                className="viewport-frame"
                src={previewUrl}
                title="Offline webpage preview"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              />
            ) : (
              <div className="empty-viewport">
                <div className="empty-viewport-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <span>Waiting for vision feed…</span>
              </div>
            )}

            {showHeatmap && <div className="heatmap-canvas animate-fade-in"></div>}

            {showHighlights && semanticNodes.map((node) => {
              if (!node.rect) return null;
              const { x, y, width, height } = node.rect;
              const isRisky = node.securityFlags && node.securityFlags.length > 0;
              const typeClass = isRisky ? 'risky' : 'safe';
              const isHovered = hoveredNode === node.id;

              return (
                <div
                  key={node.id}
                  className={`highlight-box ${typeClass} ${isHovered ? 'hovered' : ''} animate-fade-in`}
                  style={{
                    left: `${x * scale}px`,
                    top: `${y * scale}px`,
                    width: `${width * scale}px`,
                    height: `${height * scale}px`,
                    position: 'absolute',
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  title={node.text || node.attributes?.['aria-label'] || node.type}
                >
                  <div className="highlight-tooltip">
                    <span className="tooltip-type">{node.type}</span>
                    {node.text ? ` — ${node.text.substring(0, 20)}` : ''}
                    {node.score != null && (
                      <span className={`confidence ${node.score > 0.85 ? 'high' : 'med'}`}>
                        {Math.round(node.score * 100)}%
                      </span>
                    )}
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

        {/* Right Sidebar: Intelligence */}
        <aside className="right-panel">
          <div className="panel-header">
            Intelligence
            {demoMode && <span className="demo-tag">OFFLINE</span>}
          </div>

          <div className="prediction-panel">
            {analysis && (
              <div className="score-card animate-fade-in">
                <div>
                  <span className="score-label">Analysis Score</span>
                  <strong>{score}</strong>
                </div>
                <p>{analysis.summary}</p>
              </div>
            )}

            {/* Live Diagnosis */}
            <div className="insight-card animate-fade-in">
              <div className="insight-header">
                <svg className="insight-icon" style={{color: diagnosis?.state === 'ready' ? 'var(--accent-green)' : 'var(--accent-blue)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span className="insight-title">State Forensics</span>
              </div>
              <div className="insight-body">
                {diagnosis ? (
                  <>
                    State: <strong style={{color: diagnosis.state === 'ready' ? 'var(--accent-green)' : 'var(--accent-blue)'}}>{diagnosis.state}</strong>
                    {diagnosis.confidence != null && <> • {Math.round(diagnosis.confidence * 100)}%</>}<br />
                    {diagnosis.summary}
                  </>
                ) : 'Awaiting diagnostics…'}
              </div>

              {diagnosis && (
                <div className="diagnosis-metrics">
                  {diagnosis.interactiveElements != null && (
                    <div className="mini-metric">
                      <span className="mini-metric-value">{diagnosis.interactiveElements}</span>
                      <span className="mini-metric-label">Elements</span>
                    </div>
                  )}
                  {analysis?.signals.interactiveElements != null && (
                    <div className="mini-metric">
                      <span className="mini-metric-value">{analysis.signals.interactiveElements}</span>
                      <span className="mini-metric-label">Actions</span>
                    </div>
                  )}
                  {analysis?.signals.forms != null && (
                    <div className="mini-metric">
                      <span className="mini-metric-value">{analysis.signals.forms}</span>
                      <span className="mini-metric-label">Forms</span>
                    </div>
                  )}
                  {analysis?.signals.recentNetworkErrors != null && (
                    <div className="mini-metric">
                      <span className="mini-metric-value">{analysis.signals.recentNetworkErrors}</span>
                      <span className="mini-metric-label">HTTP Errors</span>
                    </div>
                  )}
                  {diagnosis.pageLoadMs != null && (
                    <div className="mini-metric">
                      <span className="mini-metric-value">{diagnosis.pageLoadMs}ms</span>
                      <span className="mini-metric-label">Load</span>
                    </div>
                  )}
                  {diagnosis.securityScore != null && (
                    <div className="mini-metric">
                      <span className="mini-metric-value">{diagnosis.securityScore}</span>
                      <span className="mini-metric-label">Security</span>
                    </div>
                  )}
                </div>
              )}

              <div className="action-grid">
                <button className="btn-secondary" onClick={() => setModalOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  Analyze
                </button>
              </div>
            </div>

            {/* Agent Actions */}
            {actionItems.length > 0 && (
              <div className="insight-card animate-fade-in">
                <div className="insight-header">
                  <svg className="insight-icon" style={{color: 'var(--accent-yellow)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                  <span className="insight-title">Coding Agent Actions</span>
                </div>
                <ul className="action-items-list">
                  {actionItems.map((item, index) => (
                    <li key={`${item.title}-${index}`} className={`severity-${item.severity}`}>
                      <strong>{item.title}</strong>
                      <span>{item.agentInstruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis?.codingAgentBrief && (
              <div className="insight-card animate-fade-in">
                <div className="insight-header">
                  <svg className="insight-icon" style={{color: 'var(--accent-green)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>
                  <span className="insight-title">Agent Brief</span>
                </div>
                <pre className="agent-brief">{analysis.codingAgentBrief}</pre>
              </div>
            )}

            {/* Audit Report */}
            <div style={{marginTop: 'auto', paddingTop: '20px'}}>
              <button
                className="btn-secondary"
                style={{width: '100%', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: 'var(--accent-blue)'}}
                onClick={() => setModalOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                View Full Report
              </button>
            </div>
          </div>
        </aside>

      </main>

      {/* Diagnostics Modal */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={() => setModalOpen(false)}>
        <div className="modal-content" onClick={event => event.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Live Diagnostics</div>
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
          </div>
          <div className="modal-body">
            <h3 style={{marginBottom: 12, fontSize: 18}}>Current Session State</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14}}>
              {diagnosis?.summary || 'No recent diagnosis.'}
            </p>

            {diagnosis?.recommendations && (
              <div style={{marginBottom: 20}}>
                <h4 style={{fontSize: 14, marginBottom: 8, color: 'var(--text-primary)'}}>Recommendations</h4>
                <ul style={{paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 13}}>
                  {diagnosis.recommendations.map((rec, i) => (
                    <li key={i} style={{marginBottom: 4}}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis?.codingAgentBrief && (
              <div style={{marginBottom: 20}}>
                <h4 style={{fontSize: 14, marginBottom: 8, color: 'var(--text-primary)'}}>Coding Agent Brief</h4>
                <pre className="modal-report">{analysis.codingAgentBrief}</pre>
              </div>
            )}

            <div style={{background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, border: '1px solid var(--border-subtle)', marginBottom: 20, maxHeight: 300, overflowY: 'auto'}}>
              <pre style={{fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--accent-green)', margin: 0, whiteSpace: 'pre-wrap'}}>
                {JSON.stringify(analysis || diagnosis, null, 2)}
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
