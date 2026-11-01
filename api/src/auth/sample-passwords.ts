/** Local sample staff passwords. A live server refuses to start while any staff account still uses one. */
export const SAMPLE_STAFF_PASSWORDS = {
  admin: 'FitClubAdmin1!',
  secretary: 'FitClubSecretary1!',
} as const;

export const SAMPLE_STAFF_PASSWORD_LIST: readonly string[] = Object.values(
  SAMPLE_STAFF_PASSWORDS,
);
