"use strict";
/**
 * RequirementDiscoveryEngine - 自主发现代码缺口的引擎
 *
 * 该引擎分析项目结构，自动发现缺失的模块、API、用户流程和数据模型
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementDiscoveryEngine = exports.API_DEPENDENCIES = exports.USER_SHOPPING_FLOW = exports.E_COMMERCE_PATTERN = exports.MODULE_REQUIREMENTS = void 0;
const Logger_1 = require("../../utils/Logger");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
/**
 * 电商模块预定义要求
 */
exports.MODULE_REQUIREMENTS = {
    user: {
        name: '用户系统',
        description: '用户注册、登录、权限管理',
        requiredFiles: ['src/app/api/auth/**/route.ts', 'src/lib/auth/**/*.ts'],
        priority: 'P0'
    },
    product: {
        name: '商品系统',
        description: '商品展示、分类、搜索',
        requiredFiles: ['src/app/product/**/page.tsx', 'src/lib/product/**/*.ts'],
        priority: 'P0'
    },
    cart: {
        name: '购物车',
        description: '加购、修改数量、结算',
        requiredFiles: ['src/components/cart/**/*.tsx', 'src/lib/cart/**/*.ts'],
        priority: 'P0'
    },
    order: {
        name: '订单系统',
        description: '创建订单、订单状态、历史',
        requiredFiles: ['src/lib/order/**/*.ts', 'src/app/api/order/**/route.ts'],
        priority: 'P0'
    },
    payment: {
        name: '支付系统',
        description: '集成支付网关、支付状态',
        requiredFiles: ['src/lib/payment/**/*.ts', 'src/app/api/payment/**/route.ts'],
        priority: 'P0'
    }
};
/**
 * 电商架构模式
 */
exports.E_COMMERCE_PATTERN = {
    type: 'ecommerce',
    requiredModules: ['user', 'product', 'cart', 'order', 'payment'],
    optionalModules: ['review', 'wishlist', 'coupon']
};
/**
 * 用户购物流程定义
 */
exports.USER_SHOPPING_FLOW = {
    name: '用户购物流程',
    steps: [
        { name: 'browse', label: '浏览商品', pagePattern: 'product/**/page.tsx' },
        { name: 'add_to_cart', label: '加购', componentPattern: 'cart/**/AddToCart*' },
        { name: 'checkout', label: '结算', pagePattern: 'checkout/**/page.tsx' },
        { name: 'payment', label: '支付', pagePattern: 'payment/**/page.tsx' }
    ]
};
/**
 * API 依赖关系图
 * 用于检查 API 闭环
 */
