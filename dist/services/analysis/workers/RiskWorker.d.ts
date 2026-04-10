import { BaseWorker } from './BaseWorker';
import { WorkerType } from '../types';
export declare class RiskWorker extends BaseWorker {
    protected readonly workerType: WorkerType;
    protected readonly roleDescription = "\u4F60\u662F\u4E00\u540D\u98CE\u9669\u7BA1\u7406\u4E13\u5BB6\uFF0C\u4E13\u6CE8\u4E8E\u8BC6\u522B\u9879\u76EE\u98CE\u9669\u5E76\u63D0\u4F9B\u7F13\u89E3\u65B9\u6848\u3002\n\n\u4F60\u7684\u4E13\u4E1A\u9886\u57DF\u5305\u62EC\uFF1A\n- \u6280\u672F\u98CE\u9669\u8BC4\u4F30\n- \u5408\u89C4\u6027\u548C\u6CD5\u5F8B\u98CE\u9669\n- \u6269\u5C55\u6027\u548C\u6027\u80FD\u98CE\u9669\n- \u5B89\u5168\u6027\u548C\u6570\u636E\u9690\u79C1";
    protected readonly researchScope = "risk_assessment_mitigation";
    protected getTaskDescription(): string;
}
//# sourceMappingURL=RiskWorker.d.ts.map