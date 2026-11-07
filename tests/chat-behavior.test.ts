import { test } from "node:test";
import assert from "node:assert/strict";
import { detectIntent } from "../lib/intent";
import { readChatStream } from "../lib/chat-stream";
import { renderDocument } from "../lib/document-export";

test("routes creation requests without requiring a model switch", () => {
  for (const [text, hasImage, action, format] of [
    ["generate image of car", false, "image-generate", "pdf"],
    ["Please create a Word report about sales", false, "document", "docx"],
    ["Make an Excel budget spreadsheet", false, "document", "xlsx"],
    ["Prepare a PDF business proposal", false, "document", "pdf"],
    ["Remove the background", true, "image-edit", "pdf"],
    ["What is a PDF?", false, "chat", "pdf"],
    ["How do I create an image?", false, "chat", "pdf"],
  ] as const) assert.deepEqual(detectIntent(text, hasImage), { action, format });
});

test("preserves SSE records and Unicode split across individual bytes", async () => {
  const content = "Hello café 世界";
  const bytes = new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\ndata: {"done":true}\n\n`);
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } });
  assert.equal(await readChatStream(new Response(stream), () => {}), content);
});

test("surfaces interrupted-stream errors instead of silently accepting a partial reply", async () => {
  await assert.rejects(readChatStream(new Response('data: {"error":"Response interrupted"}\n\n'), () => {}), /Response interrupted/);
});

const sample = "# Quarterly review\n\nProfessional findings with **clear recommendations** and café.\n\n## Results\n\n| Category | Amount |\n| --- | --- |\n| Sales | 1250 |\n| Costs | 450 |\n\n- Review costs\n- Plan next quarter\n\n" + "Readable report paragraph with natural page flow.\n\n".repeat(100);
for (const format of ["pdf", "docx", "xlsx"] as const) {
  test(`renders an actual ${format.toUpperCase()} file for a long document`, async () => {
    const blob = await renderDocument(sample, format);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert(bytes.length > 1000);
    assert.equal(new TextDecoder().decode(bytes.slice(0, format === "pdf" ? 4 : 2)), format === "pdf" ? "%PDF" : "PK");
    if (format === "xlsx") {
      const { Workbook } = await import("exceljs");
      const book = new Workbook();
      await book.xlsx.load(await blob.arrayBuffer());
      const sheet = book.worksheets[0];
      let amount: unknown;
      sheet.eachRow(row => { if (row.getCell(1).value === "Sales") amount = row.getCell(2).value; });
      assert.equal(amount, 1250);
      assert(sheet.getCell("A1").isMerged);
    }
  });
}
