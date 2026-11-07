import { marked, type Token } from "marked";
import type { Content } from "pdfmake/interfaces";

const plain = (text: string) => text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/<[^>]*>/g, "");
function blocks(content: string): Token[] {
  return marked.lexer(content.replace(/^```(?:markdown|md)?\s*\n([\s\S]*)\n```\s*$/, "$1")).filter(t => t.type !== "space" && t.type !== "hr");
}
export async function renderDocument(content: string, format: "pdf" | "docx" | "xlsx"): Promise<Blob> {
  const tokens = blocks(content);
  if (format === "pdf") {
    const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
    pdfMake.addVirtualFileSystem(fonts);
    const body: Content[] = tokens.map((t): Content => {
      if (t.type === "heading") return { text: plain(t.text), fontSize: t.depth === 1 ? 24 : 16, bold: true, color: "#243d50", margin: [0, 16, 0, 8], headlineLevel: t.depth };
      if (t.type === "table") return { table: { headerRows: 1, widths: Array(t.header.length).fill("*"), body: [t.header.map((c: { text: string }) => ({ text: plain(c.text), bold: true, color: "#ffffff", fillColor: "#243d50" })), ...t.rows.map((r: { text: string }[]) => r.map((c: { text: string }) => plain(c.text)))] }, layout: "lightHorizontalLines", margin: [0, 8, 0, 14], fontSize: 9 };
      if (t.type === "list") return { ...(t.ordered ? { ol: t.items.map((i: { text: string }) => plain(i.text)) } : { ul: t.items.map((i: { text: string }) => plain(i.text)) }), margin: [0, 0, 0, 10] };
      return { text: plain("text" in t ? String(t.text) : t.raw), margin: [0, 0, 0, 10] };
    });
    return await pdfMake.createPdf({
      pageSize: "A4", pageMargins: [48, 48, 48, 52],
      defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.35, color: "#263238" },
      content: body,
      footer: (page, total) => ({ text: `${page} / ${total}`, alignment: "right", margin: [0, 12, 48, 0], fontSize: 9, color: "#718096" }),
      pageBreakBefore: (node, container) => Boolean(node.headlineLevel && container.getFollowingNodesOnPage().length === 0),
    }).getBlob();
  }
  if (format === "docx") {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = await import("docx");
    const children = tokens.map(t => {
      if (t.type === "table") return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [t.header, ...t.rows].map((row, index) => new TableRow({ tableHeader: index === 0, children: row.map((c: { text: string }) => new TableCell({ shading: index === 0 ? { fill: "E8EEF3" } : undefined, children: [new Paragraph({ children: [new TextRun({ text: plain(c.text), bold: index === 0 })] })] })) })) });
      if (t.type === "heading") return new Paragraph({ text: plain(t.text), heading: t.depth === 1 ? HeadingLevel.TITLE : t.depth === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 240, after: 120 } });
      if (t.type === "list") return new Paragraph({ children: t.items.flatMap((i: { text: string }, n: number) => [new TextRun({ text: `${t.ordered ? `${n + 1}.` : "•"} ${plain(i.text)}`, break: n ? 1 : 0 })]), spacing: { after: 180 } });
      return new Paragraph({ text: plain("text" in t ? String(t.text) : t.raw), spacing: { after: 180, line: 300 }, widowControl: true });
    });
    return Packer.toBlob(new Document({ styles: { default: { document: { run: { font: "Calibri", size: 22, color: "263238" } } } }, sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }] }));
  }
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "Fikra AI";
  const sheet = workbook.addWorksheet("Document", { views: [{ state: "frozen", ySplit: 1 }] });
  let maxColumns = 1;
  const narrativeRows: number[] = [];
  for (const t of tokens) {
    if (t.type === "table") {
      maxColumns = Math.max(maxColumns, t.header.length);
      const header = sheet.addRow(t.header.map((c: { text: string }) => plain(c.text)));
      header.eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243D50" } }; });
      for (const row of t.rows) sheet.addRow(row.map((c: { text: string }) => { const text = plain(c.text); return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text; }));
      sheet.addRow([]);
    } else {
      const text = t.type === "list" ? t.items.map((i: { text: string }) => plain(i.text)).join("\n") : plain("text" in t ? String(t.text) : t.raw);
      const row = sheet.addRow([text]);
      narrativeRows.push(row.number);
      if (t.type === "heading") { row.font = { bold: true, size: t.depth === 1 ? 20 : 14, color: { argb: "FF243D50" } }; row.height = 34; }
      else row.height = Math.max(26, Math.ceil(text.length / 90) * 18);
    }
  }
  for (let i = 1; i <= maxColumns; i++) sheet.getColumn(i).width = maxColumns === 1 ? 100 : 28;
  if (maxColumns > 1) for (const row of narrativeRows) sheet.mergeCells(row, 1, row, maxColumns);
  sheet.eachRow(row => {
    row.eachCell(cell => { cell.alignment = { vertical: "top", wrapText: true }; });
    if (!narrativeRows.includes(row.number)) {
      let lines = 1;
      row.eachCell(cell => { lines = Math.max(lines, Math.ceil(String(cell.value ?? "").length / 26)); });
      row.height = Math.max(26, lines * 18);
    }
  });
  sheet.pageSetup = { paperSize: 9, orientation: maxColumns > 5 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const data = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(data)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
