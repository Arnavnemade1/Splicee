import { useState, useEffect, useCallback, useRef } from 'react';

export interface SemanticNode {
  id: string;
  type: string;
  text?: string;
  value?: string;
  attributes?: Record<string, string>;
  children?: SemanticNode[];
  score?: number;
  rect?: { x: number; y: number; width: number; height: number };
  securityFlags?: string[];
}

interface TelemetryEvent {
  type: string;
  detail: string;
  timestamp: number;
}

interface SessionStatus {
  url: string;
  title?: string;
  liveFeed: { feed: TelemetryEvent[] };
}

interface Diagnosis {
  state: string;
  confidence?: number;
  summary: string;
  evidence?: string[];
  recommendations?: string[];
  interactiveElements?: number;
  pageLoadMs?: number;
  securityScore?: string;
  signals?: {
    actionableElements?: number;
    recentNetworkErrors?: number;
    invalidFields?: number;
    obstructiveOverlays?: number;
  };
  recommendedNextAction?: {
    tool: string;
    target?: string;
    reason: string;
  };
}

export interface AgentPageAnalysis {
  target: {
    requestedUrl?: string;
    resolvedUrl: string;
    finalUrl: string;
    title: string;
    reachable: boolean;
    resolutionTried: string[];
  };
  summary: string;
  score: number;
  generatedAt: number;
  signals: {
    interactiveElements: number;
    forms: number;
    headings: number;
    imagesMissingAlt: number;
    securityFlags: string[];
    recentNetworkErrors: number;
  };
  diagnosis: Diagnosis;
  actionItems: Array<{
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail: string;
    agentInstruction: string;
  }>;
  codingAgentBrief: string;
  semanticTree?: SemanticNode;
  screenshot?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────

interface GatewayOptions {
  port?: number;
  url?: string;
}

function resolveGatewayUrl(options: GatewayOptions): string | null {
  const explicitUrl = options.url || import.meta.env.VITE_SPLICE_GATEWAY_URL;
  if (explicitUrl) return explicitUrl;

  if (import.meta.env.DEV) {
    return `ws://127.0.0.1:${options.port ?? 18789}`;
  }

  return null;
}

function normalizeTargetUrl(input: string): string {
  const value = input.trim();
  if (!value || /^(local|localhost)$/i.test(value)) return 'http://127.0.0.1:8080';
  if (/^\d{2,5}$/.test(value)) return `http://127.0.0.1:${value}`;
  if (/^(localhost|127\.0\.0\.1):\d+/i.test(value)) return `http://${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.includes('.') && !value.includes(' ')) return `https://${value}`;
  return value;
}

function makeOfflineAnalysis(targetUrl: string): AgentPageAnalysis {
  return {
    target: {
      requestedUrl: targetUrl,
      resolvedUrl: targetUrl,
      finalUrl: targetUrl,
      title: 'Gateway offline preview',
      reachable: false,
      resolutionTried: [targetUrl],
    },
    summary: 'Preview loaded in the dashboard, but real DOM, network, screenshot, and agent feedback require the local Splice gateway.',
    score: 0,
    generatedAt: Date.now(),
    signals: {
      interactiveElements: 0,
      forms: 0,
      headings: 0,
      imagesMissingAlt: 0,
      securityFlags: [],
      recentNetworkErrors: 0,
    },
    diagnosis: {
      state: 'gateway_offline',
      confidence: 1,
      summary: 'Start Splice with SPLICE_ENABLE_OPENCLAW=1 or set VITE_SPLICE_GATEWAY_URL to enable real browser analysis.',
      evidence: ['Static browser previews cannot inspect cross-origin DOM or report to the coding agent.'],
      recommendations: ['Run the Splice MCP server with the OpenClaw gateway enabled.', 'Re-run Analyze after the status shows Gateway Connected.'],
      recommendedNextAction: {
        tool: 'analyze_page_for_agent',
        reason: 'The MCP tool performs the same Playwright analysis and persists splice://agent/latest-feedback.',
      },
    },
    actionItems: [{
      severity: 'critical',
      title: 'Gateway connection required',
      detail: 'The page can be previewed, but analysis and coding-agent feedback are disabled until the WebSocket gateway is connected.',
      agentInstruction: 'Start the local Splice gateway, then call analyze_page_for_agent with this target URL.',
    }],
    codingAgentBrief: `# Splice Preview\n\nTarget: ${targetUrl}\n\nStart the local Splice gateway and rerun analyze_page_for_agent to get actionable DOM, network, and diagnostics feedback.`,
  };
}

export function useSpliceGateway(options: GatewayOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [semanticTree, setSemanticTree] = useState<SemanticNode | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [analysis, setAnalysis] = useState<AgentPageAnalysis | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messageResolvers = useRef<Map<string, (value: any) => void>>(new Map());
  const failCountRef = useRef(0);
  const gatewayUrl = resolveGatewayUrl(options);

  // ── Live WebSocket connection ──
  useEffect(() => {
    let cancelled = false;

    if (!gatewayUrl) {
      setConnected(false);
      setDemoMode(true);
      return () => {
        cancelled = true;
      };
    }

    const connect = () => {
      if (cancelled) return;

      try {
        const ws = new WebSocket(gatewayUrl);

        ws.onopen = () => {
          failCountRef.current = 0;
          setConnected(true);
          setDemoMode(false);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === 'handshake') return;
            if (payload.event === 'agent_feedback') {
              setAnalysis(payload.data);
              if (payload.data?.diagnosis) setDiagnosis(payload.data.diagnosis);
              if (payload.data?.semanticTree) setSemanticTree(payload.data.semanticTree);
              if (payload.data?.screenshot) setScreenshot(payload.data.screenshot);
              return;
            }
            if (payload.event === 'live_feed_update') {
              setSessionStatus((current) => ({
                url: current?.url || '',
                title: current?.title,
                liveFeed: {
                  feed: [
                    { type: payload.data?.type || 'event', detail: payload.data?.detail || 'Gateway event', timestamp: payload.timestamp || Date.now() },
                    ...(current?.liveFeed?.feed || []),
                  ].slice(0, 20),
                },
              }));
              return;
            }

            if (payload.id && messageResolvers.current.has(payload.id)) {
              const resolver = messageResolvers.current.get(payload.id);
              if (payload.status === 'success') {
                resolver?.(payload.data);
              } else {
                resolver?.(null);
              }
              messageResolvers.current.delete(payload.id);
            }
          } catch {
            // silently ignore parse errors
          }
        };

        ws.onclose = () => {
          setConnected(false);
          failCountRef.current++;
          if (failCountRef.current >= 2) {
            setDemoMode(true);
          } else if (!cancelled) {
            setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          // let onclose handle reconnect logic
          ws.close();
        };

        wsRef.current = ws;
      } catch {
        failCountRef.current++;
        if (failCountRef.current >= 2) {
          setDemoMode(true);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, [gatewayUrl]);

  const sendCommand = useCallback((command: string, args: any = {}): Promise<any> => {
    return new Promise((resolve) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }
      const id = Math.random().toString(36).substring(7);
      messageResolvers.current.set(id, resolve);
      wsRef.current.send(JSON.stringify({ id, command, args }));
    });
  }, []);

  const navigate = useCallback(async (url: string) => {
    const targetUrl = normalizeTargetUrl(url);
    if (!connected || demoMode) {
      setPreviewUrl(targetUrl);
      setScreenshot(null);
      setSemanticTree(null);
      setAnalysis(makeOfflineAnalysis(targetUrl));
      setDiagnosis(makeOfflineAnalysis(targetUrl).diagnosis);
      setSessionStatus({
        url: targetUrl,
        title: 'Preview mode',
        liveFeed: {
          feed: [{ type: 'preview_navigation', detail: `Previewing ${targetUrl}`, timestamp: Date.now() }],
        },
      });
      return { success: true, url: targetUrl, previewOnly: true };
    }

    setPreviewUrl(null);
    return sendCommand('navigate', { url: targetUrl });
  }, [connected, demoMode, sendCommand]);

  const analyzePage = useCallback(async (targetUrl?: string, intent?: string) => {
    const normalizedUrl = targetUrl ? normalizeTargetUrl(targetUrl) : undefined;
    if (!connected || demoMode) {
      const previewTarget = normalizedUrl || previewUrl || 'http://127.0.0.1:8080';
      setPreviewUrl(previewTarget);
      setScreenshot(null);
      const offlineAnalysis = makeOfflineAnalysis(previewTarget);
      setAnalysis(offlineAnalysis);
      setDiagnosis(offlineAnalysis.diagnosis);
      setSessionStatus({
        url: previewTarget,
        title: 'Preview mode',
        liveFeed: {
          feed: [{ type: 'offline_analysis', detail: `Gateway required for ${previewTarget}`, timestamp: Date.now() }],
        },
      });
      return offlineAnalysis;
    }

    setPreviewUrl(null);
    const result = await sendCommand('analyze_page', { targetUrl: normalizedUrl, intent });
    if (result) {
      setAnalysis(result);
      if (result.screenshot) setScreenshot(result.screenshot);
      if (result.semanticTree) setSemanticTree(result.semanticTree);
      if (result.diagnosis) setDiagnosis(result.diagnosis);
      setSessionStatus((current) => ({
        url: result.target?.finalUrl || normalizedUrl || current?.url || '',
        title: result.target?.title,
        liveFeed: current?.liveFeed || { feed: [] },
      }));
    }
    return result;
  }, [connected, demoMode, previewUrl, sendCommand]);

  const interact = useCallback((elementId: string, action: string, value?: string) => {
    return sendCommand('interact', { elementId, action, value });
  }, [sendCommand]);

  // ── Live polling (only when actually connected to backend) ──
  useEffect(() => {
    if (!connected || demoMode) return;

    let isActive = true;

    const poll = async () => {
      if (!isActive) return;

      const [status, shot, tree, diag] = await Promise.all([
        sendCommand('session_status'),
        sendCommand('capture_clean_screenshot'),
        sendCommand('get_semantic_tree'),
        sendCommand('diagnose', { intent: 'evaluate state' }),
      ]);

      if (isActive) {
        if (status) setSessionStatus(status);
        if (shot?.screenshot) setScreenshot(shot.screenshot);
        if (tree) setSemanticTree(tree);
        if (diag) setDiagnosis(diag);
      }

      if (isActive) setTimeout(poll, 2000);
    };

    poll();
    return () => { isActive = false; };
  }, [connected, demoMode, sendCommand]);

  // ── Offline state (honest preview mode; real analysis requires gateway) ──
  useEffect(() => {
    if (!demoMode || previewUrl) return;

    setScreenshot(null);
    setSemanticTree(null);
    setAnalysis(null);
    setDiagnosis({
      state: 'gateway_offline',
      confidence: 1,
      summary: 'Enter localhost, a port like 8080, or a full URL to preview it. Start the Splice gateway for real Playwright analysis and coding-agent feedback.',
      evidence: ['No synthetic DOM or screenshot is shown in offline mode.'],
      recommendations: ['Enable SPLICE_ENABLE_OPENCLAW=1 for live analysis.', 'Use analyze_page_for_agent from MCP for direct coding-agent feedback.'],
    });
    setSessionStatus({
      url: '',
      title: 'Gateway offline',
      liveFeed: {
        feed: [{ type: 'gateway_offline', detail: 'Waiting for target URL or local gateway', timestamp: Date.now() }],
      },
    });
  }, [demoMode, previewUrl]);

  return {
    connected,
    demoMode,
    sessionStatus,
    screenshot,
    previewUrl,
    semanticTree,
    diagnosis,
    analysis,
    navigate,
    analyzePage,
    interact,
  };
}
