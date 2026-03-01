# Part 6 — Layout Bug Fix (visual-evolution-editor.tsx)

## 6.1 Root Cause Analysis

Three compounding CSS errors in `visual-evolution-editor.tsx`:

### Error 1: Hardcoded inner size + `transform: scale()`

```tsx
// ~line 854
<div style={{
  transform: `scale(${zoom})`,
  transformOrigin: 'top left',
  width: '1600px',
  height: '1000px',
}}>
```

`transform: scale()` creates a new stacking context but does **NOT change the element's layout box**. The browser computes layout FIRST (1600×1000px), THEN paints at the scaled visual size:

| Zoom | Layout Box | Visual Size | Problem |
|------|-----------|-------------|---------|
| 1.0  | 1600px    | 1600px      | OK |
| 1.5  | 1600px    | 2400px      | Visual overflows parent; scrollbar only covers 1600px layout |
| 0.7  | 1600px    | 1120px      | Scrollbar for 1600px but only 1120px visible → dead space |

Nodes use `position: absolute; left: ${node.x}px` relative to the 1600px container. If `node.x > 1600`, the node extends beyond the container. Since the container is in normal flow, this pushes the **page** layout.

### Error 2: Percentage dimensions inside scaled container

```tsx
// ~line 866
style={{ width: `${100 * zoom}%`, height: `${100 * zoom}%` }}
```

At zoom=1.5: `width: 150%` of 1600px parent = **2400px layout**, then `scale(1.5)` = **3600px visual**. This is compound scaling — the percentage already accounts for zoom, then `scale()` applies zoom again.

### Error 3: `overflow: auto` without containment

```tsx
// ~line 845
className="... overflow-auto"
```

`overflow: auto` clips based on **layout box**, not **painted (visual) box**. Without `contain: paint` on an ancestor, the transformed child's visual bounds "leak" past the scroll area. The horizontal scrollbar appears on the `<body>` instead of staying contained.

## 6.2 Containment Model

```
┌── Outer Container ─────────────────────────────────────────┐
│  overflow: hidden                                           │
│  contain: layout style paint    ← FIREWALL                 │
│                                                             │
│  ┌── Scroll Container ───────────────────────────────────┐ │
│  │  position: absolute; inset: 0                          │ │
│  │  overflow: auto              ← internal scroll only    │ │
│  │                                                        │ │
│  │  ┌── Zoom Container ───────────────────────────────┐  │ │
│  │  │  transform: scale(zoom)                          │  │ │
│  │  │  transform-origin: top left                      │  │ │
│  │  │  position: relative                              │  │ │
│  │  │  width: 3000px; height: 2000px  ← fixed canvas   │  │ │
│  │  │                                                  │  │ │
│  │  │  [grid]  [SVG connections]  [positioned nodes]   │  │ │
│  │  │                                                  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why this works:**

1. **Outer container** (`contain: layout style paint` + `overflow: hidden`): Creates a CSS containment boundary. Nothing inside can affect layout outside. This is the firewall that prevents the page scrollbar from appearing.

2. **Scroll container** (`position: absolute; inset: 0; overflow: auto`): Fills the outer container and provides internal scrolling. Because it's absolutely positioned and its parent has `contain: paint`, the scroll area is fully isolated.

3. **Zoom container** (`transform: scale(zoom)` + fixed dimensions): The actual canvas. `transform` applies visual scaling without changing the layout box (which remains 3000×2000px). The scroll container's scrollbars account for the layout box size, not the visual size — this is correct because the user scrolls through the canvas at the layout level, and the visual scaling is just a "zoom lens" effect.

## 6.3 CSS Fix

```css
/* Add to custom.css or a CSS module */

.visual-editor-container {
  position: relative;
  width: 100%;
  height: 600px;
  border-radius: 0.75rem;
  border: 2px solid rgba(251, 146, 60, 0.3);
  background: rgba(17, 24, 39, 0.5);
  overflow: hidden;                /* clip — NOT auto */
  contain: layout style paint;    /* containment firewall */
}

.visual-editor-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;                  /* scrollable, but isolated */
}

.visual-editor-canvas {
  position: relative;             /* anchor for absolute children */
  width: 3000px;
  height: 2000px;
  transform-origin: top left;
  /* transform: scale(zoom) — applied via inline style */
}

.visual-editor-grid {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image:
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  /* NO width/height override — inherits from canvas parent */
}

.visual-editor-svg {
  position: absolute;
  inset: 0;
  width: 100%;   /* 100% of 3000px canvas */
  height: 100%;
  pointer-events: none;
}
```

## 6.4 JSX Replacement

Replace the canvas rendering section (~lines 842-973) of `visual-evolution-editor.tsx`:

```tsx
<div className="visual-editor-container">
  <div className="visual-editor-scroll">
    <div
      className="visual-editor-canvas"
      ref={canvasRef}
      style={{ transform: `scale(${zoom})` }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid background */}
      <div className="visual-editor-grid" />

      {/* SVG connection lines */}
      <svg className="visual-editor-svg">
        {connections.map((conn, index) => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;
          return (
            <g key={index}>
              <path
                d={getConnectionPath(fromNode, toNode)}
                stroke="#fb923c"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10"
            refX="8" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#fb923c" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: `${node.x}px`,
            top: `${node.y}px`,
          }}
          onMouseDown={(e) => handleMouseDown(node.id, e)}
        >
          {/* ... existing node content ... */}
        </div>
      ))}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg font-semibold">Empty Canvas</p>
            <p className="text-sm">Search and add Digimon to get started</p>
          </div>
        </div>
      )}
    </div>
  </div>
</div>
```

## 6.5 Key Differences from Current Code

| Aspect | Before (broken) | After (fixed) |
|--------|-----------------|---------------|
| Outer container | `overflow-auto` on same element | `overflow: hidden` + `contain: layout style paint` |
| Scroll mechanism | On outer element (leaks to body) | Separate absolute-positioned scroll container |
| Canvas size | `1600×1000px` hardcoded | `3000×2000px` fixed canvas |
| Grid dimensions | `width: ${100*zoom}%` (compound scaling) | `inset: 0` (inherits canvas size) |
| SVG dimensions | Percentage of scaled parent | `inset: 0; width: 100%; height: 100%` of canvas |
| Containment | None | `contain: layout style paint` on outer |

## 6.6 Note

This fix applies to the **existing** `visual-evolution-editor.tsx` as a stopgap. The new React Flow–based `EvolutionGraphEditor` (Part 4) replaces this component entirely. React Flow handles its own viewport transform, zoom, and scroll internally using a `<svg>` + CSS transform approach that is already properly contained.
