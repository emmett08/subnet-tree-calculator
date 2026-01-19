import type { Meta, StoryObj } from "@storybook/react";
import { SubnetTreeCalculator } from "./SubnetTreeCalculator";

const meta = {
  title: "Subnet Tree Calculator",
  component: SubnetTreeCalculator,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen"
  },
  args: {
    initialCidr: "192.168.0.0/24",
    initialMaxDepth: 6,
    height: 650
  }
} satisfies Meta<typeof SubnetTreeCalculator>;

export default meta;

type Story = StoryObj<typeof SubnetTreeCalculator>;

export const Default: Story = {};

export const IPv6: Story = {
  args: {
    initialCidr: "2001:db8::/48",
    initialMaxDepth: 5,
    height: 700
  }
};

export const Compact: Story = {
  args: {
    nodeWidth: 210,
    nodeHeight: 62,
    xGap: 70,
    yGap: 90,
    height: 560
  }
};

export const WarmTheme: Story = {
  args: {
    theme: {
      fontFamily: "\"IBM Plex Sans\", \"Segoe UI\", Arial, sans-serif",
      monoFamily: "\"IBM Plex Mono\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
      bg: "#f7f1e9",
      panelBg: "#fffaf2",
      canvasBg: "#fef7ea",
      border: "#d8c7b3",
      text: "#2a1d12",
      mutedText: "#6b5141",
      linkStroke: "#c2a98a",
      nodeFill: "#fffaf2",
      nodeStroke: "#9a795f",
      nodeStrokeSelected: "#c15f3a",
      nodeStrokeDisabled: "#d2c2b5",
      buttonBg: "#f6e8d6",
      buttonText: "#2a1d12",
      buttonBorder: "#9a795f",
      buttonPrimaryBg: "#ffe2c6",
      buttonPrimaryBorder: "#c15f3a",
      buttonOkBg: "#e4f6df",
      buttonOkBorder: "#2d7a46",
      hintBg: "rgba(255, 250, 242, 0.92)",
      error: "#b62020"
    }
  }
};
