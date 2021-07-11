import * as ts from "typescript";
import { inspect } from "util";
function declareStatement(variableName: string, typeName: string, moduleName: string) {
  return ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(variableName),
        undefined,
        ts.factory.createImportTypeNode(
          ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(moduleName)),
          ts.factory.createIdentifier(typeName),
          undefined,
          false
        ),
        undefined
      )],
      8388608
    )
  );
}
function declareIntersection(variableName: string, types: [string, string][]) {
  return ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(variableName),
        undefined,
        ts.factory.createIntersectionTypeNode(types.map(([typeName, moduleName]) => ts.factory.createImportTypeNode(
          ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(moduleName)),
          ts.factory.createIdentifier(typeName),
          undefined,
          false
        ))),
        undefined
      )],
      8388608
    )
  )
}
function declareChannel() {
  const types: string[] = ["TextChannel", "VoiceChannel"];
  return ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier("channel"),
        undefined,
        ts.factory.createIntersectionTypeNode(types.map((typeName) => ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier("Omit"),
          [
            ts.factory.createImportTypeNode(
              ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("discord.js")),
              ts.factory.createIdentifier(typeName),
              undefined,
              false
            ),
            ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("type"))
          ]
        ))),
        undefined
      )],
      8388608
    )
  )
}
function normalImport(token: string, moduleName: string) {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([ts.factory.createImportSpecifier(
        undefined,
        ts.factory.createIdentifier(token)
      )])
    ),
    ts.factory.createStringLiteral(moduleName)
  )
}
function asImport(token: string, moduleName: string) {
  return ts.factory.createImportDeclaration(
    undefined,
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamespaceImport(ts.factory.createIdentifier(token))
    ),
    ts.factory.createStringLiteral(moduleName)
  )

}
const rewriteRequire = <T extends ts.Node>(context: ts.TransformationContext) => (
  rootNode: T
) => {
  function visit(node: ts.Node): ts.Node | undefined {
    node = ts.visitEachChild(node, visit, context);
    if (!ts.isVariableStatement(node)) {
      return node;
    }
    const declarations = node.declarationList.declarations;
    if (declarations.length !== 1) {
      return node;
    }
    const vDecl = declarations[0];
    if (!vDecl.initializer || !ts.isCallExpression(vDecl.initializer)) {
      return node;
    }
    const expr = vDecl.initializer.expression;
    if (!ts.isIdentifier(expr) || expr.text !== "require") {
      return node;
    }
    const requireArgs = vDecl.initializer.arguments;
    if (requireArgs.length !== 1) {
      throw new Error();
    }
    const requireToken = requireArgs[0];
    if (!ts.isStringLiteral(requireToken)) {
      throw new Error();
    }
    if (ts.isIdentifier(vDecl.name)) {
      return ts.factory.createImportDeclaration(
        undefined,
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamespaceImport(vDecl.name)
        ),
        requireToken
      );
    }
    if (ts.isObjectBindingPattern(vDecl.name)) {
      const identifiers = vDecl.name.elements.map(e => {
        if (!ts.isIdentifier(e.name)) {
          throw new Error();
        } else {
          if (e.propertyName === undefined || ts.isIdentifier(e.propertyName)) {
            return [e.propertyName, e.name] as const;
          } else {
            throw new Error();
          }
        }
      });
      return ts.factory.createImportDeclaration(
        undefined,
        undefined,
        ts.factory.createImportClause(
          false,
          undefined,
          ts.factory.createNamedImports(identifiers.map(e => {
            return ts.factory.createImportSpecifier(
              ...e
            )
          }))
        ),
        requireToken
      );
    }
    throw new Error();
  }
  return ts.visitNode(rootNode, visit);
}
function createHost(options: ts.CompilerOptions, filename: string, sourceFile: ts.SourceFile) {
  const host = ts.createCompilerHost(options);

  const original_getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fn, ...args) => {
    return fn === filename ? sourceFile
      : original_getSourceFile(fn, ...args);
  };
  return host;
}
const defaultDeclares: Record<string, [ts.Statement]> = {
  client: [declareStatement("client", "Client", "discord.js")],
  message: [declareStatement("message", "Message", "discord.js")],
  user: [declareStatement("user", "User", "discord.js")],
  member: [declareStatement("member", "GuildMember", "discord.js")],
  guild: [declareStatement("guild", "Guild", "discord.js")],
  channel: [declareChannel()],
  Client: [normalImport("Client", "discord.js")],
  Intents: [normalImport("Intents", "discord.js")],
  TextChannel: [normalImport("TextChannel", "discord.js")],
  VoiceChannel: [normalImport("VoiceChannel", "discord.js")],
  NewsChannel: [normalImport("NewsChannel", "discord.js")],
  DMChannel: [normalImport("DMChannel", "discord.js")],
  Discord: [asImport("Discord", "discord.js")],
  discord: [asImport("discord", "discord.js")]
};
function warnMessageEventVisitorEnv(checker: ts.TypeChecker, rootNode: ts.Node) {
  let warn = false;
  function visit(node: ts.Node): ts.Node | undefined {
    node.forEachChild(visit);
    if (!ts.isCallExpression(node)) {
      return undefined;
    }
    if (node.arguments.length === 0 || !ts.isStringLiteral(node.arguments[0])) {
      return
    }
    if (node.arguments[0].text === "message") {
      warn = true;
    }
    return undefined;
  }
  ts.visitNode(rootNode, visit);
  return warn;
}
function compile(filename: string, src: string, options: ts.CompilerOptions) {
  const originalSourceFile = ts.createSourceFile(filename, src, ts.ScriptTarget.ESNext, undefined, ts.ScriptKind.TS);
  const result = ts.transform(originalSourceFile,
    [rewriteRequire]
  );
  let printer = ts.createPrinter();
  const assertedFile = printer.printFile(result.transformed[0] as ts.SourceFile);
  let sourceFile = ts.createSourceFile(filename, assertedFile, ts.ScriptTarget.ESNext, undefined, ts.ScriptKind.TS);
  let host = createHost(options, filename, sourceFile);
  let program = ts.createProgram({
    options,
    rootNames: [filename],
    host
  });
  const checker = program.getTypeChecker();
  const gSymbol = new Map<string, ts.Statement[]>();
  function visit(node: ts.Node): ts.Node | undefined {
    node.forEachChild(visit)
    if (!ts.isIdentifier(node)) {
      return;
    }

    const sym = checker.getSymbolAtLocation(node);

    if (sym?.declarations?.length === 1 || sym?.valueDeclaration) {
      return;
    }

    const defaultDeclare = defaultDeclares[node.text];
    if (defaultDeclare) {
      gSymbol.set(node.text, defaultDeclare);
    }
    return;
  }
  console.error(assertedFile);

  ts.visitNodes(sourceFile.statements, visit);


  printer = ts.createPrinter();
  const sourceFile2 = ts.factory.createSourceFile([...[...gSymbol.values()].flat()], sourceFile.endOfFileToken, sourceFile.flags);
  const declarations = printer.printNode(ts.EmitHint.SourceFile, sourceFile2, sourceFile2);
  console.error(declarations);
  sourceFile = ts.createSourceFile(filename, declarations + "\n" + assertedFile, ts.ScriptTarget.ES2021, undefined, ts.ScriptKind.TS);
  printer = ts.createPrinter();
  const injectedFile = printer.printFile(sourceFile);
  console.error(injectedFile);

  //sourceFile = ts.createSourceFile(filename, assertedFile, ts.ScriptTarget.ESNext, undefined, ts.ScriptKind.TS);
  host = createHost(options, filename, sourceFile);
  program = ts.createProgram({
    options,
    rootNames: [filename],
    host
  });
  const warnMessageEvent = warnMessageEventVisitorEnv(program.getTypeChecker(), sourceFile);

  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);
  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });
  return { allDiagnostics, injectedFile, warnMessageEvent };
}
export interface Source {
  title: string,
  source: string,
  filename: string,
}
export function check({
  title,
  source,
  filename,
}: Source) {
  try {
    const r = compile(filename, source, {
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ES2020,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      typeRoots: ["node_modules/@types"],
      types: ["node"]
    });
    const diagnostic = r.allDiagnostics.map(diagnostic => {
      if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
      } else {
        return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      }
    });
    if (r.warnMessageEvent) {
      diagnostic.push("used message Event");
    }
    return {
      diagnostic,
      title,
      source,
      assertedSource: r.injectedFile
    };
  } catch (err: unknown) {
    return {
      diagnostic: [inspect(err)],
      title,
      source,
      assertedSource: ""
    };
  }


}
