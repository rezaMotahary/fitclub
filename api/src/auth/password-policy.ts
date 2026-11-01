import { SAMPLE_STAFF_PASSWORD_LIST } from './sample-passwords.js';

export const STAFF_PASSWORD_MIN_LENGTH = 12;

/** Returns a reason the password is too weak for a real staff account, or null. */
export function staffPasswordProblem(password: string): string | null {
  if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return `password must be at least ${STAFF_PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > 200) {
    return 'password must be at most 200 characters';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9۰-۹٠-٩]/.test(password)) {
    return 'password must contain both letters and digits';
  }
  if (SAMPLE_STAFF_PASSWORD_LIST.includes(password)) {
    return 'sample passwords are not allowed';
  }
  return null;
}
