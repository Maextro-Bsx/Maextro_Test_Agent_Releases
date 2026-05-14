import { test } from "@playwright/test";
import { ExcelTemplateGenerator } from "../../utils/Recorder/ExcelTemplateGenerator";

test("TC_GenerateExcel", async () => {
  await ExcelTemplateGenerator.generate();
});