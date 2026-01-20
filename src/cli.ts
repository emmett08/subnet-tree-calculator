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
  parse <cidr>                    Parse and normalize a CIDR
  meta <cidr>                     Show subnet metadata
  split <cidr>                    Split subnet into two
  vlsm <base> <req1> <req2>...    Allocate VLSM subnets
  export <format> <cidr>          Export subnet (json|csv|md|tf)
  help                            Show this help

Examples:
  subnet-calc parse 192.168.1.0/24
  subnet-calc meta 10.0.0.0/16
  subnet-calc split 172.16.0.0/16
  subnet-calc vlsm 10.0.0.0/16 1000 500 250
  subnet-calc export json 192.168.0.0/24
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
        throw new Error("CIDR required");
      }
      const result = parseCidr(args[1]!);
      return JSON.stringify(result, bigIntReplacer, 2);
    }

    case "meta": {
      if (args.length < 2) {
        throw new Error("CIDR required");
      }
      const cidr = parseCidr(args[1]!);
      const bits = cidr.version === 4 ? 32 : 128;
      const meta = subnetMeta(cidr.network, cidr.prefix, cidr.version, bits);
      return JSON.stringify(meta, bigIntReplacer, 2);
    }

    case "split": {
      if (args.length < 2) {
        throw new Error("CIDR required");
      }
      const cidr = parseCidr(args[1]!);
      const [left, right] = splitBinary(cidr);
      return JSON.stringify({ left, right }, bigIntReplacer, 2);
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
        throw new Error("Format and CIDR required");
      }
      const format = args[1]!;
      const cidr = parseCidr(args[2]!);
      const subnets = [cidr];

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

