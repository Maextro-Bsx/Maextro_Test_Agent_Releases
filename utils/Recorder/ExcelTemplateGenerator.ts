import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import { RecorderStorage } from "./RecorderStorage";

type RecordedField = {
  viewCode: string;
  viewName: string;
  appearance: number;
  record: number;
  multiOrg: "YES" | "NO";
  field: string;
  value: string;
  mode: "INPUT" | "VALIDATION";
  mandatory: boolean;
  step: string;
  isReadonly?: boolean;
};

export class ExcelTemplateGenerator {
  static async generate() {
    const jsonPath = path.resolve("test-data/recorded-template.json");

    if (!fs.existsSync(jsonPath)) {
      throw new Error("recorded-template.json not found");
    }

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);

    const stepGroups: Record<string, Record<string, RecordedField[]>> =
      parsed.groupedData || {};
    // ✅ Build Workflow Action Map from recorded data
    const workflowActionMap: Record<string, string> = {};

    Object.entries(stepGroups).forEach(([step, stepData]) => {
      const allFields = ([] as RecordedField[]).concat(
        ...Object.values(stepData)
      );

      const wfActions = allFields
        .filter((f) => f.field === "__WORKFLOW_ACTION__")
        .map((f) => (f.value || "").toUpperCase().trim());

      if (wfActions.length) {
        // ✅ RULE: prioritize SAVE first (YOUR REQUIREMENT)
        if (wfActions.every((x) => x === "SAVE")) {
          workflowActionMap[step] = "Save";
        } else if (wfActions.every((x) => x === "APPROVE")) {
          workflowActionMap[step] = "Approve";
        } else if (wfActions.includes("SAVE")) {
          workflowActionMap[step] = "Save";
        } else {
          workflowActionMap[step] = "Approve";
        }
      }
    });
    const stepRows =
      parsed.stepRows || RecorderStorage.buildStepRows();

    const workbook = new ExcelJS.Workbook();

    /**
     * =====================================================
     * MXT_HDR SHEET
     * =====================================================
     */

    const headerSheet = workbook.addWorksheet("MXT_HDR");

    const headerRows: any[][] = [
      [
        "Object",
        "Template ID",
        "CR Description",
        "Reason Code",
        "Org. Division",
        "Priority",
        "Expected Completion Date",
        "Request Number"
      ],
      [
        parsed.headerData?.object || "",
        parsed.headerData?.templateId || "",
        parsed.headerData?.crDescription || "",
        parsed.headerData?.reasonCode?.selected || "",
        parsed.headerData?.orgDivision?.selected || "",
        parsed.headerData?.priority?.selected || "",
        parsed.headerData?.expectedCompletionDate || "",
        parsed.headerData?.requestNumber || ""
      ],
      [],
      [
        "Step No",
        "Task Type",
        "Views",
        "Workflow Action",
        "Rejecting To"
      ]
    ];

    for (const row of stepRows) {
      const stepNumber = Number(
        row.stepNo.replace("Step ", "")
      );
      
      let workflowAction =
        workflowActionMap[row.stepNo] ||
        (stepNumber === 0 ? "Save" : "Approve");
      
      if (stepNumber === 0) {
        workflowAction = "Save";
      }

      let taskType = "";
      if (stepNumber === 0) {
        taskType = "Create Request";
      } else if (workflowAction === "Save") {
        taskType = "Data Collection";
      } else if (workflowAction === "Approve") {
        taskType = "Data Approval";
      } else {
        taskType = "Data Approval"; 
      }

      headerRows.push([
        stepNumber,
        taskType,
        row.views,
        workflowAction,
        ""
      ]);
    }

    headerRows.forEach((row) => {
      headerSheet.addRow(row);
    });

    const boldRows = [1, 4];

    boldRows.forEach((rowNumber) => {
      const row = headerSheet.getRow(rowNumber);

      row.eachCell((cell) => {
        cell.font = {
          ...cell.font,
          bold: true
        };
      });
    });

    const reasonCodeCell = headerSheet.getCell("D2");
    const orgDivisionCell = headerSheet.getCell("E2");
    const priorityCell = headerSheet.getCell("F2");

    const reasonOptions =
      parsed.headerData?.reasonCode?.options || [];

    const orgDivisionOptions =
      parsed.headerData?.orgDivision?.options || [];

