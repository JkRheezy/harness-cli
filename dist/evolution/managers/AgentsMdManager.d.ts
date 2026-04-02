/**
 * AgentsMdManager - 自动读写 AGENTS.md 的管理器
 *
 * 用于自动维护项目需求文档，支持：
 * - 读取并解析 AGENTS.md 结构
 * - 添加新需求到待实现列表
 * - 标记模块为进行中/已实现
 */
import { Gap, AgentsMdStructure } from '../types';
export declare class AgentsMdManager {
    private projectPath;
    private agentsMdPath;
    constructor(projectPath: string);
    /**
     * 读取并解析 AGENTS.md 文件
     * @returns 解析后的结构，如果文件不存在则返回 null
     */
    read(): Promise<AgentsMdStructure | null>;
    /**
     * 解析 AGENTS.md 内容
     */
    private parse;
    /**
     * 解析表格行
     */
    private parseTableRow;
    /**
     * 解析列表项
     */
    private parseListItem;
    /**
     * 将新发现的需求添加到"待实现"列表
     * 如果已存在则跳过
     */
    addRequirement(gap: Gap): Promise<void>;
    /**
     * 将模块从"待实现/进行中"移到"已实现"
     * 记录完成时间
     */
    markAsImplemented(moduleName: string): Promise<void>;
    /**
     * 将模块标记为"进行中"
     */
    markAsInProgress(moduleName: string, description?: string): Promise<void>;
    /**
     * 创建默认结构
     */
    private createDefaultStructure;
    /**
     * 将结构写入 AGENTS.md 文件
     */
    private write;
    /**
     * 序列化结构为 Markdown
     */
    private serialize;
    /**
     * 获取 AGENTS.md 文件路径
     */
    getAgentsMdPath(): string;
}
//# sourceMappingURL=AgentsMdManager.d.ts.map