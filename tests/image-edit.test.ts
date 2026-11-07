import { test } from "node:test";
import assert from "node:assert/strict";
import { imageEditInput } from "../lib/image-edit";

test("turns browser data URLs into named files for the provider upload", async () => {
  const source = imageEditInput("data:image/png;base64,iVBORw0KGgo=");
  assert(source instanceof File);
  assert.equal(source.name, "source.png");
  assert.equal(source.type, "image/png");
  assert.deepEqual(Buffer.from(await source.arrayBuffer()), Buffer.from("iVBORw0KGgo=", "base64"));
});

test("preserves HTTPS images and rejects filesystem paths and unsupported uploads", () => {
  assert.equal(imageEditInput("https://example.com/image.png"), "https://example.com/image.png");
  for (const value of ["/etc/passwd", "file:///tmp/image.png", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,"]) {
    assert.throws(() => imageEditInput(value));
  }
});

test("rejects uploads larger than the image limit", () => {
  assert.throws(() => imageEditInput(`data:image/png;base64,${Buffer.alloc(10 * 1024 * 1024 + 1).toString("base64")}`));
});
