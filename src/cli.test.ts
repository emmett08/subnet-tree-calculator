import { describe, it, expect } from "vitest";
import { runCommand, printHelp } from "./cli";

describe("CLI", () => {
  it("should show help when no arguments provided", () => {
    const output = runCommand([]);
    expect(output).toContain("Subnet Tree Calculator CLI");
    expect(output).toContain("Usage:");
  });

  it("should show help when help command is used", () => {
    const output = runCommand(["help"]);
    expect(output).toContain("Subnet Tree Calculator CLI");
    expect(output).toContain("Commands:");
  });

  it("should parse CIDR", () => {
    const output = runCommand(["parse", "192.168.0.0/24"]);
    expect(output).toContain("\"version\": 4");
    expect(output).toContain("\"prefix\": 24");
    expect(output).toContain("\"network\"");
  });

  it("should show metadata", () => {
    const output = runCommand(["meta", "10.0.0.0/16"]);
    expect(output).toContain("\"network\"");
    expect(output).toContain("\"broadcast\"");
    expect(output).toContain("\"netmask\"");
  });

  it("should split subnet", () => {
    const output = runCommand(["split", "172.16.0.0/16"]);
    expect(output).toContain("\"left\"");
    expect(output).toContain("\"right\"");
    expect(output).toContain("\"prefix\": 17");
  });

  it("should allocate VLSM", () => {
    const output = runCommand(["vlsm", "10.0.0.0/16", "1000", "500"]);
    expect(output).toContain("\"allocated\"");
    expect(output).toContain("\"cidr\"");
  });

  it("should export to JSON", () => {
    const output = runCommand(["export", "json", "192.168.0.0/24"]);
    expect(output).toContain("192.168.0.0");
  });

  it("should export to CSV", () => {
    const output = runCommand(["export", "csv", "192.168.0.0/24"]);
    expect(output).toContain("192.168.0.0");
    expect(output).toContain("CIDR");
  });

  it("should export to Markdown", () => {
    const output = runCommand(["export", "md", "192.168.0.0/24"]);
    expect(output).toContain("192.168.0.0");
  });

  it("should export to Terraform", () => {
    const output = runCommand(["export", "tf", "192.168.0.0/24"]);
    expect(output).toContain("192.168.0.0");
  });

  it("should handle invalid command", () => {
    expect(() => runCommand(["invalid"])).toThrow("Unknown command");
  });

  it("should handle missing arguments for parse", () => {
    expect(() => runCommand(["parse"])).toThrow("CIDR required");
  });

  it("should handle missing arguments for meta", () => {
    expect(() => runCommand(["meta"])).toThrow("CIDR required");
  });

  it("should handle missing arguments for split", () => {
    expect(() => runCommand(["split"])).toThrow("CIDR required");
  });

  it("should handle missing arguments for vlsm", () => {
    expect(() => runCommand(["vlsm", "10.0.0.0/16"])).toThrow("Base CIDR and at least one requirement needed");
  });

  it("should handle missing arguments for export", () => {
    expect(() => runCommand(["export", "json"])).toThrow("Format and at least one CIDR required");
  });

  it("should handle unknown export format", () => {
    expect(() => runCommand(["export", "unknown", "10.0.0.0/16"])).toThrow("Unknown format");
  });

  // Multiple subnet tests
  describe("Multiple Subnets", () => {
    it("should parse multiple CIDRs", () => {
      const output = runCommand(["parse", "192.168.0.0/24", "10.0.0.0/8", "172.16.0.0/12"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("version", 4);
      expect(result[0]).toHaveProperty("prefix", 24);
      expect(result[1]).toHaveProperty("prefix", 8);
      expect(result[2]).toHaveProperty("prefix", 12);
    });

    it("should parse single CIDR as object not array", () => {
      const output = runCommand(["parse", "192.168.0.0/24"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty("version", 4);
      expect(result).toHaveProperty("prefix", 24);
    });

    it("should show metadata for multiple CIDRs", () => {
      const output = runCommand(["meta", "10.0.0.0/16", "192.168.0.0/24"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("cidr");
      expect(result[0]).toHaveProperty("network");
      expect(result[0]).toHaveProperty("broadcast");
      expect(result[1]).toHaveProperty("cidr");
      expect(result[1]).toHaveProperty("network");
    });

    it("should show metadata for single CIDR as object not array", () => {
      const output = runCommand(["meta", "10.0.0.0/16"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty("cidr");
      expect(result).toHaveProperty("network");
    });

    it("should split multiple CIDRs", () => {
      const output = runCommand(["split", "172.16.0.0/16", "10.0.0.0/8"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("original");
      expect(result[0]).toHaveProperty("left");
      expect(result[0]).toHaveProperty("right");
      expect(result[0].left).toHaveProperty("prefix", 17);
      expect(result[0].right).toHaveProperty("prefix", 17);
      expect(result[1].left).toHaveProperty("prefix", 9);
      expect(result[1].right).toHaveProperty("prefix", 9);
    });

    it("should split single CIDR as object not array", () => {
      const output = runCommand(["split", "172.16.0.0/16"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty("original");
      expect(result).toHaveProperty("left");
      expect(result).toHaveProperty("right");
    });

    it("should export multiple CIDRs to JSON", () => {
      const output = runCommand(["export", "json", "192.168.0.0/24", "10.0.0.0/16"]);
      expect(output).toContain("192.168.0.0");
      expect(output).toContain("10.0.0.0");
    });

    it("should export multiple CIDRs to CSV", () => {
      const output = runCommand(["export", "csv", "192.168.0.0/24", "10.0.0.0/16"]);
      expect(output).toContain("192.168.0.0");
      expect(output).toContain("10.0.0.0");
      expect(output).toContain("CIDR");
    });

    it("should export multiple CIDRs to Markdown", () => {
      const output = runCommand(["export", "md", "192.168.0.0/24", "10.0.0.0/16"]);
      expect(output).toContain("192.168.0.0");
      expect(output).toContain("10.0.0.0");
    });

    it("should export multiple CIDRs to Terraform", () => {
      const output = runCommand(["export", "tf", "192.168.0.0/24", "10.0.0.0/16"]);
      expect(output).toContain("192.168.0.0");
      expect(output).toContain("10.0.0.0");
    });

    it("should handle IPv6 with multiple CIDRs", () => {
      const output = runCommand(["parse", "2001:db8::/32", "2001:db8:abcd::/48"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("version", 6);
      expect(result[0]).toHaveProperty("prefix", 32);
      expect(result[1]).toHaveProperty("version", 6);
      expect(result[1]).toHaveProperty("prefix", 48);
    });

    it("should handle mixed IPv4 and IPv6", () => {
      const output = runCommand(["parse", "192.168.0.0/24", "2001:db8::/32"]);
      const result = JSON.parse(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("version", 4);
      expect(result[1]).toHaveProperty("version", 6);
    });
  });
});

