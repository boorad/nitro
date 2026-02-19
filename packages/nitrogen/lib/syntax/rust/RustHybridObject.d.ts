import type { SourceFile } from "../SourceFile.js";
import type { HybridObjectSpec } from "../HybridObjectSpec.js";
/**
 * Creates the Rust trait definition and FFI shim functions for a HybridObject,
 * plus the C++ bridge class that calls into Rust via extern "C".
 */
export declare function createRustHybridObject(spec: HybridObjectSpec): SourceFile[];
