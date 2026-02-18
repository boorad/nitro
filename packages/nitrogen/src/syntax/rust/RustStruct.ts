import type { SourceFile } from '../SourceFile.js'
import { createFileMetadataString, toSnakeCase } from '../helpers.js'
import type { NamedType } from '../types/Type.js'

/**
 * Creates a Rust struct definition from a Nitro StructType's properties.
 *
 * Generates a Rust struct with `#[repr(C)]` for FFI compatibility,
 * plus derived traits for common operations.
 */
export function createRustStruct(
  structName: string,
  properties: NamedType[]
): SourceFile {
  const fields = properties
    .map((p) => {
      const rustFieldName = toSnakeCase(p.name)
      const rustType = p.getCode('rust')
      return `pub ${rustFieldName}: ${rustType},`
    })
    .join('\n')

  const code = `
${createFileMetadataString(`${structName}.rs`)}

/// Struct \`${structName}\` — auto-generated from TypeScript.
#[derive(Debug, Clone)]
#[repr(C)]
pub struct ${structName} {
    ${fields}
}
`.trim()

  return {
    content: code,
    name: `${structName}.rs`,
    subdirectory: [],
    language: 'rust',
    platform: 'shared',
  }
}
