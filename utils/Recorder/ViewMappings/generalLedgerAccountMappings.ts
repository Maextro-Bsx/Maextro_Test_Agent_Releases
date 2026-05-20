import { ViewMapping } from "./types";

export const generalLedgerAccountMappings: ViewMapping[] = [
  {
    matchText: "General",
    cleanName: "General",
    viewCode: "GEN",
  },
  {
    matchText: "Time-Dependent",
    cleanName: "Time-Dependent",
    viewCode: "TD",
  },
  {
    matchText: "Allocations",
    cleanName: "Allocations",
    viewCode: "ALLOC",
  },
  {
    matchText: "Origin",
    cleanName: "Origin",
    viewCode: "ORG",
  },
  {
    matchText: "Depreciation Areas",
    cleanName: "Depreciation Areas",
    viewCode: "DEP",
  }
];