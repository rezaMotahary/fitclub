export type StaffPanel = "secretary" | "admin";

export type StaffPanelPaths = {
  token: string;
  home: string;
  payments: string;
};

export type StaffPathConfig = {
  secretary: StaffPanelPaths;
  admin: StaffPanelPaths;
};

const MIN_LEN = 32;
const URL_SAFE = /^[A-Za-z0-9_-]+$/;
const FORBIDDEN = /admin|secretary|staff|fitclub/i;

export type StaffPathEnv = {
  STAFF_PATH_SECRETARY?: string;
  STAFF_PATH_ADMIN?: string;
};

export function parseStaffPathToken(raw: string | undefined, label: string): string {
  const token = raw?.trim() ?? "";
  if (token.length < MIN_LEN) {
    throw new Error(`${label} must be at least ${MIN_LEN} characters`);
  }
  if (!URL_SAFE.test(token)) {
    throw new Error(`${label} must be url-safe`);
  }
  if (FORBIDDEN.test(token)) {
    throw new Error(`${label} contains a forbidden word`);
  }
  return token;
}

export function buildStaffPaths(env: StaffPathEnv): StaffPathConfig {
  const secretaryToken = parseStaffPathToken(
    env.STAFF_PATH_SECRETARY,
    "STAFF_PATH_SECRETARY",
  );
  const adminToken = parseStaffPathToken(env.STAFF_PATH_ADMIN, "STAFF_PATH_ADMIN");
  if (secretaryToken === adminToken) {
    throw new Error("staff path tokens must differ");
  }
  return {
    secretary: {
      token: secretaryToken,
      home: `/${secretaryToken}/reception`,
      payments: `/${secretaryToken}/reception/payments`,
    },
    admin: {
      token: adminToken,
      home: `/${adminToken}/overview`,
      payments: `/${adminToken}/overview/payments`,
    },
  };
}

export function matchStaffKey(
  key: string,
  config: StaffPathConfig,
): StaffPanel | null {
  if (key === config.secretary.token) return "secretary";
  if (key === config.admin.token) return "admin";
  return null;
}

export function tryBuildStaffPaths(env: StaffPathEnv): StaffPathConfig | null {
  try {
    return buildStaffPaths(env);
  } catch {
    return null;
  }
}

