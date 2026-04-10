import { BaseWorker } from './BaseWorker';
import { WorkerType } from '../types';
export declare class TechWorker extends BaseWorker {
    protected readonly workerType: WorkerType;
    protected readonly roleDescription = "\u4F60\u662F\u4E00\u540D\u6280\u672F\u67B6\u6784\u5E08\uFF0C\u4E13\u6CE8\u4E8E\u6280\u672F\u9009\u578B\u3001\u67B6\u6784\u8BBE\u8BA1\u548C\u9879\u76EE\u7ED3\u6784\u89C4\u5212\u3002\n\n\u4F60\u7684\u4E13\u4E1A\u9886\u57DF\u5305\u62EC\uFF1A\n- \u6280\u672F\u6808\u8BC4\u4F30\u548C\u9009\u578B\n- \u7CFB\u7EDF\u67B6\u6784\u8BBE\u8BA1\n- \u9879\u76EE\u76EE\u5F55\u7ED3\u6784\u89C4\u5212\n- \u5F00\u53D1\u5DE5\u5177\u548C\u90E8\u7F72\u65B9\u6848";
    protected readonly researchScope = "tech_stack_architecture";
    protected getTaskDescription(): string;
}
//# sourceMappingURL=TechWorker.d.ts.map