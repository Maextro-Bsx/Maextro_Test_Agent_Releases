import { Page , Locator } from '@playwright/test';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const requestDetailsFieldsLocators = (page: Page) => {

const frame = page.frameLocator('.sapUShellApplicationContainer');

return {

  tableGrid: frame.getByRole('grid'),

  columnHeader: (columnName: string) =>
  frame.locator('td[role="columnheader"]').filter({ hasText: columnName }).first(),
  statusCompleteButton: frame.getByRole('button', { name: 'Status Complete',exact:true }),
  submitTaskButton: frame.getByRole('button', { name: 'Submit Task' }),
  saveAsDraftMenuItem: page.getByRole('menuitem', { name: 'Save As Draft'}),
  saveMenuItem: frame.locator('.sapMMenuItemText', {hasText: /^Save$/}),
  editViewButton: frame.getByRole('button', { name: 'Edit View' }),
  statusText: frame.locator('[role="progressbar"] span.sapMPITextLeft'),
  statusCompleteIndicator: frame.locator('[role="progressbar"][aria-valuenow]'),
  confirmMessage : frame.getByText('This will submit this request and you will be unable to make any more changes, are you sure you wish to continue?',{ exact: true } ),
  submitConfirmButton : frame.getByRole('button', {name: 'Yes, Submit this request'}),
  cancelButton : frame.getByRole('button', {name: 'Cancel'}),
  successTitle: frame.locator('span.sapUiSelectable:has-text("Success")').first(),
  requestRaisedTitle: frame.getByRole('heading', {name: 'Your Request has been raised!'}),
  requestSuccessMessage: frame.locator('span.sapMIllustratedMessageDescription',{hasText: /Request \d+ created/i }),
  exitButton : frame.getByRole('button', { name: 'Exit' }),
  taskCloseConfirmMessage: frame.getByRole('dialog').getByText(/All data views completed/i),
  confirmYesButton: frame.getByRole('dialog').getByRole('button', { name: 'Yes' }),
  confirmNoButton: frame.getByRole('dialog').getByRole('button', { name: 'No' }),
  saveSuccessMessage: frame.getByText(/Data saved\s*successfully/i),
  taskClosedMessage: frame.getByText(/Task successfully\s*closed/i),
  backToTaskListButton: frame.getByRole('dialog').getByRole('button', { name: 'Back to Task List' }),
  approveMenuItem: frame.getByRole('menuitem', { name: 'Approve' }),
  rejectMenuItem: frame.getByRole('menuitem', { name: 'Reject' }),
  reviewMenuItem: frame.getByRole('menuitem', { name: 'Review' }),
  saveButton: frame.getByRole('button', { name: 'Save' }),
  approvalSuccessMessage: frame.getByText(/Data successfully\s*approved/i),
  mandatoryColumnHeader: (columnName: string) =>frame.getByRole('columnheader').filter({ has: frame.locator('bdi', { hasText: columnName }) })
    .locator('span.sapMLabelRequired'),
  table: frame.locator('table[id^="__table"]'),
  tableBody: frame.locator('table[id$="-table"]').first(),
  columnHeaders: frame.locator('td[role="columnheader"]'),
  tableRows : frame.locator('table[id^="__table"]:visible tr.sapUiTableContentRow:not(.sapUiTableRowHidden)'),
  getCell: (rowIndex: number, colIndex: number) =>frame.locator('tr[id^="__table"][id*="rows-row"]').nth(rowIndex)
    .locator('td.sapUiTableContentCell').nth(colIndex),
  getValueHelpIcon: (rowIndex: number, colIndex: number) => frame.locator('tr[id^="__table"][id*="rows-row"]').nth(rowIndex)
    .locator('td.sapUiTableContentCell').nth(colIndex).locator('span[aria-label="Show Value Help"]'),
  valueHelpDialog: frame.locator('#f4Dialog'),
  valueHelpDialogRows: frame.locator('#f4Dialog').getByRole('row'),
  closeDialogButton: frame.getByRole('button', { name: /^Close$/i }), 
  rejectReasonDropdown: frame.locator('#rejectReasonCodeSelect-label'),
  rejectStepDropdown: frame.locator('#rejectStepSelect'),
  rejectCommentsTextarea: frame.locator('#rejectCommentsArea-inner'),
  submitRejectionButton: frame.getByRole('button', { name: 'Submit Rejection' }),
  // rejectSuccessMessage: (requestNumber: string, stepNumber: string) => frame.getByText(`Request ${requestNumber} sent to step ${stepNumber} for review`),
  rejectSuccessMessage: (requestNumber: string | RegExp, stepNumber: string | RegExp) =>frame.getByText(new RegExp(`Request\\s*${requestNumber}.*step\\s*${stepNumber}`, 'i')),
  errorItems: frame.locator("li.sapMMsgViewItemError"),
  errorTitle: (item: Locator) => item.locator(".sapMSLITitle span"),
  errorDescription: (item: Locator) => item.locator(".sapMSLIDescription span"),
  readOnlyFieldWrapper: (rowIndex: number, colIndex: number) =>frame.locator('tr[id^="__table"][id*="rows-row"]')
    .nth(rowIndex).locator('td.sapUiTableContentCell').nth(colIndex).locator('.sapMInputBase'),
  // tableRowSelectionCheckbox: (rowIndex: number) => `div[role="row"]:nth-child(${rowIndex + 1}) div[role="gridcell"].sapUiTableRowSelectionCell`,
  tableRowSelectionCheckbox: (rowIndex: number) =>frame.locator('div[role="row"]').nth(rowIndex+1).locator('div.sapUiTableRowSelectionCell'),
  tableRowCheckbox: (visibleIndex: number) =>
  frame.locator(`div[id$="rowsel${visibleIndex}"]`).first(),
  bpAddRolesButton: frame.getByRole('button', { name: /BP\s*:\s*Add Roles/i }),
  confirmButton : frame.locator('button:has-text("Confirm")'),
  addRolesDialog : frame.locator('div.sapMDialog:has(span:text("BP : Add Roles"))'),
  // rejectSuccessMessageDynamic: frame.locator('.sapMIllustratedMessageDescription').filter({ hasText: /Request.*step/i }).first(),
  rejectSuccessMessageDynamic: frame.locator('.sapMIllustratedMessageDescription').filter({ hasText: /Request/i }).first(),
  dataINSAPERPConfirmMessage: frame.getByRole('dialog').getByText(/This approval will update SAP ERP, do you wish to continue?/i),
  resultTitle: frame.getByRole('heading', { name: 'Result' }),
  logTitle: frame.getByRole('heading', { name: 'Log' }),
  messageLocator : frame.locator('li.sapMMsgViewItem span[id$="titleText"]'),
  // formLabel: (fieldName: string) =>frame.locator('label').filter({has: frame.locator('bdi').filter({hasText: new RegExp(`^\\s*${fieldName}\\s*$`, 'i')})}).first(),
  formLabel: (fieldName: string) => {
    const safeField = escapeRegex(fieldName.trim());
    return frame.locator('label').filter({
      has: frame.locator('bdi', { hasText: new RegExp(`^${safeField}$`, 'i') })
    }).first();
  },
  
  formInputById: (inputId: string) =>frame.locator(`#${inputId}`),
  formFieldContainer: (input: Locator) =>input.locator('xpath=ancestor::div[contains(@class,"sapMInputBase")]').first(),
  formValueHelpIcon: (container: Locator) =>container.locator('[aria-label="Show Value Help"]'),
  errorSegment: frame.locator('.sapMMsgViewBtnError'),
  warningSegment: frame.locator('.sapMMsgViewBtnWarning'),
  successSegment: frame.locator('.sapMMsgViewBtnSuccess'),
  errorCountText: frame.locator('.sapMMsgViewBtnError .sapMSegBBtnInner'),
  warningCountText: frame.locator('.sapMMsgViewBtnWarning .sapMSegBBtnInner'),
  successCountText: frame.locator('.sapMMsgViewBtnSuccess .sapMSegBBtnInner'),
  segmentContainer: frame.locator('ul.sapMSegB'),
  addRowButton: frame.locator('button[aria-label="Add Row"], button[title="Add Row"]'),
  deleteRowButton: frame.locator('button[aria-label="Delete Row"], button[title="Delete Row"]'),
  dependentViewWarningHeader: frame.locator('h1.sapMDialogTitle span.sapUiSelectable').filter({hasText: 'Warning'}),
  dependentViewWarningMessages: frame.locator('section.sapMDialogSection div[id$="scrollCont"] span.sapMText'),
  dependentViewYesButton: frame.getByRole('button', {name: 'Yes'}),
  viewDropdownButton: frame.locator('button[id$="dgViewName"]'),
  viewListItems: frame.locator('ul[id$="dgPopoverList-listUl"] > li'),
  selectedCurrentView: frame.locator('li.sapMLIBSelected'),
  completedViewIcon: (item: Locator) =>item.locator('[aria-label="sys-enter-2"]'),

}
};