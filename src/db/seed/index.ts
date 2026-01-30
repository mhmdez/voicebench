/**
 * Database Seed Runner
 *
 * Idempotent seed script for populating the database with initial data.
 * Can be run multiple times safely - uses upsert logic.
 */

import { eq } from 'drizzle-orm';
import { db, prompts, scenarios } from '../index';
import { seedPrompts, promptSummary } from './prompts';
import { seedScenarios, scenarioSummary } from './scenarios';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface YamlScenario {
  id: string;
  name: string;
  type: 'task-completion' | 'information-retrieval' | 'conversation-flow';
  prompt: string;
  expectedOutcome: string;
  tags: string[];
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface YamlScenarioFile {
  name: string;
  description: string;
  version: string;
  scenarios: YamlScenario[];
}

/**
 * Load scenarios from YAML files in data/scenarios/
 */
function loadYamlScenarios(): YamlScenario[] {
  const scenariosDir = path.join(process.cwd(), 'data', 'scenarios');

  if (!fs.existsSync(scenariosDir)) {
    console.log('  No data/scenarios directory found, skipping YAML scenarios');
    return [];
  }

  const yamlFiles = fs.readdirSync(scenariosDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  const allScenarios: YamlScenario[] = [];

  for (const file of yamlFiles) {
    const filePath = path.join(scenariosDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.parse(content) as YamlScenarioFile;

    if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
      console.log(`  Loaded ${parsed.scenarios.length} scenarios from ${file}`);
      allScenarios.push(...parsed.scenarios);
    }
  }

  return allScenarios;
}

/**
 * Seed prompts table
 */
async function seedPromptsTable(): Promise<number> {
  console.log('\n📝 Seeding prompts...');
  console.log(`  Total prompts to seed: ${promptSummary.total}`);
  console.log(`  Categories: general(${promptSummary.general}), customer-support(${promptSummary.customerSupport}), information-retrieval(${promptSummary.informationRetrieval}), creative(${promptSummary.creative}), multilingual(${promptSummary.multilingual})`);

  let inserted = 0;
  let updated = 0;

  for (const prompt of seedPrompts) {
    const existing = await db.select().from(prompts).where(eq(prompts.id, prompt.id)).get();

    if (existing) {
      // Update existing
      await db
        .update(prompts)
        .set({
          category: prompt.category,
          text: prompt.text,
          language: prompt.language,
        })
        .where(eq(prompts.id, prompt.id));
      updated++;
    } else {
      // Insert new
      await db.insert(prompts).values({
        id: prompt.id,
        category: prompt.category,
        text: prompt.text,
        language: prompt.language,
        isActive: true,
      });
      inserted++;
    }
  }

  console.log(`  ✓ Inserted: ${inserted}, Updated: ${updated}`);
  return inserted + updated;
}

/**
 * Seed scenarios table (from TypeScript + YAML)
 */
async function seedScenariosTable(): Promise<number> {
  console.log('\n🎬 Seeding scenarios...');

  // Load from TypeScript
  console.log(`  TypeScript scenarios: ${scenarioSummary.total}`);
  console.log(`  Types: task-completion(${scenarioSummary.taskCompletion}), information-retrieval(${scenarioSummary.informationRetrieval}), conversation-flow(${scenarioSummary.conversationFlow})`);

  // Load from YAML files
  console.log('\n  Loading YAML scenarios...');
  const yamlScenarios = loadYamlScenarios();

  // Combine all scenarios
  const allScenarios = [
    ...seedScenarios.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      prompt: s.prompt,
      expectedOutcome: s.expectedOutcome,
      tags: s.tags,
      language: s.language,
      difficulty: s.difficulty,
    })),
    ...yamlScenarios,
  ];

  console.log(`\n  Total scenarios to seed: ${allScenarios.length}`);

  let inserted = 0;
  let updated = 0;

  for (const scenario of allScenarios) {
    const existing = await db.select().from(scenarios).where(eq(scenarios.id, scenario.id)).get();

    if (existing) {
      // Update existing
      await db
        .update(scenarios)
        .set({
          name: scenario.name,
          type: scenario.type,
          prompt: scenario.prompt,
          expectedOutcome: scenario.expectedOutcome,
          tags: scenario.tags,
          language: scenario.language,
          difficulty: scenario.difficulty,
        })
        .where(eq(scenarios.id, scenario.id));
      updated++;
    } else {
      // Insert new
      await db.insert(scenarios).values({
        id: scenario.id,
        name: scenario.name,
        type: scenario.type,
        prompt: scenario.prompt,
        expectedOutcome: scenario.expectedOutcome,
        tags: scenario.tags,
        language: scenario.language,
        difficulty: scenario.difficulty,
      });
      inserted++;
    }
  }

  console.log(`  ✓ Inserted: ${inserted}, Updated: ${updated}`);
  return inserted + updated;
}

/**
 * Main seed function
 */
async function seed(): Promise<void> {
  console.log('🌱 VoiceBench Database Seed');
  console.log('===========================');

  const startTime = Date.now();

  try {
    const promptCount = await seedPromptsTable();
    const scenarioCount = await seedScenariosTable();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n===========================');
    console.log('✅ Seed completed successfully!');
    console.log(`   Prompts: ${promptCount}`);
    console.log(`   Scenarios: ${scenarioCount}`);
    console.log(`   Duration: ${duration}s`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
seed();
