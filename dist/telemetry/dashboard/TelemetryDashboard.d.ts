interface DashboardConfig {
    telemetryDir: string;
    refreshIntervalMs?: number;
}
export declare class TelemetryDashboard {
    private config;
    constructor(config: DashboardConfig);
    generateReport(): Promise<string>;
    private loadJsonlFiles;
    private loadMetrics;
    private loadSpans;
    private summarizeTasks;
    private summarizeLLM;
    private formatReport;
    watch(): Promise<void>;
}
export {};
//# sourceMappingURL=TelemetryDashboard.d.ts.map