import type { Language } from "../../getPlatformSpecs.js";
import type { BridgedType } from "../BridgedType.js";
import { getReferencedTypes } from "../getReferencedTypes.js";
import type { SourceFile, SourceImport } from "../SourceFile.js";
import { EnumType } from "../types/EnumType.js";
import { getTypeAs } from "../types/getTypeAs.js";
import { StructType } from "../types/StructType.js";
import type { Type } from "../types/Type.js";
import { createRustEnum } from "./RustEnum.js";
import { createRustStruct } from "./RustStruct.js";

/**
 * Bridges types between Rust and C++ across the `extern "C"` FFI boundary.
 *
 * At the FFI boundary, only C-compatible types can cross:
 * - Primitives (f64, bool, i64, u64, i32) pass directly
 * - Strings become *const c_char
 * - Enums pass as i32 discriminants
 * - Complex types (arrays, optionals, etc.) pass as opaque void* pointers
 */
export class RustCxxBridgedType implements BridgedType<"rust", "c++"> {
  readonly type: Type;

  constructor(type: Type) {
    this.type = type;
  }

  get hasType(): boolean {
    return this.type.kind !== "void" && this.type.kind !== "null";
  }

  get canBePassedByReference(): boolean {
    return this.type.canBePassedByReference;
  }

  get needsSpecialHandling(): boolean {
    switch (this.type.kind) {
      case "string":
        return true;
      case "array":
        return true;
      case "optional":
        return true;
      case "record":
        return true;
      case "enum":
        return true;
      case "struct":
        return true;
      case "variant":
        return true;
      case "function":
        return true;
      case "hybrid-object":
        return true;
      case "promise":
        return true;
      case "array-buffer":
        return true;
      case "date":
        return true;
      case "error":
        return true;
      case "map":
        return true;
      case "tuple":
        return true;
      default:
        return false;
    }
  }

  getRequiredImports(language: Language): SourceImport[] {
    const imports = this.type.getRequiredImports(language);

    const referencedTypes = getReferencedTypes(this.type);
    for (const t of referencedTypes) {
      if (t === this.type) continue;
      const bridged = new RustCxxBridgedType(t);
      imports.push(...bridged.getRequiredImports(language));
    }

    return imports;
  }

  getExtraFiles(): SourceFile[] {
    const files: SourceFile[] = [];

    switch (this.type.kind) {
      case "enum": {
        const enumType = getTypeAs(this.type, EnumType);
        files.push(createRustEnum(enumType));
        break;
      }
      case "struct": {
        const structType = getTypeAs(this.type, StructType);
        files.push(
          createRustStruct(structType.structName, structType.properties),
        );
        break;
      }
    }

    // Recursively collect extra files from referenced types
    const referencedTypes = getReferencedTypes(this.type);
    for (const t of referencedTypes) {
      if (t === this.type) continue;
      const bridged = new RustCxxBridgedType(t);
      files.push(...bridged.getExtraFiles());
    }

    return files;
  }

  /**
   * Returns the type as it appears at the FFI boundary.
   * For C++, this is the C-compatible type used in `extern "C"` declarations.
   * For Rust, this is the C-compatible type used in `extern "C" fn` declarations.
   */
  getTypeCode(language: "rust" | "c++"): string {
    switch (this.type.kind) {
      case "void":
        return language === "c++" ? "void" : "()";
      case "null":
        return language === "c++" ? "void" : "()";
      case "number":
        return language === "c++" ? "double" : "f64";
      case "boolean":
        return language === "c++" ? "bool" : "bool";
      case "int64":
        return language === "c++" ? "int64_t" : "i64";
      case "uint64":
        return language === "c++" ? "uint64_t" : "u64";
      case "string":
        return language === "c++" ? "const char*" : "*const std::ffi::c_char";
      case "enum":
        return language === "c++" ? "int32_t" : "i32";
      case "date":
        return language === "c++" ? "double" : "f64";
      case "error":
        return language === "c++" ? "const char*" : "*const std::ffi::c_char";
      case "hybrid-object":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "array-buffer":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "array":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "optional":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "record":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "struct":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "variant":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "tuple":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "function":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "promise":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      case "map":
        return language === "c++" ? "void*" : "*mut std::ffi::c_void";
      default:
        return this.type.getCode(language);
    }
  }

