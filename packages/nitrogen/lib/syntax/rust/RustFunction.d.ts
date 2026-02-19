import type { SourceFile } from "../SourceFile.js";
import type { FunctionType } from "../types/FunctionType.js";
/**
 * Creates a Rust type alias and FFI wrapper for a callback/function type.
 *
 * At the FFI boundary, callbacks are passed as a C function pointer + userdata pointer.
 * The Rust side wraps this into a safe closure.
 *
 * C++ side: `void(*callback)(void* userdata, Args...)` + `void* userdata`
 * Rust side: `Box<dyn Fn(Args...) -> ReturnType>`
 */
export declare function createRustFunction(funcType: FunctionType): SourceFile;
