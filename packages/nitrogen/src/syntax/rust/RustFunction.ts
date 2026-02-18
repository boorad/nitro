import type { SourceFile } from "../SourceFile.js";
import { createFileMetadataString } from "../helpers.js";
import type { FunctionType } from "../types/FunctionType.js";
import { RustCxxBridgedType } from "./RustCxxBridgedType.js";

/**
 * Creates a Rust type alias and FFI wrapper for a callback/function type.
 *
 * At the FFI boundary, callbacks are passed as a C function pointer + userdata pointer.
 * The Rust side wraps this into a safe closure.
 *
 * C++ side: `void(*callback)(void* userdata, Args...)` + `void* userdata`
 * Rust side: `Box<dyn Fn(Args...) -> ReturnType>`
 */
export function createRustFunction(funcType: FunctionType): SourceFile {
  const name = funcType.specializationName;

  // FFI parameter types (C-compatible)
  const ffiParams = funcType.parameters.map((p) => {
    const bridged = new RustCxxBridgedType(p);
    return bridged.getRustFfiType();
  });

  // FFI return type
  const returnBridged = new RustCxxBridgedType(funcType.returnType);
  const ffiReturnType = returnBridged.getRustFfiType();
  const ffiReturnSuffix = ffiReturnType === "()" ? "" : ` -> ${ffiReturnType}`;

  // The C function pointer type: fn(userdata, args...) -> ret
  const ffiParamsWithUserdata = ["*mut std::ffi::c_void", ...ffiParams].join(
    ", ",
  );
  const cFnType = `unsafe extern "C" fn(${ffiParamsWithUserdata})${ffiReturnSuffix}`;

  // Native Rust parameter types
  const rustParams = funcType.parameters.map((p) => p.getCode("rust"));
  const rustReturnType = funcType.returnType.getCode("rust");
  const rustReturnSuffix =
    rustReturnType === "()" ? "" : ` -> ${rustReturnType}`;

  // Build the wrapper struct
  const wrapperFields = `    fn_ptr: ${cFnType},\n    userdata: *mut std::ffi::c_void,`;

  // Build the call() implementation
  const callFfiArgs = funcType.parameters.map((p, i) => {
    const bridged = new RustCxxBridgedType(p);
    const argName = `arg${i}`;
    if (bridged.needsSpecialHandling) {
      return bridged.parseFromRustToCpp(argName, "rust");
    }
    return argName;
  });
  const ffiCallArgs = ["self.userdata", ...callFfiArgs].join(", ");

  let callBody: string;
  if (returnBridged.needsSpecialHandling) {
    const resultConversion = returnBridged.parseFromCppToRust(
      "__result",
      "rust",
    );
    callBody = `        let __result = (self.fn_ptr)(${ffiCallArgs});\n        ${resultConversion}`;
  } else if (rustReturnType === "()") {
    callBody = `        (self.fn_ptr)(${ffiCallArgs});`;
  } else {
    callBody = `        (self.fn_ptr)(${ffiCallArgs})`;
  }

  const callParams = funcType.parameters
    .map((p, i) => `${p.escapedName}: ${rustParams[i]}`)
    .join(", ");

  const code = `
${createFileMetadataString(`${name}.rs`)}

use std::ffi;

/// FFI-safe wrapper for callback \`${name}\`.
///
/// Wraps a C function pointer + userdata into a callable Rust struct.
/// The C++ side passes a function pointer and opaque userdata;
/// the Rust side can call it safely through this wrapper.
#[repr(C)]
pub struct ${name} {
${wrapperFields}
}

// Safety: The C++ side guarantees the function pointer and userdata
// are valid for the lifetime of this struct and are thread-safe.
unsafe impl Send for ${name} {}
unsafe impl Sync for ${name} {}

impl ${name} {
    /// Create a new wrapper from a C function pointer and userdata.
    pub fn new(fn_ptr: ${cFnType}, userdata: *mut ffi::c_void) -> Self {
        Self { fn_ptr, userdata }
    }

    /// Call the wrapped function.
    pub unsafe fn call(&self, ${callParams})${rustReturnSuffix} {
${callBody}
    }
}
`.trim();

  return {
    content: code,
    name: `${name}.rs`,
    subdirectory: [],
    language: "rust",
    platform: "shared",
  };
}
