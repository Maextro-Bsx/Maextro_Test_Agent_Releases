import { Page } from '@playwright/test';

export const homeLocators = (page: Page) => {
 
const frame = page.frameLocator('.sapUShellApplicationContainer');

  return {
    dashboard: frame.getByRole('treeitem', { name: 'Dashboard' }),
    createRequest: frame.getByRole('treeitem', { name: 'Create Request' }),
    myTaskList: frame.getByRole('treeitem', { name: 'My Task List' }),
    trackMyRequests: frame.getByRole('treeitem', { name: 'Track my Requests' }),
    maextroHealth: frame.getByRole('treeitem', { name: 'Maextro health' }),
    logs: frame.getByRole('treeitem', { name: 'Logs' }),
    adminApps: frame.getByRole('treeitem', { name: 'Admin Apps' }),
  };

};