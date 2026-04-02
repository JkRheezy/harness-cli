"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewDecision = exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["WAITING_REVIEW"] = "waiting_review";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var ReviewDecision;
(function (ReviewDecision) {
    ReviewDecision["APPROVE"] = "approve";
    ReviewDecision["REJECT"] = "reject";
    ReviewDecision["MODIFY"] = "modify";
})(ReviewDecision || (exports.ReviewDecision = ReviewDecision = {}));
//# sourceMappingURL=orchestration.js.map