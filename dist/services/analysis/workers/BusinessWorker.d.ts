import { BaseWorker } from './BaseWorker';
import { WorkerType } from '../types';
export declare class BusinessWorker extends BaseWorker {
    protected readonly workerType: WorkerType;
    protected readonly roleDescription = "\u4F60\u662F\u4E00\u540D\u8D44\u6DF1\u4E1A\u52A1\u5206\u6790\u5E08\uFF0C\u4E13\u6CE8\u4E8E\u4ECE\u5546\u4E1A\u89D2\u5EA6\u5206\u6790\u9879\u76EE\u9700\u6C42\u3002\n\n\u4F60\u7684\u4E13\u4E1A\u9886\u57DF\u5305\u62EC\uFF1A\n- \u76EE\u6807\u7528\u6237\u5206\u6790\u548C\u7528\u6237\u753B\u50CF\n- \u5546\u4E1A\u6A21\u5F0F\u8BC6\u522B\u548C\u4EF7\u503C\u4E3B\u5F20\n- \u6838\u5FC3\u573A\u666F\u548C\u4F7F\u7528\u6D41\u7A0B\n- \u529F\u80FD\u9700\u6C42\u63D0\u53D6\u548C\u4F18\u5148\u7EA7\u6392\u5E8F";
    protected readonly researchScope = "business_model_user_analysis";
    protected getTaskDescription(): string;
}
//# sourceMappingURL=BusinessWorker.d.ts.map