import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getApiBaseUrl, logout } from "./api";

describe("getApiBaseUrl", () => {
  it("strips trailing slash and falls back to local API", () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api/";
    expect(getApiBaseUrl()).toBe("http://localhost:3001/api");
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBe("http://localhost:3001/api");
    process.env.NEXT_PUBLIC_API_URL = prev;
  });
});

describe("logout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("asks the browser and the cdn not to reuse the account call", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Cache-Control"]).toBe("no-cache");
  });
});

describe("ApiError", () => {
  it("keeps status and body", () => {
    const err = new ApiError("ورود ناموفق", 401, { message: "Unauthorized" });
    expect(err.status).toBe(401);
    expect(err.message).toBe("ورود ناموفق");
    expect(err.body).toEqual({ message: "Unauthorized" });
  });
});
