/**
 * Skill installer - handles installation to different targets
 */
export interface SkillInfo {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    tags: string[];
    downloadUrl: string;
    npmPackage?: string;
    tools: Array<{
        name: string;
        description: string;
    }>;
}
export interface InstallOptions {
    target: "kai" | "mcp" | "local";
    config?: string;
    claudeConfig?: string;
}
/**
 * Fetch skills from registry
 */
export declare function listSkills(): Promise<SkillInfo[]>;
/**
 * Install a skill to the specified target
 */
export declare function installSkill(skillId: string, options: InstallOptions): Promise<void>;
/**
 * Uninstall a skill
 */
export declare function uninstallSkill(skillId: string, options: InstallOptions): Promise<void>;
/**
 * Update all installed skills
 */
export declare function updateSkills(options: InstallOptions): Promise<number>;
