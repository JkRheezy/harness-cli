/**
 * Template Registry for Six-Layer Architecture
 * Manages templates for all 6 layers with tech stack support
 */

import { LayerName, LayerTemplate, TechStackChoice, FileTemplate } from './types';

export class TemplateRegistry {
  private templates: Map<LayerName, Map<string, LayerTemplate>> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Get a template for a specific layer and tech stack
   * Falls back to 'default' template if specific tech stack not found
   */
  getTemplate(layer: LayerName, techStack: TechStackChoice): LayerTemplate | undefined {
    const layerTemplates = this.templates.get(layer);
    if (!layerTemplates) {
      return undefined;
    }

    // Try specific tech stack key first
    const key = this.buildKey(techStack);
    if (layerTemplates.has(key)) {
      return layerTemplates.get(key);
    }

    // Fall back to default template
    return layerTemplates.get('default');
  }

  /**
   * Register a custom template for a layer
   */
  registerTemplate(layer: LayerName, key: string, template: LayerTemplate): void {
    if (!this.templates.has(layer)) {
      this.templates.set(layer, new Map());
    }
    this.templates.get(layer)!.set(key, template);
  }

  /**
   * Get all templates for a specific layer
   */
  getLayerTemplates(layer: LayerName): LayerTemplate[] {
    const layerTemplates = this.templates.get(layer);
    if (!layerTemplates) {
      return [];
    }
    return Array.from(layerTemplates.values());
  }

  /**
   * Build a key from tech stack choices
   * Format: {language}-{database}-{frontend} (optional parts omitted if 'none')
   */
  private buildKey(techStack: TechStackChoice): string {
    const parts: string[] = [techStack.language];
    
    if (techStack.database && techStack.database !== 'none') {
      parts.push(techStack.database);
    }
    
    if (techStack.frontend && techStack.frontend !== 'none') {
      parts.push(techStack.frontend);
    }

    return parts.join('-');
  }

  /**
   * Register all default templates for the six-layer architecture
   */
  private registerDefaultTemplates(): void {
    // Layer 1: types (default)
    this.registerTemplate('types', 'default', {
      name: 'types',
      description: 'Domain types and interfaces - Layer 1',
      directory: 'src/types',
      dependencies: [],
      files: [
        {
          path: 'index.ts',
          template: `// Layer 1: Domain Types - {{projectName}}
// Central export for all domain types

export * from './domain';
`,
          variables: ['projectName']
        },
        {
          path: 'domain.ts',
          template: `// Domain Types - Core business entities
// Project: {{projectName}}

export interface DomainEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Add your domain types here
`,
          variables: ['projectName']
        }
      ]
    });

    // Layer 2: config (default)
    this.registerTemplate('config', 'default', {
      name: 'config',
      description: 'Configuration and environment - Layer 2',
      directory: 'src/config',
      dependencies: ['types'],
      files: [
        {
          path: 'index.ts',
          template: `// Layer 2: Configuration - {{projectName}}
// Environment and application configuration

import { z } from 'zod';

export const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().optional(),
  API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse(process.env);
}

export const config = loadConfig();
`,
          variables: ['projectName']
        }
      ]
    });

    // Layer 3: repo (typescript-postgresql)
    this.registerTemplate('repo', 'typescript-postgresql', {
      name: 'repo',
      description: 'Data access and repositories - Layer 3 (PostgreSQL)',
      directory: 'src/repo',
      dependencies: ['types', 'config'],
      files: [
        {
          path: 'index.ts',
          template: `// Layer 3: Repository Layer - {{projectName}}
// Data access and persistence

export * from './prisma';
export * from './repositories';
`,
          variables: ['projectName']
        },
        {
          path: 'prisma.ts',
          template: `// Prisma Client Setup - {{projectName}}

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export type { PrismaClient };
`,
          variables: ['projectName']
        },
        {
          path: 'repositories/index.ts',
          template: `// Repository Exports - {{projectName}}
// Concrete repository implementations

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
`,
          variables: ['projectName']
        }
      ]
    });

    // Layer 4: service (default)
    this.registerTemplate('service', 'default', {
      name: 'service',
      description: 'Business logic and services - Layer 4',
      directory: 'src/service',
      dependencies: ['repo', 'types'],
      files: [
        {
          path: 'index.ts',
          template: `// Layer 4: Service Layer - {{projectName}}
// Business logic and domain services

export * from './services';
`,
          variables: ['projectName']
        },
        {
          path: 'services/index.ts',
          template: `// Service Exports - {{projectName}}
// Business logic implementations

export interface Service<T> {
  execute(data: unknown): Promise<T>;
}

// Add your services here
`,
          variables: ['projectName']
        }
      ]
    });

    // Layer 5: runtime (default)
    this.registerTemplate('runtime', 'default', {
      name: 'runtime',
      description: 'Runtime, executors, and agents - Layer 5',
      directory: 'src/runtime',
      dependencies: ['service', 'config'],
      files: [
        {
          path: 'index.ts',
          template: `// Layer 5: Runtime Layer - {{projectName}}
// Runtime, executors, and agent orchestration

export * from './executor';
`,
          variables: ['projectName']
        },
        {
          path: 'executor.ts',
          template: `// Executor - {{projectName}}
// Task execution and agent runtime

import { Service } from '../service';

export interface ExecutionContext {
  requestId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class Executor {
  constructor(private services: Map<string, Service<unknown>>) {}

  async execute<T>(
    serviceName: string, 
    data: unknown, 
    context: ExecutionContext
  ): Promise<T> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(\`Service '\${serviceName}' not found\`);
    }
    return service.execute(data) as Promise<T>;
  }
}
`,
          variables: ['projectName']
        }
      ]
    });

    // Layer 6: ui (typescript-nextjs)
    this.registerTemplate('ui', 'typescript-nextjs', {
      name: 'ui',
      description: 'UI components and pages - Layer 6 (Next.js + React)',
      directory: 'src/ui',
      dependencies: ['runtime', 'types'],
      files: [
        {
          path: 'index.ts',
          template: `// Layer 6: UI Layer - {{projectName}}
// Components, pages, and UI logic

export * from './components';
`,
          variables: ['projectName']
        },
        {
          path: 'components/index.tsx',
          template: `// Component Exports - {{projectName}}
// React components for the application

import React from 'react';

export interface AppProps {
  title: string;
  children?: React.ReactNode;
}

export const App: React.FC<AppProps> = ({ title, children }) => {
  return (
    <div className="app">
      <h1>{title}</h1>
      {children}
    </div>
  );
};

export default App;
`,
          variables: ['projectName']
        }
      ]
    });
  }
}
