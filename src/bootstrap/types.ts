/**
 * Types for Bootstrap Generator
 * Six-layer architecture foundation
 */

export interface BootstrapInput {
  projectName: string;
  description: string;
  techStack: TechStackChoice;
  patterns?: PatternChoice[];
  targetDir: string;
}

export interface TechStackChoice {
  language: 'typescript' | 'python' | 'go';
  frontend?: 'nextjs' | 'react' | 'vue' | 'none';
  backend?: 'nextjs-api' | 'express' | 'fastify' | 'none';
  database?: 'postgresql' | 'mongodb' | 'sqlite' | 'none';
  deployment?: 'vercel' | 'docker' | 'aws';
}

export interface PatternChoice {
  name: string;
  version?: string;
  config?: Record<string, any>;
}

export interface BootstrapResult {
  success: boolean;
  projectPath: string;
  layers: LayerResult[];
  filesCreated: string[];
  error?: string;
}

export interface LayerResult {
  layer: LayerName;
  created: boolean;
  files: string[];
}

export type LayerName = 
  | 'types'      // Layer 1: Domain types, interfaces
  | 'config'     // Layer 2: Configuration, environment
  | 'repo'       // Layer 3: Data access, repositories
  | 'service'    // Layer 4: Business logic, services
  | 'runtime'    // Layer 5: Runtime, executors, agents
  | 'ui';        // Layer 6: UI components, pages

export interface LayerTemplate {
  name: LayerName;
  description: string;
  directory: string;
  files: FileTemplate[];
  dependencies: LayerName[];
}

export interface FileTemplate {
  path: string;
  template: string;
  variables?: string[];
}

export interface ProjectStructure {
  root: DirectoryNode;
  layers: Map<LayerName, DirectoryNode>;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryNode[];
  content?: string;
}
