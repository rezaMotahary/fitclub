import { logout } from "./api";

/** End the session, then open that door with a full page load. */
export async function logoutAndLeave(href: string): Promise<void> {
  try {
    await logout();
  } catch {
    // Still leave. A failed call must not keep the old panel on screen.
  }
  window.location.assign(href);
}
