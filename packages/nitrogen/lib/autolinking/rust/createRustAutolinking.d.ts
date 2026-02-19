import type { SourceFile } from "../../syntax/SourceFile.js";
/**
 * Generates a `NitroBuffer.rs` file that provides a zero-copy ArrayBuffer
 * type for use across the Rust/C++ FFI boundary.
 *
 * The C++ side creates a NitroBuffer with a pointer to the ArrayBuffer's data,
 * a handle to the shared_ptr, and a release function. Rust can read/write the
 * data directly without copying, and the C++ ArrayBuffer stays alive until
 * the NitroBuffer is dropped.
 */
export declare function createRustNitroBuffer(): SourceFile;
/**
 * Generates a `lib.rs` file that declares all generated Rust modules.
 * Also generates stub modules for any referenced but non-generated types
 * (e.g., external HybridObject traits).
 * This must be called after all Rust files have been collected.
 */
export declare function createRustLibRs(allFiles: SourceFile[]): SourceFile;
/**
 * Generates a `Cargo.toml` file for the generated Rust crate.
 */
export declare function createRustCargoToml(): SourceFile;
/**
 * Generates a `factory.rs` file with `create_HybridTSpec()` factory functions
 * and `impl HybridTSpec for UserStruct` delegation blocks for each
 * Rust-autolinked HybridObject.
 *
 * The delegation blocks bridge the user's implementation struct (which can't
 * directly implement the generated trait due to cross-crate restrictions)
 * to the generated trait by forwarding each method call.
 *
 * Returns `undefined` if there are no Rust-autolinked HybridObjects.
 */
export declare function createRustFactory(allFiles: SourceFile[]): SourceFile | undefined;
