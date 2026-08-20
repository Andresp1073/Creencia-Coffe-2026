import { describe, it, expect } from "vitest";
import { escapeJsonForScript } from "@/lib/security/sanitize";

describe("security.sanitize.escapeJsonForScript", () => {
  it("serializa un objeto simple a JSON", () => {
    expect(escapeJsonForScript({ name: "Café" })).toBe('{"name":"Café"}');
  });

  it("escapa < para impedir romper </script> (XSS)", () => {
    const out = escapeJsonForScript({ name: "</script><script>alert(1)</script>" });
    expect(out).toContain("\\u003c/script>");
    expect(out).not.toContain("</script>");
  });

  it("escapa U+2028 y U+2029 (separadores de línea JS)", () => {
    const out = escapeJsonForScript({ desc: "line\u2028separator" });
    expect(out).toContain("\\u2028");
  });

  it("no altera objetos sin caracteres peligrosos", () => {
    const out = escapeJsonForScript({ a: 1, b: "texto normal" });
    expect(out).toBe('{"a":1,"b":"texto normal"}');
  });
});
