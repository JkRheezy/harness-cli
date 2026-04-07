"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCategory = exports.HealingLevel = void 0;
var HealingLevel;
(function (HealingLevel) {
    HealingLevel[HealingLevel["CODE"] = 1] = "CODE";
    HealingLevel[HealingLevel["LLM"] = 2] = "LLM";
    HealingLevel[HealingLevel["HUMAN"] = 3] = "HUMAN"; // Escalation, manual intervention
})(HealingLevel || (exports.HealingLevel = HealingLevel = {}));
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["CONFIG_MISSING"] = "config_missing";
    ErrorCategory["DEPENDENCY_MISSING"] = "dependency_missing";
    ErrorCategory["COMMAND_NOT_FOUND"] = "command_not_found";
    ErrorCategory["BUILD_ERROR"] = "build_error";
    ErrorCategory["TEST_FAILURE"] = "test_failure";
    ErrorCategory["LINT_ERROR"] = "lint_error";
    ErrorCategory["TIMEOUT"] = "timeout";
    ErrorCategory["NETWORK_ERROR"] = "network_error";
    ErrorCategory["UNKNOWN"] = "unknown";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
//# sourceMappingURL=types.js.map