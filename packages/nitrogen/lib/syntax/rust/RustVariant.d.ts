import type { SourceFile } from "../SourceFile.js";
import type { VariantType } from "../types/VariantType.js";
/**
 * Creates a Rust enum (tagged union) from a Nitro VariantType.
 *
 * TypeScript `A | B | C` becomes Rust `enum Variant_A_B_C { First(A), Second(B), Third(C) }`.
 * Each case holds its associated data.
 */
export declare function createRustVariant(variant: VariantType): SourceFile;