exports.API_DEPENDENCIES = {
    order: ['payment', 'cart', 'product'],
    cart: ['product', 'user'],
    payment: ['order', 'user'],
    product: [],
    user: []
};
class RequirementDiscoveryEngine {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.logger = new Logger_1.Logger();
    }
    /**
     * 主分析方法 - 发现所有缺口
     */
    async analyze() {
        this.logger.info('🔍 Starting requirement discovery analysis...');
        const startTime = Date.now();
        const [architectureGaps, apiGaps, userFlowGaps, dataModelGaps] = await Promise.all([
            this.analyzeArchitectureCompleteness(),
            this.analyzeApiCompleteness(),
            this.analyzeUserFlows(),
            this.analyzeDataModels()
        ]);
        const allGaps = [
            ...architectureGaps,
            ...apiGaps,
            ...userFlowGaps,
            ...dataModelGaps
        ];
        const existingModules = this.getExistingModules(allGaps);
        const missingModules = this.getMissingModules(allGaps);
        const incompleteFlows = userFlowGaps.map(gap => gap.name);
        const duration = Date.now() - startTime;
        this.logger.info(`✅ Requirement discovery complete: ${allGaps.length} gaps found in ${duration}ms`);
        return {
            gaps: allGaps,
            existingModules,
            missingModules,
            incompleteFlows,
            detectedAt: new Date()
        };
    }
    /**
     * 分析架构完整性 - 检查必需模块是否存在
     */
    async analyzeArchitectureCompleteness() {
        this.logger.info('📦 Analyzing architecture completeness...');
        const gaps = [];
        for (const [moduleId, requirement] of Object.entries(exports.MODULE_REQUIREMENTS)) {
            const exists = await this.checkModuleExists(moduleId, requirement);
            if (!exists) {
                gaps.push({
                    id: `gap-module-${moduleId}-${Date.now()}`,
                    type: 'missing_module',
                    name: requirement.name,
                    description: `缺少必需模块: ${requirement.name}`,
                    reason: `未找到 ${moduleId} 模块的必需文件: ${requirement.requiredFiles.join(', ')}`,
                    priority: requirement.priority,
                    suggestedScope: this.generateModuleScope(moduleId, requirement),
                    detectedAt: new Date()
                });
                this.logger.warn(`  ⚠️ Missing module: ${requirement.name}`);
            }
            else {
                this.logger.info(`  ✅ Module found: ${requirement.name}`);
            }
        }
        return gaps;
    }
    /**
     * 分析 API 完整性 - 检查 API 是否形成闭环
     */
    async analyzeApiCompleteness() {
        this.logger.info('🌐 Analyzing API completeness...');
        const gaps = [];
        try {
            // 检测已存在的 API 模块
            const existingApis = await this.detectExistingApiModules();
            // 检查每个存在 API 的依赖是否满足
            for (const apiModule of existingApis) {
                const dependencies = exports.API_DEPENDENCIES[apiModule] || [];
                for (const dependency of dependencies) {
                    if (!existingApis.includes(dependency)) {
                        const depRequirement = exports.MODULE_REQUIREMENTS[dependency];
                        if (depRequirement) {
                            // 检查是否已报告过此缺口
                            const alreadyReported = gaps.some(g => g.type === 'missing_api' && g.name.includes(depRequirement.name));
                            if (!alreadyReported) {
                                gaps.push({
                                    id: `gap-api-${apiModule}-needs-${dependency}-${Date.now()}`,
                                    type: 'missing_api',
                                    name: `缺少 ${depRequirement.name} API`,
                                    description: `${exports.MODULE_REQUIREMENTS[apiModule]?.name || apiModule} 依赖 ${depRequirement.name}，但未检测到相关 API`,
                                    reason: `API 闭环不完整: ${apiModule} → ${dependency} (缺失)`,
                                    priority: depRequirement.priority,
                                    suggestedScope: this.generateApiScope(dependency, depRequirement),
                                    relatedFiles: [`src/app/api/${apiModule}`],
                                    detectedAt: new Date()
                                });
                                this.logger.warn(`  ⚠️ API gap: ${apiModule} depends on missing ${dependency}`);
                            }
                        }
                    }
                }
            }
            // 检查必需的 API 端点
            const requiredApiPatterns = [
                { pattern: 'src/app/api/auth/**/route.ts', name: '认证 API', module: 'user' },
                { pattern: 'src/app/api/order/**/route.ts', name: '订单 API', module: 'order' },
                { pattern: 'src/app/api/payment/**/route.ts', name: '支付 API', module: 'payment' }
            ];
            for (const api of requiredApiPatterns) {
                const exists = await this.checkFilePatternExists(api.pattern);
                if (!exists && !existingApis.includes(api.module)) {
                    const alreadyReported = gaps.some(g => g.name.includes(api.name));
                    if (!alreadyReported) {
                        const req = exports.MODULE_REQUIREMENTS[api.module];
                        gaps.push({
                            id: `gap-api-missing-${api.module}-${Date.now()}`,
                            type: 'missing_api',
                            name: `缺少 ${api.name}`,
                            description: `未检测到 ${api.name} 端点`,
                            reason: `必需的 API 端点不存在: ${api.pattern}`,
                            priority: 'P0',
                            suggestedScope: `实现 ${api.name} 端点，包括 CRUD 操作`,
                            detectedAt: new Date()
                        });
                    }
                }
            }
        }
        catch (error) {
            this.logger.warn('Error analyzing API completeness:', error);
        }
        return gaps;
    }
    /**
     * 分析用户流程 - 检查购物流程是否完整
     */
    async analyzeUserFlows() {
        this.logger.info('👤 Analyzing user flows...');
        const gaps = [];
        try {
            const missingSteps = [];
            const relatedFiles = [];
            for (const step of exports.USER_SHOPPING_FLOW.steps) {
                let stepExists = false;
                if (step.pagePattern) {
                    const pageExists = await this.checkFilePatternExists(`src/app/${step.pagePattern}`);
                    if (pageExists) {
                        stepExists = true;
                        const files = await (0, glob_1.glob)(`src/app/${step.pagePattern}`, { cwd: this.projectPath });
                        relatedFiles.push(...files);
                    }
                }
                if (!stepExists && step.componentPattern) {
                    const componentExists = await this.checkFilePatternExists(`src/components/${step.componentPattern}`);
                    if (componentExists) {
                        stepExists = true;
                        const files = await (0, glob_1.glob)(`src/components/${step.componentPattern}`, { cwd: this.projectPath });
                        relatedFiles.push(...files);
                    }
                }
                // 检查 lib 目录
                if (!stepExists) {
                    const libPattern = `src/lib/**/${step.name}*`;
                    const libExists = await this.checkFilePatternExists(libPattern);
                    if (libExists) {
                        stepExists = true;
                    }
                }
                if (!stepExists) {
                    missingSteps.push(step.label);
                    this.logger.warn(`  ⚠️ Missing flow step: ${step.label}`);
                }
                else {
                    this.logger.info(`  ✅ Flow step found: ${step.label}`);
                }
            }
            if (missingSteps.length > 0) {
                gaps.push({
                    id: `gap-flow-incomplete-${Date.now()}`,
                    type: 'incomplete_flow',
                    name: '用户购物流程不完整',
                    description: `用户购物流程缺少以下步骤: ${missingSteps.join(' → ')}`,
                    reason: `流程中断点: ${missingSteps.join(', ')}`,
                    priority: 'P0',
                    suggestedScope: this.generateFlowScope(missingSteps),
                    relatedFiles: relatedFiles.length > 0 ? relatedFiles : undefined,
                    detectedAt: new Date()
                });
            }
        }
        catch (error) {
            this.logger.warn('Error analyzing user flows:', error);
        }
        return gaps;
    }
    /**
     * 分析数据模型 - 检查 Prisma schema 中的数据模型完整性
     */
    async analyzeDataModels() {
        this.logger.info('🗄️ Analyzing data models...');
        const gaps = [];
        try {
            // 查找 Prisma schema 文件
            const schemaPaths = [
                'prisma/schema.prisma',
                'src/prisma/schema.prisma',
                'schema.prisma'
            ];
            let schemaContent = '';
            let schemaPath = '';
            for (const sp of schemaPaths) {
                try {
                    const fullPath = path.join(this.projectPath, sp);
                    schemaContent = await fs.readFile(fullPath, 'utf-8');
                    schemaPath = sp;
                    break;
                }
                catch {
                    continue;
                }
            }
            if (!schemaContent) {
                gaps.push({
                    id: `gap-model-no-schema-${Date.now()}`,
                    type: 'missing_model',
                    name: '缺少 Prisma Schema',
                    description: '未找到 Prisma schema 文件，无法验证数据模型完整性',
                    reason: '未找到 prisma/schema.prisma 或类似文件',
                    priority: 'P1',
                    suggestedScope: '创建 prisma/schema.prisma 文件并定义核心数据模型',
                    detectedAt: new Date()
                });
                this.logger.warn('  ⚠️ No Prisma schema found');
                return gaps;
            }
            this.logger.info(`  📄 Found schema: ${schemaPath}`);
            // 必需的模型定义
            const requiredModels = [
                { name: 'User', label: '用户模型', priority: 'P0' },
                { name: 'Product', label: '商品模型', priority: 'P0' },
                { name: 'Order', label: '订单模型', priority: 'P0' },
                { name: 'Cart', label: '购物车模型', priority: 'P0' },
                { name: 'Payment', label: '支付模型', priority: 'P0' }
            ];
            for (const model of requiredModels) {
                const modelExists = this.checkModelExists(schemaContent, model.name);
                if (!modelExists) {
                    gaps.push({
                        id: `gap-model-missing-${model.name.toLowerCase()}-${Date.now()}`,
                        type: 'missing_model',
                        name: `缺少 ${model.label}`,
                        description: `Prisma schema 中未定义 ${model.label}`,
                        reason: `数据模型缺失: ${model.name}`,
                        priority: model.priority,
                        suggestedScope: this.generateModelScope(model.name),
                        relatedFiles: [schemaPath],
                        detectedAt: new Date()
                    });
                    this.logger.warn(`  ⚠️ Missing model: ${model.name}`);
                }
                else {
                    this.logger.info(`  ✅ Model found: ${model.name}`);
                }
            }
            // 检查模型间关系
            const hasRelations = schemaContent.includes('@relation') ||
                schemaContent.includes('references:');
            if (!hasRelations && requiredModels.every(m => this.checkModelExists(schemaContent, m.name))) {
                gaps.push({
                    id: `gap-model-no-relations-${Date.now()}`,
                    type: 'missing_model',
                    name: '数据模型缺少关联',
                    description: 'Prisma schema 中的模型缺少必要的关联定义',
                    reason: '未检测到 @relation 或 references 定义',
                    priority: 'P1',
                    suggestedScope: '为 User-Order、Order-Payment、Cart-Product 等模型添加关联关系',
                    relatedFiles: [schemaPath],
                    detectedAt: new Date()
                });
                this.logger.warn('  ⚠️ Models lack relationships');
            }
        }
        catch (error) {
            this.logger.warn('Error analyzing data models:', error);
        }
        return gaps;
    }
    // ===== 私有辅助方法 =====
    /**
     * 检查模块是否存在
     */
    async checkModuleExists(moduleId, requirement) {
        for (const pattern of requirement.requiredFiles) {
            const exists = await this.checkFilePatternExists(pattern);
            if (exists) {
                return true;
            }
        }
        return false;
    }
    /**
     * 检查文件模式是否存在
     */
    async checkFilePatternExists(pattern) {
        try {
            const files = await (0, glob_1.glob)(pattern, {
                cwd: this.projectPath,
                ignore: ['node_modules/**', '.next/**', 'dist/**']
            });
            return files.length > 0;
        }
        catch {
            return false;
        }
    }
    /**
     * 检测已存在的 API 模块
     */
    async detectExistingApiModules() {
        const modules = [];
        const apiModules = ['user', 'product', 'cart', 'order', 'payment'];
        for (const module of apiModules) {
            const pattern = `src/app/api/${module}/**/route.ts`;
            const exists = await this.checkFilePatternExists(pattern);
            if (exists) {
                modules.push(module);
            }
        }
        return modules;
    }
    /**
     * 检查 Prisma 模型是否存在
     */
    checkModelExists(schemaContent, modelName) {
        const modelRegex = new RegExp(`^\\s*model\\s+${modelName}\\s*\\{`, 'm');
        return modelRegex.test(schemaContent);
    }
    /**
     * 从缺口中提取已存在的模块
     */
    getExistingModules(gaps) {
        const allModules = Object.keys(exports.MODULE_REQUIREMENTS);
        const missingModules = gaps
            .filter(g => g.type === 'missing_module')
            .map(g => {
            // 反向查找模块ID
            for (const [id, req] of Object.entries(exports.MODULE_REQUIREMENTS)) {
                if (req.name === g.name)
                    return id;
            }
            return '';
        })
            .filter(Boolean);
        return allModules.filter(m => !missingModules.includes(m));
    }
    /**
     * 从缺口中提取缺失的模块
     */
    getMissingModules(gaps) {
        return gaps
            .filter(g => g.type === 'missing_module')
            .map(g => g.name);
    }
    /**
     * 生成模块实现范围
     */
    generateModuleScope(moduleId, requirement) {
        const scopes = {
            user: '实现用户注册、登录、JWT 认证、权限验证中间件',
            product: '实现商品列表、详情页、分类、搜索功能',
            cart: '实现购物车添加、删除、数量修改、结算功能',
            order: '实现订单创建、状态管理、订单历史查询',
            payment: '实现支付网关集成、支付状态回调、退款处理'
        };
        return scopes[moduleId] || `实现 ${requirement.name} 的核心功能`;
    }
    /**
     * 生成 API 实现范围
     */
    generateApiScope(moduleId, requirement) {
        return `创建 ${requirement.name} 的 REST API 端点，包括列表、详情、创建、更新、删除操作`;
    }
    /**
     * 生成用户流程实现范围
     */
    generateFlowScope(missingSteps) {
        return `补全购物流程: ${missingSteps.join(' → ')}`;
    }
    /**
     * 生成数据模型实现范围
     */
    generateModelScope(modelName) {
        const scopes = {
            User: '定义 User 模型: id, email, password, name, role, createdAt 等字段',
            Product: '定义 Product 模型: id, name, description, price, stock, category 等字段',
            Order: '定义 Order 模型: id, userId, items, total, status, createdAt 等字段',
            Cart: '定义 Cart 模型: id, userId, items, 与 Product 关联',
            Payment: '定义 Payment 模型: id, orderId, amount, status, provider, transactionId 等字段'
        };
        return scopes[modelName] || `定义 ${modelName} 数据模型`;
    }
}
exports.RequirementDiscoveryEngine = RequirementDiscoveryEngine;
exports.default = RequirementDiscoveryEngine;
//# sourceMappingURL=RequirementDiscoveryEngine.js.map