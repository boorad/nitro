import { NitroConfig } from "../../config/NitroConfig.js";
import { createFileMetadataString, createRustFileMetadataString, } from "../../syntax/helpers.js";
/**
 * Generates a `NitroBuffer.rs` file that provides a zero-copy ArrayBuffer
 * type for use across the Rust/C++ FFI boundary.
 *
 * The C++ side creates a NitroBuffer with a pointer to the ArrayBuffer's data,
 * a handle to the shared_ptr, and a release function. Rust can read/write the
 * data directly without copying, and the C++ ArrayBuffer stays alive until
 * the NitroBuffer is dropped.
 */
export function createRustNitroBuffer() {
    const code = `
${createRustFileMetadataString("NitroBuffer.rs")}

use std::ffi::c_void;

/// A zero-copy buffer type for passing ArrayBuffer data across the FFI boundary.
///
/// On the C++ side, a \`NitroBuffer\` is created from a \`shared_ptr<ArrayBuffer>\`:
/// - \`data\` points directly to the ArrayBuffer's memory
/// - \`len\` is the byte length
/// - \`handle\` is an opaque pointer to the boxed \`shared_ptr\` (prevents deallocation)
/// - \`release_fn\` frees the \`handle\` when the NitroBuffer is dropped
///
/// On the Rust side, you can access the data as a slice without copying.
/// If you need an owned \`Vec<u8>\`, use \`to_vec()\` which will copy.
#[repr(C)]
pub struct NitroBuffer {
    data: *mut u8,
    len: usize,
    handle: *mut c_void,
    release_fn: unsafe extern "C" fn(*mut c_void),
}

// SAFETY: NitroBuffer owns its handle and the C++ shared_ptr it points to
// is thread-safe (reference counting is atomic). The data pointer remains
// valid as long as the handle is alive.
unsafe impl Send for NitroBuffer {}
unsafe impl Sync for NitroBuffer {}

impl NitroBuffer {
    /// Create a NitroBuffer that takes ownership of a Vec<u8>.
    pub fn from_vec(mut vec: Vec<u8>) -> Self {
        let data = vec.as_mut_ptr();
        let len = vec.len();
        let handle = Box::into_raw(Box::new(vec)) as *mut c_void;

        unsafe extern "C" fn release_vec(handle: *mut c_void) {
            unsafe { drop(Box::from_raw(handle as *mut Vec<u8>)); }
        }

        NitroBuffer {
            data,
            len,
            handle,
            release_fn: release_vec,
        }
    }

    /// Get an immutable slice of the buffer's data.
    ///
    /// # Safety
    /// The caller must ensure this NitroBuffer has not been dropped
    /// and the data pointer is still valid.
    pub unsafe fn as_slice(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.data, self.len) }
    }

    /// Get a mutable slice of the buffer's data.
    ///
    /// # Safety
    /// The caller must ensure this NitroBuffer has not been dropped,
    /// the data pointer is still valid, and there are no other references
    /// to this data.
    pub unsafe fn as_mut_slice(&mut self) -> &mut [u8] {
        unsafe { std::slice::from_raw_parts_mut(self.data, self.len) }
    }

    /// Copy the buffer's data into a new owned Vec<u8>.
    pub fn to_vec(&self) -> Vec<u8> {
        unsafe { self.as_slice().to_vec() }
    }

    /// Get the length of the buffer in bytes.
    pub fn len(&self) -> usize {
        self.len
    }

    /// Check if the buffer is empty.
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Get a raw pointer to the buffer's data.
    pub fn as_ptr(&self) -> *const u8 {
        self.data
    }

    /// Get a mutable raw pointer to the buffer's data.
    pub fn as_mut_ptr(&mut self) -> *mut u8 {
        self.data
    }
}

impl Drop for NitroBuffer {
    fn drop(&mut self) {
        unsafe {
            (self.release_fn)(self.handle);
        }
    }
}
`.trim();
    return {
        content: code,
        name: "NitroBuffer.rs",
        subdirectory: [],
        language: "rust",
        platform: "shared",
    };
}
/**
 * Generates a `lib.rs` file that declares all generated Rust modules.
 * Also generates stub modules for any referenced but non-generated types
 * (e.g., external HybridObject traits).
 * This must be called after all Rust files have been collected.
 */
export function createRustLibRs(allFiles) {
    const rustFiles = allFiles
        .filter((f) => f.language === "rust" && f.name.endsWith(".rs"))
        .map((f) => f.name.replace(".rs", ""))
        .filter((name) => name !== "lib");
    // Scan generated file content for `use super::X` or `use super::X::Y` imports
    // to find referenced modules that aren't generated
    const generatedModules = new Set(rustFiles);
    const referencedModules = new Set();
    for (const file of allFiles) {
        if (file.language !== "rust" || !file.name.endsWith(".rs"))
            continue;
        const matches = file.content.matchAll(/use super::([a-zA-Z_][a-zA-Z0-9_]*)/g);
        for (const match of matches) {
            const moduleName = match[1];
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
        const stubLines = [];
        stubLines.push("");
        stubLines.push("// Stub modules for externally referenced types.");
        stubLines.push("// These are types referenced by the generated code but not implemented in Rust.");
        stubLines.push("// Replace these stubs with real implementations or external crate imports as needed.");
        for (const moduleName of [...referencedModules].sort()) {
            if (moduleName === "Promise") {
                // Promise is a Nitro built-in type — provide a generic stub
                stubLines.push(`pub mod Promise { pub struct Promise<T>(pub std::marker::PhantomData<T>); }`);
            }
            else if (moduleName.startsWith("Hybrid")) {
                // HybridObject trait stub
                const traitName = moduleName;
                stubLines.push(`pub mod ${moduleName} { pub trait ${traitName}: Send + Sync {} }`);
            }
            else {
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
export function createRustCargoToml() {
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
