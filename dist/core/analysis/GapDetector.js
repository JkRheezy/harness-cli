"use strict";
/**
 * GapDetector - Compares target architecture with current implementation to identify gaps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GapDetector = void 0;
class GapDetector {
    constructor() {
        this.gapCounter = 0;
    }
    /**
     * Main entry point to detect all gaps between target and current implementation
     */
    detect(target, current) {
        const gaps = [];
        // Reset counter for each detection run
        this.gapCounter = 0;
        // Detect all types of gaps
        gaps.push(...this.detectMissingAgents(target, current));
        gaps.push(...this.detectMissingModules(target, current));
        gaps.push(...this.detectIncompleteModules(target, current));
        gaps.push(...this.detectMissingInterfaces(target, current));
        gaps.push(...this.detectOrphanCode(target, current));
        return gaps;
    }
    /**
     * Detect agents defined in spec but not implemented
     */
    detectMissingAgents(target, current) {
        const gaps = [];
        const implementedAgentNames = new Set(current.agents.map(a => a.name));
        for (const agentSpec of target.agents) {
            if (!implementedAgentNames.has(agentSpec.name)) {
                gaps.push(this.createGap({
                    type: 'missing_agent',
                    targetName: agentSpec.name,
                    targetDescription: agentSpec.description,
                    expected: `Agent '${agentSpec.name}' with responsibilities: ${agentSpec.responsibilities.join(', ')}`,
                    actual: 'Agent not found in implementation',
                    missingItems: agentSpec.expectedFiles,
                    relatedFiles: agentSpec.expectedFiles
                }));
            }
        }
        return gaps;
    }
    /**
     * Detect modules defined in spec but not implemented
     */
    detectMissingModules(target, current) {
        const gaps = [];
        const implementedModuleNames = new Set(current.modules.map(m => m.name));
        for (const moduleSpec of target.modules) {
            if (!implementedModuleNames.has(moduleSpec.name)) {
                gaps.push(this.createGap({
                    type: 'missing_module',
                    targetName: moduleSpec.name,
                    targetDescription: moduleSpec.description,
                    expected: `Module '${moduleSpec.name}' in ${moduleSpec.layer} layer`,
                    actual: 'Module not found in implementation',
                    missingItems: moduleSpec.expectedFiles,
                    relatedFiles: moduleSpec.expectedFiles
                }));
            }
        }
        return gaps;
    }
    /**
     * Detect modules that exist but are missing expected interfaces
     */
    detectIncompleteModules(target, current) {
        const gaps = [];
        const moduleMap = new Map(current.modules.map(m => [m.name, m]));
        for (const moduleSpec of target.modules) {
            const implementedModule = moduleMap.get(moduleSpec.name);
            if (!implementedModule) {
                continue; // Missing module is handled by detectMissingModules
            }
            const expectedInterfaces = moduleSpec.exposedInterfaces;
            const actualInterfaces = implementedModule.exportedSymbols;
            const missingInterfaces = expectedInterfaces.filter(iface => !actualInterfaces.includes(iface));
            if (missingInterfaces.length > 0) {
                const expectedCount = expectedInterfaces.length;
                const actualCount = actualInterfaces.length;
                gaps.push(this.createGap({
                    type: 'incomplete_module',
                    targetName: moduleSpec.name,
                    targetDescription: `Module ${moduleSpec.name} is missing ${missingInterfaces.length} interface(s)`,
                    expected: `${expectedCount} interface${expectedCount === 1 ? '' : 's'}`,
                    actual: `${actualCount} interface${actualCount === 1 ? '' : 's'}`,
                    missingItems: missingInterfaces,
                    existingItems: actualInterfaces,
                    relatedFiles: implementedModule.files
                }));
            }
        }
        return gaps;
    }
    /**
     * Detect individual missing interfaces
     */
    detectMissingInterfaces(target, current) {
        const gaps = [];
        const allExportedSymbols = new Set();
        for (const mod of current.modules) {
            for (const symbol of mod.exportedSymbols) {
                allExportedSymbols.add(symbol);
            }
        }
        for (const interfaceSpec of target.interfaces) {
            if (!allExportedSymbols.has(interfaceSpec.name)) {
                // Check if the parent module exists
                const parentModule = current.modules.find(m => m.name === interfaceSpec.module);
                if (parentModule) {
                    // Module exists but interface is missing
                    gaps.push(this.createGap({
                        type: 'missing_interface',
                        targetName: interfaceSpec.name,
                        targetDescription: `Interface ${interfaceSpec.name} in module ${interfaceSpec.module}`,
                        expected: `Interface '${interfaceSpec.name}' with signature: ${interfaceSpec.signature}`,
                        actual: 'Interface not exported from module',
                        relatedFiles: parentModule.files
                    }));
                }
            }
        }
        return gaps;
    }
    /**
     * Detect code that exists but is not defined in the spec (orphan code)
     */
    detectOrphanCode(target, current) {
        const gaps = [];
        const specAgentNames = new Set(target.agents.map(a => a.name));
        const specModuleNames = new Set(target.modules.map(m => m.name));
        // Find orphan agents
        for (const implementedAgent of current.agents) {
            if (!specAgentNames.has(implementedAgent.name)) {
                gaps.push(this.createGap({
                    type: 'orphan_code',
                    targetName: implementedAgent.name,
                    targetDescription: `Agent ${implementedAgent.name} exists in code but not in specification`,
                    expected: 'No agent defined in spec',
                    actual: `Agent '${implementedAgent.name}' found in implementation`,
                    existingItems: implementedAgent.files,
                    relatedFiles: implementedAgent.files
                }));
            }
        }
        // Find orphan modules
        for (const implementedModule of current.modules) {
            if (!specModuleNames.has(implementedModule.name)) {
                gaps.push(this.createGap({
                    type: 'orphan_code',
                    targetName: implementedModule.name,
                    targetDescription: `Module ${implementedModule.name} exists in code but not in specification`,
                    expected: 'No module defined in spec',
                    actual: `Module '${implementedModule.name}' found in implementation`,
                    existingItems: implementedModule.files,
                    relatedFiles: implementedModule.files
                }));
            }
        }
        return gaps;
    }
    /**
     * Calculate severity based on gap type and target name
     */
    calculateSeverity(type, targetName) {
        switch (type) {
            case 'missing_agent':
            case 'missing_module':
                return 'blocking';
            case 'incomplete_module':
            case 'missing_interface':
            case 'doc_outdated':
                return 'major';
            case 'orphan_code':
                return 'minor';
            default:
                return 'major';
        }
    }
    /**
     * Helper to create a Gap object with common fields
     */
    createGap(params) {
        this.gapCounter++;
        return {
            id: `gap-${Date.now()}-${this.gapCounter}`,
            type: params.type,
            severity: this.calculateSeverity(params.type, params.targetName),
            specRef: {
                document: 'AGENTS.md',
                section: params.targetName
            },
            targetName: params.targetName,
            targetDescription: params.targetDescription,
            evidence: {
                expected: params.expected,
                actual: params.actual,
                missingItems: params.missingItems,
                existingItems: params.existingItems
            },
            relatedFiles: params.relatedFiles || []
        };
    }
}
exports.GapDetector = GapDetector;
//# sourceMappingURL=GapDetector.js.map