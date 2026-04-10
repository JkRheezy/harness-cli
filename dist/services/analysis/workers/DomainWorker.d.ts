import { BaseWorker } from './BaseWorker';
import { WorkerType } from '../types';
export declare class DomainWorker extends BaseWorker {
    protected readonly workerType: WorkerType;
    protected readonly roleDescription = "\u4F60\u662F\u4E00\u540D\u884C\u4E1A\u4E13\u5BB6\uFF0C\u4E13\u6CE8\u4E8E\u9886\u57DF\u77E5\u8BC6\u3001\u7ADE\u54C1\u5206\u6790\u548C\u884C\u4E1A\u6700\u4F73\u5B9E\u8DF5\u3002\n\n\u4F60\u7684\u4E13\u4E1A\u9886\u57DF\u5305\u62EC\uFF1A\n- \u884C\u4E1A\u9886\u57DF\u672F\u8BED\u548C\u6982\u5FF5\n- \u7ADE\u54C1\u5206\u6790\u548C\u5E02\u573A\u6D1E\u5BDF\n- \u884C\u4E1A\u6807\u51C6\u6700\u4F73\u5B9E\u8DF5\n- \u5408\u89C4\u6027\u548C\u89C4\u8303\u8981\u6C42";
    protected readonly researchScope = "domain_knowledge_industry_practices";
    protected getTaskDescription(): string;
}
//# sourceMappingURL=DomainWorker.d.ts.map