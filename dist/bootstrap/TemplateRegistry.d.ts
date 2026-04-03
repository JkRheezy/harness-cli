/**
 * Template Registry for Six-Layer Architecture
 * Manages templates for all 6 layers with tech stack support
 */
import { LayerName, LayerTemplate, TechStackChoice } from './types';
export declare class TemplateRegistry {
    private templates;
    constructor();
    /**
     * Get a template for a specific layer and tech stack
     * Falls back through progressively more generic keys, then to 'default'
     */
    getTemplate(layer: LayerName, techStack: TechStackChoice): LayerTemplate | undefined;
    /**
     * Build a list of fallback keys from most specific to most generic
     */
    private buildFallbackKeys;
    /**
     * Register a custom template for a layer
     */
    registerTemplate(layer: LayerName, key: string, template: LayerTemplate): void;
    /**
     * Get all templates for a specific layer
     */
    getLayerTemplates(layer: LayerName): LayerTemplate[];
    /**
     * Build a key from tech stack choices
     * Format: {language}-{database}-{frontend} (optional parts omitted if 'none')
     */
    private buildKey;
    /**
     * Register all default templates for the six-layer architecture
     */
    private registerDefaultTemplates;
}
//# sourceMappingURL=TemplateRegistry.d.ts.map