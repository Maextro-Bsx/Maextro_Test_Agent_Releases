export type ViewMapping = {
  matchText: string;
  cleanName: string;
  viewCode: string;
};

export class ViewMapper {
  private static mappings: ViewMapping[] = [
    {
      matchText: "Sign In",
      cleanName: "SYSTEM_IGNORE",
      viewCode: "IGNORE",
    },
    {
      matchText: "Views",
      cleanName: "SYSTEM_IGNORE",
      viewCode: "IGNORE",
    },

    /**
     * IMPORTANT:
     * Longer / more specific matches FIRST
     */

    
    {
      matchText: "Align Header",
      cleanName: "Align Header",
      viewCode: "ALHD",
    },
    {
      matchText: "Basic Data 1 View",
      cleanName: "Basic Data 1 View",
      viewCode: "BD1",
    },
    {
      matchText: "Sales Org./Dist. Ch.",
      cleanName: "Sales Org./Dist. Ch.",
      viewCode: "ORG2",
    },
    {
      matchText: "Sales Org./Dist.",
      cleanName: "Sales Org./Dist.",
      viewCode: "SO",
    },
    {
      matchText: "Plant/Storage Loc.",
      cleanName: "Plant/Storage Loc.",
      viewCode: "ORG1",
    },
    {
      matchText: "WM/Storage Types",
      cleanName: "WM/Storage Types",
      viewCode: "ORG3",
    },
    {
      matchText: "Unit of Measure Data",
      cleanName: "Unit of Measure Data",
      viewCode: "UOM",
    },
    {
      matchText: "Sales Tax Data View",
      cleanName: "Sales Tax Data View",
      viewCode: "STAX",
    },
    {
      matchText: "Sales General Data",
      cleanName: "Sales General Data",
      viewCode: "SGP",
    },
    {
      matchText: "Purchasing Data View",
      cleanName: "Purchasing Data View",
      viewCode: "PUR",
    },
    {
      matchText: "FT Import Data View",
      cleanName: "FT Import Data View",
      viewCode: "FTI",
    },
    {
      matchText: "Plant/Storage Data",
      cleanName: "Plant/Storage Data",
      viewCode: "PSG",
    },
    {
      matchText: "Waste Management",
      cleanName: "Waste Management",
      viewCode: "ZX01",
    },
    {
      matchText: "Work Scheduling Data",
      cleanName: "Work Scheduling Data",
      viewCode: "WSCH",
    },
    {
      matchText: "QM Data View",
      cleanName: "QM Data View",
      viewCode: "QM",
    },
    {
      matchText: "Accounting View",
      cleanName: "Accounting View",
      viewCode: "ACC",
    },
    {
      matchText: "MRP Data View",
      cleanName: "MRP Data View",
      viewCode: "MRP",
    },
  ];

  private static normalize(
    value: string
  ): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[:./-]/g, "")
      .trim();
  }

  static resolve(
    rawViewText: string
  ): ViewMapping {
    const normalizedRaw =
      this.normalize(rawViewText);

    for (const mapping of this.mappings) {
      const normalizedMatch =
        this.normalize(
          mapping.matchText
        );

      if (
        normalizedRaw.includes(
          normalizedMatch
        )
      ) {
        return mapping;
      }
    }

    return {
      matchText: rawViewText,
      cleanName: rawViewText,
      viewCode: rawViewText
        .replace(/\s+/g, "_")
        .toUpperCase(),
    };
  }
}