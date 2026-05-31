# Nexus Core

Mission-control dashboard for [Splice](../README.md). Nexus Core connects to the local OpenClaw WebSocket gateway and surfaces live browser analysis, semantic highlights, and coding-agent feedback.

## Quick start

```bash
# from the repo root — start Splice with the gateway enabled
npm run build
SPLICE_ENABLE_OPENCLAW=1 node dist/index.js

# in another terminal — start the UI
cd nexus-core
npm install
npm run dev
```

Open the Vite dev URL (typically `http://localhost:5173`), enter a target such as `localhost`, `8080`, or a full URL, then click **Analyze**.

## Offline demo

If the gateway is not running, Nexus Core still works in preview mode:

- **Run Demo** steps through a guided walkthrough (landing, pricing, checkout, security review)
- **Usage Guide** documents gateway setup, Discord alerts, and MCP integration

Real Playwright analysis, screenshots, and agent briefs require the gateway.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_SPLICE_GATEWAY_URL` | `ws://127.0.0.1:18789` in dev | WebSocket URL for production builds |
| `OPENCLAW_GATEWAY_PORT` | `18789` | Set on the Splice server when starting the gateway |
| `SPLICE_LOCAL_APP_PORTS` | common dev ports | Port discovery order for `analyze_page_for_agent` on the server |

Example production build with a custom gateway:

```bash
VITE_SPLICE_GATEWAY_URL=ws://127.0.0.1:18789 npm run build
npm run preview
```

## MCP equivalent

Coding agents can request the same report without the UI:

```json
{
  "name": "analyze_page_for_agent",
  "arguments": {
    "targetUrl": "http://localhost:8080",
    "intent": "Analyze this application and produce concrete coding-agent feedback"
  }
}
```

## Scripts

```bash
npm run dev      # local development with HMR
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint
```
