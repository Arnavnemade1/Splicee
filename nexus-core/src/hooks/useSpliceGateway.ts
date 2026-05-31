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

export function useSpliceGateway(port: number = 18789) {
  const [connected, setConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [semanticTree, setSemanticTree] = useState<SemanticNode | null>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messageResolvers = useRef<Map<string, (value: any) => void>>(new Map());

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      
      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.event === 'handshake') return;

          // If this is a response to a specific command request
          if (payload.id && messageResolvers.current.has(payload.id)) {
            const resolver = messageResolvers.current.get(payload.id);
            if (payload.status === 'success') {
              resolver?.(payload.data);
            } else {
              console.error(`Command failed: ${payload.error}`);
              resolver?.(null); // Resolve with null on error for simplicity
            }
            messageResolvers.current.delete(payload.id);
          }

        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000); // Reconnect loop
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [port]);

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

  // Polling loop for Vision and Status
  useEffect(() => {
    if (!connected) return;

    let isActive = true;

    const poll = async () => {
      if (!isActive) return;

      const [status, shot, tree, diag] = await Promise.all([
        sendCommand('session_status'),
        sendCommand('capture_clean_screenshot'),
        sendCommand('get_semantic_tree'),
        sendCommand('diagnose', { intent: 'evaluate state' })
      ]);

      if (isActive) {
        if (status) setSessionStatus(status);
        if (shot && shot.screenshot) setScreenshot(shot.screenshot);
        if (tree) setSemanticTree(tree);
        if (diag) setDiagnosis(diag);
      }

      setTimeout(poll, 2000);
    };

    poll();

    return () => {
      isActive = false;
    };
  }, [connected, sendCommand]);

  return {
    connected,
    sessionStatus,
    screenshot,
    semanticTree,
    diagnosis,
    navigate,
    interact
  };
}
