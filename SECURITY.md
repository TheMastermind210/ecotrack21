# Security Policy

## Credential handling

The OpenRouter credential must be supplied to the Node server through the
`OPENROUTER_API_KEY` environment variable. It is never embedded into the Vite
bundle, returned by an API response, or stored in LocalStorage/SessionStorage.

Do not prefix the variable with `VITE_`; Vite-prefixed variables are exposed to
client code.

## Proxy protections

The same-origin proxy provides:

- request content-type and body-size enforcement;
- runtime validation for activity and history payloads;
- a 15-second upstream timeout;
- safe upstream errors without provider response bodies;
- origin checks and per-client in-memory rate limiting;
- `nosniff`, frame-denial, permissions-policy, and referrer-policy headers.

For a public horizontally scaled deployment, replace the in-memory limiter
with a shared rate-limit store and add platform-level authentication or abuse
protection.

## Data transmission

Activity text is sent to OpenRouter for parsing. Personalized narratives are
optional and send at most 10 validated recent entries after the user enables
the feature. Activity history otherwise remains in browser LocalStorage.

## Reporting a vulnerability

Report suspected vulnerabilities privately to the project maintainers. Do not
include active credentials in an issue, log, screenshot, or test fixture.
