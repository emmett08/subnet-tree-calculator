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
    expect(() => runCommand(["export", "json"])).toThrow("Format and CIDR required");
  });

  it("should handle unknown export format", () => {
    expect(() => runCommand(["export", "unknown", "10.0.0.0/16"])).toThrow("Unknown format");
  });
});

