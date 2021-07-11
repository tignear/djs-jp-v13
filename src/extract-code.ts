import { parse, ParserOption, Node, CodeBlock, Block, CodeNode } from "@progfay/scrapbox-parser";
import { readFile } from "fs/promises";
import { check, Source } from "./type-check";
import * as ts from "typescript";
interface Data<T> {
  meta: T,
  text: string
}
function extractFromNodes<T>(meta: T, nodes: Node[]) {
  return nodes.filter((node): node is CodeNode => {
    switch (node.type) {
      case "code":
        return true;
      case "commandLine":
        console.error(node);
    }
    return false;
  }).map(node => ({
    node,
    meta
  }));
}
function extractFromBlocks<T>(meta: T, blocks: Block[]) {
  const codeBlocks: { meta: T, block: CodeBlock }[] = [];
  const codeNodes: { meta: T, node: CodeNode }[] = [];
  blocks.forEach(block => {
    switch (block.type) {
      case "title":
        break;
      case "codeBlock":
        codeBlocks.push({ meta, block });
        break;
      case "table":
        codeNodes.push(...extractFromNodes(meta, block.cells.flat(2)));
        break;
      case "line":
        codeNodes.push(...extractFromNodes(meta, block.nodes));
        break;
    }
  });
  return { codeBlocks, codeNodes };
}
function parseData<T>(d: Data<T>[], parserOption: ParserOption = {}) {
  const a = d.map(({ meta, text }) => {
    return {
      meta,
      ast: parse(text, parserOption)
    };
  }).map(e => {
    return extractFromBlocks(e.meta, e.ast);
  });
  const blocks = a.flatMap(e => e.codeBlocks).map(e => {
    return { meta: e.meta, filename: e.block.fileName, code: e.block.content };
  });
  const nodes = a.flatMap(e => e.codeNodes).map(e => {
    return { meta: e.meta, filename: undefined, code: e.node.text };
  });
  return [...blocks, ...nodes];
}
const ignoreExtensions = [
  "bash", "sh", "cmd", "diff", "text", "json", "txt", "shell", "md", ".env", ".env.example", "css", ".gitignore", "json", "powershell", "http"
];
const ignoreFiles = [
  "コマンドプロントの場合", "powershellの場合", "emoji", "テーブル", "結果", "悪い例(js)"
]
function performFilename(fn?: string) {
  console.error(fn);
  if(!fn){
    return "test.ts";
  }
  fn = fn.toLowerCase().trim();
  if (fn === "javascript") {
    return "test.ts";
  }
  if (fn === "ts") {
    return "test.ts";
  }
  if (fn === "js") {
    return "test.ts";
  }
  if (fn.endsWith("js")) {
    return fn.replace("js", "ts");
  }
  if (ignoreExtensions.some(e => fn!.endsWith(e))) {
    return undefined;
  }
  if (ignoreFiles.includes(fn)) {
    return undefined;
  }
  throw new Error();
}
async function mainA() {
  const a = JSON.parse(await readFile(process.argv[2], "utf-8"));
  const b = parseData(a.pages.map((page: any) => ({ text: page.lines.join("\n"), meta: page.title }))).map(e => ({
    title: e.meta as string,
    source: e.code,
    filename: performFilename(e.filename)?.trim(),
  })).filter((e): e is Source => e.filename != null).map(check);
  const c = b.map(e => {
    return {
      diagnostic: e.diagnostic,
      source: e.source,
      title: e.title,
      assertedSource: e.assertedSource
    };

  });
  console.log(JSON.stringify(c));
}
mainA();
setTimeout(() => { }, 1000);