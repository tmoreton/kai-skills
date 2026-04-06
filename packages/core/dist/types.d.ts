/**
 * Core types for Kai Skills
 *
 * These types define the contract between skills and their consumers
 * (Kai, MCP servers, or direct API usage).
 */
/** Skill manifest - defines the skill's metadata and tools */
export interface SkillManifest {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    tags?: string[];
    tools: SkillToolDefinition[];
    config_schema?: Record<string, SkillConfigField>;
}
/** Definition of a single tool/action */
export interface SkillToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, SkillParamDefinition>;
    required?: string[];
}
/** Parameter definition for tool inputs */
export interface SkillParamDefinition {
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
    required?: boolean;
    enum?: string[];
    default?: any;
    items?: SkillParamDefinition;
}
/** Configuration field definition */
export interface SkillConfigField {
    type: string;
    description?: string;
    required?: boolean;
    env?: string;
    default?: any;
}
/** Skill handler - the implementation */
export interface SkillHandler {
    /** Called when skill is loaded/installed */
    install?: (config: Record<string, any>) => Promise<void>;
    /** Called when skill is unloaded/uninstalled */
    uninstall?: () => Promise<void>;
    /** Map of action names to implementations */
    actions: Record<string, SkillAction>;
}
/** Individual action function */
export type SkillAction = (params: Record<string, any>) => Promise<any>;
/** Loaded skill instance */
export interface LoadedSkill {
    manifest: SkillManifest;
    handler: SkillHandler;
    config: Record<string, any>;
    path: string;
    loaded_at: number;
}
/** Skill registry entry */
export interface SkillRegistryEntry {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    tags: string[];
    downloadUrl: string;
    npmPackage?: string;
    tools: Pick<SkillToolDefinition, "name" | "description">[];
}
