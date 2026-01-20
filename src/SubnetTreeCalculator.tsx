import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { IpVersion } from "./core/types";
import { formatCidr, parseCidr } from "./core/parser";
import { binaryWithPrefix, formatCount, subnetMeta } from "./core/calculations";
import { truncateMiddle, truncateStart } from "./utils/string-utils";

export type SubnetTreeTheme = Partial<{
  fontFamily: string;
  monoFamily: string;

  bg: string;
  panelBg: string;
  canvasBg: string;
  border: string;

  text: string;
  mutedText: string;

  linkStroke: string;

  nodeFill: string;
  nodeStroke: string;
  nodeStrokeSelected: string;
  nodeStrokeDisabled: string;

  buttonBg: string;
  buttonText: string;
  buttonBorder: string;

  buttonPrimaryBg: string;
  buttonPrimaryBorder: string;

  buttonOkBg: string;
  buttonOkBorder: string;

  hintBg: string;
  error: string;
}>;

export type SubnetTreeCalculatorProps = {
  /** IPv4 or IPv6 CIDR, e.g. 192.168.0.0/24 or 2001:db8::/48 */
  initialCidr?: string;

  /** How many additional prefix bits you allow relative to the base CIDR. */
  initialMaxDepth?: number;

  /** Height of the SVG canvas (px). */
  height?: number;

  /** Theming via CSS variables. */
  theme?: SubnetTreeTheme;

  /** Optional wrapper props */
  className?: string;
  style?: React.CSSProperties;

  /** Node geometry (useful to guarantee non-overlap with larger fonts or longer IPv6 labels). */
  nodeWidth?: number;
  nodeHeight?: number;
  xGap?: number;
  yGap?: number;
};

type SubnetNode = {
  id: string;
  version: IpVersion;
  bits: 32 | 128;
  network: bigint;
  prefix: number;
  path: string;
  children?: [SubnetNode, SubnetNode];
  collapsed?: boolean;
  status?: 'VALID' | 'INVALID' | 'RESERVED' | 'DEPRECATED';
};

