export const browserDomScript = `
window.BrowserDomUtils = {
  getViewName: function() {
    const candidates = [...document.querySelectorAll('[id*="--dgViewName"], [id*="--viewName"]'),];
    for (const el of candidates) {
      const htmlEl = el;
      const isVisible =
        htmlEl.offsetWidth > 0 ||
        htmlEl.offsetHeight > 0 ||
        htmlEl.getClientRects().length > 0;
      if (!isVisible) continue;
      const text = el.textContent?.trim();
      if ( text && text !== "" && !text.includes("Select View")) {
        return text;
      }
    }
    return "UNKNOWN_VIEW";
  },

  getStep: function() {
    const bdis = Array.from(document.querySelectorAll("bdi"));
    for (const el of bdis) {
      const match = el.textContent?.match(/:\\s*(\\d+)\\s*-/);
      if (match) return "Step " + match[1];
    }
    return "Step 0";
  },

  getFieldLabel: function(el) {
    const aria = el.getAttribute("aria-labelledby");
    if (aria) {
      for (const id of aria.split(/\\s+/)) {
        const label = document.getElementById(id)?.textContent;
        if (label?.trim()) return label.trim();
      }
    }
    return el.placeholder || el.name || el.id || "UNKNOWN_FIELD";
  },

  isVisible: function(el) {
    return el.offsetWidth > 0 ||
           el.offsetHeight > 0 ||
           el.getClientRects().length > 0;
  },

  isValidationField: function(el) {
    return el.disabled || el.readOnly;
  },

  isMandatoryField: function(el) {
    return el.getAttribute("aria-required") === "true";
  },

  isTableMandatoryField: function(input) {
    // direct required on input itself
    if (input.getAttribute("aria-required") === "true") {
      return true;
    }

    const labelledBy = input.getAttribute("aria-labelledby");

    if (!labelledBy) {
      return this.isMandatoryField(input);
    }

    for (const id of labelledBy.split(/\s+/)) {
      const header = document.getElementById(id);

      if (!header) continue;

      const isRequired =
        header.classList.contains("sapMLabelRequired") ||
        !!header.querySelector(".sapMLabelRequired");

      console.log(
        "[MANDATORY CHECK]",
        "FIELD:", this.getFieldLabel(input),
        "| HEADER ID:", id,
        "| REQUIRED:", isRequired
      );

      if (isRequired) {
        return true;
      }
    }

    return this.isMandatoryField(input);
  },

  getRecord: function(el) {
    const row = el.closest("tr");
    if (!row) return 1;
    const index = row.getAttribute("data-sap-ui-rowindex");
    return index ? Number(index) + 1 : 1;
  }


};
`;
