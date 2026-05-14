import { RecorderStorage } from "./RecorderStorage";

export class TemplateRecorder {
  private static currentView = "";
  private static currentViewCode = "";

  static setCurrentView(viewName: string,viewCode: string) {
    this.currentView = viewName;
    this.currentViewCode = viewCode;
  }

  static incrementAppearance(viewCode: string) {
    RecorderStorage.incrementAppearance(viewCode);
  }


  static capture(
    field: string,
    value: string,
    mode: "INPUT" | "VALIDATION",
    record: number = 1,
    appearance: number = 1,
    mandatory: boolean = false,
    step: string = "Step 0"
  ) {
    if (!this.currentView) return;
      console.log("CAPTURE →", this.currentViewCode, field, value, step);
      const multiOrg = RecorderStorage.isViewReopened(this.currentViewCode)? "YES": "NO";
    RecorderStorage.add({
      viewName: this.currentView,
      viewCode: this.currentViewCode,
      appearance,
      record,
      multiOrg,
      field,
      value,
      mode,
      mandatory,
      step
    });
  }
}