# EcoTrack: Carbon Footprint Awareness Platform

**PromptWars Hackathon — Challenge 3 Submission**

EcoTrack combines a React 19 interface, a secure same-origin Node proxy, Claude
through OpenRouter, and a deterministic Rust/WebAssembly emissions engine.

## Architecture

```text
Browser → /api proxy → OpenRouter/Claude
        → Rust WASM calculation → React visualizations
```

### Frontend

- React 19, Vite, D3.js, Recharts, and an offline-capable service worker
- Natural-language activity capture and accessible carbon visualizations
- Local activity-history persistence; no API credentials in browser storage
- Optional personalized narratives, disabled until the user opts in

### Secure AI proxy

- OpenRouter key exists only in the server environment
- Same-origin `/api/parse-activity` and `/api/attribution` endpoints
- Request body limits, schema validation, provider timeout, safe error messages
- Origin enforcement, per-client rate limiting, and security headers
- Provider output is validated again before it reaches the browser

### Rust/WebAssembly engine

- Deterministic emission-factor multiplication
- Supported categories: transport, food, energy, and goods
- Invalid, negative, malformed, and unknown-category inputs are rejected

## Security model

- `OPENROUTER_API_KEY` is read server-side from the environment
- The frontend bundle contains no provider URL, authorization header, or key
- The browser connects only to same-origin `/api` endpoints and NOAA
- CSP blocks framing and general script `unsafe-inline`/`unsafe-eval`; only
  WebAssembly compilation is permitted
- Personalized narrative requests contain at most 10 validated recent entries
- API responses never expose provider response bodies or credentials

## Getting started

```bash
cp .env.example .env
# Set OPENROUTER_API_KEY in .env
npm install
npm run dev
```

Development URLs:

- Frontend: `http://127.0.0.1:5173`
- API proxy: `http://127.0.0.1:8787`

The Vite development server proxies `/api` to the local Node server.

## Production

```bash
npm run build
OPENROUTER_API_KEY=your-key HOST=0.0.0.0 PORT=8787 npm start
```

The Node server serves `dist/` and the same-origin API endpoints. The WASM
engine is precompiled in `pkg/`; end users do not need a Rust toolchain.

## Testing

```bash
npm test
npm run test:coverage
npm run check
cargo test
```

The suite covers:

- Complete activity flow from proxy response through WASM to rendered history
- Confirmation that the browser sends no API key or authorization header
- Server-side credential isolation and safe missing-configuration behavior
- Origin checks, security headers, payload limits, and provider validation
- Low-confidence AI clarification behavior
- Local-calendar and ISO-week calculations
- Supply-chain graph runtime validation
- Corrupt browser-storage recovery
- Rust engine calculations and invalid-input rejection

Current JavaScript/TypeScript coverage gates require at least 80% statements,
functions, and lines plus 70% branches.

## Known limitations

- The proxy uses in-memory rate limiting; horizontally scaled production
  deployments should use a shared store such as Redis.
- There is no user authentication, so the proxy should be deployed behind
  platform-level abuse protection for a public high-traffic launch.
- The WASM engine currently supports four broad categories.
- API responses are intentionally not cached offline.

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, Vite, D3.js, Recharts, Lucide |
| Proxy | Node.js HTTP server |
| AI | Claude via OpenRouter |
| Engine | Rust, wasm-bindgen, serde |
| Storage | LocalStorage, SessionStorage, Workbox |

## License

MIT
