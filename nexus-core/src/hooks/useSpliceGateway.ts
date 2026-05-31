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
  liveFeed: { feed: TelemetryEvent[] };
}

interface Diagnosis {
  state: string;
  summary: string;
  recommendations?: string[];
  interactiveElements?: number;
  pageLoadMs?: number;
  securityScore?: string;
}

// ─── Demo Simulation Data ────────────────────────────────────────────

const DEMO_URLS = [
  'https://stripe.com/payments',
  'https://linear.app/inbox',
  'https://vercel.com/dashboard',
  'https://github.com/trending',
];

const DEMO_TELEMETRY_TEMPLATES: Array<{ type: string; detail: string }> = [
  { type: 'navigation', detail: 'Navigated to target URL' },
  { type: 'semantic_extract', detail: 'Extracted 47 semantic nodes from DOM' },
  { type: 'vision_capture', detail: 'Captured clean viewport screenshot' },
  { type: 'interaction', detail: 'Clicked primary CTA button' },
  { type: 'scroll', detail: 'Scrolled viewport to content section' },
  { type: 'form_fill', detail: 'Filled email input field' },
  { type: 'diagnosis', detail: 'Page state evaluated — ready' },
  { type: 'security_scan', detail: 'No unsafe iframes detected' },
  { type: 'element_wait', detail: 'Waited for modal to appear (1.2s)' },
  { type: 'assertion', detail: 'Verified expected heading text' },
  { type: 'screenshot', detail: 'Saved annotated screenshot to session' },
  { type: 'recovery', detail: 'Self-healed stale element reference' },
];

const DEMO_DIAGNOSES: Diagnosis[] = [
  {
    state: 'ready',
    summary: 'Page fully loaded. All interactive elements are reachable. No blockers detected.',
    recommendations: ['Proceed with form fill sequence', 'Consider checking newsletter opt-in state'],
    interactiveElements: 23,
    pageLoadMs: 847,
    securityScore: 'A+',
  },
  {
    state: 'interactive',
    summary: 'Agent is actively interacting with form elements. 3 of 5 fields completed.',
    recommendations: ['Fill remaining required fields before submit', 'Verify reCAPTCHA widget state'],
    interactiveElements: 18,
    pageLoadMs: 1203,
    securityScore: 'A',
  },
  {
    state: 'navigating',
    summary: 'Navigation in progress. Waiting for network idle and DOM stability.',
    recommendations: ['Wait for load event', 'Re-extract semantic tree after navigation'],
    interactiveElements: 0,
    pageLoadMs: 2100,
    securityScore: 'A',
  },
  {
    state: 'evaluating',
    summary: 'Running visual diff against expected state. Comparing 12 landmark elements.',
    recommendations: ['Screenshot comparison in progress', 'Flag any layout drift > 5px'],
    interactiveElements: 31,
    pageLoadMs: 950,
    securityScore: 'A+',
  },
];

function generateDemoSemanticNodes(): SemanticNode {
  const makeNode = (
    id: string, type: string, text: string, rect: { x: number; y: number; width: number; height: number },
    securityFlags?: string[]
  ): SemanticNode => ({
    id, type, text, rect, securityFlags,
    score: Math.random() * 0.3 + 0.7,
  });

  return {
    id: 'root',
    type: 'document',
    text: 'Document',
    children: [
      makeNode('nav-logo', 'interactive', 'Logo', { x: 24, y: 12, width: 110, height: 32 }),
      makeNode('nav-products', 'interactive', 'Products', { x: 160, y: 16, width: 72, height: 24 }),
      makeNode('nav-pricing', 'interactive', 'Pricing', { x: 248, y: 16, width: 60, height: 24 }),
      makeNode('nav-docs', 'interactive', 'Docs', { x: 324, y: 16, width: 45, height: 24 }),
      makeNode('nav-signin', 'interactive', 'Sign In', { x: 680, y: 12, width: 80, height: 32 }),
      makeNode('hero-heading', 'content', 'Build the future', { x: 80, y: 90, width: 420, height: 48 }),
      makeNode('hero-subtext', 'content', 'Infrastructure for the internet', { x: 80, y: 148, width: 380, height: 24 }),
      makeNode('cta-primary', 'interactive', 'Start now →', { x: 80, y: 196, width: 140, height: 44 }),
      makeNode('cta-secondary', 'interactive', 'Contact sales', { x: 236, y: 196, width: 130, height: 44 }),
      makeNode('feature-card-1', 'content', 'Payments', { x: 40, y: 280, width: 220, height: 140 }),
      makeNode('feature-card-2', 'content', 'Billing', { x: 280, y: 280, width: 220, height: 140 }),
      makeNode('feature-card-3', 'content', 'Connect', { x: 520, y: 280, width: 220, height: 140 }),
      makeNode('cookie-banner', 'interactive', 'Accept Cookies', { x: 20, y: 440, width: 760, height: 48 }, ['tracking_consent']),
      makeNode('footer-link', 'interactive', 'Privacy Policy', { x: 40, y: 510, width: 100, height: 20 }),
    ],
  };
}

