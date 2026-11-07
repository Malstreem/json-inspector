# Performance Baseline

These are initial local measurements, not performance guarantees or CI
thresholds. Use `npm run benchmark` to rerun them; results vary with hardware,
runtime, and system load.

Environment: Windows, Node.js 24.6.0, Vitest 3.2.7. Values are mean
milliseconds per operation from one run. Fixtures are deterministic generated
JSON and the byte count is the UTF-8 source size.

| Fixture | Records | Source bytes | Parse | Build graph | Flatten rows | Layout | Generate SVG |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Small | 10 | 2,312 | 0.0082 ms | 0.0194 ms | 0.0136 ms | 0.0010 ms | 0.1009 ms |
| Medium | 250 | 58,785 | 0.1731 ms | 0.4679 ms | 0.2127 ms | 0.0277 ms | 2.9614 ms |
| Large | 1,500 | 357,275 | 0.9998 ms | 1.5874 ms | 1.0185 ms | 0.2328 ms | 39.0100 ms |

SVG generation is the most expensive measured stage for the large fixture.
This baseline helps identify which pipeline stages benefit from later
optimization; it does not measure end-to-end browser responsiveness or editor
input latency.
