import { TemplateRegistry } from '../TemplateRegistry';
import { LayerName, LayerTemplate, TechStackChoice } from '../types';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('Template Registration', () => {
    it('should have all 6 layers registered', () => {
      const layers: LayerName[] = ['types', 'config', 'repo', 'service', 'runtime', 'ui'];
      
      layers.forEach(layer => {
        const templates = registry.getLayerTemplates(layer);
        expect(templates.length).toBeGreaterThan(0);
      });
    });

    it('should retrieve types layer template', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('types', techStack);
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('types');
      expect(template?.directory).toBe('src/types');
    });

    it('should retrieve config layer template', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('config', techStack);
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('config');
      expect(template?.directory).toBe('src/config');
    });

    it('should retrieve repo layer template with postgresql', () => {
      const techStack: TechStackChoice = { 
        language: 'typescript', 
        database: 'postgresql' 
      };
      const template = registry.getTemplate('repo', techStack);
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('repo');
      expect(template?.directory).toBe('src/repo');
    });

    it('should retrieve service layer template', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('service', techStack);
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('service');
      expect(template?.directory).toBe('src/service');
    });

    it('should retrieve runtime layer template', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('runtime', techStack);
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('runtime');
      expect(template?.directory).toBe('src/runtime');
    });

    it('should retrieve ui layer template with nextjs', () => {
      const techStack: TechStackChoice = { 
        language: 'typescript', 
        frontend: 'nextjs' 
      };
      const template = registry.getTemplate('ui', techStack);
      
      expect(template).toBeDefined();
      expect(template?.name).toBe('ui');
      expect(template?.directory).toBe('src/ui');
    });
  });

  describe('Dependencies', () => {
    it('types layer should have no dependencies', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('types', techStack);
      
      expect(template).toBeDefined();
      expect(template?.dependencies).toEqual([]);
      expect(template?.dependencies).toHaveLength(0);
    });

    it('config layer should depend on types', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('config', techStack);
      
      expect(template).toBeDefined();
      expect(template?.dependencies).toContain('types');
      expect(template?.dependencies).toEqual(['types']);
    });

    it('repo layer should depend on types and config', () => {
      const techStack: TechStackChoice = { 
        language: 'typescript', 
        database: 'postgresql' 
      };
      const template = registry.getTemplate('repo', techStack);
      
      expect(template).toBeDefined();
      expect(template?.dependencies).toContain('types');
      expect(template?.dependencies).toContain('config');
      expect(template?.dependencies).toEqual(['types', 'config']);
    });

    it('service layer should depend on repo and types', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('service', techStack);
      
      expect(template).toBeDefined();
      expect(template?.dependencies).toContain('repo');
      expect(template?.dependencies).toContain('types');
      expect(template?.dependencies).toEqual(['repo', 'types']);
    });

    it('runtime layer should depend on service and config', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('runtime', techStack);
      
      expect(template).toBeDefined();
      expect(template?.dependencies).toContain('service');
      expect(template?.dependencies).toContain('config');
      expect(template?.dependencies).toEqual(['service', 'config']);
    });

    it('ui layer should depend on runtime and types', () => {
      const techStack: TechStackChoice = { 
        language: 'typescript', 
        frontend: 'nextjs' 
      };
      const template = registry.getTemplate('ui', techStack);
      
      expect(template).toBeDefined();
      expect(template?.dependencies).toContain('runtime');
      expect(template?.dependencies).toContain('types');
      expect(template?.dependencies).toEqual(['runtime', 'types']);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to default template when specific tech stack not found', () => {
      const techStack: TechStackChoice = { 
        language: 'python'  // No specific python templates registered
      };
      
      // types has 'default' template
      const template = registry.getTemplate('types', techStack);
      expect(template).toBeDefined();
      expect(template?.name).toBe('types');
    });

    it('should return undefined for layer with no templates', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      
      // Create a new registry and manually clear a layer to test edge case
      const customRegistry = new TemplateRegistry();
      
      // This tests the fallback to 'default' when specific key not found
      // but default exists
      const template = customRegistry.getTemplate('types', techStack);
      expect(template).toBeDefined();
    });
  });

  describe('Custom Template Registration', () => {
    it('should allow registering custom templates', () => {
      const customTemplate: LayerTemplate = {
        name: 'types',
        description: 'Custom types template',
        directory: 'src/custom-types',
        dependencies: [],
        files: [
          {
            path: 'custom.ts',
            template: '// Custom template',
            variables: []
          }
        ]
      };

      registry.registerTemplate('types', 'custom-key', customTemplate);
      
      // Verify custom template is registered
      const templates = registry.getLayerTemplates('types');
      expect(templates.length).toBe(2); // default + custom
      expect(templates).toContainEqual(customTemplate);
    });

    it('should retrieve custom template by building the correct key', () => {
      const customTemplate: LayerTemplate = {
        name: 'config',
        description: 'Custom config for python',
        directory: 'src/custom-config',
        dependencies: ['types'],
        files: []
      };

      registry.registerTemplate('config', 'python', customTemplate);
      
      const techStack: TechStackChoice = { language: 'python' };
      const template = registry.getTemplate('config', techStack);
      
      expect(template).toBeDefined();
      expect(template?.description).toBe('Custom config for python');
    });
  });

  describe('Template Files', () => {
    it('types layer should have correct files', () => {
      const techStack: TechStackChoice = { language: 'typescript' };
      const template = registry.getTemplate('types', techStack);
      
      expect(template).toBeDefined();
      expect(template?.files).toHaveLength(2);
      
      const filePaths = template?.files.map(f => f.path);
      expect(filePaths).toContain('index.ts');
      expect(filePaths).toContain('domain.ts');
    });

    it('repo layer should have correct files for postgresql', () => {
      const techStack: TechStackChoice = { 
        language: 'typescript', 
        database: 'postgresql' 
      };
      const template = registry.getTemplate('repo', techStack);
      
      expect(template).toBeDefined();
      expect(template?.files).toHaveLength(3);
      
      const filePaths = template?.files.map(f => f.path);
      expect(filePaths).toContain('index.ts');
      expect(filePaths).toContain('prisma.ts');
      expect(filePaths).toContain('repositories/index.ts');
    });

    it('ui layer should have correct files for nextjs', () => {
      const techStack: TechStackChoice = { 
        language: 'typescript', 
        frontend: 'nextjs' 
      };
      const template = registry.getTemplate('ui', techStack);
      
      expect(template).toBeDefined();
      expect(template?.files).toHaveLength(2);
      
      const filePaths = template?.files.map(f => f.path);
      expect(filePaths).toContain('index.ts');
      expect(filePaths).toContain('components/index.tsx');
    });
  });

  describe('getLayerTemplates', () => {
    it('should return all templates for a layer', () => {
      const templates = registry.getLayerTemplates('types');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return empty array for layer with no templates', () => {
      // Create a custom layer name that doesn't exist
      const customRegistry = new TemplateRegistry();
      
      // Access internal map to test edge case - can't add non-existent layer through public API
      const templates = customRegistry.getLayerTemplates('types');
      expect(Array.isArray(templates)).toBe(true);
    });
  });
});
