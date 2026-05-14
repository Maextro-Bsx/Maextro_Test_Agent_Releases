export const Logger = {
  tracker: (...args: any[]) => console.log("[TRACKER]", ...args),
  capture: (...args: any[]) => console.log("[CAPTURE]", ...args),
  browser: (...args: any[]) => console.log("[BROWSER]", ...args),
  sync: (...args: any[]) => console.log("[SYNC]", ...args),
};