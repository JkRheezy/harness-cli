"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarnessStateAnnotation = void 0;
const langgraph_1 = require("@langchain/langgraph");
exports.HarnessStateAnnotation = langgraph_1.Annotation.Root({
    tasks: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => [] }),
    currentTaskId: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => null }),
    results: (0, langgraph_1.Annotation)({
        reducer: (c, u) => new Map([...c, ...u]),
        default: () => new Map()
    }),
    pendingReview: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => null }),
    reviewDecision: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => null }),
    abTestVariant: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => null }),
    abTestResults: (0, langgraph_1.Annotation)({
        reducer: (c, u) => new Map([...c, ...u]),
        default: () => new Map()
    }),
    config: (0, langgraph_1.Annotation)({
        reducer: (c, u) => u || c,
        default: () => ({ enableHumanReview: false, enableParallelExecution: false, enableABTesting: false, maxParallelAgents: 3, reviewTimeoutMs: 300000 })
    }),
    iterationCount: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => 0 }),
    startTime: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => Date.now() }),
    errors: (0, langgraph_1.Annotation)({ reducer: (c, u) => [...c, ...u], default: () => [] }),
    shouldStop: (0, langgraph_1.Annotation)({ reducer: (c, u) => u, default: () => false })
});
//# sourceMappingURL=state.js.map