import { Page } from "@playwright/test";
import { TemplateRecorder } from "../../utils/Recorder/TemplateRecorder";
import { RecorderStorage } from "../../utils/Recorder/RecorderStorage";
import { ViewMapper } from "../../utils/Recorder/ViewMappings/ViewMapper";
import { RecorderViewTracker } from "../../utils/Recorder/RecorderViewTracker";
import { Logger } from "../../utils/Recorder/Logger";
import { browserDomScript } from "../../utils/Recorder/BrowserDom"; 

/**
 * ✅ Central Recorder Controller
 * Handles:
 * - Browser ↔ Node communication
 * - Field capture pipeline
 * - View tracking integration
 * - SAP iframe injection
 */
export class BrowserRecorder {
  private static capturedSet = new Set<string>();

  /**
   * ✅ Structured Logger (clear + consistent)
   */
  private static log = {
    tracker: (...args: any[]) => Logger.tracker(...args),
    capture: (...args: any[]) => Logger.capture(...args),
    browser: (...args: any[]) => Logger.browser(...args),
    sync: (...args: any[]) => Logger.sync(...args),
  };

  static async start(page: Page) {
    RecorderStorage.clear();
    BrowserRecorder.capturedSet.clear();

    // ✅ Forward browser console logs to Node terminal
    page.on("console", (msg) => {
      const text = msg.text();

      // ✅ FILTER SAP NOISE
      if (
        text.includes("FUTURE FATAL") ||
        text.includes("CustomData") ||
        text.includes("EventProvider") ||

        // 🚫 SAP COMMON ERRORS
        text.includes("ODataMetadata") ||
        text.includes("Invalid metadata document") ||
        text.includes("Failed to load resource") ||
        text.includes("CORS policy") ||
        text.includes("net::ERR_FAILED") ||

        // 🚫 UI5 FRAGMENT ERRORS
        text.includes("Error found in Fragment") ||
        text.includes("noEscape") ||

        // 🚫 SAP UI WARNINGS
        text.includes("ManagedObject.apply") ||
        text.includes("maxLength") ||
        text.includes("resizble") ||

        // 🚫 TRANSLATION WARNINGS
        text.includes("could not find any translatable text")
      ) {
        return; // ✅ IGNORE THESE
      }

      // ✅ SHOW ONLY CLEAN LOGS
      BrowserRecorder.log.browser(text);
    });



    /* =====================
       ✅ BACKEND EXPOSED APIs
       ===================== */

    /**
     * ✅ Receives captured field data from browser
     * Responsible for:
     * - mapping view
     * - deduplication
     * - saving to recorder
     */
    await page.exposeFunction("captureField", async (payload: any) => {
      const mappedView =ViewMapper.resolve(payload.view,RecorderStorage.headerData.object)
      const cleanView = mappedView.cleanName;
      const viewCode = mappedView.viewCode;

      if (
        cleanView === "SYSTEM_IGNORE" ||
        cleanView === "UNKNOWN_VIEW"
      ) return;

      const appearance = RecorderStorage.getAppearance(viewCode);

      TemplateRecorder.setCurrentView(cleanView, viewCode);

      const finalRecord = RecorderStorage.getFinalRecordNumber(viewCode,appearance,payload.record);

      const finalValue = payload.mode === "VALIDATION" ? payload.value.startsWith("^") ? payload.value
            : `^${payload.value}` : payload.value;

      // ✅ Unique key prevents duplicate capture
      const captureKey = [
        viewCode,
        appearance,
        finalRecord,
        payload.field,
        finalValue,
        payload.mode,
        payload.step,
      ].join("|");
      console.log(
              "FIELD:",
              payload.field,
              "| mandatory:",
              payload.mandatory
            );
      if (BrowserRecorder.capturedSet.has(captureKey)) return;

      BrowserRecorder.capturedSet.add(captureKey);

      // ✅ Clean structured log
      BrowserRecorder.log.capture("VIEW:", viewCode, "| FIELD:", payload.field,"| STEP:", payload.step);

      // ✅ Sync debug (VERY IMPORTANT)
      BrowserRecorder.log.sync( "Payload view:", payload.view, "| Mapped view:", viewCode);
      TemplateRecorder.capture(
        payload.field,
        finalValue,
        payload.mode,
        finalRecord,
        appearance,
        payload.mandatory,
        payload.step
      );
    });

    /* =====================
       ✅ VIEW TRACKER SETUP
       ===================== */

    const tracker = new RecorderViewTracker(page);
    let currentViewFromTracker = "";

    /**
     * ✅ Called from browser when user clicks Status Complete
     * Handles:
     * - progress detection
     * - next view detection
     * - updating current tracker view
     */
    await page.exposeFunction("notifyStatusComplete", async () => {
      const beforeView = await tracker.getCurrentViewName();
      BrowserRecorder.log.tracker("Before View →", beforeView);

      const updated = await tracker.waitForStatusProgressIncrement();

      await tracker.detectNextViewFlow(beforeView, updated);

      const nextView = await tracker.getCurrentViewName();
      currentViewFromTracker = nextView;

      BrowserRecorder.log.tracker("Updated View →", nextView);

      const progress = await tracker.getCurrentProgressCount();

      // ✅ detect completion
      if (progress !== null && progress >= 14) {
        BrowserRecorder.log.tracker("✅ Step completed — stopping capture");
        await page.evaluate(() => {
          (window as any).__CAPTURE_ENABLED__ = false;
          (window as any).__AWAITING_NEW_VIEW__ = true;
          (window as any).__CAPTURE_SCHEDULED__ = false;
          (window as any).__TASK_READY__ = false;
          (window as any).__RECORDER_LOCKED__ = true;
        });
      }

    });

    await page.exposeFunction(
      "captureHeaderData",
      async (payload: any) => {
        RecorderStorage.updateHeaderData({
          object: payload.object || "",
          templateId: payload.templateId || ""
        });

        console.log(
          "HEADER SAVED →",
          payload.object,
          "|",
          payload.templateId
        );
      }
    );
    await page.exposeFunction("captureCreateRequestHeader",async (payload: any) => {
        RecorderStorage.updateHeaderData({
          crDescription: payload.crDescription || "",
          reasonCode: {
            selected:
              payload.reasonCode?.selected || "",
            options:
              payload.reasonCode?.options || []
          },
          orgDivision: {
            selected:
              payload.orgDivision?.selected || "",
            options:
              payload.orgDivision?.options || []
          },
          priority: {
            selected:
              payload.priority?.selected || "",
            options:
              payload.priority?.options || []
          }
        });
        console.log(
          "CREATE REQUEST HEADER SAVED →",
          payload
        );
      }
    );
    /**
     * ✅ Used by browser to fetch latest tracker view
     */
    await page.exposeFunction("__getCurrentView__", () => {
      return currentViewFromTracker;
    });

    /**
     * ✅ Reset function (for debugging / restart)
     */
    await page.exposeFunction("__resetRecorder__", async () => {
      BrowserRecorder.log.tracker("Recorder Reset ✅");
      RecorderStorage.clear();
      BrowserRecorder.capturedSet.clear();
    });

    /* =====================
       ✅ SAP FRAME INJECTION
       ===================== */

    const appFrame = page.frameLocator(".sapUShellApplicationContainer");

    await appFrame.locator("body").waitFor({state: "visible",timeout: 30000});
    await page.waitForTimeout(2000);

    /**
     * ✅ Inject capture logic into SAP iframe
     */
    await appFrame.locator("body").evaluate(browserDomScript);
    await appFrame.locator("body").evaluate(() => {
      console.log("Recorder injected");
      
      const utils = (window as any).BrowserDomUtils;
      console.log("Utils available:", !!utils);

      if (!utils) return;
      (window as any).__CAPTURE_ENABLED__ = true;
      (window as any).__TASK_READY__ = true;
      (window as any).__LAST_VIEW__ = "";
      (window as any).__RECORDER_LOCKED__ = false;
      (window as any).__HEADER_CAPTURED__ = false;
      (window as any).__CREATE_REQUEST_CAPTURED__ = false;
      // ✅ VIEW stability tracking
      let lastView = "";
      let lastViewChangeTime = 0;

      // ✅ STEP stability tracking
      let lastStep = "";
      let lastStepChangeTime = 0;
      const isViewStable = (currentView: string) => {
        if (currentView !== lastView) {
          lastView = currentView;
          lastViewChangeTime = Date.now();
          return false;
        }

        return Date.now() - lastViewChangeTime > 400;
      };

      const isStepStable = (step: string) => {
        if (step !== lastStep) {
          lastStep = step;
          lastStepChangeTime = Date.now();
          return false;
        }

        return Date.now() - lastStepChangeTime > 500;
      };

      /* =========================
        ✅ CORE CAPTURE ENGINE
        ========================= */
      const getWorkflowAction = () => {
        const buttons = Array.from(document.querySelectorAll("button"));

        let foundSave = false;

        for (const btn of buttons) {
          // ✅ Ignore hidden / inactive buttons
          if (!(btn as HTMLElement).offsetParent) continue;

          const label = btn
            .querySelector("bdi")
            ?.textContent?.trim()
            .toLowerCase() || "";

          // ✅ STRICT match for Submit Task
          if (label === "submit task") {
            return "Approve"; // ✅ your requirement
          }

          // ✅ STRICT match for Save (ONLY toolbar button)
          if (label === "save") {
            foundSave = true;
          }
        }

        // ✅ fallback only if Submit not found
        if (foundSave) {
          return "Save";
        }

        return "";
      };

      const captureAllFields = async () => {
        if (!(window as any).__CAPTURE_ENABLED__) return;
        const inputs = document.querySelectorAll(
          "input, textarea, select"
        );
        console.log("Capturing fields, total found →", inputs.length);
        const step = utils.getStep();
        const viewName = utils.getViewName();

        // ✅ Capture workflow action (SAFE - once per cycle)
        const workflowAction = getWorkflowAction();

        if (workflowAction) {
          await (window as any).captureField({
            view: viewName,
            record: 0, // synthetic record
            field: "__WORKFLOW_ACTION__",
            value: workflowAction,
            mode: "INPUT",
            mandatory: false,
            step: step
          });
        }

        console.log("Using ViewName →", viewName);
        console.log("Using Step →", step);

        const progressBars = document.querySelectorAll('[role="progressbar"]');
        const progressText = progressBars.length > 0 ? progressBars[progressBars.length - 1].getAttribute("aria-valuetext") || "": "";
        const isFirstScreen = progressText.includes("0 of") || progressText.includes("1 of");
        console.log("Is first screen:", isFirstScreen);
        if (isFirstScreen) {
          if (!step || step === "UNKNOWN") {
            console.log("Step is unknown, skipping capture");
            return;
          }
          console.log("First screen detected → capture immediately");
        } else {
          await new Promise((r) => setTimeout(r, 400));
        }
        for (const node of inputs) {
          const el = node as HTMLInputElement;

          if (!utils.isVisible(el)) continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const field = utils.getFieldLabel(el);
          if (!field || field === "UNKNOWN_FIELD") continue;

          // filter SAP noise fields
          if (
            field.startsWith("__") ||
            field.includes("filterContainer") ||
            field.length > 50
          ) continue;

          const value = (el.value || "").trim();

          if (!value && !utils.isValidationField(el)) continue;
          await (window as any).captureField({
            view: viewName,
            record: utils.getRecord(el),
            field,
            value,
            mode: utils.isValidationField(el)
              ? "VALIDATION"
              : "INPUT",
            mandatory: el.closest("table")? utils.isTableMandatoryField(el): utils.isMandatoryField(el),
            step: utils.getStep(),
          });
        }
      };

      // ✅ expose globally
      (window as any).captureAllFields = captureAllFields;

      /* =========================
        ✅ ✅ AUTO CAPTURE (FIX)
        ========================= */

      (window as any).__CAPTURE_SCHEDULED__ = false;

      const observer = new MutationObserver(() => {
        
        if ((window as any).__RECORDER_LOCKED__) {
          return; // 🚨 IGNORE ALL USER ACTIONS
        }
        const viewEl = document.querySelector('[id*="viewName"] bdi');
        const currentView = viewEl?.textContent?.trim() || "";
        // ✅ detect REAL new view (NOT QM reuse)
        if ((window as any).__AWAITING_NEW_VIEW__) {
          const viewEl = document.querySelector('[id*="viewName"] bdi');
          const currentView = viewEl?.textContent?.trim() || "";
          const lastView = (window as any).__LAST_VIEW__;
          const progressText =document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuetext") || "";
          const progressReset = progressText.includes("0 of") ||progressText.includes("1 of");
          if (currentView &&(currentView !== lastView ||progressReset)){
              console.log("[RECORDER] New view detected → starting capture");
              (window as any).__CAPTURE_ENABLED__ = true;
              (window as any).__AWAITING_NEW_VIEW__ = false;
              (window as any).__LAST_VIEW__ = currentView;
              (window as any).__RECORDER_LOCKED__ = false;
              
              setTimeout(async () => {
                await (window as any).captureAllFields?.();
              }, 50);
          }
          return;
        }

        if (!(window as any).__TASK_READY__) {
          return;
        }
        
        if ((window as any).__CAPTURE_SCHEDULED__) return;
        (window as any).__CAPTURE_SCHEDULED__ = true;

        setTimeout(async () => {
          if (!(window as any).__CAPTURE_ENABLED__) return;
          console.log("[AUTO] Capture triggered");

          // first capture instantly
          await captureAllFields();

          // wait until DOM stabilizes
          let lastHtml = document.body.innerHTML;
          const start = Date.now();

          while (Date.now() - start < 1500) {
            await new Promise((r) => setTimeout(r,150));

            if (document.body.innerHTML === lastHtml) break;

            lastHtml = document.body.innerHTML;
          }

          // final stable capture
          await captureAllFields();

          (window as any).__CAPTURE_SCHEDULED__ = false;
        }, 400);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      console.log("✅ Auto capture observer started");

      /* =========================
        ✅ EVENT LISTENER (clean)
        ========================= */

      let isProcessing = false;

      document.addEventListener("click",async (event) => {
        if (isProcessing) return;
        /**
         * HEADER DATA CAPTURE
         * Object + Template ID
         * Capture only once when user clicks template tile
         */
        const templateCard = (event.target as HTMLElement)?.closest( ".templateNoHdr");
        if (templateCard && !(window as any).__HEADER_CAPTURED__) {
          const templateCode =
            templateCard.querySelector(".templateId bdi")
              ?.textContent?.trim() || "";

          const templateTitle =
            templateCard.querySelector(".templateTitleText bdi")
              ?.textContent?.trim() || "";

          let objectName = "";

          /**
           * CASE 1:
           * First check subsection
           * Example:
           * Business Partners → Customer
           */
          let parent = templateCard.parentElement;

          while (parent && !objectName) {
            /**
             * Look for nearest subsection title
             * in current container only
             */
            const subSection = parent.closest(
              ".subObjPanelTitle"
            )?.querySelector(".typeSubGroupTitle bdi");

            if (subSection?.textContent?.trim()) {
              objectName = subSection.textContent.trim();
              break;
            }

            parent = parent.parentElement;
          }

          /**
           * CASE 2:
           * No subsection exists
           * Example:
           * Asset Master
           *
           * Find real panel header
           */
          if (!objectName) {
            let parent = templateCard.parentElement;

            /**
             * Move upward until:
             * immediate parent panel only
             *
             * Example:
             * __panel5-content → __panel5
             */
            while (
              parent &&
              !(
                parent.id &&
                /^__panel\d+$/.test(parent.id) &&
                parent.classList.contains("sapMPanel")
              )
            ) {
              parent = parent.parentElement;
            }

            /**
             * Get exact matching header
             *
             * __panel5 → __panel5-header
             */
            if (parent?.id) {
              const headerId = `${parent.id}-header`;
              const panelHeader =
                document.getElementById(headerId);

              if (
                panelHeader &&
                panelHeader.classList.contains("sapMPanelHdr")
              ) {
                objectName =
                  panelHeader.textContent?.trim() || "";
              }
            }
          }

          /**
           * Final cleanup
           */
          objectName = objectName.replace(/\.$/, "").trim();

          console.log(
            "[OBJECT DETECTION]",
            "Captured Object →",
            objectName
          );

          const finalTemplateId =
            `${templateCode} - ${templateTitle}`;
          await (window as any).captureHeaderData({
            object: objectName,
            templateId: finalTemplateId
          });

          (window as any).__HEADER_CAPTURED__ = true;
        }


        /**
         * CREATE REQUEST HEADER CAPTURE
         * Capture once on Confirm click
         */
        const btn = (event.target as HTMLElement)?.closest("button");
        if (!btn) return;
        const label = btn.querySelector("bdi")?.textContent?.toLowerCase() || "";
        if (
          label.includes("confirm") &&
          !(window as any).__CREATE_REQUEST_CAPTURED__
        ) {
          const crDescription =
            (
              document.querySelector(
                "#reqDesc-inner"
              ) as HTMLInputElement
            )?.value?.trim() || "";

          const getDropdownOptions = (
            key: string
          ) => {
            return Array.from(
              document.querySelectorAll(
                `li[id*="${key}"]`
              )
            )
              .map((el) =>
                el.textContent?.trim() || ""
              )
              .filter(Boolean);
          };

          const reasonCode = {
            selected:
              document.querySelector(
                "#reqReason-labelText"
              )?.textContent?.trim() || "",

            options: getDropdownOptions("reqReason")
          };

          const orgDivision = {
            selected:
              document.querySelector(
                "#divCode-labelText"
              )?.textContent?.trim() || "",

            options: getDropdownOptions("divCode")
          };

          const priority = {
            selected:
              document.querySelector(
                "#priority-labelText"
              )?.textContent?.trim() || "",

            options: getDropdownOptions("priority")
          };

          console.log(
            "[CREATE REQUEST HEADER]",
            {
              crDescription,
              reasonCode,
              orgDivision,
              priority
            }
          );

          await (window as any)
            .captureCreateRequestHeader({
              crDescription,
              reasonCode,
              orgDivision,
              priority
            });

          (window as any).__CREATE_REQUEST_CAPTURED__ = true;
        }

        if (label.includes("status") && label.includes("complete")) {
          isProcessing = true;
          console.log("\n========== EVENT START ==========");
          await (window as any).notifyStatusComplete();
          console.log("========== EVENT END ==========\n");
          isProcessing = false;
        }
      },
      true);
    });
  }

  static markViewReopened(viewCode: string) {
    RecorderStorage.incrementAppearance(viewCode);
    RecorderStorage.markViewAsMultiOrg(viewCode);
  }

  static save() {
    RecorderStorage.saveToFile();
  }
}