  /**
   * Generates code to convert a value from one language to the other at the FFI boundary.
   */
  parse(
    parameterName: string,
    from: "c++" | "rust",
    to: "rust" | "c++",
    inLanguage: "rust" | "c++",
  ): string {
    if (from === "c++" && to === "rust") {
      return this.parseFromCppToRust(parameterName, inLanguage);
    } else if (from === "rust" && to === "c++") {
      return this.parseFromRustToCpp(parameterName, inLanguage);
    } else {
      throw new Error(`Cannot parse from ${from} to ${to}!`);
    }
  }

  /**
   * Convert a value from C++ representation to Rust representation.
   * The `inLanguage` parameter indicates which language the conversion code runs in.
   */
  parseFromCppToRust(
    parameterName: string,
    inLanguage: "rust" | "c++",
  ): string {
    switch (this.type.kind) {
      case "string":
        switch (inLanguage) {
          case "rust":
            return `std::ffi::CStr::from_ptr(${parameterName}).to_string_lossy().into_owned()`;
          case "c++":
            return `${parameterName}.c_str()`;
          default:
            return parameterName;
        }
      case "enum": {
        const enumType = getTypeAs(this.type, EnumType);
        switch (inLanguage) {
          case "rust":
            return `${enumType.enumName}::from_i32(${parameterName}).unwrap()`;
          case "c++":
            return `static_cast<int32_t>(${parameterName})`;
          default:
            return parameterName;
        }
      }
      case "date":
        switch (inLanguage) {
          case "c++":
            return `std::chrono::duration<double, std::milli>(${parameterName}.time_since_epoch()).count()`;
          case "rust":
            return parameterName;
          default:
            return parameterName;
        }
      case "error":
        switch (inLanguage) {
          case "rust":
            return `std::ffi::CStr::from_ptr(${parameterName}).to_string_lossy().into_owned()`;
          case "c++":
            return `[&]() -> const char* { try { std::rethrow_exception(${parameterName}); } catch (const std::exception& e) { return e.what(); } catch (...) { return "unknown error"; } }()`;
          default:
            return parameterName;
        }
      case "void":
      case "null":
        return "";
      default:
        return parameterName;
    }
  }

  /**
   * Convert a value from Rust representation to C++ representation.
   * The `inLanguage` parameter indicates which language the conversion code runs in.
   */
  parseFromRustToCpp(
    parameterName: string,
    inLanguage: "rust" | "c++",
  ): string {
    switch (this.type.kind) {
      case "string":
        switch (inLanguage) {
          case "rust":
            return `std::ffi::CString::new(${parameterName}).unwrap().into_raw()`;
          case "c++":
            return `std::string(${parameterName})`;
          default:
            return parameterName;
        }
      case "enum":
        switch (inLanguage) {
          case "rust":
            return `${parameterName} as i32`;
          case "c++":
            return `static_cast<${this.type.getCode("c++")}>(${parameterName})`;
          default:
            return parameterName;
        }
      case "date":
        switch (inLanguage) {
          case "rust":
            return parameterName;
          case "c++":
            return `std::chrono::system_clock::time_point(std::chrono::duration_cast<std::chrono::system_clock::duration>(std::chrono::duration<double, std::milli>(${parameterName})))`;
          default:
            return parameterName;
        }
      case "error":
        switch (inLanguage) {
          case "rust":
            return `std::ffi::CString::new(${parameterName}).unwrap().into_raw()`;
          case "c++":
            return `std::make_exception_ptr(std::runtime_error(${parameterName}))`;
          default:
            return parameterName;
        }
      case "void":
      case "null":
        return "";
      default:
        return parameterName;
    }
  }

  /**
   * Returns the Rust FFI type that crosses the extern "C" boundary.
   */
  getRustFfiType(): string {
    return this.getTypeCode("rust");
  }

  /**
   * Returns the C++ FFI type that crosses the extern "C" boundary.
   */
  getCppFfiType(): string {
    return this.getTypeCode("c++");
  }
}
