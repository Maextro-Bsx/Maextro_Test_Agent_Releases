import { Page } from '@playwright/test';

export const chooseTemplateLocators = (page: Page) => {
 
const frame = page.frameLocator('.sapUShellApplicationContainer');


  return {
   searchInput : frame.locator('input[aria-label="Search"]'),
   create : frame.locator('button', { hasText: 'Create' }),
   change : frame.locator('button', { hasText: 'Change' }),
   extend : frame.locator('button', { hasText: 'Extend' }),
   align : frame.locator('button', { hasText: 'Align' }),
   previous : frame.locator('button', { hasText: 'Previous' }),
   next : frame.locator('button', { hasText: 'Next' }),
  templateByName: (templateId: string, objectName: string) =>frame.locator(`.sapMPanel:has(.sapMPanelHdr:has-text("${objectName}"))`)
    .locator('.sapMGT', {has: frame.locator('.templateId', { hasText: templateId })}).first(),




};




};