function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Old browsers / unusual environments
    if (typeof ResizeObserver === "undefined") {
      const update = () => {
        const rect = el.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      };
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setSize({ width: cr.width, height: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

function findNodeById(node: SubnetNode, id: string): SubnetNode | null {
  if (node.id === id) return node;
  if (!node.children) return null;
  return findNodeById(node.children[0], id) ?? findNodeById(node.children[1], id);
}

function collectLeaves(node: SubnetNode, out: SubnetNode[] = []): SubnetNode[] {
  if (!node.children) {
    out.push(node);
    return out;
  }
  collectLeaves(node.children[0], out);
  collectLeaves(node.children[1], out);
  return out;
}

function canSplit(node: SubnetNode, rootPrefix: number, maxDepth: number): boolean {
  if (maxDepth < 0) return false;
  if (node.prefix >= node.bits) return false;
  const relativeDepth = node.prefix - rootPrefix;
  return relativeDepth < maxDepth;
}

function toggleSplit(
  node: SubnetNode,
  targetId: string,
  makeId: () => string,
  rootPrefix: number,
  maxDepth: number
): SubnetNode {
  if (node.id === targetId) {
    // Merge
    if (node.children) return { ...node, children: undefined };

    // Split
    if (!canSplit(node, rootPrefix, maxDepth)) return node;

    const childPrefix = node.prefix + 1;
    const childSize = 1n << BigInt(node.bits - childPrefix);

    const left: SubnetNode = {
      id: makeId(),
      version: node.version,
      bits: node.bits,
      network: node.network,
      prefix: childPrefix,
      path: node.path + "0"
    };

    const right: SubnetNode = {
      id: makeId(),
      version: node.version,
      bits: node.bits,
      network: node.network + childSize,
      prefix: childPrefix,
      path: node.path + "1"
    };

    return { ...node, children: [left, right] };
  }

  if (!node.children) return node;

  const a = node.children[0];
  const b = node.children[1];

  const na = toggleSplit(a, targetId, makeId, rootPrefix, maxDepth);
  const nb = toggleSplit(b, targetId, makeId, rootPrefix, maxDepth);

  if (na === a && nb === b) return node;
  return { ...node, children: [na, nb] };
}

function toggleCollapse(node: SubnetNode, targetId: string): SubnetNode {
  if (node.id === targetId) {
    return { ...node, collapsed: !node.collapsed };
  }

  if (!node.children) return node;

  const a = node.children[0];
  const b = node.children[1];

  const na = toggleCollapse(a, targetId);
  const nb = toggleCollapse(b, targetId);

  if (na === a && nb === b) return node;
  return { ...node, children: [na, nb] };
}

function cssVarsFromTheme(theme?: SubnetTreeTheme): React.CSSProperties {
  if (!theme) return {};
  const v: React.CSSProperties = {};

  const setVar = (name: string, value?: string) => {
    if (value == null) return;
    (v as any)[name] = value;
  };

  setVar("--stc-fontFamily", theme.fontFamily);
  setVar("--stc-monoFamily", theme.monoFamily);

  setVar("--stc-bg", theme.bg);
  setVar("--stc-panelBg", theme.panelBg);
  setVar("--stc-canvasBg", theme.canvasBg);
  setVar("--stc-border", theme.border);

  setVar("--stc-text", theme.text);
  setVar("--stc-mutedText", theme.mutedText);

  setVar("--stc-linkStroke", theme.linkStroke);

  setVar("--stc-nodeFill", theme.nodeFill);
  setVar("--stc-nodeStroke", theme.nodeStroke);
  setVar("--stc-nodeStrokeSelected", theme.nodeStrokeSelected);
  setVar("--stc-nodeStrokeDisabled", theme.nodeStrokeDisabled);

  setVar("--stc-buttonBg", theme.buttonBg);
  setVar("--stc-buttonText", theme.buttonText);
  setVar("--stc-buttonBorder", theme.buttonBorder);

  setVar("--stc-buttonPrimaryBg", theme.buttonPrimaryBg);
  setVar("--stc-buttonPrimaryBorder", theme.buttonPrimaryBorder);

  setVar("--stc-buttonOkBg", theme.buttonOkBg);
  setVar("--stc-buttonOkBorder", theme.buttonOkBorder);

  setVar("--stc-hintBg", theme.hintBg);
  setVar("--stc-error", theme.error);

  return v;
}

export function SubnetTreeCalculator({
  initialCidr = "192.168.0.0/24",
  initialMaxDepth = 6,
  height = 650,
  theme,
  className,
  style,
  nodeWidth = 240,
  nodeHeight = 72,
  xGap = 90,
  yGap = 110
}: SubnetTreeCalculatorProps) {
  const idCounter = useRef(0);
  const makeId = useCallback(() => `n${idCounter.current++}`, []);

  const [cidrInput, setCidrInput] = useState(initialCidr);
  const [maxDepth, setMaxDepth] = useState(initialMaxDepth);
  const [error, setError] = useState<string | null>(null);

  const [rootVersion, setRootVersion] = useState(0);

  const [root, setRoot] = useState<SubnetNode>(() => {
    const { version, bits, network, prefix } = parseCidr(initialCidr);
    return { id: makeId(), version, bits, network, prefix, path: "" };
  });

  const [selectedId, setSelectedId] = useState<string>(() => root.id);

  const applyBase = useCallback(() => {
    try {
      const { version, bits, network, prefix } = parseCidr(cidrInput);
      const newRoot: SubnetNode = { id: makeId(), version, bits, network, prefix, path: "" };
      setRoot(newRoot);
      setSelectedId(newRoot.id);
      setError(null);
      setRootVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [cidrInput, makeId]);

  const { nodes, links } = useMemo(() => {
    // Respect collapsed flag when building hierarchy
    const h = d3.hierarchy<SubnetNode>(root, (d) => {
      if (d.collapsed) return undefined;
      return d.children ? (d.children as unknown as SubnetNode[]) : undefined;
    });

    const dx = nodeWidth + xGap;
    const dy = nodeHeight + yGap;

    const layout = d3
      .tree<SubnetNode>()
      .nodeSize([dx, dy])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.15));

    const hp = layout(h);

    return { nodes: hp.descendants(), links: hp.links() };
  }, [root, nodeWidth, nodeHeight, xGap, yGap]);

  const { ref: canvasRef, size: canvasSize } = useResizeObserver<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zb = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    zoomRef.current = zb;
    svg.call(zb as any);

    // Don’t let dblclick-zoom fight split/merge.
    svg.on("dblclick.zoom", null);

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const fitView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;

    const width = canvasSize.width;
    const heightPx = canvasSize.height;
    if (!width || !heightPx || nodes.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.x - nodeWidth / 2);
      maxX = Math.max(maxX, n.x + nodeWidth / 2);
      minY = Math.min(minY, n.y - nodeHeight / 2);
      maxY = Math.max(maxY, n.y + nodeHeight / 2);
    }

    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const padding = 70;

    const sx = (width - padding) / bboxW;
    const sy = (heightPx - padding) / bboxH;
    const scale = Math.min(6, Math.max(0.15, Math.min(sx, sy) * 0.95));

    const tx = width / 2 - scale * (minX + bboxW / 2);
    const ty = heightPx / 2 - scale * (minY + bboxH / 2);

    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
    const svg = d3.select(svgRef.current);

    svg.transition().duration(350).call((zoomRef.current.transform as any), t);
  }, [canvasSize.width, canvasSize.height, nodes, nodeWidth, nodeHeight]);

  const didInitialFit = useRef(false);
  useEffect(() => {
    if (didInitialFit.current) return;
    if (canvasSize.width === 0 || canvasSize.height === 0) return;
    fitView();
    didInitialFit.current = true;
  }, [canvasSize.width, canvasSize.height, fitView]);

  useEffect(() => {
    if (rootVersion === 0) return;
    fitView();
  }, [rootVersion, fitView]);

  const selectedNode = useMemo(() => findNodeById(root, selectedId) ?? root, [root, selectedId]);
  const selectedMeta = useMemo(
    () => subnetMeta(selectedNode.network, selectedNode.prefix, selectedNode.version, selectedNode.bits),
    [selectedNode]
  );

  const canSplitSelected = useMemo(() => canSplit(selectedNode, root.prefix, maxDepth), [selectedNode, root.prefix, maxDepth]);
  const canMergeSelected = !!selectedNode.children;
  const splitMergeLabel = canMergeSelected ? "Merge selected" : "Split selected";

  const splitMergeSelected = useCallback(() => {
    setRoot((prevRoot) => toggleSplit(prevRoot, selectedId, makeId, prevRoot.prefix, maxDepth));
  }, [selectedId, makeId, maxDepth]);

  const toggleCollapseSelected = useCallback(() => {
    setRoot((prevRoot) => toggleCollapse(prevRoot, selectedId));
  }, [selectedId]);

  const canCollapseSelected = !!selectedNode.children && !selectedNode.collapsed;
  const canExpandSelected = !!selectedNode.children && selectedNode.collapsed;

  const nextSplitPreview = useMemo(() => {
    if (selectedNode.children) return null;
    if (!canSplitSelected) return null;

    const childPrefix = selectedNode.prefix + 1;
    const childSize = 1n << BigInt(selectedNode.bits - childPrefix);

    const left = formatCidr(selectedNode.version, selectedNode.network, childPrefix);
    const right = formatCidr(selectedNode.version, selectedNode.network + childSize, childPrefix);

    return { left, right };
  }, [selectedNode, canSplitSelected]);

  const leaves = useMemo(() => {
    const all = collectLeaves(root);
    return [...all].sort((a, b) => (a.network < b.network ? -1 : a.network > b.network ? 1 : 0));
  }, [root]);

  const copyLeaves = useCallback(async () => {
    const text = leaves.map((l) => formatCidr(l.version, l.network, l.prefix)).join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }, [leaves]);

  const themedStyle: React.CSSProperties = {
    ...cssVarsFromTheme(theme),
    ...style
  };

  const versionLabel = selectedMeta.version === 6 ? "IPv6" : "IPv4";
  const lastLabel = selectedMeta.version === 6 ? "Last address" : "Broadcast";

  const nodeTitleMax = 32;
  const nodeBitsMax = 18;

  return (
    <div className={`stc ${className ?? ""}`} style={themedStyle}>
      <div className="stc__toolbar">
        <label className="stc__label">
          Base CIDR
          <input
            className="stc__input"
            value={cidrInput}
            onChange={(e) => setCidrInput(e.target.value)}
            placeholder="e.g. 10.0.0.0/16 or 2001:db8::/48"
          />
        </label>

        <label className="stc__label">
          Max depth
          <input
            className="stc__input stc__input--number"
            type="number"
            min={0}
            max={128}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
          />
        </label>

        <button className="stc__button stc__button--primary" onClick={applyBase}>
          Apply
        </button>

        <button className="stc__button" onClick={fitView}>
          Fit view
        </button>

        <button
          className="stc__button stc__button--ok"
          onClick={splitMergeSelected}
          disabled={!canMergeSelected && !canSplitSelected}
          title={!canMergeSelected && !canSplitSelected ? "Reached max depth or maximum prefix" : undefined}
        >
          {splitMergeLabel}
        </button>

        <button
          className="stc__button"
          onClick={toggleCollapseSelected}
          disabled={!canCollapseSelected && !canExpandSelected}
          title={canCollapseSelected ? "Collapse subtree" : canExpandSelected ? "Expand subtree" : "No children to collapse/expand"}
        >
          {canCollapseSelected ? "Collapse" : "Expand"}
        </button>

        {error && <div className="stc__error">{error}</div>}
      </div>

      <div className="stc__main">
        <div className="stc__canvas" ref={canvasRef} style={{ height }}>
          <svg
            ref={svgRef}
            width={canvasSize.width || "100%"}
            height={canvasSize.height || "100%"}
            className="stc__svg"
            role="img"
            aria-label="Subnet binary tree"
          >
            <g ref={gRef}>
              {links.map((lnk, i) => {
                const sx = lnk.source.x;
                const sy = lnk.source.y + nodeHeight / 2;
                const tx = lnk.target.x;
                const ty = lnk.target.y - nodeHeight / 2;
                const midY = (sy + ty) / 2;
                const d = `M${sx},${sy} V${midY} H${tx} V${ty}`;
                return <path key={i} className="stc__link" d={d} />;
              })}

              {nodes.map((n) => {
                const meta = subnetMeta(n.data.network, n.data.prefix, n.data.version, n.data.bits);
                const isSelected = n.data.id === selectedId;
                const disabled = !n.data.children && !canSplit(n.data, root.prefix, maxDepth) && n.data.prefix < n.data.bits;

                // FR-057: Visual cues for status
                const statusClass = n.data.status ? ` stc__node--${n.data.status.toLowerCase()}` : "";
                const collapsedClass = n.data.collapsed ? " stc__node--collapsed" : "";

                const nodeClass =
                  "stc__node" +
                  (isSelected ? " stc__node--selected" : "") +
                  (disabled ? " stc__node--disabled" : "") +
                  statusClass +
                  collapsedClass;

                const title = truncateMiddle(meta.cidr, nodeTitleMax);

                const countLine =
                  meta.version === 4
                    ? `${formatCount(meta.addressCount, meta.bits, meta.prefix)} addrs | ${formatCount(meta.usableCount, meta.bits, meta.prefix)} hosts`
                    : `${formatCount(meta.addressCount, meta.bits, meta.prefix)} addrs`;

                const pathBits = n.data.path ? `bits: ${truncateStart(n.data.path, nodeBitsMax)}` : "";

                return (
                  <g
                    key={n.data.id}
                    className={nodeClass}
                    transform={`translate(${n.x},${n.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(n.data.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(n.data.id);
                      setRoot((prevRoot) => toggleSplit(prevRoot, n.data.id, makeId, prevRoot.prefix, maxDepth));
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      className="stc__nodeRect"
                      x={-nodeWidth / 2}
                      y={-nodeHeight / 2}
                      width={nodeWidth}
                      height={nodeHeight}
                      rx={12}
                      ry={12}
                    />

                    <text className="stc__nodeText" textAnchor="middle">
                      <tspan className="stc__nodeTitle" x={0} dy={-8}>
                        {title}
                      </tspan>
                      <tspan className="stc__nodeSub" x={0} dy={18}>
                        {countLine}
                      </tspan>
                      {pathBits && (
                        <tspan className="stc__nodeSub" x={0} dy={18}>
                          {pathBits}
                        </tspan>
                      )}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="stc__hint">Tip: click to select • double‑click to split/merge • scroll to zoom • drag to pan</div>
        </div>

        <aside className="stc__sidebar">
          <h3 className="stc__h3">Selected subnet</h3>

          <div className="stc__card">
            <div className="stc__kv">
              <div>Version</div>
              <div>{versionLabel}</div>

              <div>CIDR</div>
              <div className="stc__mono">{selectedMeta.cidr}</div>

              <div>Netmask</div>
              <div className="stc__mono">{selectedMeta.netmask}</div>

              {selectedMeta.version === 4 && (
                <>
                  <div>Wildcard</div>
                  <div className="stc__mono">{selectedMeta.wildcard}</div>
                </>
              )}

              <div>{lastLabel}</div>
              <div className="stc__mono">{selectedMeta.lastAddress}</div>

              <div>Usable range</div>
              <div className="stc__mono">
                {selectedMeta.firstUsable && selectedMeta.lastUsable
                  ? `${selectedMeta.firstUsable} – ${selectedMeta.lastUsable}`
                  : "n/a"}
              </div>

              <div>Addresses</div>
              <div>{formatCount(selectedMeta.addressCount, selectedMeta.bits, selectedMeta.prefix)}</div>

              <div>Usable</div>
              <div>{formatCount(selectedMeta.usableCount, selectedMeta.bits, selectedMeta.prefix)}</div>

              <div>Path bits</div>
              <div className="stc__mono">{selectedNode.path || "—"}</div>
            </div>

            <div className="stc__binaryBlock">
              <div className="stc__binaryLabel">Network (binary)</div>
              <pre className="stc__binaryPre">
                {binaryWithPrefix(selectedNode.network, selectedNode.prefix, selectedNode.bits)}
              </pre>
            </div>
          </div>

          <div className="stc__card">
            <h4 className="stc__h4">Next split</h4>
            {nextSplitPreview ? (
              <div className="stc__mono">
                0 → {nextSplitPreview.left}
                <br />
                1 → {nextSplitPreview.right}
              </div>
            ) : (
              <div className="stc__muted">No further split (already split, max depth reached, or maximum prefix).</div>
            )}
          </div>

          <div className="stc__card">
            <h4 className="stc__h4">Leaf subnets</h4>
            <div className="stc__muted">These are the final allocations (subnets that haven’t been split further).</div>

            <div className="stc__leaves">
              {leaves.map((l) => {
                const m = subnetMeta(l.network, l.prefix, l.version, l.bits);

                const rightLabel =
                  m.version === 4
                    ? `${formatCount(m.usableCount, m.bits, m.prefix)} hosts`
                    : `${formatCount(m.addressCount, m.bits, m.prefix)} addrs`;

                return (
                  <div key={l.id} className="stc__leafRow">
                    <span className="stc__mono">{m.cidr}</span>
                    <span className="stc__muted">{rightLabel}</span>
                  </div>
                );
              })}
            </div>

            <div className="stc__leafActions">
              <button className="stc__button" onClick={copyLeaves}>
                Copy leaf CIDRs
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
