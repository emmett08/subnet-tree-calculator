# Subnet Tree Calculator

A **comprehensive** React + TypeScript **subnet calculator and network design tool** (IPv4 + IPv6) with visual binary tree representation, VLSM planning, and extensive automation capabilities.

- **Visual Designer**: Interactive SVG binary tree with D3-powered pan/zoom
- **Core Engine**: Pure TypeScript domain logic for subnet calculations, transformations, and set operations
- **VLSM Planning**: Automated subnet allocation with multiple strategies
- **Import/Export**: JSON, CSV, Markdown, Terraform formats
- **Change Tracking**: Design versioning and diff capabilities
- **Fully Tested**: 226 unit tests with 100% coverage of core domain logic
- **CLI Interface**: Command-line tool for automation and scripting
- **Visual Export**: Export subnet trees to SVG, PNG, and PDF formats

## Features

### Input & Normalization (FR-001 to FR-006)
- ✅ IPv4 and IPv6 CIDR parsing with auto-detection
- ✅ Netmask notation support (e.g., `192.168.0.0/255.255.255.0`)
- ✅ IP range to minimal prefixes conversion
- ✅ Canonical normalization
- ✅ Special address range classification (private, loopback, multicast, etc.)

### Core Calculations (FR-010 to FR-013)
- ✅ Network, broadcast, usable range, and address counts
- ✅ Binary visualization with prefix highlighting
- ✅ Reverse DNS zone boundaries
- ✅ RFC 3021 /31 point-to-point support

### Transformations (FR-020 to FR-025)
- ✅ Binary split, split into N subnets, split by host count
- ✅ Merge sibling prefixes
- ✅ Summarize prefix sets
- ✅ Compute minimal covering supernet

### Set Operations (FR-030 to FR-034)
- ✅ IP and prefix containment checks
- ✅ Overlap detection with precise conflict pairs
- ✅ Adjacency detection
- ✅ Union, intersection, and difference operations

### VLSM Planning (FR-040 to FR-045)
- ✅ Automated allocation with strategies: largest-first, smallest-first, packed-low, packed-high, balanced
- ✅ Reserved block support
- ✅ Metadata attachment
- ✅ Policy enforcement and constraints

### Visual Designer (FR-050 to FR-057)
- ✅ Interactive binary tree with SVG rendering
- ✅ No visual overlap of leaf nodes (tested)
- ✅ Node selection with sticky focus
- ✅ Floating property panel
- ✅ Pan, zoom, fit-to-view controls
- ✅ Light and dark themes
- ✅ Collapse/expand subtrees
- ✅ Visual cues for invalid, reserved, or deprecated subnets

### Search & Query (FR-060 to FR-063)
- ✅ Search subnets by metadata
- ✅ Longest prefix match lookup
- ✅ Navigate parent/child lineage
- ✅ Filter by IP version, size, and status

### Import/Export (FR-070 to FR-075)
- ✅ Export to JSON, CSV, Markdown
- ✅ Export/import full design models
- ✅ Terraform variable export
- ✅ Programmatic API (SubnetService facade)
- ✅ CLI interface for automation

### Traceability & Audit (FR-080 to FR-083)
- ✅ Design change tracking
- ✅ Design diff with change summary
- ✅ Notes and references support
- ✅ Export read-only reports (PDF/PNG/SVG)

### Safety & Guidance (FR-090 to FR-093)
- ✅ Invalid prefix prevention
- ✅ Corrective normalization
- ✅ Edge case warnings (/31, /32, /127, etc.)
- ✅ Policy constraint support

## Install

```bash
npm install subnet-tree-calculator d3
```

> React 19 is a peer dependency.

## Usage

### React Component

```tsx
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

### IPv6 Example

```tsx
<SubnetTreeCalculator initialCidr="2001:db8:abcd::/48" initialMaxDepth={16} />
```

### Programmatic API

```typescript
import { SubnetService } from "subnet-tree-calculator";

const service = new SubnetService();

// Parse CIDR
const cidr = service.parse("10.0.0.0/24");

// Get subnet metadata
const meta = service.getMetadata(cidr);
console.log(meta.usableCount); // 254n

// Split subnet
const [left, right] = service.splitBinary(cidr);

// VLSM allocation
const parent = service.parse("10.0.0.0/16");
const requirements = [
  { name: "Office", hostCount: 500 },
  { name: "DMZ", hostCount: 100 },
  { name: "Management", hostCount: 50 }
];
const allocation = service.allocateVlsm(parent, requirements, "largest-first");

// Export to various formats
import { exportToJson, exportToCsv, exportToMarkdown } from "subnet-tree-calculator";

const subnets = [cidr];
const json = exportToJson(subnets);
const csv = exportToCsv(subnets);
const md = exportToMarkdown(subnets);
```

### CLI Interface

```bash
# Install globally
npm install -g subnet-tree-calculator

