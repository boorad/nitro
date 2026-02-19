import type { SourceFile } from "../SourceFile.js";
import type { EnumType } from "../types/EnumType.js";
/**
 * Creates a Rust enum definition from a Nitro EnumType.
 *
 * Generates a `#[repr(i32)]` Rust enum with explicit discriminant values
 * matching the C++ enum class, enabling safe transmute at the FFI boundary.
 */
export declare function createRustEnum(enumType: EnumType): SourceFile;
