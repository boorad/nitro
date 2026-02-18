import type { SourceFile } from '../SourceFile.js'
import { createFileMetadataString } from '../helpers.js'
import type { VariantType } from '../types/VariantType.js'

/**
 * Creates a Rust enum (tagged union) from a Nitro VariantType.
 *
 * TypeScript `A | B | C` becomes Rust `enum Variant_A_B_C { First(A), Second(B), Third(C) }`.
 * Each case holds its associated data.
 */
export function createRustVariant(variant: VariantType): SourceFile {
  const aliasName = variant.getAliasName('rust')

  const cases = variant.cases
    .map(([label, type]) => {
      const rustType = type.getCode('rust')
      const caseName = label.charAt(0).toUpperCase() + label.slice(1)
      return `${caseName}(${rustType}),`
    })
    .join('\n')

  const code = `
${createFileMetadataString(`${aliasName}.rs`)}

/// Tagged union \`${aliasName}\` — auto-generated from TypeScript.
#[derive(Debug, Clone)]
pub enum ${aliasName} {
    ${cases}
}
`.trim()

  return {
    content: code,
    name: `${aliasName}.rs`,
    subdirectory: [],
    language: 'rust',
    platform: 'shared',
  }
}
