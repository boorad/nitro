import type { Language } from "../../getPlatformSpecs.js";
import type { BridgedType } from "../BridgedType.js";
import type { SourceFile, SourceImport } from "../SourceFile.js";
import type { Type } from "../types/Type.js";
/**
 * Bridges types between Rust and C++ across the `extern "C"` FFI boundary.
 *
 * At the FFI boundary, only C-compatible types can cross:
 * - Primitives (f64, bool, i64, u64, i32) pass directly
 * - Strings become *const c_char
 * - Enums pass as i32 discriminants
 * - Complex types (arrays, optionals, structs, etc.) pass as opaque void* pointers
 */
export declare class RustCxxBridgedType implements BridgedType<"rust", "c++"> {
    readonly type: Type;
    constructor(type: Type);
    get hasType(): boolean;
    get canBePassedByReference(): boolean;
    get needsSpecialHandling(): boolean;
    getRequiredImports(language: Language): SourceImport[];
    getExtraFiles(): SourceFile[];
    /**
     * Returns the type as it appears at the FFI boundary.
     */
    getTypeCode(language: "rust" | "c++"): string;
    /**
     * Generates code to convert a value from one language to the other at the FFI boundary.
     */
    parse(parameterName: string, from: "c++" | "rust", to: "rust" | "c++", inLanguage: "rust" | "c++"): string;
    /**
     * Convert a value from C++ representation to Rust representation.
     */
    parseFromCppToRust(parameterName: string, inLanguage: "rust" | "c++"): string;
    /**
     * Convert a value from Rust representation to C++ representation.
     */
    parseFromRustToCpp(parameterName: string, inLanguage: "rust" | "c++"): string;
    /**
     * Returns the Rust FFI type that crosses the extern "C" boundary.
     */
    getRustFfiType(): string;
    /**
     * Returns the C++ FFI type that crosses the extern "C" boundary.
     */
    getCppFfiType(): string;
}
