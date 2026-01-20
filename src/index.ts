export { SubnetTreeCalculator } from "./SubnetTreeCalculator";
export type { SubnetTreeCalculatorProps, SubnetTreeTheme } from "./SubnetTreeCalculator";

// Core domain exports
export {
  parseCidr,
  formatCidr,
  formatAddress,
  parseCidrWithNetmask,
  rangeToMinimalPrefixes,
  parseCidrSafe,
  classifyAddress,
  ipv4ToBigInt,
  bigIntToIpv4,
  ipv6ToBigInt,
  bigIntToIpv6,
  maskFromPrefix,
  wildcardFromPrefix,
} from "./core/parser";

export {
  subnetMeta,
  formatCount,
  binaryWithPrefix,
  reverseDnsZone,
} from "./core/calculations";

export {
  splitBinary,
  splitIntoN,
  splitByHostCount,
  mergeSiblings,
  summarizePrefixes,
  minimalCoveringSupernet,
} from "./core/transformations";

export {
  containsIp,
  containsPrefix,
  detectOverlaps,
  areAdjacent,
  canMerge,
  unionPrefixes,
  intersectPrefixes,
  differencePrefixes,
} from "./core/set-operations";

export {
  allocateVlsm,
} from "./core/vlsm";

export {
  exportToJson,
  exportToCsv,
  exportToMarkdown,
  exportDesignModel,
  importDesignModel,
  exportToTerraform,
} from "./core/export";

export {
  checkEdgeCases,
  formatWarnings,
  hasErrors,
  hasWarnings,
} from "./core/warnings";

export {
  SubnetService,
} from "./core/service";

export {
  searchByMetadata,
  filterSubnets,
  getParentPrefixes,
  getParent,
  getChildren,
  findDescendants,
  findAncestors,
} from "./core/search";

export {
  recordChange,
  diffDesigns,
  formatChangesAsMarkdown,
} from "./core/changes";

export {
  createNote,
  createReference,
  updateNote,
  formatNotesAsMarkdown,
  searchNotes,
} from "./core/notes";

export type {
  IpVersion,
  NormalisedCidr,
  SubnetMeta,
  AddressClass,
  Result,
  OverlapResult,
  VlsmRequest,
  VlsmAllocation,
  VlsmStrategy,
  DesignChange,
  SubnetNode,
  ExportFormat,
  DesignModel,
} from "./core/types";

export type {
  SubnetExportData,
  DesignModel as ExportDesignModel,
} from "./core/export";

export type {
  WarningLevel,
  SubnetWarning,
} from "./core/warnings";

export type {
  FilterCriteria,
} from "./core/search";

export type {
  ChangeType,
  Change,
  DesignHistory,
} from "./core/changes";

export type {
  NoteType,
  Note,
  Reference,
  SubnetNotes,
} from "./core/notes";
