import type { SourceImport } from "../SourceFile.js";
interface Props {
    /**
     * The name of the Hybrid Object under which it should be registered and exposed to JS to.
     */
    hybridObjectName: string;
    /**
     * The name of the Rust struct that implements the trait.
     * This struct must have a `new()` constructor.
     */
    rustClassName: string;
}
interface RustHybridObjectRegistration {
    cppCode: string;
    cppExternDeclarations: string;
    requiredImports: SourceImport[];
}
export declare function createRustHybridObjectRegistration({ hybridObjectName, rustClassName, }: Props): RustHybridObjectRegistration;
export {};
