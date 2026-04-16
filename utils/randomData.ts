import { faker } from '@faker-js/faker';

/**
 * Generates a random integer within a specified range (inclusive).
 *
 * This utility is commonly used in test automation for:
 * - Generating random numeric test data
 * - Creating unique identifiers
 * - Simulating realistic numeric inputs
 *
 * Steps:
 * 1. Generate a random decimal number between 0 and 1 using Math.random().
 * 2. Scale it to the desired range (max - min + 1).
 * 3. Shift it by the minimum value.
 * 4. Use Math.floor to ensure an integer result.
 *
 * @param min Minimum value (default: 1000)
 * @param max Maximum value (default: 9999)
 *
 * @returns A random integer between min and max (inclusive).
 *
 * Example:
 * const id = randomNumber(1, 100);
 */
export function randomNumber(min: number = 1000, max: number = 9999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random alphanumeric string of a given length.
 *
 * This utility function is commonly used for:
 * - Creating unique test data
 * - Generating random identifiers
 * - Avoiding duplicate values in automation tests
 *
 * Steps:
 * 1. Define a character set containing uppercase, lowercase, and digits.
 * 2. Initialize an empty result string.
 * 3. Loop until the desired length is reached.
 * 4. Randomly select a character from the character set in each iteration.
 * 5. Append selected characters to build the final string.
 * 6. Return the generated random string.
 *
 * @param length Length of the generated string (default: 8)
 *
 * @returns A randomly generated alphanumeric string.
 *
 * Example:
 * const id = randomAlphaNumeric(10);
 */
export function randomAlphaNumeric(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}