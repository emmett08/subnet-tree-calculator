# subnet-tree-calculator

A **themeable** React + TypeScript **subnet calculator** (IPv4 + IPv6) that lets users **split CIDR blocks visually as a binary tree**.

- Rendering is **SVG**.
- Layout + pan/zoom is handled with **D3**.
- The split operation is **pure CIDR maths** (left child = appended bit `0`, right child = appended bit `1`).

## Features

- ✅ IPv4 and IPv6 CIDRs (auto-detected from the address)
- ✅ Interactive binary tree: click to select, **double-click to split/merge**
- ✅ Zoom + pan + fit-to-view
- ✅ Leaf subnet list + “copy leaf CIDRs”
- ✅ Fully themeable via CSS variables **or** a `theme` prop
- ✅ Node spacing derived from node geometry, so **nodes (including leaves) do not overlap**

## Install

```bash
npm i subnet-tree-calculator d3
# (if you are building from source)
npm i -D typescript tsup
```

> React is a peer dependency.

## Usage

```tsx
import React from "react";
import { SubnetTreeCalculator } from "subnet-tree-calculator";
import "subnet-tree-calculator/style.css";

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <SubnetTreeCalculator initialCidr="10.0.0.0/16" initialMaxDepth={8} />
    </div>
  );
}
```

### IPv6 example

```tsx
<SubnetTreeCalculator initialCidr="2001:db8:abcd::/48" initialMaxDepth={16} />
```

## Theming

### Option A: pass a theme object

```tsx
<SubnetTreeCalculator
  initialCidr="192.168.0.0/24"
  theme={{
    bg: "#121418",
    panelBg: "#1a1d22",
    canvasBg: "#171a1f",
    border: "#343a46",
    text: "#f2f4f8",
    mutedText: "#a7afbf",
    nodeStrokeSelected: "#4f8cff"
  }}
/>
```

### Option B: override CSS variables

```tsx
<div
  style={{
    ["--stc-bg" as any]: "#0b1020",
    ["--stc-nodeStrokeSelected" as any]: "#ffb020"
  }}
>
  <SubnetTreeCalculator />
</div>
```

## Preventing overlaps

The component uses D3’s `tree().nodeSize([dx, dy])` where:

- `dx = nodeWidth + xGap`
- `dy = nodeHeight + yGap`

So the rectangles are laid out with **guaranteed spacing**.

If you increase fonts or want more breathing room (especially for long IPv6 strings), tweak:

```tsx
<SubnetTreeCalculator
  nodeWidth={280}
  xGap={120}
  nodeHeight={80}
  yGap={120}
/>
```

## IPv4 vs IPv6 notes

- IPv4 shows `Broadcast` and uses RFC 3021 behaviour for `/31` (both addresses considered usable).
- IPv6 does not have broadcast; the UI shows **Last address** instead.

## Development (demo)

This repo includes a small Vite demo app.

```bash
npm i
npm run dev
```

## Assets

Mock UI PNGs are in `assets/`.

## Licence

MIT.
