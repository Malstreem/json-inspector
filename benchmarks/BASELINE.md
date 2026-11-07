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

## Viewport rendering comparison

The benchmark also compares generating SVG for the full expanded graph with
generating SVG for a 1,600 × 900 graph viewport. In one local run, the means
were:

| Fixture | Full SVG | Viewport SVG |
| --- | ---: | ---: |
| Small | 0.0548 ms | 0.0258 ms |
| Medium | 1.1036 ms | 0.0873 ms |
| Large | 8.6440 ms | 0.5822 ms |

These are illustrative local results, not guarantees. They measure SVG string
generation only; they do not include layout, browser DOM insertion, or
interaction latency.

## Large-array initial expansion

The large fixture contains 1,500 object records. Arrays with more than 100
items now start collapsed. In one local run, the relevant means were:

| Operation | Mean |
| --- | ---: |
| Build initial graph model | 0.2945 ms |
| Build and expand full graph | 1.9919 ms |
| Generate initial SVG | 0.0013 ms |
| Generate full SVG | 34.0690 ms |

The initial graph still parses and counts the complete JSON document; these
measurements show the additional projection and SVG work avoided until the
user opens the complete graph. Use **Expand all nodes** to materialize every
item.
