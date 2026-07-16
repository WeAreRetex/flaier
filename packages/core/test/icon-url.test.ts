import { describe, expect, it } from "vite-plus/test";
import { resolveIconUrl } from "../src/icon-url";

describe("resolveIconUrl", () => {
  it("resolves iconify names against the iconify API with a neutral color", () => {
    expect(resolveIconUrl("logos:aws-lambda")).toBe(
      "https://api.iconify.design/logos/aws-lambda.svg?color=%2394a3b8",
    );
    expect(resolveIconUrl("simple-icons:cloudflare")).toBe(
      "https://api.iconify.design/simple-icons/cloudflare.svg?color=%2394a3b8",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(resolveIconUrl("  logos:azure  ")).toBe(
      "https://api.iconify.design/logos/azure.svg?color=%2394a3b8",
    );
  });

  it("passes through URLs and data URIs untouched", () => {
    expect(resolveIconUrl("https://example.com/logo.png")).toBe("https://example.com/logo.png");
    expect(resolveIconUrl("/assets/logo.svg")).toBe("/assets/logo.svg");
    expect(resolveIconUrl("//cdn.example.com/logo.svg")).toBe("//cdn.example.com/logo.svg");
    expect(resolveIconUrl("data:image/svg+xml;base64,abc")).toBe("data:image/svg+xml;base64,abc");
  });

  it("returns undefined for values that are not icons or URLs", () => {
    expect(resolveIconUrl("")).toBeUndefined();
    expect(resolveIconUrl("   ")).toBeUndefined();
    expect(resolveIconUrl("not an icon")).toBeUndefined();
    expect(resolveIconUrl("logos:")).toBeUndefined();
    expect(resolveIconUrl("Logos:AWS")).toBeUndefined();
    expect(resolveIconUrl("javascript:alert(1)")).toBeUndefined();
  });
});
