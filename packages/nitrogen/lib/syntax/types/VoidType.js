export class VoidType {
    get canBePassedByReference() {
        // It's void.
        return false;
    }
    get kind() {
        return 'void';
    }
    get isEquatable() {
        return true;
    }
    getCode(language) {
        switch (language) {
            case 'c++':
                return 'void';
            case 'swift':
                return 'Void';
            case 'kotlin':
                return 'Unit';
            case 'rust':
                return '()';
            default:
                throw new Error(`Language ${language} is not yet supported for VoidType!`);
        }
    }
    getExtraFiles() {
        return [];
    }
    getRequiredImports() {
        return [];
    }
}
