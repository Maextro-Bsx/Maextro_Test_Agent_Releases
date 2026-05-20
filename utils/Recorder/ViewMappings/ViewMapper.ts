import {
  ViewMapping,
  commonMappings,
  materialMappings,
  assetMasterMappings,
  businessPartnerMappings,
  costCenterMappings,
  generalLedgerAccountMappings,
  goodsMovementTransactionsMappings,
  HRMappings,
  internalOrderMappings,
  plantMaintenanceMappings,
  profitCentreMappings,
  projectSystemsMappings,
  quotesProcessMappings,
} from "./index";

export class ViewMapper {

  private static normalize(
    value: string
  ): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[:./-]/g, "")
      .trim();
  }

  private static getMappingsByObject(
    objectName: string
  ): ViewMapping[] {
    const object =
      objectName.toLowerCase();

    /**
     * Material
     */
    if (object.includes("material")) {
      return [
        ...commonMappings,
        ...materialMappings
      ];
    }

    /**
     * Asset Master
     */
    if (object.includes("asset master")) {
      return [
        ...commonMappings,
        ...assetMasterMappings
      ];
    }

    /**
     * Business Partner / Customer / Vendor / Supplier
     */
    if (
      object.includes("business partner") ||
      object.includes("customer") ||
      object.includes("vendor") ||
      object.includes("supplier")
    ) {
      return [
        ...commonMappings,
        ...businessPartnerMappings
      ];
    }

    /**
     * Cost Center
     */
    if (object.includes("cost center")) {
      return [
        ...commonMappings,
        ...costCenterMappings
      ];
    }

    /**
     * General Ledger Account
     */
    if (
      object.includes("general ledger") ||
      object.includes("gl account")
    ) {
      return [
        ...commonMappings,
        ...generalLedgerAccountMappings
      ];
    }

    /**
     * Goods Movement Transactions
     */
    if (
      object.includes("goods movement") ||
      object.includes("goods movement transaction")
    ) {
      return [
        ...commonMappings,
        ...goodsMovementTransactionsMappings
      ];
    }

    /**
     * HR
     */
    if (
      object.includes("hr") ||
      object.includes("human resource")
    ) {
      return [
        ...commonMappings,
        ...HRMappings
      ];
    }

    /**
     * Internal Order
     */
    if (object.includes("internal order")) {
      return [
        ...commonMappings,
        ...internalOrderMappings
      ];
    }

    /**
     * Plant Maintenance
     */
    if (object.includes("plant maintenance")) {
      return [
        ...commonMappings,
        ...plantMaintenanceMappings
      ];
    }

    /**
     * Profit Centre
     */
    if (
      object.includes("profit centre") ||
      object.includes("profit center")
    ) {
      return [
        ...commonMappings,
        ...profitCentreMappings
      ];
    }

    /**
     * Project Systems
     */
    if (
      object.includes("project system") ||
      object.includes("project systems")
    ) {
      return [
        ...commonMappings,
        ...projectSystemsMappings
      ];
    }

    /**
     * Quotes Process
     */
    if (
      object.includes("quotes") ||
      object.includes("quote process")
    ) {
      return [
        ...commonMappings,
        ...quotesProcessMappings
      ];
    }

    /**
     * Fallback
     */
    return commonMappings;
  }

  static resolve(
    rawViewText: string,
    objectName: string
  ): ViewMapping {
    const normalizedRaw =
      this.normalize(rawViewText);

    const mappings =
      this.getMappingsByObject(objectName);

    for (const mapping of mappings) {
      const normalizedMatch =
        this.normalize(mapping.matchText);

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