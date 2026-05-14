import fs from "fs";
import path from "path";

export type RecordedField = {
  viewCode: string;
  viewName: string;
  appearance: number;
  record: number;
  multiOrg: "YES" | "NO";
  field: string;
  value: string;
  mode: "INPUT" | "VALIDATION";
  mandatory: boolean;
  step: string
};

type HeaderData = {
  object: string;
  templateId: string;
  crDescription: string;
  reasonCode: {
    selected: string;
    options: string[];
  };

  orgDivision: {
    selected: string;
    options: string[];
  };

  priority: {
    selected: string;
    options: string[];
  };
  expectedCompletionDate: string;
  requestNumber: string;
};


export class RecorderStorage {
  private static records: RecordedField[] = [];

  private static appearances: Record<string, number> = {};

  private static multiOrgViews: Record<string, boolean> = {};

  /**"UNKNOWN_VIEW"
   * Final record counter per view
   */
  private static maxRecordPerView: Record<string, number> = {};

  /**
   * Stable row signature mapping
   *
   * Example:
   * SO_2_GB01|30 -> 2
   */
  private static stableRecordMap: Record<string, number> = {};

  static headerData: HeaderData = {
    object: "",
    templateId: "",
    crDescription: "",
    reasonCode: {
      selected: "",
      options: []
    },
    orgDivision: {
      selected: "",
      options: []
    },
    priority: {
      selected: "",
      options: []
    },
    expectedCompletionDate: "",
    requestNumber: ""
  };

  static updateHeaderData(partial: Partial<HeaderData>) {
    this.headerData = {
      ...this.headerData,
      ...partial
    };
  }

  static add(record: any) {
    
    const existingIndex = this.records.findIndex(
      (existing) =>
        existing.viewCode === record.viewCode &&
        existing.appearance === record.appearance &&
        existing.record === record.record &&
        existing.field === record.field &&
        existing.step === record.step
    );
    
    if (existingIndex !== -1) {
      this.records[existingIndex] = record;
      return;
    }

    this.records.push(record);
  }


  static getAppearance(viewCode: string): number {
    if (!this.appearances[viewCode]) {
      this.appearances[viewCode] = 1;
    }

    return this.appearances[viewCode];
  }

  static incrementAppearance(viewCode: string) {
    if (!this.appearances[viewCode]) {
      this.appearances[viewCode] = 1;
    } else {
      this.appearances[viewCode]++;
    }
    console.log(`Appearance Updated → ${viewCode}: ${this.appearances[viewCode]}`);
  }

  static markViewAsMultiOrg(viewCode: string) {
    this.multiOrgViews[viewCode] = true;
    console.log(`Marked MultiOrg YES → ${viewCode}`);
  }

  static isViewReopened(viewCode: string): boolean {
    return !!this.multiOrgViews[viewCode];
  }

  /**
   * FINAL FIX
   *
   * Uses stable row signature instead of row index
   */
  static getFinalRecordNumber(
    viewCode: string,
    appearance: number,
    localRecord: number
  ): number {
    const stableKey = `${viewCode}_${appearance}_${localRecord}`;

    if (!this.stableRecordMap[stableKey]) {
      const newRecord =
        (this.maxRecordPerView[viewCode] || 0) + 1;

      this.stableRecordMap[stableKey] = newRecord;
      this.maxRecordPerView[viewCode] = newRecord;
    }

    return this.stableRecordMap[stableKey];
  }


  static isMultiOrg(viewCode: string): boolean {
    return this.isViewReopened(viewCode);
  }

  static saveToFile(fileName: string = "recorded-template.json") {
    const filePath = path.join(process.cwd(),"test-data",fileName);

    const groupedData = this.getGroupedData();
    const stepRows = this.buildStepRows();
    fs.writeFileSync(
      filePath,
      JSON.stringify({headerData: this.headerData, groupedData, stepRows }, null, 2),
      "utf-8"
    );
    console.log(`Recorder file saved → ${filePath}`);
  }

  static clear() {
    this.records = [];
    this.appearances = {};
    this.multiOrgViews = {};
    this.maxRecordPerView = {};
    this.stableRecordMap = {};
    this.headerData = {
      object: "",
      templateId: "",
      crDescription: "",
      reasonCode: {
        selected: "",
        options: []
      },
      orgDivision: {
        selected: "",
        options: []
      },
      priority: {
        selected: "",
        options: []
      },
      expectedCompletionDate: "",
      requestNumber: ""
    };
  }

  static getGroupedData() {
    const grouped: any = {};
    for (const record of this.records) {
      const step = record.step || "Step 0";
      const view = record.viewCode;
      if (!grouped[step]) grouped[step] = {};
      if (!grouped[step][view]) grouped[step][view] = [];
      grouped[step][view].push(record);
    }
    return grouped;
  }

  static getStepViews() {
    const groupedData = this.getGroupedData();
    const result: Record<string, string[]> = {};

    for (const step of Object.keys(groupedData)) {
      if (!result[step]) {
        result[step] = [];
      }

      for (const viewCode of Object.keys(groupedData[step])) {
        if (!result[step].includes(viewCode)) {
          result[step].push(viewCode);
        }
      }
    }

    return result;
  }

  static buildStepRows() {
    const stepViews = this.getStepViews();

    const rows = [];

    for (const step of Object.keys(stepViews)) {
      rows.push({
        stepNo: step,
        views: stepViews[step].join(",")
      });
    }

    return rows;
  }






}