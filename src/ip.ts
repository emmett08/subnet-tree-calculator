export type IpVersion = 4 | 6;

export type NormalisedCidr = {
  version: IpVersion;
  bits: 32 | 128;
  network: bigint;
  prefix: number;
};

export type SubnetMeta = {
  version: IpVersion;
  bits: 32 | 128;
  cidr: string;

  network: string;
  prefix: number;
  netmask: string;
  wildcard: string;

  /** IPv4 only. For IPv6 this will be undefined (IPv6 has no broadcast address). */
  broadcast?: string;

  /** The last address in the CIDR block (broadcast for IPv4). */
  lastAddress: string;

  addressCount: bigint;
  usableCount: bigint;

  /** Range of addresses considered "usable" by this calculator.
   *  - IPv4: /32 => 1, /31 => 2 (RFC 3021), otherwise excludes network + broadcast.
   *  - IPv6: all addresses are considered usable.
   */
  firstUsable: string | null;
  lastUsable: string | null;
};

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function assertIntegerInRange(n: number, min: number, max: number, msg: string) {
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(msg);
}

function isLikelyIpv6(s: string): boolean {
  return s.includes(":");
}

function stripZoneIndex(ip: string): string {
  // e.g. fe80::1%eth0
  const i = ip.indexOf("%");
  return i === -1 ? ip : ip.slice(0, i);
}

export function ipv4ToBigInt(ip: string): bigint {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) throw new Error("Invalid IPv4 address (expected a.b.c.d)");

  let n = 0n;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) throw new Error("Invalid IPv4 address (octets must be 0-255)");
    const v = Number(p);
    if (v < 0 || v > 255) throw new Error("Invalid IPv4 address (octets must be 0-255)");
    n = n * 256n + BigInt(v);
  }
  return n;
}

export function bigIntToIpv4(n: bigint): string {
  if (n < 0n || n > 0xffffffffn) throw new Error("IPv4 value out of range");
  const a = Number((n >> 24n) & 255n);
  const b = Number((n >> 16n) & 255n);
  const c = Number((n >> 8n) & 255n);
  const d = Number(n & 255n);
  return `${a}.${b}.${c}.${d}`;
}

function expandEmbeddedIpv4(ipv6: string): string {
  // Handles e.g. ::ffff:192.0.2.128 or ::192.0.2.1
  if (!ipv6.includes(".")) return ipv6;

  const lastColon = ipv6.lastIndexOf(":");
  if (lastColon === -1) throw new Error("Invalid IPv6 address");

  const head = ipv6.slice(0, lastColon);
  const tail = ipv6.slice(lastColon + 1);

  const v4 = ipv4ToBigInt(tail);
  const hi = Number((v4 >> 16n) & 0xffffn);
  const lo = Number(v4 & 0xffffn);

  const hiStr = hi.toString(16);
  const loStr = lo.toString(16);

  // If head ends with ':' already (e.g. '::'), avoid creating ':::'.
  const sep = head.endsWith(":") ? "" : ":";
  return `${head}${sep}${hiStr}:${loStr}`;
}

export function ipv6ToBigInt(ip: string): bigint {
  let s = stripZoneIndex(ip.trim()).toLowerCase();
  if (s.length === 0) throw new Error("Invalid IPv6 address");

  s = expandEmbeddedIpv4(s);

  const parts = s.split("::");
  if (parts.length > 2) throw new Error("Invalid IPv6 address (too many '::')");

  const leftPart = parts[0] ?? "";
  const rightPart = parts.length === 2 ? (parts[1] ?? "") : "";

  const left = leftPart.length ? leftPart.split(":") : [];
  const right = rightPart.length ? rightPart.split(":") : [];

  // If there is no '::', we must have exactly 8 hextets.
  if (parts.length === 1) {
    const hextets = left;
    if (hextets.length !== 8) throw new Error("Invalid IPv6 address (expected 8 hextets)");
    return hextetsToBigInt(hextets);
  }

  // With '::', we can have fewer than 8 hextets total.
  const total = left.length + right.length;
  if (total > 8) throw new Error("Invalid IPv6 address (too many hextets)");

  const missing = 8 - total;
  const full: string[] = [...left, ...Array(missing).fill("0"), ...right];
  if (full.length !== 8) throw new Error("Invalid IPv6 address");

  return hextetsToBigInt(full);
}

function hextetsToBigInt(hextets: string[]): bigint {
  let n = 0n;
  for (const h of hextets) {
    if (h.length === 0) throw new Error("Invalid IPv6 address");
    if (!/^[0-9a-f]{1,4}$/i.test(h)) throw new Error("Invalid IPv6 address (bad hextet)");
    const v = parseInt(h, 16);
    if (v < 0 || v > 0xffff) throw new Error("Invalid IPv6 address (hextet out of range)");
    n = (n << 16n) + BigInt(v);
  }
  return n;
}

export function bigIntToIpv6(n: bigint): string {
  if (n < 0n || n > ((1n << 128n) - 1n)) throw new Error("IPv6 value out of range");

  const hextets: number[] = new Array(8);
  let x = n;
  for (let i = 7; i >= 0; i--) {
    hextets[i] = Number(x & 0xffffn);
    x >>= 16n;
  }

  // Find longest run of zeros (length >= 2) for '::' compression.
  let bestStart = -1;
  let bestLen = 0;

  for (let i = 0; i < 8; ) {
    if (hextets[i] === 0) {
      let j = i;
      while (j < 8 && hextets[j] === 0) j++;
      const len = j - i;
      if (len >= 2 && len > bestLen) {
        bestStart = i;
        bestLen = len;
      }
      i = j;
    } else {
      i++;
    }
  }

  const toHex = (v: number) => v.toString(16);

  if (bestStart === -1) {
    return hextets.map(toHex).join(":");
  }

  const before = hextets.slice(0, bestStart).map(toHex);
  const after = hextets.slice(bestStart + bestLen).map(toHex);

  // Edge case: all zeros
  if (before.length === 0 && after.length === 0) return "::";

  const left = before.join(":");
  const right = after.join(":");

  if (left.length === 0) return `::${right}`;
  if (right.length === 0) return `${left}::`;
  return `${left}::${right}`;
}

