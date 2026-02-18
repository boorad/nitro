import { NitroConfig } from "../../config/NitroConfig.js";
import {
  createFileMetadataString,
  createRustFileMetadataString,
} from "../../syntax/helpers.js";
import type { SourceFile } from "../../syntax/SourceFile.js";

/**
 * Generates a `lib.rs` file that declares all generated Rust modules.
 * Also generates stub modules for any referenced but non-generated types
 * (e.g., external HybridObject traits, Promise).
 * This must be called after all Rust files have been collected.
 */
export function createRustLibRs(allFiles: SourceFile[]): SourceFile {
  const rustFiles = allFiles
    .filter((f) => f.language === "rust" && f.name.endsWith(".rs"))
    .map((f) => f.name.replace(".rs", ""))
    .filter((name) => name !== "lib");

  // Scan generated file content for `use super::X` or `use super::X::Y` imports
  // to find referenced modules that aren't generated
  const generatedModules = new Set(rustFiles);
  const referencedModules = new Set<string>();

  for (const file of allFiles) {
    if (file.language !== "rust" || !file.name.endsWith(".rs")) continue;
    const matches = file.content.matchAll(
      /use super::([a-zA-Z_][a-zA-Z0-9_]*)/g,
    );
    for (const match of matches) {
      const moduleName = match[1]!;
      if (!generatedModules.has(moduleName)) {
        referencedModules.add(moduleName);
      }
    }
  }

  const modDeclarations = rustFiles
    .map((name) => `pub mod ${name};`)
    .join("\n");

  // Generate stub modules for missing referenced types
  let stubs = "";
  if (referencedModules.size > 0) {
    const stubLines: string[] = [];
    stubLines.push("");
    stubLines.push("// Stub modules for externally referenced types.");
    stubLines.push(
      "// These are types referenced by the generated code but not implemented in Rust.",
    );
    stubLines.push(
      "// Replace these stubs with real implementations or external crate imports as needed.",
    );
    for (const moduleName of [...referencedModules].sort()) {
      if (moduleName === "Promise") {
        // Promise is a Nitro built-in type — provide a generic stub
        stubLines.push(
          `pub mod Promise { pub struct Promise<T>(pub std::marker::PhantomData<T>); }`,
        );
      } else if (moduleName.startsWith("Hybrid")) {
        // HybridObject trait stub
        const traitName = moduleName;
        stubLines.push(
          `pub mod ${moduleName} { pub trait ${traitName}: Send + Sync {} }`,
        );
      } else {
        // Unknown type — provide an empty module
        stubLines.push(`pub mod ${moduleName} { }`);
      }
    }
    stubs = stubLines.join("\n");
  }

  const code = `
${createRustFileMetadataString("lib.rs")}

${modDeclarations}
${stubs}
  `.trim();

  return {
    content: code,
    name: "lib.rs",
    subdirectory: [],
    language: "rust",
    platform: "shared",
  };
}

/**
 * Generates a `Cargo.toml` file for the generated Rust crate.
 */
export function createRustCargoToml(): SourceFile {
  const name = NitroConfig.current.getAndroidCxxLibName();
  const crateName = name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  const code = `
${createFileMetadataString("Cargo.toml", "#")}

[package]
name = "${crateName}_rust"
version = "0.1.0"
edition = "2021"

[lib]
path = "lib.rs"
crate-type = ["staticlib"]
  `.trim();

  return {
    content: code,
    name: "Cargo.toml",
    subdirectory: [],
    language: "rust",
    platform: "shared",
  };
}