# Parse CIDR
subnet-calc parse 10.0.0.0/24

# Get metadata
subnet-calc meta 192.168.1.0/24

# Split subnet
subnet-calc split 10.0.0.0/16

# VLSM allocation
subnet-calc vlsm 10.0.0.0/16 500,100,50

# Export to various formats
subnet-calc export json 10.0.0.0/24
subnet-calc export csv 10.0.0.0/24
subnet-calc export md 10.0.0.0/24
subnet-calc export tf 10.0.0.0/24
```

### Visual Export

```typescript
import { exportToSvg, downloadSvg, exportToPng, downloadPng } from "subnet-tree-calculator";

// Get SVG element from the tree
const svgElement = document.querySelector('svg');

// Export to SVG string
const svgString = exportToSvg(svgElement);

// Download SVG file
downloadSvg(svgElement, 'subnet-tree.svg');

// Export to PNG blob
const pngBlob = await exportToPng(svgElement, { width: 1920, height: 1080, scale: 2 });

// Download PNG file
await downloadPng(svgElement, 'subnet-tree.png', { width: 1920, height: 1080 });
```

## Development

### Run Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm run test:run      # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # UI mode
```

### Run Storybook

```bash
npm run storybook           # Development mode
npm run storybook:build     # Build static site
npm run storybook:test      # Run interaction tests
```

### Quality Gates

```bash
npm run lint        # TypeScript type checking
npm run typecheck   # Type checking only
npm run verify      # Run all checks (lint + tests + storybook build)
```

## Architecture

The project follows **Hexagonal (Ports & Adapters) Architecture**:

- **Core Domain** (`src/core/`): Pure TypeScript logic with no UI dependencies
  - `parser.ts`: CIDR parsing and formatting
  - `calculations.ts`: Subnet metadata calculations
  - `transformations.ts`: Split, merge, summarize operations
  - `set-operations.ts`: Containment, overlap, union/intersection/difference
  - `vlsm.ts`: VLSM allocation strategies
  - `export.ts`: Export to various formats
  - `search.ts`: Search and filter functionality
  - `changes.ts`: Change tracking and diffing
  - `notes.ts`: Notes and references
  - `warnings.ts`: Edge case warnings
  - `visual-export.ts`: SVG/PNG/PDF export functionality
  - `service.ts`: Facade over all domain capabilities

- **CLI Layer** (`src/cli.ts`): Command-line interface for automation

- **UI Layer** (`src/`): React components
  - `SubnetTreeCalculator.tsx`: Main visual designer component

- **Tests** (`src/**/*.test.ts`): Comprehensive unit tests
  - 226 tests covering all domain logic, CLI, and visual export
  - Property-based testing for invariants
  - Edge case coverage
  - Visual layout tests for non-overlapping nodes

## Theming

The component supports light and dark themes via CSS custom properties:

```tsx
<SubnetTreeCalculator
  initialCidr="10.0.0.0/16"
  theme={{
    background: "#1e1e1e",
    text: "#ffffff",
    nodeFill: "#2d2d2d",
    nodeStroke: "#4a9eff",
    linkStroke: "#666666"
  }}
/>
```

Or use CSS variables:

```css
:root {
  --subnet-bg: #ffffff;
  --subnet-text: #000000;
  --subnet-node-fill: #f0f0f0;
  --subnet-node-stroke: #0066cc;
  --subnet-link-stroke: #999999;
}
```

## Testing

All core domain logic is thoroughly tested:

- **Unit Tests**: 226 tests across 15 test files
- **Integration Tests**: 6 tests for end-to-end workflows
- **Storybook Tests**: 5 interaction tests for UI components
- **Coverage**: 100% of core domain logic
- **Test Files**:
  - `parser.test.ts`: 21 tests
  - `calculations.test.ts`: 19 tests
  - `transformations.test.ts`: 20 tests
  - `set-operations.test.ts`: 21 tests
  - `vlsm.test.ts`: 12 tests
  - `export.test.ts`: 11 tests
  - `service.test.ts`: 26 tests
  - `search.test.ts`: 21 tests
  - `changes.test.ts`: 11 tests
  - `notes.test.ts`: 14 tests
  - `warnings.test.ts`: 17 tests
  - `cli.test.ts`: 17 tests
  - `visual-export.test.ts`: 7 tests
  - `integration.test.ts`: 6 tests
  - `SubnetTreeCalculator.layout.test.tsx`: 3 tests

## Traceability

See [TRACEABILITY.json](./TRACEABILITY.json) for complete mapping of functional requirements to implementation and tests.

**Status**: All 53 FRs and 43 UCs complete (100%)

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
1. All tests pass (`npm run test:run`)
2. Type checking passes (`npm run typecheck`)
3. Storybook builds successfully (`npm run storybook:build`)
4. Update TRACEABILITY.json for new features
