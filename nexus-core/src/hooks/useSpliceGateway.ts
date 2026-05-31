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

interface DemoPage {
  slug: string;
  title: string;
  score: number;
  state: string;
  summary: string;
  html: string;
  nodes: SemanticNode[];
  actionItems: AgentPageAnalysis['actionItems'];
  signals: AgentPageAnalysis['signals'];
}

const DEMO_PAGES: DemoPage[] = [
  {
    slug: 'landing',
    title: 'Acme Cloud — Landing',
    score: 91,
    state: 'ready',
    summary: 'Landing page is visually stable with clear navigation, one primary CTA, and no blocking UI. The agent should verify CTA hierarchy and image alt coverage.',
    html: demoDocument('Acme Cloud', 'Build safer browser agents', 'Launch Console', 'Docs', 'Trusted by security teams shipping agentic workflows.', 'Explore integrations'),
    nodes: [
      demoNode('demo-nav-docs', 'interactive', 'Docs', { x: 620, y: 34, width: 78, height: 34 }),
      demoNode('demo-primary-cta', 'interactive', 'Launch Console', { x: 92, y: 252, width: 180, height: 48 }),
      demoNode('demo-secondary-cta', 'interactive', 'Explore integrations', { x: 288, y: 252, width: 190, height: 48 }),
      demoNode('demo-headline', 'content', 'Build safer browser agents', { x: 88, y: 138, width: 500, height: 60 }),
    ],
    actionItems: [{
      severity: 'info',
      title: 'CTA hierarchy is strong',
      detail: 'Primary and secondary CTAs are visually distinct.',
      agentInstruction: 'Keep the primary CTA above the fold and verify it maps to the intended onboarding route.',
    }],
    signals: { interactiveElements: 3, forms: 0, headings: 3, imagesMissingAlt: 0, securityFlags: [], recentNetworkErrors: 0 },
  },
  {
    slug: 'pricing',
    title: 'Acme Cloud — Pricing',
    score: 84,
    state: 'ready',
    summary: 'Pricing page has good structure, but plan comparison needs clearer affordances for the recommended plan.',
    html: demoDocument('Pricing', 'Plans that scale with your agents', 'Start Pro Trial', 'Contact Sales', 'Three plans, transparent limits, and usage-based overages.', 'Compare features'),
    nodes: [
      demoNode('demo-plan-pro', 'interactive', 'Start Pro Trial', { x: 92, y: 252, width: 168, height: 48 }),
      demoNode('demo-sales', 'interactive', 'Contact Sales', { x: 278, y: 252, width: 158, height: 48 }),
      demoNode('demo-pricing-copy', 'content', 'Plans that scale with your agents', { x: 88, y: 138, width: 560, height: 60 }),
    ],
    actionItems: [{
      severity: 'warning',
      title: 'Recommended plan affordance is subtle',
      detail: 'The Pro plan CTA is visible but not strongly differentiated.',
      agentInstruction: 'Add a “Recommended” badge and stronger contrast to the Pro plan card.',
    }],
    signals: { interactiveElements: 4, forms: 0, headings: 4, imagesMissingAlt: 0, securityFlags: [], recentNetworkErrors: 0 },
  },
  {
    slug: 'checkout',
    title: 'Acme Cloud — Checkout',
    score: 76,
    state: 'validation_blocked',
    summary: 'Checkout flow is reachable, but the agent detected validation risk around required billing fields and disabled submit state.',
    html: demoDocument('Checkout', 'Complete workspace setup', 'Create Workspace', 'Back to Pricing', 'Billing email and workspace name are required before submit activates.', 'Review security policy'),
    nodes: [
      demoNode('demo-email', 'interactive', 'Billing email', { x: 96, y: 236, width: 260, height: 44 }),
      demoNode('demo-workspace', 'interactive', 'Workspace name', { x: 96, y: 296, width: 260, height: 44 }),
      demoNode('demo-submit', 'interactive', 'Create Workspace', { x: 96, y: 360, width: 180, height: 48 }),
    ],
    actionItems: [{
      severity: 'warning',
      title: 'Submit flow needs clearer validation',
      detail: 'Required fields gate the submit button.',
      agentInstruction: 'Show inline validation hints before submit and explain why the CTA is disabled.',
    }],
    signals: { interactiveElements: 5, forms: 1, headings: 3, imagesMissingAlt: 0, securityFlags: [], recentNetworkErrors: 0 },
  },
  {
    slug: 'security',
    title: 'Acme Cloud — Security Review',
    score: 68,
    state: 'ui_obstruction',
    summary: 'Security review found a modal-style policy banner that may obstruct agent actions until acknowledged.',
    html: demoDocument('Security Review', 'Agent policy checkpoint', 'Accept Policy', 'View Details', 'A required policy banner is layered above the main workflow.', 'Dismiss later'),
    nodes: [
      demoNode('demo-policy', 'interactive', 'Accept Policy', { x: 96, y: 352, width: 164, height: 48 }, ['policy-gate']),
      demoNode('demo-details', 'interactive', 'View Details', { x: 276, y: 352, width: 140, height: 48 }),
      demoNode('demo-policy-copy', 'content', 'Agent policy checkpoint', { x: 88, y: 138, width: 510, height: 60 }),
    ],
    actionItems: [{
      severity: 'critical',
      title: 'Policy banner blocks the flow',
      detail: 'The demo page includes a policy checkpoint above the primary workflow.',
      agentInstruction: 'Use compile_verified_action to target the policy acknowledgement before continuing automation.',
    }],
    signals: { interactiveElements: 2, forms: 0, headings: 3, imagesMissingAlt: 0, securityFlags: ['policy-gate'], recentNetworkErrors: 0 },
  },
];

