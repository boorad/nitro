import { Platform } from 'react-native';
// TODO: Migrate to the official export of `NativeComponentRegistry` from `react-native` once react-native 0.83.0 becomes more established
// eslint-disable-next-line @react-native/no-deep-imports
import * as NativeComponentRegistry from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';
function typesafe(config) {
    // TODO: Remove this unsafe cast and make it safe
    return config;
}
/**
 * Wraps all valid attributes of {@linkcode TProps} using Nitro's
 * default `diff` and `process` functions.
 */
function wrapValidAttributes(attributes) {
    const keys = Object.keys(attributes);
    for (const key of keys) {
        attributes[key] = {
            diff: (a, b) => a !== b,
            process: (i) => i,
        };
    }
    return attributes;
}
/**
 * Finds and returns a native view (aka "HostComponent") via the given {@linkcode name}.
 *
 * The view is bridged to a native Hybrid Object using Nitro Views.
 */
export function getHostComponent(name, getViewConfig) {
    if (NativeComponentRegistry == null) {
        throw new Error(`NativeComponentRegistry is not available on ${Platform.OS}!`);
    }
    return NativeComponentRegistry.get(name, () => {
        const config = getViewConfig();
        config.validAttributes = wrapValidAttributes(config.validAttributes);
        return typesafe(config);
    });
}
export function callback(func) {
    if (typeof func === 'function') {
        return { f: func };
    }
    return func;
}
