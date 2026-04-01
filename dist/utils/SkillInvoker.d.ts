export declare class SkillInvoker {
    private logger;
    private skillsPath;
    constructor(skillsPath?: string);
    /**
     * Invoke a Superpowers skill
     */
    invoke(skillName: string, args: any): Promise<any>;
    /**
     * Check if skill exists
     */
    exists(skillName: string): Promise<boolean>;
}
//# sourceMappingURL=SkillInvoker.d.ts.map