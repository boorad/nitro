import type { SourceFile } from "../SourceFile.js";
import type { NamedType } from "../types/Type.js";
/**
 * Creates a Rust struct definition from a Nitro StructType's properties.
 *
 * Generates a Rust struct with `#[repr(C)]` for FFI compatibility,
 * plus derived traits for common operations.
 */
export declare function createRustStruct(structName: string, properties: NamedType[]): SourceFile;
