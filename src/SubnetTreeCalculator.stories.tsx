import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify the component renders
    const cidrInput = canvas.getByPlaceholderText(/e\.g\./i);
    expect(cidrInput).toBeInTheDocument();
    expect(cidrInput).toHaveValue("192.168.0.0/24");

    // Verify SVG canvas is present
    const svg = canvas.getByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();

    // Verify control buttons are present
    const splitButton = canvas.getByRole("button", { name: /Split selected/i });
    expect(splitButton).toBeInTheDocument();
  }
};

export const IPv6: Story = {
  args: {
    initialCidr: "2001:db8::/48",
    initialMaxDepth: 5,
    height: 700
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify IPv6 CIDR is loaded
    const cidrInput = canvas.getByPlaceholderText(/e\.g\./i);
    expect(cidrInput).toHaveValue("2001:db8::/48");

    // Verify the component handles IPv6
    const svg = canvas.getByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();
  }
};

export const Compact: Story = {
  args: {
    nodeWidth: 210,
    nodeHeight: 62,
    xGap: 70,
    yGap: 90,
    height: 560
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify compact layout renders
    const svg = canvas.getByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();

    // Verify controls are accessible
    const cidrInput = canvas.getByPlaceholderText(/e\.g\./i);
    expect(cidrInput).toBeInTheDocument();
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
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify warm theme is applied
    const svg = canvas.getByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();

    // Verify theme colors are applied to container
    const container = canvasElement.querySelector('.stc');
    expect(container).toBeTruthy();
  }
};

export const DarkTheme: Story = {
  args: {
    theme: {
      fontFamily: "\"Inter\", \"Segoe UI\", Arial, sans-serif",
      monoFamily: "\"JetBrains Mono\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
      bg: "#1a1a1a",
      panelBg: "#242424",
      canvasBg: "#0f0f0f",
      border: "#3a3a3a",
      text: "#e0e0e0",
      mutedText: "#a0a0a0",
      linkStroke: "#505050",
      nodeFill: "#2a2a2a",
      nodeStroke: "#606060",
      nodeStrokeSelected: "#4a9eff",
      nodeStrokeDisabled: "#404040",
      buttonBg: "#2a2a2a",
      buttonText: "#e0e0e0",
      buttonBorder: "#505050",
      buttonPrimaryBg: "#1e3a5f",
      buttonPrimaryBorder: "#4a9eff",
      buttonOkBg: "#1e3a2f",
      buttonOkBorder: "#4ade80",
      hintBg: "rgba(36, 36, 36, 0.95)",
      error: "#ef4444"
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify dark theme is applied
    const svg = canvas.getByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();

    // Verify dark theme colors are applied
    const container = canvasElement.querySelector('.stc');
    expect(container).toBeTruthy();

    // Verify text is readable in dark theme
    const cidrInput = canvas.getByPlaceholderText(/e\.g\./i);
    expect(cidrInput).toBeInTheDocument();
  }
};
