import { notFound } from "next/navigation";
import {
  buildStaffPaths,
  matchStaffKey,
  type StaffPanel,
  type StaffPanelPaths,
} from "./staff-paths";

export function loadStaffPanelPaths(
  staffKey: string,
  panel: StaffPanel,
): StaffPanelPaths {
  let config;
  try {
    config = buildStaffPaths({
      STAFF_PATH_SECRETARY: process.env.STAFF_PATH_SECRETARY,
      STAFF_PATH_ADMIN: process.env.STAFF_PATH_ADMIN,
    });
  } catch {
    notFound();
  }
  if (matchStaffKey(staffKey, config) !== panel) {
    notFound();
  }
  return config[panel];
}
