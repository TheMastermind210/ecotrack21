# EcoTrack Carbon Engine

Precompiled WebAssembly package for EcoTrack's deterministic emissions
calculation layer.

The source implementation is in `src-rs/lib.rs`. Rebuild with:

```bash
wasm-pack build --target web --release
```

Supported categories and factors:

- transport: `0.19 kg/km`
- food: `2.5 kg/meal`
- energy: `0.4 kg/kWh`
- goods: `15 kg/item`

Malformed input, negative quantities, and unknown categories return `-1`.