    const priorityOptions =
      parsed.headerData?.priority?.options || [];

    /**
     * Excel dropdown validation
     */
    if (reasonOptions.length>1) {
      reasonCodeCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`"${reasonOptions.join(",")}"`]
      };
    }

    if (orgDivisionOptions.length>1) {
      orgDivisionCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`"${orgDivisionOptions.join(",")}"`]
      };
    }

    if (priorityOptions.length>1) {
      priorityCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`"${priorityOptions.join(",")}"`]
      };
    }

    /**
     * Requirement 3
     * Task Type dropdown
     */

    for (let i = 5; i < 5 + stepRows.length; i++) {
      const stepNo = Number(
        headerSheet.getCell(`A${i}`).value
      );

      /**
       * Task Type
       */
      const taskTypeCell =
        headerSheet.getCell(`B${i}`);
      const workflowActionCell = headerSheet.getCell(`D${i}`);
      const stepKey = `Step ${stepNo}`;
      const capturedAction = workflowActionMap[stepKey];

      let finalAction =
        capturedAction ||
        (stepNo === 0 ? "Save" : "Approve");

      // ✅ STEP 0 override
      if (stepNo === 0) {
        finalAction = "Save";
      }

      // ✅ Derive Task Type
      let derivedTaskType = "";

      if (stepNo === 0) {
        derivedTaskType = "Create Request";
      } else if (finalAction === "Save") {
        derivedTaskType = "Data Collection";
      } else if (finalAction === "Approve") {
        derivedTaskType = "Data Approval";
      } else {
        derivedTaskType = "Data Approval";
      }

      /**
       * Dropdown
       */
      if (stepNo !== 0) {
        taskTypeCell.dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [
            '"Data Collection,Data Approval"'
          ]
        };
      }

      taskTypeCell.value = derivedTaskType;

      /**
       * Workflow Action
       */
      workflowActionCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [
          '"Save,Skip,Approve,Skip -> Save,Skip -> Approve,Reject -> Approve"'
        ]
      };
      workflowActionCell.value = finalAction;
    }

    /**
     * =====================================================
     * STEP SHEETS
     * =====================================================
     */

    Object.entries(stepGroups)
      .sort((a, b) => {
        const numA = Number(a[0].replace("Step ", ""));
        const numB = Number(b[0].replace("Step ", ""));
        return numA - numB;
      })
      .forEach(([step, stepData]) => {
        const stepArray: RecordedField[] = ([] as RecordedField[])
          .concat(...Object.values(stepData));

        const grouped: Record<
          string,
          {
            viewName: string;
            records: {
              excelRecord: number;
              fields: RecordedField[];
            }[];
          }
        > = {};

        const tempMap: Record<string,Map<string, RecordedField[]>> = {};

        const IGNORE_FIELDS = [
          "__WORKFLOW_ACTION__",
          "Search for request"
        ];
        for (const item of stepArray) {
          if (
            item.viewName === "SYSTEM_IGNORE" ||
            item.viewName === "UNKNOWN_VIEW"
          ) {
            continue;
          }

          if (!tempMap[item.viewCode]) {
            tempMap[item.viewCode] = new Map<string, RecordedField[]>();
          }

          const uniqueKey =
            `${item.viewCode}_${item.appearance}_${item.record}`;

          if (!tempMap[item.viewCode].has(uniqueKey)) {
            tempMap[item.viewCode].set(uniqueKey, []);
          }

          if (!item.field || IGNORE_FIELDS.includes(item.field)) {
            continue;
          }

          const normalize = (v?: string) =>
            (v || "")
              .toString()
              .trim()
              .toLowerCase();

          const currentFields = tempMap[item.viewCode].get(uniqueKey)!;

          const existingIndex = currentFields.findIndex(
            (x) => normalize(x.field) === normalize(item.field)
          );

          if (existingIndex === -1) {
            currentFields.push(item);  // ✅ preserves order
          } else {
            // ✅ update WITHOUT changing position
            currentFields[existingIndex].value = item.value;
            currentFields[existingIndex].mode = item.mode;
            currentFields[existingIndex].mandatory = item.mandatory;
          }
        }

        for (const viewCode of Object.keys(tempMap)) {
          const groupedEntries = Array.from(
            tempMap[viewCode].entries()
          ).filter(([_, fields]) => fields && fields.length > 0);

          if (!groupedEntries.length) {
            continue;
          }

          const first = groupedEntries[0][1][0];

          if (!first) {
            continue;
          }

          grouped[viewCode] = {
            viewName: first.viewName || viewCode,
            records: groupedEntries.map(
              ([_, fields], index) => ({
                excelRecord: index + 1,
                fields
              })
            )
          };
        }

        const worksheet = workbook.addWorksheet(step);
        let rowPointer = 1;

        for (const viewCode of Object.keys(grouped)) {
          const viewData = grouped[viewCode];
          const records = viewData.records;

          if (!records.length) continue;

          const isMultiOrg = stepArray.some(
            (x) =>
              x.viewCode === viewCode &&
              x.multiOrg === "YES"
          );

          // const headers: string[] = [];

          // for (const record of records) {
          //   for (const f of record.fields) {
          //     if (!headers.includes(f.field)) {
          //       headers.push(f.field);
          //     }
          //   }
          // }
          const headers: string[] = records[0].fields.map(f => f.field);
          /**
           * View header row
           */
          worksheet.addRow([
            `View - ${viewCode}`,
            `MultiOrg - ${isMultiOrg ? "Yes" : "No"}`,
            "Delete Records -",
            "Add Records -"
          ]);

          const viewHeaderRow = worksheet.getRow(rowPointer);

          viewHeaderRow.eachCell((cell) => {
            cell.font = {
              ...cell.font,
              bold: true
            };
          });
          /**
           * Field header row
           */
          worksheet.addRow([
            "Records",
            ...headers
          ]);

          const fieldHeaderRow = worksheet.getRow(
            rowPointer + 1
          );

          fieldHeaderRow.eachCell((cell) => {
            cell.font = {
              ...cell.font,
              bold: true
            };
          });
          const headerRowIndex = rowPointer + 1;

          /**
           * Mandatory fields → red + bold
           */
          headers.forEach((header, index) => {
            const allMatchingFields = records
              .flatMap((r) => r.fields)
              .filter((f) => f.field === header);

            const isMandatory = allMatchingFields.some(
              (f) => f.mandatory === true
            );

            if (isMandatory) {
              const cell = worksheet.getCell(
                headerRowIndex,
                index + 2
              );

              cell.font = {
                color: { argb: "FFFF0000" },
                bold: true
              };
            }
          });

          /**
           * Data rows
           */
          records.forEach((record, rowIndex) => {
            const fieldMap = Object.fromEntries(
              record.fields.map((f) => [f.field, f.value])
            );

            const rowValues = headers.map(
              (header) => fieldMap[header] || ""
            );

            worksheet.addRow([
              record.excelRecord,
              ...rowValues
            ]);

            /**
             * Validation fields → grey fill
             */
            record.fields.forEach((field) => {
              // ✅ Only grey readonly fields
              if (field.mode !== "VALIDATION" || !field.isReadonly) {
                return;
              }

              const columnIndex = headers.indexOf(field.field);
              if (columnIndex === -1) return;

              const cell = worksheet.getCell(
                headerRowIndex + rowIndex + 1,
                columnIndex + 2
              );

              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD9D9D9" }
              };
            });
          });

          worksheet.addRow([]);

          rowPointer += 2 + records.length + 1;
        }
      });

    /**
     * =====================================================
     * FINAL SAVE
     * =====================================================
     */

    const rawTemplateName =parsed.headerData?.templateId || "generated-template";

    const safeTemplateName = rawTemplateName.replace(/[\\/:*?"<>|]/g, "").trim();

    const tempFolderPath = path.join(
      process.cwd(),
      "temp"
    );

    if (!fs.existsSync(tempFolderPath)) {
      fs.mkdirSync(tempFolderPath, {
        recursive: true
      });
    }

    const outputPath = path.join(
      tempFolderPath,
      `${safeTemplateName}.xlsx`
    );

    workbook.worksheets.forEach((worksheet) => {
      worksheet.columns.forEach((column) => {
        let maxLength = 0;

        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value
            ? cell.value.toString()
            : "";

          maxLength = Math.max(
            maxLength,
            cellValue.length
          );
        });

        column.width = Math.max(
          maxLength + 2,
          15
        );
      });
    });
    await workbook.xlsx.writeFile(outputPath);

    console.log(`Excel generated → ${outputPath}`);
  }
}
