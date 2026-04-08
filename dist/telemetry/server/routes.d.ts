import { IncomingMessage, ServerResponse } from 'http';
import { IndexedFileAdapter } from '../adapters/IndexedFileAdapter';
export declare function createRoutes(adapter: IndexedFileAdapter): {
    listTraces(req: IncomingMessage, res: ServerResponse): Promise<void>;
    getTrace(req: IncomingMessage, res: ServerResponse, traceId: string): Promise<void>;
    getStats(req: IncomingMessage, res: ServerResponse): Promise<void>;
    health(req: IncomingMessage, res: ServerResponse): Promise<void>;
};
export type Routes = ReturnType<typeof createRoutes>;
//# sourceMappingURL=routes.d.ts.map