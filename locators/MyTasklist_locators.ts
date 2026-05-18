import { Page } from '@playwright/test';

export const myTasklistLocators = (page: Page) => {

const frame = page.frameLocator('.sapUShellApplicationContainer');

return {
  tableGrid: frame.getByRole('grid'),
  requestSearchBox : frame.getByPlaceholder('Search for request'),
  stepText: frame.locator('div.sapMLabelInner bdi').filter({ hasText: /Step\s*\d+/i }).first(),
  statusText: frame.locator('.sapMObjStatusText').filter({ hasText: /.+/ }).nth(1),
  // taskSearchResult: (requestNumber: string) => frame.locator('li[aria-roledescription="Group Header"]').filter({ hasText: requestNumber })
  //   .first().locator('xpath=following-sibling::li[1]'),
  saveButton: frame.getByRole('button', { name: 'Save' }),
  noDataMessage: frame.locator('.sapMListNoDataText:visible'),
  taskSearchResultHeader: (requestNumber: string) =>frame.locator('li[aria-roledescription="Group Header"]').filter({ hasText: requestNumber }),
  taskSearchResult: (requestNumber: string, taskName: string) =>frame.locator('li[aria-roledescription="Group Header"]')
    .filter({ hasText: requestNumber }).first().locator('xpath=following-sibling::li').filter({ hasText: taskName }).first(),
  taskSearchResultByStep: (requestNumber: string, step: string) => frame.locator('li[aria-roledescription="Group Header"]')
    .filter({ hasText: requestNumber }).first().locator('xpath=following-sibling::li').filter({ hasText: step }).first(),
  refreshButton: frame.getByRole('button', { name: 'Refresh tasks' }),
  taskLockItems: frame.locator('li.sapMMsgViewItemError'),
  taskLockTexts: frame.locator('li.sapMMsgViewItemError span[id$="titleText"]'),
  taskErrorDialogTitle: frame.getByRole('heading', { name: 'Error' }),
  taskErrorOkButton: frame.getByRole('button', { name: /^ok$/i }),
  openedTaskButton: (requestNumber: string, step: string) =>
  frame.locator(`bdi:has-text("${requestNumber}")`).first(),
  


}
};