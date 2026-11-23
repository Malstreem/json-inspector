# Chrome Web Store Submission Guide — JSON Inspector

> Everything you need to publish **JSON Inspector** to the official Chrome Web Store.

---

## 1. Store Listing Details (Copy-Paste into Dashboard)

**Extension Name**:
```text
JSON Inspector
```

**Short Description** (Max 132 chars):
```text
Interactive JSON tree and graph visualizer with live CodeMirror editing, WebAssembly spatial indexing, and DevTools integration.
```

**Category**:
```text
Developer Tools
```

**Single Purpose Description**:
```text
Visualizes, inspects, and edits JSON documents as interactive graphs and trees in the browser.
```

**Detailed Description**:
```text
JSON Inspector turns raw, complex JSON data into an interactive, visual 2D graph tree right inside Google Chrome.

KEY FEATURES
• Interactive 2D Graph: Pan, zoom, expand, and collapse nested objects and arrays.
• Chrome Side Panel: Pin JSON Inspector to your browser sidebar to inspect API responses alongside any webpage.
• Chrome DevTools Integration: Dedicated JSON Inspector tab inside DevTools (F12).
• Full CodeMirror 6 Editor: Syntax highlighting, auto-formatting, bracket matching, and inline syntax validation.
• High-Performance Engine: WebAssembly and Web Worker background processing for smooth, lag-free 60 FPS navigation on large JSON files.
• Smart Copy: Right-click any node to copy its formatted JSON value, exact JSONPath (e.g. $.users[0].name), or property key.
• SVG Export: Download high-resolution vector diagrams of your data structures.

HOW TO USE
1. Click the JSON Inspector icon in your Chrome toolbar to open the Side Panel, or press F12 and select the "JSON Inspector" tab in DevTools.
2. Paste or type your JSON in the editor, or click "Sample" to load example data.
3. Explore the visual graph on the right: click to expand/collapse nodes, drag to pan, and scroll to zoom.
4. Use Ctrl+F to search keys and values across the entire tree.

PRIVACY & SECURITY
JSON Inspector runs 100% locally on your computer. Your JSON data is never transmitted to any external server or third party.
```

---

## 2. Permissions Justification (For Google Review Team)

| Permission | Type | Exact Justification for Reviewer |
| :--- | :--- | :--- |
| **`sidePanel`** | `permissions` | *"Required to display the JSON editor and interactive graph visualizer inside Chrome's native browser Side Panel so developers can inspect and format JSON responses alongside active web pages."* |

---

## 3. Privacy & Data Usage Answers

* **Does this extension collect user data?**: **No**
* **Does it transmit data off-device?**: **No**
* **Data Use Certifications**:
  - [x] Does not sell user data.
  - [x] Does not use data for unrelated purposes.
  - [x] Does not use data for creditworthiness or lending.

---

## 4. Privacy Policy Text

*(You can copy this into a public GitHub Gist, README, or GitHub Pages URL for the required Privacy Policy link)*:

```text
Privacy Policy for JSON Inspector

JSON Inspector is committed to protecting your privacy.

1. Data Collection: JSON Inspector does NOT collect, store, track, or transmit any personal data, browsing history, or user-entered JSON documents.
2. Local Processing: All JSON parsing, graph generation, formatting, and rendering happen entirely locally within your browser using Web Workers and WebAssembly.
3. Network Requests: JSON Inspector makes zero external network requests and communicates with no remote servers or third-party analytics services.
4. Contact: For issues or questions, visit https://github.com/Malstreem/json-inspector/issues
```

---

## 5. Ready-to-Upload Assets

All visual assets have been generated and sized strictly to Chrome Web Store specifications:

| Asset | File | Size | Requirement |
| :--- | :--- | :--- | :--- |
| **Store Icon** | [`public/icons/icon-128.png`](public/icons/icon-128.png) | 128×128 px PNG | **Required** |
| **Screenshot #1** | [`public/screenshot-1280x800.png`](public/screenshot-1280x800.png) | 1280×800 px PNG | **Required** (Exact 16:10 store ratio) |
| **Small Promo Tile** | [`public/promo-tile-440x280.png`](public/promo-tile-440x280.png) | 440×280 px PNG | Recommended for store search cards |
| **Package ZIP** | [`json-inspector-extension.zip`](json-inspector-extension.zip) | Flat root ZIP | Upload in Developer Dashboard |
