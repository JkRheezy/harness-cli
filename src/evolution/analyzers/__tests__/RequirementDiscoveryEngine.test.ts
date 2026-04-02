/**
 * RequirementDiscoveryEngine 测试套件
 */

import { RequirementDiscoveryEngine, MODULE_REQUIREMENTS, E_COMMERCE_PATTERN } from '../RequirementDiscoveryEngine';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

// Mock glob
jest.mock('glob', () => ({
  glob: jest.fn()
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn()
}));

describe('RequirementDiscoveryEngine', () => {
  let engine: RequirementDiscoveryEngine;
  const mockProjectPath = '/mock/project';
  const mockedGlob = glob as jest.MockedFunction<typeof glob>;
  const mockedReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RequirementDiscoveryEngine(mockProjectPath);
  });

  describe('constructor', () => {
    it('should set project path correctly', () => {
      expect(engine).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return complete analysis result', async () => {
      // Mock all modules missing
      mockedGlob.mockResolvedValue([]);
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const result = await engine.analyze();

      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('existingModules');
      expect(result).toHaveProperty('missingModules');
      expect(result).toHaveProperty('incompleteFlows');
      expect(result).toHaveProperty('detectedAt');
      expect(Array.isArray(result.gaps)).toBe(true);
      expect(Array.isArray(result.existingModules)).toBe(true);
      expect(Array.isArray(result.missingModules)).toBe(true);
    });

    it('should detect all gap types', async () => {
      // Mock empty project
      mockedGlob.mockResolvedValue([]);
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const result = await engine.analyze();

      const gapTypes = new Set(result.gaps.map(g => g.type));
      expect(gapTypes.size).toBeGreaterThan(0);
    });
  });

  describe('analyzeArchitectureCompleteness', () => {
    it('should detect missing modules when no files exist', async () => {
      mockedGlob.mockResolvedValue([]);

      const gaps = await engine.analyzeArchitectureCompleteness();

      expect(gaps.length).toBe(Object.keys(MODULE_REQUIREMENTS).length);
      expect(gaps.every(g => g.type === 'missing_module')).toBe(true);
      expect(gaps.some(g => g.name === '用户系统')).toBe(true);
      expect(gaps.some(g => g.name === '商品系统')).toBe(true);
      expect(gaps.some(g => g.name === '购物车')).toBe(true);
      expect(gaps.some(g => g.name === '订单系统')).toBe(true);
      expect(gaps.some(g => g.name === '支付系统')).toBe(true);
    });

    it('should not report existing modules', async () => {
      // Mock user module exists
      mockedGlob.mockImplementation((pattern: string | string[]) => {
        const p = Array.isArray(pattern) ? pattern[0] : pattern;
        if (p.includes('auth')) {
          return Promise.resolve(['src/lib/auth/user.ts']);
        }
        return Promise.resolve([]);
      });

      const gaps = await engine.analyzeArchitectureCompleteness();

      expect(gaps.some(g => g.name === '用户系统')).toBe(false);
      expect(gaps.length).toBe(Object.keys(MODULE_REQUIREMENTS).length - 1);
    });

    it('should assign correct priority to gaps', async () => {
      mockedGlob.mockResolvedValue([]);

      const gaps = await engine.analyzeArchitectureCompleteness();

      expect(gaps.every(g => g.priority === 'P0')).toBe(true);
    });

    it('should generate suggested scope for each gap', async () => {
      mockedGlob.mockResolvedValue([]);

      const gaps = await engine.analyzeArchitectureCompleteness();

      expect(gaps.every(g => g.suggestedScope && g.suggestedScope.length > 0)).toBe(true);
    });
  });

  describe('analyzeApiCompleteness', () => {
    it('should detect missing API dependencies', async () => {
      // Mock only order API exists
      mockedGlob.mockImplementation((pattern: string | string[]) => {
        const p = Array.isArray(pattern) ? pattern[0] : pattern;
        if (p.includes('api/order')) {
          return Promise.resolve(['src/app/api/order/route.ts']);
        }
        return Promise.resolve([]);
      });

      const gaps = await engine.analyzeApiCompleteness();

      // Order depends on payment, cart, product
      expect(gaps.some(g => g.type === 'missing_api')).toBe(true);
      expect(gaps.some(g => g.reason.includes('order'))).toBe(true);
    });

    it('should detect missing required API endpoints', async () => {
      mockedGlob.mockResolvedValue([]);

      const gaps = await engine.analyzeApiCompleteness();

      const apiGaps = gaps.filter(g => g.type === 'missing_api');
      expect(apiGaps.length).toBeGreaterThan(0);
    });

    it('should not duplicate gaps for same missing API', async () => {
      // Mock multiple APIs that depend on the same missing module
      mockedGlob.mockImplementation((pattern: string | string[]) => {
        const p = Array.isArray(pattern) ? pattern[0] : pattern;
        if (p.includes('api/order') || p.includes('api/cart')) {
          return Promise.resolve(['route.ts']);
        }
        return Promise.resolve([]);
      });

      const gaps = await engine.analyzeApiCompleteness();

      const uniqueNames = new Set(gaps.map(g => g.name));
      expect(uniqueNames.size).toBe(gaps.length);
    });
  });

  describe('analyzeUserFlows', () => {
    it('should detect incomplete shopping flow', async () => {
      mockedGlob.mockResolvedValue([]);

      const gaps = await engine.analyzeUserFlows();

      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps.some(g => g.type === 'incomplete_flow')).toBe(true);
      expect(gaps.some(g => g.name.includes('购物流程'))).toBe(true);
    });

    it('should detect specific missing flow steps', async () => {
      mockedGlob.mockResolvedValue([]);

      const gaps = await engine.analyzeUserFlows();

      const flowGap = gaps.find(g => g.type === 'incomplete_flow');
      expect(flowGap).toBeDefined();
      expect(flowGap?.description).toContain('浏览');
      expect(flowGap?.description).toContain('加购');
      expect(flowGap?.description).toContain('结算');
      expect(flowGap?.description).toContain('支付');
    });

    it('should not report gaps when all flow steps exist', async () => {
      mockedGlob.mockResolvedValue(['page.tsx']);

      const gaps = await engine.analyzeUserFlows();

      expect(gaps.length).toBe(0);
    });

    it('should detect partial flow completion', async () => {
      let callCount = 0;
      mockedGlob.mockImplementation(() => {
        callCount++;
        // Only return results for first 2 calls (browse and add_to_cart)
        if (callCount <= 4) {
          return Promise.resolve(['page.tsx']);
        }
        return Promise.resolve([]);
      });

      const gaps = await engine.analyzeUserFlows();

      expect(gaps.length).toBe(1);
      expect(gaps[0].description).toContain('结算');
      expect(gaps[0].description).toContain('支付');
      expect(gaps[0].description).not.toContain('浏览');
      expect(gaps[0].description).not.toContain('加购');
    });
  });

  describe('analyzeDataModels', () => {
    it('should detect missing Prisma schema', async () => {
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const gaps = await engine.analyzeDataModels();

      expect(gaps.some(g => g.name.includes('Prisma Schema'))).toBe(true);
      expect(gaps.some(g => g.type === 'missing_model')).toBe(true);
    });

    it('should detect missing required models', async () => {
      const emptySchema = `
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        
        generator client {
          provider = "prisma-client-js"
        }
      `;
      mockedReadFile.mockResolvedValue(emptySchema);

      const gaps = await engine.analyzeDataModels();

      expect(gaps.some(g => g.name.includes('用户模型'))).toBe(true);
      expect(gaps.some(g => g.name.includes('商品模型'))).toBe(true);
      expect(gaps.some(g => g.name.includes('订单模型'))).toBe(true);
      expect(gaps.some(g => g.name.includes('购物车模型'))).toBe(true);
      expect(gaps.some(g => g.name.includes('支付模型'))).toBe(true);
    });

    it('should not report existing models', async () => {
      const schemaWithUser = `
        model User {
          id    Int    @id @default(autoincrement())
          email String @unique
          name  String
        }
        
        model Product {
          id    Int    @id @default(autoincrement())
          name  String
          price Float
        }
      `;
      mockedReadFile.mockResolvedValue(schemaWithUser);

      const gaps = await engine.analyzeDataModels();

      expect(gaps.some(g => g.name.includes('用户模型'))).toBe(false);
      expect(gaps.some(g => g.name.includes('商品模型'))).toBe(false);
      expect(gaps.some(g => g.name.includes('订单模型'))).toBe(true);
    });

    it('should detect missing model relationships', async () => {
      const schemaWithoutRelations = `
        model User {
          id    Int    @id @default(autoincrement())
          email String @unique
        }
        
        model Product {
          id    Int    @id @default(autoincrement())
          name  String
          price Float
        }
        
        model Cart {
          id     Int @id @default(autoincrement())
          userId Int
        }
        
        model Order {
          id     Int @id @default(autoincrement())
          userId Int
        }
        
        model Payment {
          id      Int @id @default(autoincrement())
          orderId Int
          amount  Float
        }
      `;
      mockedReadFile.mockResolvedValue(schemaWithoutRelations);

      const gaps = await engine.analyzeDataModels();

      // Should report missing relationships when all models exist but no relations
      const relationGap = gaps.find(g => g.name.includes('关联'));
      expect(relationGap).toBeDefined();
      expect(relationGap?.type).toBe('missing_model');
    });

    it('should not report missing relationships when relations exist', async () => {
      const schemaWithRelations = `
        model User {
          id      Int     @id @default(autoincrement())
          email   String  @unique
          orders  Order[]
        }
        
        model Order {
          id       Int    @id @default(autoincrement())
          userId   Int
          user     User   @relation(fields: [userId], references: [id])
        }
      `;
      mockedReadFile.mockResolvedValue(schemaWithRelations);

      const gaps = await engine.analyzeDataModels();

      expect(gaps.some(g => g.name.includes('关联'))).toBe(false);
    });

    it('should assign correct priority to model gaps', async () => {
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const gaps = await engine.analyzeDataModels();

      const schemaGap = gaps.find(g => g.name.includes('Prisma Schema'));
      expect(schemaGap?.priority).toBe('P1');
    });
  });

  describe('Gap structure validation', () => {
    it('should have all required fields for each gap', async () => {
      mockedGlob.mockResolvedValue([]);
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const result = await engine.analyze();

      for (const gap of result.gaps) {
        expect(gap).toHaveProperty('id');
        expect(gap).toHaveProperty('type');
        expect(gap).toHaveProperty('name');
        expect(gap).toHaveProperty('description');
        expect(gap).toHaveProperty('reason');
        expect(gap).toHaveProperty('priority');
        expect(gap).toHaveProperty('suggestedScope');
        expect(gap).toHaveProperty('detectedAt');
        
        expect(typeof gap.id).toBe('string');
        expect(typeof gap.name).toBe('string');
        expect(typeof gap.description).toBe('string');
        expect(typeof gap.reason).toBe('string');
        expect(typeof gap.suggestedScope).toBe('string');
        expect(gap.detectedAt instanceof Date).toBe(true);
        expect(['P0', 'P1', 'P2']).toContain(gap.priority);
        expect(['missing_module', 'missing_api', 'incomplete_flow', 'missing_model', 'config_mismatch']).toContain(gap.type);
      }
    });
  });

  describe('Result structure', () => {
    it('should correctly categorize existing vs missing modules', async () => {
      // Mock user module exists, others missing
      mockedGlob.mockImplementation((pattern: string | string[]) => {
        const p = Array.isArray(pattern) ? pattern[0] : pattern;
        if (p.includes('auth')) {
          return Promise.resolve(['src/lib/auth/user.ts']);
        }
        return Promise.resolve([]);
      });
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const result = await engine.analyze();

      expect(result.existingModules).toContain('user');
      expect(result.missingModules).toContain('商品系统');
      expect(result.missingModules).toContain('购物车');
    });

    it('should list incomplete flows', async () => {
      mockedGlob.mockResolvedValue([]);
      mockedReadFile.mockRejectedValue(new Error('File not found'));

      const result = await engine.analyze();

      expect(result.incompleteFlows.length).toBeGreaterThan(0);
      expect(result.incompleteFlows.some(f => f.includes('购物流程'))).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should export MODULE_REQUIREMENTS with all required modules', () => {
      expect(MODULE_REQUIREMENTS).toHaveProperty('user');
      expect(MODULE_REQUIREMENTS).toHaveProperty('product');
      expect(MODULE_REQUIREMENTS).toHaveProperty('cart');
      expect(MODULE_REQUIREMENTS).toHaveProperty('order');
      expect(MODULE_REQUIREMENTS).toHaveProperty('payment');
    });

    it('should have correct module structure', () => {
      for (const [key, module] of Object.entries(MODULE_REQUIREMENTS)) {
        expect(module).toHaveProperty('name');
        expect(module).toHaveProperty('description');
        expect(module).toHaveProperty('requiredFiles');
        expect(module).toHaveProperty('priority');
        expect(Array.isArray(module.requiredFiles)).toBe(true);
        expect(module.requiredFiles.length).toBeGreaterThan(0);
      }
    });

    it('should export E_COMMERCE_PATTERN', () => {
      expect(E_COMMERCE_PATTERN).toHaveProperty('type', 'ecommerce');
      expect(E_COMMERCE_PATTERN).toHaveProperty('requiredModules');
      expect(E_COMMERCE_PATTERN.requiredModules).toContain('user');
      expect(E_COMMERCE_PATTERN.requiredModules).toContain('product');
      expect(E_COMMERCE_PATTERN.requiredModules).toContain('cart');
      expect(E_COMMERCE_PATTERN.requiredModules).toContain('order');
      expect(E_COMMERCE_PATTERN.requiredModules).toContain('payment');
    });
  });
});
