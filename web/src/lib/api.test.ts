import { describe, expect, it } from "vitest";
import { ApiError, getApiBaseUrl } from "./api";

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

describe("ApiError", () => {
  it("keeps status and body", () => {
    const err = new ApiError("ورود ناموفق", 401, { message: "Unauthorized" });
    expect(err.status).toBe(401);
    expect(err.message).toBe("ورود ناموفق");
    expect(err.body).toEqual({ message: "Unauthorized" });
  });
});
