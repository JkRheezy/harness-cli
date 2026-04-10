"use strict";
/**
 * Gap Analysis module exports
 * Provides components for analyzing gaps between specification and implementation
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
exports.TaskGenerator = exports.GapDetector = exports.CodeScanner = exports.SpecParser = exports.GapAnalysisEngine = void 0;
var GapAnalysisEngine_1 = require("./GapAnalysisEngine");
Object.defineProperty(exports, "GapAnalysisEngine", { enumerable: true, get: function () { return GapAnalysisEngine_1.GapAnalysisEngine; } });
var SpecParser_1 = require("./SpecParser");
Object.defineProperty(exports, "SpecParser", { enumerable: true, get: function () { return SpecParser_1.SpecParser; } });
var CodeScanner_1 = require("./CodeScanner");
Object.defineProperty(exports, "CodeScanner", { enumerable: true, get: function () { return CodeScanner_1.CodeScanner; } });
var GapDetector_1 = require("./GapDetector");
Object.defineProperty(exports, "GapDetector", { enumerable: true, get: function () { return GapDetector_1.GapDetector; } });
var TaskGenerator_1 = require("./TaskGenerator");
Object.defineProperty(exports, "TaskGenerator", { enumerable: true, get: function () { return TaskGenerator_1.TaskGenerator; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map