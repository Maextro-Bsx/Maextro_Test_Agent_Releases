import { ViewMapping } from "./types";

export const assetMasterMappings: ViewMapping[] = [
  {
    matchText: "Header Data Asset", //Header Data for Asset Object
    cleanName: "Header Data Asset",
    viewCode: "AHDR",
  },
  {
    matchText: "General", // General View
    cleanName: "General",
    viewCode: "AM01",
  },
  {
    matchText: "Insurance", //Insurance View
    cleanName: "Insurance",
    viewCode: "AM02",
  },
  {
    matchText: "Leasing", //Leasing View
    cleanName: "Leasing",
    viewCode: "AM03",
  },
  {
    matchText: "Depreciation Areas", //Depreciation View
    cleanName: "Depreciation Areas",
    viewCode: "AM04",
  },
  {
    matchText: "Time Dependent",
    cleanName: "Time Dependent",
    viewCode: "AM05",
  },
  {
    matchText: "Investment support", //Investment support Measure
    cleanName: "Investment support",
    viewCode: "AM06",
  },
  {
    matchText: "Takeover values", //Intergattion Asset \ Equip
    cleanName: "Takeover values",
    viewCode: "AM07",
  },
  
];