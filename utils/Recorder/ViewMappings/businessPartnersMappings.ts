import { ViewMapping } from "./types";

export const businessPartnerMappings: ViewMapping[] = [
  {
    matchText: " BP :R/Account Groups",
    cleanName: " BP :R/Account Groups",
    viewCode: "BOR1",
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