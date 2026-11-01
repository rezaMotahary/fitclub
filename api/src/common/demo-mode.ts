/**
 * Public test / teaching server (owner decision 1404/08/10): the fixed member code works,
 * no SMS is sent, and the sample staff accounts are allowed. Never enable on a real club.
 */
export function isDemoMode(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.DEMO_MODE?.trim().toLowerCase() ?? '';
  return raw === 'true' || raw === '1' || raw === 'yes';
}