function generateDemoScreenshot(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 800, 560);
  bgGrad.addColorStop(0, '#0f0f1a');
  bgGrad.addColorStop(0.5, '#1a1a2e');
  bgGrad.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 560);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 560); ctx.stroke();
  }
  for (let y = 0; y < 560; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
  }

  // Nav bar
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, 0, 800, 56);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 56, 800, 1);

  // Logo placeholder
  const logoGrad = ctx.createLinearGradient(24, 12, 134, 44);
  logoGrad.addColorStop(0, '#635bff');
  logoGrad.addColorStop(1, '#a259ff');
  ctx.fillStyle = logoGrad;
  ctx.beginPath();
  ctx.roundRect(24, 12, 110, 32, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Inter, system-ui';
  ctx.fillText('stripe', 52, 34);

  // Nav links
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px Inter, system-ui';
  ctx.fillText('Products', 164, 32);
  ctx.fillText('Pricing', 252, 32);
  ctx.fillText('Docs', 328, 32);

  // Sign in button
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(680, 12, 80, 32, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '12px Inter, system-ui';
  ctx.fillText('Sign In', 698, 33);

  // Hero heading
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Inter, system-ui';
  ctx.fillText('Build the future', 80, 128);

  // Subtext
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px Inter, system-ui';
  ctx.fillText('Infrastructure for the internet economy', 80, 164);

  // CTA buttons
  const ctaGrad = ctx.createLinearGradient(80, 196, 220, 240);
  ctaGrad.addColorStop(0, '#635bff');
  ctaGrad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = ctaGrad;
  ctx.beginPath();
  ctx.roundRect(80, 196, 140, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 14px Inter, system-ui';
  ctx.fillText('Start now →', 108, 224);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(236, 196, 130, 44, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '600 14px Inter, system-ui';
  ctx.fillText('Contact sales', 258, 224);

  // Feature cards
  const cardColors = ['#635bff', '#00d4aa', '#ff6b6b'];
  const cardLabels = ['Payments', 'Billing', 'Connect'];
  const cardDescs = ['Accept payments globally', 'Automate revenue ops', 'Multi-party payouts'];
  for (let i = 0; i < 3; i++) {
    const cx = 40 + i * 260;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(cx, 280, 220, 140, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Color accent bar
    ctx.fillStyle = cardColors[i];
    ctx.beginPath();
    ctx.roundRect(cx, 280, 220, 4, [12, 12, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter, system-ui';
    ctx.fillText(cardLabels[i], cx + 20, 320);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '12px Inter, system-ui';
    ctx.fillText(cardDescs[i], cx + 20, 345);

    // Fake metric
    ctx.fillStyle = cardColors[i];
    ctx.font = 'bold 28px Inter, system-ui';
    ctx.fillText(['$2.4M', '98.7%', '340+'][i], cx + 20, 395);
  }

  // Cookie banner
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(20, 440, 760, 48, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px Inter, system-ui';
  ctx.fillText('🍪  We use cookies for analytics and functionality.', 40, 469);
  ctx.fillStyle = '#635bff';
  ctx.beginPath();
  ctx.roundRect(640, 450, 100, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 11px Inter, system-ui';
  ctx.fillText('Accept All', 662, 469);

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px Inter, system-ui';
  ctx.fillText('Privacy Policy', 40, 524);
  ctx.fillText('Terms of Service', 160, 524);
  ctx.fillText('© 2026 Stripe, Inc.', 650, 524);

  return canvas.toDataURL('image/png');
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

export function useSpliceGateway(options: GatewayOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [semanticTree, setSemanticTree] = useState<SemanticNode | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

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

  const navigate = useCallback((url: string) => {
    return sendCommand('navigate', { url });
  }, [sendCommand]);

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

  // ── Demo simulation (when no backend is available) ──
  useEffect(() => {
    if (!demoMode) return;

    let isActive = true;
    let tick = 0;
    const feedBuffer: TelemetryEvent[] = [];

    // Generate the initial screenshot once
    const demoScreenshot = generateDemoScreenshot();
    setScreenshot(demoScreenshot);
    setSemanticTree(generateDemoSemanticNodes());

    const simulate = () => {
      if (!isActive) return;

      // Rotate URL
      const urlIdx = Math.floor(tick / 4) % DEMO_URLS.length;
      // Cycle through diagnoses
      const diagIdx = tick % DEMO_DIAGNOSES.length;
      // Add a new telemetry event
      const tmplIdx = tick % DEMO_TELEMETRY_TEMPLATES.length;
      const tmpl = DEMO_TELEMETRY_TEMPLATES[tmplIdx];

      feedBuffer.unshift({
        type: tmpl.type,
        detail: tmpl.detail,
        timestamp: Date.now(),
      });

      // Keep feed at max 20 events
      if (feedBuffer.length > 20) feedBuffer.pop();

      setSessionStatus({
        url: DEMO_URLS[urlIdx],
        liveFeed: { feed: [...feedBuffer] },
      });

      setDiagnosis(DEMO_DIAGNOSES[diagIdx]);

      // Slightly shuffle semantic nodes to simulate live re-extraction
      const tree = generateDemoSemanticNodes();
      if (tree.children) {
        tree.children.forEach((child) => {
          if (child.rect) {
            child.rect.x += Math.round((Math.random() - 0.5) * 4);
            child.rect.y += Math.round((Math.random() - 0.5) * 2);
          }
        });
      }
      setSemanticTree(tree);

      tick++;
      if (isActive) setTimeout(simulate, 2500);
    };

    // Start simulation after a short delay for smooth transition
    const timer = setTimeout(simulate, 500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [demoMode]);

  return {
    connected,
    demoMode,
    sessionStatus,
    screenshot,
    semanticTree,
    diagnosis,
    navigate,
    interact,
  };
}
