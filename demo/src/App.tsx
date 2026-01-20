import React, { useMemo, useState } from "react";
import { SubnetTreeCalculator } from "@lib";
import "@lib/SubnetTreeCalculator.css";

const darkTheme = {
  bg: "#121418",
  panelBg: "#1a1d22",
  canvasBg: "#171a1f",
  border: "#343a46",
  text: "#f2f4f8",
  mutedText: "#a7afbf",
  linkStroke: "#5b6270",
  nodeFill: "#1a1d22",
  nodeStroke: "#6b7280",
  nodeStrokeSelected: "#4f8cff",
  nodeStrokeDisabled: "#3b4150",
  buttonBg: "#20242b",
  buttonBorder: "#3b4150",
  buttonText: "#f2f4f8",
  buttonPrimaryBg: "#20304d",
  buttonPrimaryBorder: "#4f8cff",
  buttonOkBg: "#1e3a2a",
  buttonOkBorder: "#33c173",
  hintBg: "rgba(26,29,34,0.85)",
  error: "#ff6b6b"
} as const;

export default function App() {
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState<"ipv4" | "ipv6">("ipv4");

  const initialCidr = useMemo(() => {
    return mode === "ipv4" ? "10.0.0.0/16" : "2001:db8:abcd::/48";
  }, [mode]);

  const initialDepth = mode === "ipv4" ? 8 : 16;

  return (
    <div className="demo">
      <header className="demo__header">
        <div>
          <div className="demo__title">Subnet Tree Calculator</div>
          <div className="demo__subtitle">IPv4 + IPv6 • SVG + D3 • themeable</div>
        </div>

        <div className="demo__controls">
          <label className="demo__toggle">
            <span>IPv4</span>
            <input
              type="radio"
              name="mode"
              checked={mode === "ipv4"}
              onChange={() => setMode("ipv4")}
            />
          </label>
          <label className="demo__toggle">
            <span>IPv6</span>
            <input
              type="radio"
              name="mode"
              checked={mode === "ipv6"}
              onChange={() => setMode("ipv6")}
            />
          </label>

          <label className="demo__toggle">
            <span>Dark theme</span>
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          </label>
        </div>
      </header>

      <SubnetTreeCalculator
        key={`${mode}-${dark}`}
        initialCidr={initialCidr}
        initialMaxDepth={initialDepth}
        height={690}
        theme={dark ? darkTheme : undefined}
      />

      <footer className="demo__footer">
        Tip: double‑click a node to split/merge. For IPv6, try splitting a /48 towards /64.
      </footer>
    </div>
  );
}
