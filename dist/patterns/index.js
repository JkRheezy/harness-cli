"use strict";
/**
 * Patterns Module
 *
 * Pattern overlay system for extending the six-layer foundation architecture.
 * Patterns provide reusable architectural extensions like multi-agent systems.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternRegistry = exports.PatternRegistry = exports.MultiAgentPattern = exports.BasePatternApplier = void 0;
// Export types
__exportStar(require("./types"), exports);
// Export pattern appliers
var PatternApplier_1 = require("./PatternApplier");
Object.defineProperty(exports, "BasePatternApplier", { enumerable: true, get: function () { return PatternApplier_1.BasePatternApplier; } });
var MultiAgentPattern_1 = require("./MultiAgentPattern");
Object.defineProperty(exports, "MultiAgentPattern", { enumerable: true, get: function () { return MultiAgentPattern_1.MultiAgentPattern; } });
// Export registry
var PatternRegistry_1 = require("./PatternRegistry");
Object.defineProperty(exports, "PatternRegistry", { enumerable: true, get: function () { return PatternRegistry_1.PatternRegistry; } });
Object.defineProperty(exports, "patternRegistry", { enumerable: true, get: function () { return PatternRegistry_1.patternRegistry; } });
//# sourceMappingURL=index.js.map