function demoNode(
  id: string,
  type: string,
  text: string,
  rect: { x: number; y: number; width: number; height: number },
  securityFlags?: string[]
): SemanticNode {
  return { id, type, text, rect, securityFlags, score: securityFlags?.length ? 0.64 : 0.92 };
}

function demoDocument(kicker: string, headline: string, primary: string, secondary: string, body: string, tertiary: string): string {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { margin: 0; font-family: Inter, ui-sans-serif, system-ui; color: #f8fafc; background: radial-gradient(circle at 20% 10%, #3458ff55, transparent 32%), linear-gradient(135deg, #080b14, #121a2c); }
        main { min-height: 100vh; padding: 34px 88px; box-sizing: border-box; }
        nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 76px; }
        .brand { font-weight: 800; letter-spacing: -0.03em; }
        .links { display: flex; gap: 16px; }
        a, button { color: inherit; border: 1px solid #ffffff24; background: #ffffff0e; border-radius: 12px; padding: 12px 18px; font-weight: 700; }
        .hero { max-width: 720px; }
        .eyebrow { color: #9dbbff; text-transform: uppercase; letter-spacing: .16em; font-size: 12px; font-weight: 800; }
        h1 { font-size: 58px; line-height: 0.96; margin: 18px 0; letter-spacing: -0.055em; }
        p { color: #aab7cf; font-size: 18px; line-height: 1.6; max-width: 620px; }
        .actions { display: flex; gap: 16px; margin-top: 34px; }
        .primary { background: linear-gradient(135deg, #b8d5ff, #8b5cf6); color: #07101d; border: 0; box-shadow: 0 22px 70px #6ea8ff33; }
        .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 70px; }
        .card { border: 1px solid #ffffff1f; background: #ffffff0a; border-radius: 20px; padding: 22px; min-height: 112px; }
        .card strong { display: block; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <main>
        <nav><div class="brand">Acme Cloud</div><div class="links"><a>${secondary}</a><a>${tertiary}</a></div></nav>
        <section class="hero"><div class="eyebrow">${kicker}</div><h1>${headline}</h1><p>${body}</p><div class="actions"><button class="primary">${primary}</button><button>${secondary}</button></div></section>
        <section class="cards"><div class="card"><strong>Signals</strong><span>DOM, network, and state forensics</span></div><div class="card"><strong>Agent Brief</strong><span>Direct instructions for coding agents</span></div><div class="card"><strong>Verification</strong><span>Replayable analysis and evidence</span></div></section>
      </main>
    </body>
  </html>`;
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

function demoPageUrl(page: DemoPage): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(page.html)}`;
}

function makeDemoAnalysis(page: DemoPage, step: number, total: number): AgentPageAnalysis {
  const finalUrl = `demo://${page.slug}`;
  const diagnosis: Diagnosis = {
    state: page.state,
    confidence: page.state === 'ready' ? 0.92 : 0.86,
    summary: page.summary,
    evidence: [
      `Demo step ${step} of ${total}: ${page.title}`,
      `${page.signals.interactiveElements} interactive controls detected.`,
      page.signals.securityFlags.length > 0 ? `Flags: ${page.signals.securityFlags.join(', ')}` : 'No security flags on this step.',
    ],
    recommendations: page.actionItems.map(item => item.agentInstruction),
    signals: {
      actionableElements: page.signals.interactiveElements,
      recentNetworkErrors: page.signals.recentNetworkErrors,
      invalidFields: page.state === 'validation_blocked' ? 2 : 0,
      obstructiveOverlays: page.state === 'ui_obstruction' ? 1 : 0,
    },
    recommendedNextAction: {
      tool: page.state === 'ready' ? 'compile_verified_action' : 'diagnose_agent_state',
      reason: page.actionItems[0]?.agentInstruction || 'Continue the walkthrough.',
    },
  };

  const codingAgentBrief = [
    '# Splice Guided Demo',
    '',
    `Step: ${step}/${total} — ${page.title}`,
    `Target: ${finalUrl}`,
    `Score: ${page.score}/100`,
    `State: ${diagnosis.state} (${Math.round((diagnosis.confidence || 0) * 100)}% confidence)`,
    '',
    '## Summary',
    page.summary,
    '',
    '## Coding Agent Actions',
    ...page.actionItems.map((item, index) => `${index + 1}. [${item.severity.toUpperCase()}] ${item.agentInstruction}`),
  ].join('\n');

  return {
    target: {
      requestedUrl: finalUrl,
      resolvedUrl: finalUrl,
      finalUrl,
      title: page.title,
      reachable: true,
      resolutionTried: DEMO_PAGES.slice(0, step).map(item => `demo://${item.slug}`),
    },
    summary: page.summary,
    score: page.score,
    generatedAt: Date.now(),
    signals: page.signals,
    diagnosis,
    actionItems: page.actionItems,
    codingAgentBrief,
    semanticTree: {
      id: 'demo-root',
      type: 'root',
      children: page.nodes,
    },
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
  const [demoRunning, setDemoRunning] = useState(false);

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

  const runDemo = useCallback(async () => {
    if (demoRunning) return;

    setDemoRunning(true);
    setScreenshot(null);

    const feedBuffer: TelemetryEvent[] = [];
    for (let index = 0; index < DEMO_PAGES.length; index++) {
      const page = DEMO_PAGES[index];
      const step = index + 1;
      const demoAnalysis = makeDemoAnalysis(page, step, DEMO_PAGES.length);

      feedBuffer.unshift({ type: 'demo_navigation', detail: `Navigated to ${page.title}`, timestamp: Date.now() });
      feedBuffer.unshift({ type: 'demo_analysis', detail: `Analyzed ${page.slug}: score ${page.score}/100`, timestamp: Date.now() + 1 });

      setPreviewUrl(demoPageUrl(page));
      setSessionStatus({
        url: demoAnalysis.target.finalUrl,
        title: page.title,
        liveFeed: { feed: feedBuffer.slice(0, 20) },
      });
      setSemanticTree(demoAnalysis.semanticTree || null);
      setDiagnosis(demoAnalysis.diagnosis);
      setAnalysis(demoAnalysis);

      await new Promise(resolve => setTimeout(resolve, 1600));
    }

    setDemoRunning(false);
  }, [demoRunning]);

  // ── Live polling (only when actually connected to backend) ──
  useEffect(() => {
    if (!connected || demoMode || demoRunning) return;

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
  }, [connected, demoMode, demoRunning, sendCommand]);

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
    demoRunning,
    navigate,
    analyzePage,
    runDemo,
    interact,
  };
}
