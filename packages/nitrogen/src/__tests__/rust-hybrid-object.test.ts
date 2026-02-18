import { describe, test, expect } from "bun:test";
import { createRustHybridObject } from "../syntax/rust/RustHybridObject.js";
import { NitroConfig } from "../config/NitroConfig.js";
import { Method } from "../syntax/Method.js";
import { Property } from "../syntax/Property.js";
import { Parameter } from "../syntax/Parameter.js";
import { NumberType } from "../syntax/types/NumberType.js";
import { StringType } from "../syntax/types/StringType.js";

import { VoidType } from "../syntax/types/VoidType.js";
import { ArrayType } from "../syntax/types/ArrayType.js";
import { OptionalType } from "../syntax/types/OptionalType.js";
import { DateType } from "../syntax/types/DateType.js";
import type { HybridObjectSpec } from "../syntax/HybridObjectSpec.js";

// Create a mock NitroConfig for testing
const mockConfig = new NitroConfig({
  cxxNamespace: ["image"],
  ios: { iosModuleName: "NitroImage" },
  android: {
    androidNamespace: ["image"],
    androidCxxLibName: "NitroImage",
  },
  autolinking: {},
  gitAttributesGeneratedFlag: true,
});

function makeSpec(
  name: string,
  properties: Property[],
  methods: Method[],
): HybridObjectSpec {
  return {
    name,
    language: "rust",
    properties,
    methods,
    baseTypes: [],
    isHybridView: false,
    config: mockConfig,
  };
}

