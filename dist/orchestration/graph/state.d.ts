import { Task } from '../../core/TaskQueue';
import { TaskResult, PendingReview, ReviewDecision, OrchestrationConfig } from '../../types/orchestration';
export declare const HarnessStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    tasks: import("@langchain/langgraph").BinaryOperatorAggregate<Task[], Task[]>;
    currentTaskId: import("@langchain/langgraph").BinaryOperatorAggregate<string | null, string | null>;
    results: import("@langchain/langgraph").BinaryOperatorAggregate<Map<string, TaskResult>, Map<string, TaskResult>>;
    pendingReview: import("@langchain/langgraph").BinaryOperatorAggregate<PendingReview | null, PendingReview | null>;
    reviewDecision: import("@langchain/langgraph").BinaryOperatorAggregate<ReviewDecision | null, ReviewDecision | null>;
    abTestVariant: import("@langchain/langgraph").BinaryOperatorAggregate<"A" | "B" | null, "A" | "B" | null>;
    abTestResults: import("@langchain/langgraph").BinaryOperatorAggregate<Map<string, TaskResult>, Map<string, TaskResult>>;
    config: import("@langchain/langgraph").BinaryOperatorAggregate<OrchestrationConfig, OrchestrationConfig>;
    iterationCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    startTime: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    errors: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    shouldStop: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
}>;
export type HarnessStateType = typeof HarnessStateAnnotation.State;
//# sourceMappingURL=state.d.ts.map