export function maskFromPrefix(prefix: number, bits: 32 | 128): bigint {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);

  if (prefix === 0) return 0n;
  if (prefix === bits) return (1n << BigInt(bits)) - 1n;

  const ones = (1n << BigInt(prefix)) - 1n;
  const shift = BigInt(bits - prefix);
  return ones << shift;
}

export function wildcardFromPrefix(prefix: number, bits: 32 | 128): bigint {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);
  const hostBits = bits - prefix;
  if (hostBits === 0) return 0n;
  return (1n << BigInt(hostBits)) - 1n;
}

export function parseCidr(input: string): NormalisedCidr {
  const trimmed = input.trim();
  const parts = trimmed.split("/");
  if (parts.length !== 2) throw new Error("Invalid CIDR (expected address/prefix)");

  const addrStr = parts[0]?.trim();
  const prefixStr = parts[1]?.trim();
  if (!addrStr || !prefixStr) throw new Error("Invalid CIDR (expected address/prefix)");
  if (!/^\d+$/.test(prefixStr)) throw new Error("Invalid CIDR prefix");

  const prefix = Number(prefixStr);
  const version: IpVersion = isLikelyIpv6(addrStr) ? 6 : 4;
  const bits: 32 | 128 = version === 6 ? 128 : 32;
  assertIntegerInRange(prefix, 0, bits, `Invalid CIDR prefix (expected 0..${bits})`);

  const ip = version === 6 ? ipv6ToBigInt(addrStr) : ipv4ToBigInt(addrStr);
  const mask = maskFromPrefix(prefix, bits);
  const network = ip & mask;

  return { version, bits, network, prefix };
}

export function formatAddress(version: IpVersion, n: bigint): string {
  return version === 6 ? bigIntToIpv6(n) : bigIntToIpv4(n);
}

export function formatCidr(version: IpVersion, network: bigint, prefix: number): string {
  return `${formatAddress(version, network)}/${prefix}`;
}

export function subnetMeta(network: bigint, prefix: number, version: IpVersion, bits: 32 | 128): SubnetMeta {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);

  const mask = maskFromPrefix(prefix, bits);
  const wildcard = wildcardFromPrefix(prefix, bits);
  const last = network | wildcard;

  const addressCount = 1n << BigInt(bits - prefix);

  let usableCount: bigint;
  let firstUsable: bigint | null;
  let lastUsable: bigint | null;

  if (version === 4) {
    if (prefix === 32) {
      usableCount = 1n;
      firstUsable = network;
      lastUsable = network;
    } else if (prefix === 31) {
      // RFC 3021 point-to-point: both addresses usable
      usableCount = 2n;
      firstUsable = network;
      lastUsable = last;
    } else {
      usableCount = addressCount - 2n;
      firstUsable = network + 1n;
      lastUsable = last - 1n;
    }
  } else {
    // IPv6: treat all addresses as usable.
    usableCount = addressCount;
    firstUsable = network;
    lastUsable = last;
  }

  return {
    version,
    bits,
    cidr: formatCidr(version, network, prefix),
    network: formatAddress(version, network),
    prefix,
    netmask: formatAddress(version, mask),
    wildcard: formatAddress(version, wildcard),
    broadcast: version === 4 ? formatAddress(version, last) : undefined,
    lastAddress: formatAddress(version, last),
    addressCount,
    usableCount,
    firstUsable: firstUsable == null ? null : formatAddress(version, firstUsable),
    lastUsable: lastUsable == null ? null : formatAddress(version, lastUsable)
  };
}

export function formatCount(count: bigint, bits?: number, prefix?: number): string {
  if (count <= MAX_SAFE_BIGINT) return Number(count).toLocaleString("en-GB");

  // For CIDR ranges the size is always a power of two, so it's useful to show the exponent.
  if (bits != null && prefix != null) {
    const exp = bits - prefix;
    const digits = count.toString().length;
    return `2^${exp} (${digits} digits)`;
  }

  // Fallback
  return `${count.toString()} (bigint)`;
}

export function binaryWithPrefix(
  value: bigint,
  prefix: number,
  bits: 32 | 128,
  groupBits: number = bits === 128 ? 16 : 8,
  groupsPerLine: number = bits === 128 ? 4 : 4
): string {
  assertIntegerInRange(prefix, 0, bits, `Invalid prefix (expected 0..${bits})`);
  assertIntegerInRange(groupBits, 1, 64, "Invalid groupBits");

  const raw = value.toString(2).padStart(bits, "0");

  let out = "";
  let bitCount = 0;
  let groupCount = 0;

  for (let i = 0; i < bits; i++) {
    if (i === prefix) out += "|";

    out += raw[i];
    bitCount++;

    if (bitCount !== bits && bitCount % groupBits === 0) {
      out += " ";
      groupCount++;

      if (groupsPerLine > 0 && groupCount % groupsPerLine === 0) {
        out += "\n";
      }
    }
  }

  // prefix == bits means the boundary is at the end
  if (prefix === bits) out += "|";

  return out.trimEnd();
}
