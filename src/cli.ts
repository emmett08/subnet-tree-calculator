#!/usr/bin/env node

import { parseCidr, formatCidr } from "./core/parser";
import { subnetMeta } from "./core/calculations";
import { splitBinary } from "./core/transformations";
import { allocateVlsm } from "./core/vlsm";
import { exportToJson, exportToCsv, exportToMarkdown, exportToTerraform } from "./core/export";
import type { NormalisedCidr } from "./core/types";

// Helper to convert BigInt to string for JSON serialization
function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export function printHelp(): string {
  return `
Subnet Tree Calculator CLI

Usage: subnet-calc <command> [options]

Commands:
  parse <cidr> [cidr...]          Parse and normalize one or more CIDRs
  meta <cidr> [cidr...]           Show subnet metadata for one or more CIDRs
  split <cidr> [cidr...]          Split one or more subnets into two
  vlsm <base> <req1> <req2>...    Allocate VLSM subnets
  export <format> <cidr> [cidr...] Export one or more subnets (json|csv|md|tf)
  help                            Show this help

Examples:
  subnet-calc parse 192.168.1.0/24
  subnet-calc parse 192.168.1.0/24 10.0.0.0/8 172.16.0.0/12
  subnet-calc meta 10.0.0.0/16
  subnet-calc meta 10.0.0.0/16 192.168.0.0/24
  subnet-calc split 172.16.0.0/16
  subnet-calc split 172.16.0.0/16 10.0.0.0/8
  subnet-calc vlsm 10.0.0.0/16 1000 500 250
  subnet-calc export json 192.168.0.0/24
  subnet-calc export csv 192.168.0.0/24 10.0.0.0/16
`;
}

export function runCommand(args: string[]): string {
  if (args.length === 0 || args[0] === "help") {
    return printHelp();
  }

  const command = args[0];

  switch (command) {
    case "parse": {
      if (args.length < 2) {
        throw new Error("At least one CIDR required");
      }
      const cidrs = args.slice(1);
      const results = cidrs.map(cidrStr => parseCidr(cidrStr));

      // If single CIDR, return object; if multiple, return array
      if (results.length === 1) {
        return JSON.stringify(results[0], bigIntReplacer, 2);
      }
      return JSON.stringify(results, bigIntReplacer, 2);
    }

    case "meta": {
      if (args.length < 2) {
        throw new Error("At least one CIDR required");
      }
      const cidrs = args.slice(1);
      const results = cidrs.map(cidrStr => {
        const cidr = parseCidr(cidrStr);
        const bits = cidr.version === 4 ? 32 : 128;
        return subnetMeta(cidr.network, cidr.prefix, cidr.version, bits);
      });

      // If single CIDR, return object; if multiple, return array
      if (results.length === 1) {
        return JSON.stringify(results[0], bigIntReplacer, 2);
      }
      return JSON.stringify(results, bigIntReplacer, 2);
    }

    case "split": {
      if (args.length < 2) {
        throw new Error("At least one CIDR required");
      }
      const cidrs = args.slice(1);
      const results = cidrs.map(cidrStr => {
        const cidr = parseCidr(cidrStr);
        const [left, right] = splitBinary(cidr);
        return {
          original: formatCidr(cidr.version, cidr.network, cidr.prefix),
          left,
          right
        };
      });

      // If single CIDR, return object; if multiple, return array
      if (results.length === 1) {
        return JSON.stringify(results[0], bigIntReplacer, 2);
      }
      return JSON.stringify(results, bigIntReplacer, 2);
    }

    case "vlsm": {
      if (args.length < 3) {
        throw new Error("Base CIDR and at least one requirement needed");
      }
      const base = parseCidr(args[1]!);
      const requirements = args.slice(2).map((req) => ({
        name: `Subnet-${req}`,
        requiredHosts: parseInt(req, 10)
      }));
      const result = allocateVlsm(base, requirements, "LARGEST_FIRST");
      return JSON.stringify(result, bigIntReplacer, 2);
    }

    case "export": {
      if (args.length < 3) {
        throw new Error("Format and at least one CIDR required");
      }
      const format = args[1]!;
      const cidrs = args.slice(2);
      const subnets = cidrs.map(cidrStr => parseCidr(cidrStr));

      switch (format) {
        case "json":
          return exportToJson(subnets);
        case "csv":
          return exportToCsv(subnets);
        case "md":
          return exportToMarkdown(subnets);
        case "tf":
          return exportToTerraform(subnets);
        default:
          throw new Error(`Unknown format '${format}'`);
      }
    }

    default:
      throw new Error(`Unknown command '${command}'`);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  try {
    const output = runCommand(args);
    console.log(output);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if this file is being executed directly
if (import.meta.url.startsWith('file://')) {
  const modulePath = import.meta.url.slice(7);
  const scriptPath = process.argv[1];

  // Check if this module is being run directly (handles symlinks)
  if (modulePath === scriptPath || modulePath.endsWith('/cli.js')) {
    main();
  }
}

