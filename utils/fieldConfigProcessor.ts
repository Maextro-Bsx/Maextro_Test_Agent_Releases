export class FieldConfigProcessor {

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

    return {
      mandatoryFields,
      readonlyFields,
      actionMap
    };
  }
}