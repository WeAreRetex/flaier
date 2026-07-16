import { describe, expect, it } from "vite-plus/test";
import { resolveSaveTarget } from "../src/runtime/server/resolveSaveTarget";

const SAVE_DIRS = ["/srv/app/public", "/srv/layer/public"];

describe("resolveSaveTarget", () => {
  it("resolves a public URL path inside every save directory", () => {
    const result = resolveSaveTarget("/flows/demo.flow.json", SAVE_DIRS);

    expect(result).toEqual({
      ok: true,
      candidates: [
        "/srv/app/public/flows/demo.flow.json",
        "/srv/layer/public/flows/demo.flow.json",
      ],
    });
  });

  it("accepts query strings and URI encoding", () => {
    const result = resolveSaveTarget("/flows/my%20demo.flow.json?v=2#frag", SAVE_DIRS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidates[0]).toBe("/srv/app/public/flows/my demo.flow.json");
    }
  });

  it("rejects path traversal", () => {
    const result = resolveSaveTarget("/../../etc/hosts.flow.json", SAVE_DIRS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
    }
  });

  it("rejects nested traversal that escapes after resolution", () => {
    const result = resolveSaveTarget("/flows/../../secrets.flow.json", SAVE_DIRS);

    expect(result).toMatchObject({ ok: false, statusCode: 403 });
  });

  it("rejects non-flow-json suffixes", () => {
    expect(resolveSaveTarget("/flows/demo.json", SAVE_DIRS)).toMatchObject({
      ok: false,
      statusCode: 400,
    });
    expect(resolveSaveTarget("/etc/passwd", SAVE_DIRS)).toMatchObject({
      ok: false,
      statusCode: 400,
    });
  });

  it("rejects remote and protocol-relative sources", () => {
    expect(resolveSaveTarget("https://example.com/demo.flow.json", SAVE_DIRS)).toMatchObject({
      ok: false,
      statusCode: 400,
    });
    expect(resolveSaveTarget("//example.com/demo.flow.json", SAVE_DIRS)).toMatchObject({
      ok: false,
      statusCode: 400,
    });
  });

  it("rejects non-string and empty sources", () => {
    expect(resolveSaveTarget(undefined, SAVE_DIRS)).toMatchObject({ ok: false, statusCode: 400 });
    expect(resolveSaveTarget("   ", SAVE_DIRS)).toMatchObject({ ok: false, statusCode: 400 });
  });

  it("fails closed with no configured save directories", () => {
    expect(resolveSaveTarget("/flows/demo.flow.json", [])).toMatchObject({
      ok: false,
      statusCode: 403,
    });
  });
});
