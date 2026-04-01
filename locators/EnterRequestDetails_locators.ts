import { Page ,Locator} from '@playwright/test';

export const enterRequestDetailsLocators = (page: Page) => {

  const frame = page.frameLocator('.sapUShellApplicationContainer');

  return {

   
    crDescription: frame.locator('#reqDesc-inner'),
    reasonCodeDropdown: frame.locator('#reqReason'),
    dropdownOption: (optionText: string) =>
      frame.locator('li[role="option"]', { hasText: optionText }),
    orgDivisionDropdown: frame.locator('#divCode'),
    priorityDropdown: frame.locator('#priority'),
    expectedCompletionDate: frame.locator('#expCompDate-inner'),
    previousButton: frame.getByRole('button', { name: 'Previous' }),
    nextButton: frame.getByRole('button', { name: 'Next' }),
    confirmButton: frame.getByRole('button', { name: 'Confirm' }),

     // Optional: Build a mapping for Excel field names
    getLocatorsMap(): Record<string, Locator> {
    return {
      'CR Description': this.crDescription,
      'Reason Code': this.reasonCodeDropdown,
      'Org. Division': this.orgDivisionDropdown,
      'Priority': this.priorityDropdown,
      'Expected Completion Date': this.expectedCompletionDate,
    };
  }



  };
};