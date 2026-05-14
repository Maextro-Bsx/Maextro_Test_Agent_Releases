import { Page } from "@playwright/test";
import { ViewMapper } from "./ViewMapper";
import { BrowserRecorder } from "../../pages/Recorder/BrowserRecorder";
import { Logger } from "../../utils/Recorder/Logger";

export class RecorderViewTracker {
  constructor(private page: Page) {}

  /**
   * Normalize SAP dynamic view names
   * Example:
   * FFL1/5643 Sales General Data → Sales General Data
   * 5643 /FFL1/1 Plant/Storage Data → Plant/Storage Data
   */
  private normalizeView(view: string): string {
    return view
      .replace(/^\s*\d+\s+/, "")                 // remove leading material
      .replace(/^\w+\/\d+\s*/, "")               // remove FFL1/5643
      .replace(/^\d+\s*\/\w+\/\d+\s*/, "")       // remove 5643 /FFL1/1
      .trim();
  }
  private isProcessing = false;

  async getCurrentProgressCount(): Promise<number | null> {
   try {
      const frame = this.page.frameLocator(".sapUShellApplicationContainer");
      const progress = frame.locator('[role="progressbar"]').last();
      await progress.waitFor({
        state: "visible",
        timeout: 10000
      });
      const ariaValueText = await progress.getAttribute("aria-valuetext");
      Logger.tracker(`Progress text → ${ariaValueText}`);
      if (!ariaValueText) return null;
      const match = ariaValueText.match(/(\d+)\s+of\s+\d+/i);
      if (!match) return null;
      const count = parseInt(match[1], 10);
      return count;
    } catch (error) {
      Logger.tracker("Progress count detection failed:",);
      return null;
    }
  }

  // async getCurrentViewName(): Promise<string> {
  //   try {
  //     const frame = this.page.frameLocator(".sapUShellApplicationContainer");
  //     const locator = frame.locator('[id*="viewName"]').first();
  //     // ✅ DO NOT WAIT — just try to read
  //     const text = await locator.textContent().catch(() => null);
  //     const cleaned = text?.trim() || "UNKNOWN_VIEW";
  //     if (cleaned !== "UNKNOWN_VIEW") {
  //       Logger.tracker(`Current View → ${cleaned}`);
  //     }
  //     return cleaned;
  //   } catch (error) {
  //     return "UNKNOWN_VIEW";
  //   }
  // }

  async getCurrentViewName(): Promise<string> {
    try {
      const frame = this.page.frameLocator(".sapUShellApplicationContainer");
      const view = await frame.locator("body").evaluate(() => {
        const utils = (window as any).BrowserDomUtils;
        if (!utils || !utils.getViewName) {
          return "UNKNOWN_VIEW";
        }
        return utils.getViewName();
      });
      const cleaned = view?.trim() || "UNKNOWN_VIEW";
      if (cleaned !== "UNKNOWN_VIEW") {
        Logger.tracker(`Current View → ${cleaned}`);
      }
      return cleaned;
    } catch {
      return "UNKNOWN_VIEW";
    }
  }

  async waitForStatusProgressIncrement(): Promise<boolean> {
    const before = await this.getCurrentProgressCount();
    if (before === null) return false;
    for (let i = 0; i < 60; i++) {
      await this.page.waitForTimeout(1000);
      const current = await this.getCurrentProgressCount();
      if (current !== null && current > before) {
        Logger.tracker(`Progress Updated → ${before} → ${current}`);
        await this.page.waitForTimeout(3000);
        return true;
      }
    }
    Logger.tracker(`Progress NOT updated from ${before}`);
    return false;
  }

  /**
   * FINAL FIXED MultiOrg Detection
   */
  async detectNextViewFlow(beforeViewFromCaller: string,updated: boolean
    ): Promise<{
      beforeView: string;
      afterView: string;
      isSameView: boolean;
  }> {
    if (this.isProcessing) {
      Logger.tracker("Skipping duplicate detectNextViewFlow call");
      return {
        beforeView: beforeViewFromCaller,
        afterView: beforeViewFromCaller,
        isSameView: false
      };
    }
    this.isProcessing = true;
    Logger.tracker("detectNextViewFlow() started");
    let beforeView = beforeViewFromCaller;
    for (let i = 0; i < 3; i++) {
      await this.page.waitForTimeout(300);
      const retry = await this.getCurrentViewName();
      if (retry !== "UNKNOWN_VIEW") {
        beforeView = retry;
        break;
      }
    }

    const beforeMapped = ViewMapper.resolve(this.normalizeView(beforeView));
    Logger.tracker(`Before Status Complete View → ${beforeView}`);
    Logger.tracker(`Before ViewCode → ${beforeMapped.viewCode}`);
    await this.page.waitForTimeout(800);
    let afterView = beforeView;
    let isSameView = false;

    for (let i = 0; i < 20; i++) {
      await this.page.waitForTimeout(1000);
      const currentView = await this.getCurrentViewName();
      const currentMapped = ViewMapper.resolve(this.normalizeView(currentView));
      Logger.tracker(`Checking next view`);
      const isSameLogicalView =currentMapped.viewCode === beforeMapped.viewCode;
      const isDifferentInstance =currentView !== beforeView;

      /**
       * ✅✅ PRIORITY: MULTI-ORG DETECTION (MUST COME FIRST)
       */
      if (isSameLogicalView && isDifferentInstance) {
        Logger.tracker(`MultiOrg detected → ${beforeMapped.viewCode}`);
        BrowserRecorder.markViewReopened(beforeMapped.viewCode);
        afterView = currentView;
        isSameView = true;
        break;
      }

      /**
       * ✅ WAIT before allowing navigation detection
       * (prevents SAP refresh mis-detection)
       */
      if (i < 2) {continue;}

      /**
       * ✅ NORMAL NAVIGATION
       */
      if (currentMapped.viewCode !== beforeMapped.viewCode && currentMapped.viewCode !== "UNKNOWN_VIEW") {
        const stableView = await this.waitForStableView(currentMapped.viewCode, beforeMapped.viewCode);
        if (stableView) {
            Logger.tracker(`Next normal view → ${currentMapped.viewCode}`);
            afterView = currentView;
            break;
        }
      }
    }

    if (!isSameView) {
      Logger.tracker("Normal navigation detected (not MultiOrg)");
    }
    this.isProcessing = false;
    return {
      beforeView,
      afterView,
      isSameView
    };
  }

private async waitForStableView(
  newCode: string,
  oldCode: string
): Promise<boolean> {

  let stableCount = 0;

  for (let i = 0; i < 5; i++) {
    await this.page.waitForTimeout(500);

    const current = await this.getCurrentViewName();
    const mapped = ViewMapper.resolve(this.normalizeView(current));

    if (mapped.viewCode === newCode) {
      stableCount++;
    }

    // if it flickers back → not stable
    if (mapped.viewCode === oldCode) {
      return false;
    }
  }

  return stableCount >= 3;
}






}