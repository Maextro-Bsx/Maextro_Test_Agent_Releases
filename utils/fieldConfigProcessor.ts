export class FieldConfigProcessor {


  /**
   * Processes field configuration metadata and categorizes fields into
   * mandatory fields, read-only fields, and action mappings.
   *
   * This function is typically used to transform structured configuration
   * data into execution-friendly formats for form/table automation.
   *
   * Steps:
   * 1. Initialize empty collections for:
   *    - mandatory fields
   *    - read-only fields
   *    - field action mapping
   * 2. Iterate through each field in the configuration object.
   * 3. Extract configuration for each field.
   * 4. If the field is marked as mandatory, add it to mandatoryFields.
   * 5. If the field is marked as read-only, add it to readonlyFields.
   * 6. Assign an action type for each field (default: "input").
   * 7. Return the categorized result object.
   *
   * @param fieldConfig Object containing field-level configuration metadata.
   *
   * @returns An object containing:
   *          - mandatoryFields: list of required fields
   *          - readonlyFields: list of non-editable fields
   *          - actionMap: mapping of field → action type (input/dropdown/valuehelp/etc.)
   *
   * Example:
   * const result = FieldProcessor.process(config);
   */
  static process(fieldConfig: any) {

    const mandatoryFields: string[] = [];
    const readonlyFields: string[] = [];
    const actionMap: Record<string, string> = {};

    for (const field in fieldConfig) {
      const config = fieldConfig[field];
      if (config.mandatory) {
        mandatoryFields.push(field);
      }
      if (config.readonly) {
        readonlyFields.push(field);
      }
      actionMap[field] = config.action || 'input';
    }
    return {mandatoryFields,readonlyFields,actionMap};
  }
}