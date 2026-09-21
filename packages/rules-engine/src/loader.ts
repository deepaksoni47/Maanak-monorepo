import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const Table3ClassLimitSchema = z.object({
  minVerificationScaleInterval: z.string(),
  maxVerificationScaleInterval: z.string().optional(),
  minVerificationScaleIntervalUnit: z.string().default("kg"),
  minVerificationScaleDivisionsN: z.number().int().nonnegative(),
  maxVerificationScaleDivisionsN: z.number().int().nonnegative().nullable(),
  minCapacityFactorE: z.number().nonnegative(),
});

export const Table3ClassificationSchema = z.object({
  I: z.array(Table3ClassLimitSchema),
  II: z.array(Table3ClassLimitSchema),
  III: z.array(Table3ClassLimitSchema),
  IIII: z.array(Table3ClassLimitSchema),
});

export const Table6MpeBracketItemSchema = z.object({
  minMInDivisions: z.number().nonnegative(),
  maxMInDivisions: z.number().nonnegative().nullable(),
  mpeFactorE: z.string(),
});

export const AccuracyClassMpeBracketsSchema = z.object({
  I: z.array(Table6MpeBracketItemSchema),
  II: z.array(Table6MpeBracketItemSchema),
  III: z.array(Table6MpeBracketItemSchema),
  IIII: z.array(Table6MpeBracketItemSchema),
});

export const Table6MpeBracketsSchema = z.object({
  initialVerification: AccuracyClassMpeBracketsSchema,
  inService: AccuracyClassMpeBracketsSchema.optional(),
});

export const EnvironmentalConstraintsSchema = z.object({
  maxTemperatureDriftRateCPerHour: z.number(),
  defaultOperatingTempMinC: z.number(),
  defaultOperatingTempMaxC: z.number(),
  relativeHumidityMinPercent: z.number(),
  relativeHumidityMaxPercent: z.number(),
});

export const MetrologicalRulesSchema = z.object({
  nabl129MaxUncertaintyToMpeRatio: z.string(),
  repeatabilityToleranceFactor: z.string(),
  creep30MinToleranceFactorE: z.string(),
  creep15To30MinToleranceFactorE: z.string(),
  zeroReturnToleranceFactorE: z.string(),
  eccentricityToleranceFactor: z.string(),
  discriminationLoadMultiplierD: z.string(),
});

export const RulePackSchema = z.object({
  $schema: z.string().optional(),
  id: z.string().min(1),
  standard: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  effectiveFrom: z.string().min(1),
  issuingBody: z.string().min(1),
  description: z.string().optional(),
  table3Classification: Table3ClassificationSchema,
  table6MpeBrackets: Table6MpeBracketsSchema,
  environmentalConstraints: EnvironmentalConstraintsSchema,
  metrologicalRules: MetrologicalRulesSchema,
});

export type Table3ClassLimit = z.infer<typeof Table3ClassLimitSchema>;
export type Table3Classification = z.infer<typeof Table3ClassificationSchema>;
export type Table6MpeBracketItem = z.infer<typeof Table6MpeBracketItemSchema>;
export type AccuracyClassMpeBrackets = z.infer<typeof AccuracyClassMpeBracketsSchema>;
export type Table6MpeBrackets = z.infer<typeof Table6MpeBracketsSchema>;
export type EnvironmentalConstraints = z.infer<typeof EnvironmentalConstraintsSchema>;
export type MetrologicalRules = z.infer<typeof MetrologicalRulesSchema>;
export type RulePack = z.infer<typeof RulePackSchema>;

/**
 * Validates any unknown object against the RulePackSchema.
 * Throws ZodError if validation fails.
 */
export function validateRulePack(rulePackData: unknown): RulePack {
  return RulePackSchema.parse(rulePackData);
}

/**
 * Safely validates any unknown object against the RulePackSchema without throwing.
 */
export function safeValidateRulePack(rulePackData: unknown) {
  return RulePackSchema.safeParse(rulePackData);
}

/**
 * Loads and validates a RulePack JSON file synchronously from the filesystem.
 */
export function loadRulePack(filePath: string): RulePack {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Rule pack file not found at path: ${filePath}`);
  }
  const rawData = fs.readFileSync(filePath, "utf-8");
  const parsedJson = JSON.parse(rawData);
  return validateRulePack(parsedJson);
}

/**
 * Resolves the filesystem path to the default bundled OIML R-76 rule pack.
 */
export function getDefaultRulePackPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.join(currentDir, "rules", "oiml-r76-2006-v1.json"),
    path.join(currentDir, "..", "src", "rules", "oiml-r76-2006-v1.json"),
    path.join(currentDir, "oiml-r76-2006-v1.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(`Default rule pack oiml-r76-2006-v1.json could not be located from ${currentDir}`);
}

/**
 * Loads the default bundled OIML R-76 rule pack.
 */
export function loadDefaultRulePack(): RulePack {
  const defaultPath = getDefaultRulePackPath();
  return loadRulePack(defaultPath);
}
