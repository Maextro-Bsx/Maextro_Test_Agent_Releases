import { RequestDetailsFieldsPage } from '@pages/RequestDetailsFields_Page';
import { logger } from '@utils/logger';

export async function executeView(
  requestDetailsFields: RequestDetailsFieldsPage,
  view: any
) {

  logger.info(`\n========== View: ${view.viewName}${view.multiOrg ? ' (MultiOrg)' : ''} ==========\n`);

  // ✅ STEP 1: DELETE RECORDS (descending order)
  if (view.deleteRecords && view.deleteRecords.length > 0) {
    await requestDetailsFields.deleteRecords(view.deleteRecords);
  }
  // ✅ STEP 2: ADD RECORDS
  if (view.addRecords && view.addRecords > 0) {
    await requestDetailsFields.addRecord(view.addRecords);
  }

  if (!view.records.length) {
    logger.info(`No data for ${view.viewName} → Only Status Complete`);
    await requestDetailsFields.clickStatusComplete();
    return;
  }

  // ✅ MULTI ORG
  if (view.multiOrg) {

    for (let i = 0; i < view.records.length; i++) {
      const record = view.records[i];
      const recordNo = i + 1;
      logger.info(`\n[Record ${recordNo}]`);
      const hasData = Object.keys(record).length > 0;
      if (hasData) {
        logger.info(`→ Filling data`);
        await requestDetailsFields.executeDynamicDataN([record]);
      } else {
        logger.info(`→ No data → Only Status Complete`);
      }
      await requestDetailsFields.clickStatusComplete();
    }
  } else {
    logger.info(`\n[Single Execution]`);
    await requestDetailsFields.executeDynamicDataN(view.records);
    await requestDetailsFields.clickStatusComplete();
    // await requestDetailsFields.waitForSAPPageReady();
  }
}