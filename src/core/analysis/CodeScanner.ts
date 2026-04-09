/**
 * CodeScanner - Scans source code to identify current implementation state
 */

import {
  CurrentImplementation,
  ImplementedAgent,
  ImplementedModule,
  SourceFile,
  ExportSymbol
} from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CodeScanner {
  private readonly moduleDirectories = [
    'src/lib/ai/agents',
    'src/services',
    'src/modules',
    'src/components',
    'src/api',
    'src/lib',
  ];

  constructor(private projectPath: string) {}

  async scan(): Promise<CurrentImplementation> {
    const [agents, modules, files, exports] = await Promise.all([
      this.scanAgents(),
      this.scanModules(),
      this.scanFiles(),
      this.scanAllExports()
    ]);

    return {
      scannedAt: new Date(),
      agents,
      modules,
      files,
      exports
    };
  }

  async scanAgents(): Promise<ImplementedAgent[]> {
    const agentsDir = path.join(this.projectPath, 'src/lib/ai/agents');
    const agents: ImplementedAgent[] = [];

    try {
      await fs.access(agentsDir);
      const entries = await fs.readdir(agentsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const agentName = entry.name.replace(/\.(ts|tsx)$/, '');
          const filePath = path.join(agentsDir, entry.name);
          
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const stats = await fs.stat(filePath);
            const detectedResponsibilities = this.detectResponsibilities(content);
            const completeness = this.calculateCompleteness(content);

            agents.push({
              name: agentName,
              files: [filePath],
              detectedResponsibilities,
              completeness
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Directory doesn't exist, return empty array
    }

    return agents;
  }

  private async scanModules(): Promise<ImplementedModule[]> {
    const modules: ImplementedModule[] = [];
    const scannedDirs = new Set<string>();

    for (const moduleDir of this.moduleDirectories) {
      const fullPath = path.join(this.projectPath, moduleDir);
      
      // Skip if already scanned (e.g., agents dir)
      if (scannedDirs.has(fullPath)) continue;
      scannedDirs.add(fullPath);

      try {
        await fs.access(fullPath);
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            const moduleName = entry.name.replace(/\.(ts|tsx)$/, '');
            const filePath = path.join(fullPath, entry.name);
            
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const exports = await this.extractExports(content);
              
              // Detect layer based on directory
              const detectedLayer = this.detectLayer(moduleDir);

              const existingModule = modules.find(m => m.name === moduleName);
              if (existingModule) {
                existingModule.files.push(filePath);
                existingModule.exportedSymbols.push(...exports.map(e => e.name));
              } else {
                modules.push({
                  name: moduleName,
                  files: [filePath],
                  exportedSymbols: exports.map(e => e.name),
                  detectedLayer
                });
              }
            } catch {
              // Skip files that can't be read
            }
          }
        }
      } catch {
        // Directory doesn't exist, continue to next
      }
    }

    return modules;
  }

  private async scanFiles(): Promise<SourceFile[]> {
    const files: SourceFile[] = [];
    const srcDir = path.join(this.projectPath, 'src');

    try {
      await fs.access(srcDir);
      await this.scanDirectory(srcDir, files);
    } catch {
      // src directory doesn't exist
    }

    return files;
  }

  private async scanDirectory(dirPath: string, files: SourceFile[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await this.scanDirectory(fullPath, files);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          const fileType = this.getFileType(ext);
          
          if (fileType !== 'other') {
            try {
              const stats = await fs.stat(fullPath);
              const content = await fs.readFile(fullPath, 'utf-8');
              const exports = await this.extractExports(content);
              const imports = this.extractImports(content);

              files.push({
                path: fullPath,
                type: fileType,
                size: stats.size,
                exports: exports.map(e => e.name),
                imports
              });
            } catch {
              // Skip files that can't be read
            }
          }
        }
      }
    } catch {
      // Directory can't be read
    }
  }

  private async scanAllExports(): Promise<ExportSymbol[]> {
    const exports: ExportSymbol[] = [];
    const srcDir = path.join(this.projectPath, 'src');

    try {
      await fs.access(srcDir);
      await this.scanExportsInDirectory(srcDir, exports);
    } catch {
      // src directory doesn't exist
    }

    return exports;
  }

  private async scanExportsInDirectory(dirPath: string, exports: ExportSymbol[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await this.scanExportsInDirectory(fullPath, exports);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const fileExports = await this.extractExports(content);
            exports.push(...fileExports.map(e => ({ ...e, file: fullPath })));
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Directory can't be read
    }
  }

  async extractExports(content: string): Promise<{ name: string; type: ExportSymbol['type'] }[]> {
    const exports: { name: string; type: ExportSymbol['type'] }[] = [];
    
    if (!content.trim()) {
      return exports;
    }

    // Match class exports
    const classRegex = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'class' });
    }

    // Match interface exports
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'interface' });
    }

    // Match type exports
    const typeRegex = /export\s+type\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'type' });
    }

    // Match function exports
    const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'function' });
    }

    // Match const exports
    const constRegex = /export\s+const\s+(\w+)/g;
    while ((match = constRegex.exec(content)) !== null) {
      exports.push({ name: match[1], type: 'const' });
    }

    // Match arrow function const exports
    const arrowFuncRegex = /export\s+const\s+(\w+)\s*[:=]/g;
    while ((match = arrowFuncRegex.exec(content)) !== null) {
      // Avoid duplicates from the const regex
      if (!exports.find(e => e.name === match![1])) {
        exports.push({ name: match[1], type: 'const' });
      }
    }

    // Match default exports (as 'default' type)
    const defaultRegex = /export\s+default\s+(?:class|function)?\s*(\w+)/g;
    while ((match = defaultRegex.exec(content)) !== null) {
      if (match[1]) {
        exports.push({ name: match[1], type: 'class' });
      }
    }

    return exports;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"];?/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  calculateCompleteness(content: string): number {
    if (!content.trim()) {
      return 0;
    }

    let score = 10; // Base score for having content

    // Check for class definition
    if (/class\s+\w+/.test(content)) {
      score += 20;
    }

    // Check for methods
    const methodMatches = content.match(/(?:async\s+)?\w+\s*\([^)]*\)\s*[:{]/g);
    if (methodMatches) {
      score += Math.min(methodMatches.length * 10, 30);
    }

    // Check for exports
    const exportMatches = content.match(/export\s+/g);
    if (exportMatches) {
      score += Math.min(exportMatches.length * 5, 15);
    }

    // Check for type definitions
    if (/interface\s+\w+|type\s+\w+/.test(content)) {
      score += 10;
    }

    // Check for error handling
    if (/try\s*{|catch\s*\(|throw\s+/.test(content)) {
      score += 5;
    }

    // Check for comments/documentation
    if (/\/\/|\/\*\*|\/\*/.test(content)) {
      score += 5;
    }

    // Check for imports (indicates dependencies)
    if (/import\s+/.test(content)) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  private detectResponsibilities(content: string): string[] {
    const responsibilities: string[] = [];
    
    // Extract method names as potential responsibilities
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      // Skip common method names and constructors
      if (!['constructor', 'toString', 'valueOf', 'then', 'catch'].includes(methodName)) {
        // Convert camelCase to kebab-case for responsibility name
        const responsibility = methodName
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, '');
        responsibilities.push(responsibility);
      }
    }

    return [...new Set(responsibilities)]; // Remove duplicates
  }

  private detectLayer(dirPath: string): string | undefined {
    if (dirPath.includes('api')) return 'api';
    if (dirPath.includes('service')) return 'service';
    if (dirPath.includes('data')) return 'data';
    if (dirPath.includes('component') || dirPath.includes('ui')) return 'ui';
    return undefined;
  }

  private getFileType(ext: string): SourceFile['type'] {
    switch (ext) {
      case '.ts': return 'ts';
      case '.tsx': return 'tsx';
      case '.js': return 'js';
      case '.json': return 'json';
      default: return 'other';
    }
  }
}
