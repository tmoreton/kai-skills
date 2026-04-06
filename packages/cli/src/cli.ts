#!/usr/bin/env node
/**
 * Kai Skills CLI
 * 
 * One-click installer for Kai skills into various targets:
 * - Kai: Install to ~/.kai/skills/
 * - MCP: Add to Claude Desktop or other MCP clients
 * - Local: Install to local project
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { installSkill, listSkills, updateSkills, uninstallSkill } from "./installer.js";

const program = new Command();

program
  .name("kai-skills")
  .description("Install and manage Kai skills")
  .version("1.0.0");

program
  .command("install [skill]")
  .description("Install a skill (or all skills if no argument)")
  .option("-t, --target <type>", "Installation target: kai|mcp|local", "kai")
  .option("-c, --config <path>", "Path to config file (JSON)")
  .option("--claude-config <path>", "Path to Claude Desktop config")
  .action(async (skill, options) => {
    if (!skill) {
      const spinner = ora("Installing all skills...").start();
      try {
        const skills = await listSkills();
        for (const s of skills) {
          spinner.text = `Installing ${s.name}...`;
          await installSkill(s.id, options);
        }
        spinner.succeed("All skills installed");
      } catch (err) {
        spinner.fail(`Failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    } else {
      const spinner = ora(`Installing ${skill}...`).start();
      try {
        await installSkill(skill, options);
        spinner.succeed(`${chalk.green(skill)} installed to ${chalk.cyan(options.target)}`);
      } catch (err) {
        spinner.fail(`Failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    }
  });

program
  .command("list")
  .description("List available skills")
  .action(async () => {
    const skills = await listSkills();
    console.log("\n" + chalk.bold("Available Skills:") + "\n");
    
    for (const skill of skills) {
      console.log(`${chalk.cyan(skill.id)} ${chalk.gray(`v${skill.version}`)}`);
      console.log(`  ${skill.description}`);
      console.log(`  Tools: ${skill.tools.map(t => chalk.yellow(t.name)).join(", ")}`);
      console.log();
    }
  });

program
  .command("uninstall <skill>")
  .description("Uninstall a skill")
  .option("-t, --target <type>", "Target: kai|mcp|local", "kai")
  .action(async (skill, options) => {
    const spinner = ora(`Uninstalling ${skill}...`).start();
    try {
      await uninstallSkill(skill, options);
      spinner.succeed(`${chalk.green(skill)} uninstalled`);
    } catch (err) {
      spinner.fail(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command("update")
  .description("Update all installed skills")
  .option("-t, --target <type>", "Target: kai|mcp|local", "kai")
  .action(async (options) => {
    const spinner = ora("Updating skills...").start();
    try {
      const updated = await updateSkills(options);
      spinner.succeed(`Updated ${updated} skills`);
    } catch (err) {
      spinner.fail(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command("info <skill>")
  .description("Show detailed info about a skill")
  .action(async (skill) => {
    const skills = await listSkills();
    const info = skills.find(s => s.id === skill);
    if (!info) {
      console.log(chalk.red(`Skill "${skill}" not found`));
      process.exit(1);
    }

    console.log(`\n${chalk.bold(info.name)} ${chalk.gray(`v${info.version}`)}`);
    console.log(`Author: ${info.author}`);
    console.log(`\n${info.description}\n`);
    console.log(chalk.bold("Tools:"));
    for (const tool of info.tools) {
      console.log(`  ${chalk.cyan(tool.name)} - ${tool.description}`);
    }
    console.log();
  });

program.parse();