describe("Rust HybridObject Generator", () => {
  test("generates correct number of files", () => {
    const spec = makeSpec("Image", [], []);
    const files = createRustHybridObject(spec);
    expect(files).toHaveLength(4);
  });

  test("generates files with correct names", () => {
    const spec = makeSpec("Image", [], []);
    const files = createRustHybridObject(spec);
    const names = files.map((f) => f.name);
    expect(names).toContain("HybridImageSpec.rs");
    expect(names).toContain("HybridImageSpec_ffi.rs");
    expect(names).toContain("HybridImageSpecRust.hpp");
    expect(names).toContain("HybridImageSpecRust.cpp");
  });

  test("generates files with correct languages and platforms", () => {
    const spec = makeSpec("Image", [], []);
    const files = createRustHybridObject(spec);

    const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
    expect(traitFile.language).toBe("rust");
    expect(traitFile.platform).toBe("shared");

    const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
    expect(ffiFile.language).toBe("rust");
    expect(ffiFile.platform).toBe("shared");

    const hppFile = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
    expect(hppFile.language).toBe("c++");
    expect(hppFile.platform).toBe("shared");

    const cppFile = files.find((f) => f.name === "HybridImageSpecRust.cpp")!;
    expect(cppFile.language).toBe("c++");
    expect(cppFile.platform).toBe("shared");
  });

  describe("Rust trait file", () => {
    test("contains trait declaration", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(traitFile.content).toContain(
        "pub trait HybridImageSpec: Send + Sync",
      );
    });

    test("contains readonly property getter", () => {
      const spec = makeSpec(
        "Image",
        [new Property("width", new NumberType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(traitFile.content).toContain("fn get_width(&self) -> f64;");
    });

    test("contains read-write property getter and setter", () => {
      const spec = makeSpec(
        "Image",
        [new Property("name", new StringType(), false)],
        [],
      );
      const files = createRustHybridObject(spec);
      const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(traitFile.content).toContain("fn get_name(&self) -> String;");
      expect(traitFile.content).toContain(
        "fn set_name(&mut self, value: String);",
      );
    });

    test("contains method signatures", () => {
      const spec = makeSpec(
        "Image",
        [],
        [
          new Method("resize", new VoidType(), [
            new Parameter("width", new NumberType()),
            new Parameter("height", new NumberType()),
          ]),
        ],
      );
      const files = createRustHybridObject(spec);
      const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(traitFile.content).toContain(
        "fn resize(&mut self, width: f64, height: f64);",
      );
    });

    test("contains method with return type", () => {
      const spec = makeSpec(
        "Image",
        [],
        [new Method("getName", new StringType(), [])],
      );
      const files = createRustHybridObject(spec);
      const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(traitFile.content).toContain("fn get_name(&mut self) -> String;");
    });

    test("contains auto-generated header comment", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const traitFile = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(traitFile.content).toContain("DO NOT MODIFY");
    });
  });

  describe("Rust FFI shims file", () => {
    test("imports the trait", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffiFile.content).toContain("use super::HybridImageSpec;");
    });

    test("generates property getter shim", () => {
      const spec = makeSpec(
        "Image",
        [new Property("width", new NumberType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffiFile.content).toContain(
        'pub unsafe extern "C" fn HybridImageSpec_get_width',
      );
      expect(ffiFile.content).toContain("-> f64");
      expect(ffiFile.content).toContain("obj.get_width()");
    });

    test("generates property setter shim for non-readonly", () => {
      const spec = makeSpec(
        "Image",
        [new Property("name", new StringType(), false)],
        [],
      );
      const files = createRustHybridObject(spec);
      const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffiFile.content).toContain("HybridImageSpec_get_name");
      expect(ffiFile.content).toContain("HybridImageSpec_set_name");
    });

    test("does not generate setter shim for readonly", () => {
      const spec = makeSpec(
        "Image",
        [new Property("width", new NumberType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffiFile.content).toContain("HybridImageSpec_get_width");
      expect(ffiFile.content).not.toContain("HybridImageSpec_set_width");
    });

    test("generates method shim", () => {
      const spec = makeSpec(
        "Image",
        [],
        [
          new Method("resize", new VoidType(), [
            new Parameter("width", new NumberType()),
            new Parameter("height", new NumberType()),
          ]),
        ],
      );
      const files = createRustHybridObject(spec);
      const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffiFile.content).toContain(
        'pub unsafe extern "C" fn HybridImageSpec_resize',
      );
      expect(ffiFile.content).toContain("width: f64, height: f64");
      expect(ffiFile.content).toContain("obj.resize(width, height)");
    });

    test("generates destroy shim", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const ffiFile = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffiFile.content).toContain(
        'pub unsafe extern "C" fn HybridImageSpec_destroy',
      );
      expect(ffiFile.content).toContain("Box::from_raw");
    });
  });

  describe("C++ bridge header", () => {
    test("includes HybridImageSpec.hpp", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain('#include "HybridImageSpec.hpp"');
    });

    test('declares extern "C" functions', () => {
      const spec = makeSpec(
        "Image",
        [new Property("width", new NumberType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain('extern "C"');
      expect(hpp.content).toContain(
        "double HybridImageSpec_get_width(void* rustPtr)",
      );
      expect(hpp.content).toContain(
        "void HybridImageSpec_destroy(void* rustPtr)",
      );
    });

    test("inherits from HybridImageSpec", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain(
        "class HybridImageSpecRust: public virtual HybridImageSpec",
      );
    });

    test("has correct namespace", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain("namespace margelo::nitro::image");
    });

    test("has constructor taking void*", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain(
        "explicit HybridImageSpecRust(void* rustPtr)",
      );
    });

    test("destructor calls destroy", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain("~HybridImageSpecRust()");
      expect(hpp.content).toContain("HybridImageSpec_destroy(_rustPtr)");
    });

    test("generates property getter override", () => {
      const spec = makeSpec(
        "Image",
        [new Property("width", new NumberType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain("double getWidth() override");
      expect(hpp.content).toContain("HybridImageSpec_get_width(_rustPtr)");
    });

    test("generates method override", () => {
      const spec = makeSpec(
        "Image",
        [],
        [
          new Method("resize", new VoidType(), [
            new Parameter("width", new NumberType()),
            new Parameter("height", new NumberType()),
          ]),
        ],
      );
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain(
        "void resize(double width, double height) override",
      );
      expect(hpp.content).toContain(
        "HybridImageSpec_resize(_rustPtr, width, height)",
      );
    });
  });

  describe("C++ bridge implementation", () => {
    test("includes the header", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const cpp = files.find((f) => f.name === "HybridImageSpecRust.cpp")!;
      expect(cpp.content).toContain('#include "HybridImageSpecRust.hpp"');
    });

    test("has correct namespace", () => {
      const spec = makeSpec("Image", [], []);
      const files = createRustHybridObject(spec);
      const cpp = files.find((f) => f.name === "HybridImageSpecRust.cpp")!;
      expect(cpp.content).toContain("namespace margelo::nitro::image");
    });
  });

  describe("complex spec with multiple members", () => {
    test("handles mix of properties and methods", () => {
      const spec = makeSpec(
        "Image",
        [
          new Property("width", new NumberType(), true),
          new Property("height", new NumberType(), true),
          new Property("label", new StringType(), false),
        ],
        [
          new Method("resize", new VoidType(), [
            new Parameter("width", new NumberType()),
            new Parameter("height", new NumberType()),
          ]),
          new Method("toArray", new ArrayType(new NumberType()), []),
          new Method("getPixel", new OptionalType(new NumberType()), [
            new Parameter("x", new NumberType()),
            new Parameter("y", new NumberType()),
          ]),
        ],
      );
      const files = createRustHybridObject(spec);

      // Trait file
      const trait = files.find((f) => f.name === "HybridImageSpec.rs")!;
      expect(trait.content).toContain("fn get_width(&self) -> f64;");
      expect(trait.content).toContain("fn get_height(&self) -> f64;");
      expect(trait.content).toContain("fn get_label(&self) -> String;");
      expect(trait.content).toContain(
        "fn set_label(&mut self, value: String);",
      );
      expect(trait.content).toContain(
        "fn resize(&mut self, width: f64, height: f64);",
      );
      expect(trait.content).toContain("fn to_array(&mut self) -> Vec<f64>;");
      expect(trait.content).toContain(
        "fn get_pixel(&mut self, x: f64, y: f64) -> Option<f64>;",
      );

      // FFI file
      const ffi = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;
      expect(ffi.content).toContain("HybridImageSpec_get_width");
      expect(ffi.content).toContain("HybridImageSpec_get_height");
      expect(ffi.content).toContain("HybridImageSpec_get_label");
      expect(ffi.content).toContain("HybridImageSpec_set_label");
      expect(ffi.content).not.toContain("HybridImageSpec_set_width");
      expect(ffi.content).not.toContain("HybridImageSpec_set_height");
      expect(ffi.content).toContain("HybridImageSpec_resize");
      expect(ffi.content).toContain("HybridImageSpec_to_array");
      expect(ffi.content).toContain("HybridImageSpec_get_pixel");
      expect(ffi.content).toContain("HybridImageSpec_destroy");

      // C++ bridge
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;
      expect(hpp.content).toContain("double getWidth() override");
      expect(hpp.content).toContain("double getHeight() override");
    });
  });

  describe("FFI bridging for string types", () => {
    test("string property uses const char* at FFI boundary in C++ bridge", () => {
      const spec = makeSpec(
        "Image",
        [new Property("name", new StringType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;

      // extern "C" should use const char* not std::string
      expect(hpp.content).toContain(
        "const char* HybridImageSpec_get_name(void* rustPtr)",
      );
      // C++ method should convert const char* back to std::string
      expect(hpp.content).toContain("std::string getName() override");
      expect(hpp.content).toContain("std::string(");
    });

    test("string property uses *const c_char at FFI boundary in Rust shims", () => {
      const spec = makeSpec(
        "Image",
        [new Property("name", new StringType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const ffi = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;

      // FFI shim should use *const c_char return type
      expect(ffi.content).toContain("*const std::ffi::c_char");
      // Should convert String to CString
      expect(ffi.content).toContain("CString::new");
      expect(ffi.content).toContain("into_raw");
    });

    test("string method parameter uses const char* at FFI boundary", () => {
      const spec = makeSpec(
        "Image",
        [],
        [
          new Method("setName", new VoidType(), [
            new Parameter("name", new StringType()),
          ]),
        ],
      );
      const files = createRustHybridObject(spec);
      const ffi = files.find((f) => f.name === "HybridImageSpec_ffi.rs")!;

      // FFI shim should receive *const c_char
      expect(ffi.content).toContain("name: *const std::ffi::c_char");
      // Should convert c_char to String for the trait call
      expect(ffi.content).toContain("CStr::from_ptr");
      expect(ffi.content).toContain("to_string_lossy");
    });

    test("string method return uses const char* at FFI boundary in C++ bridge", () => {
      const spec = makeSpec(
        "Image",
        [],
        [new Method("getName", new StringType(), [])],
      );
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;

      // extern "C" should return const char*
      expect(hpp.content).toContain(
        "const char* HybridImageSpec_get_name(void* rustPtr)",
      );
      // C++ method should return std::string
      expect(hpp.content).toContain("std::string getName(");
    });
  });

  describe("FFI bridging for date types", () => {
    test("date property uses double at FFI boundary", () => {
      const spec = makeSpec(
        "Image",
        [new Property("createdAt", new DateType(), true)],
        [],
      );
      const files = createRustHybridObject(spec);
      const hpp = files.find((f) => f.name === "HybridImageSpecRust.hpp")!;

      // extern "C" should use double for dates
      expect(hpp.content).toContain(
        "double HybridImageSpec_get_created_at(void* rustPtr)",
      );
    });
  });
});
