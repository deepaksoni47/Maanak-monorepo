import {
  RulePack,
  validateRulePack,
  loadRulePack,
  loadDefaultRulePack,
} from "./loader.js";

export interface RulePackMetadata {
  id: string;
  standard: string;
  title: string;
  version: string;
  effectiveFrom: string;
  issuingBody: string;
  description?: string;
  isActive: boolean;
}

export interface RegisterRulePackOptions {
  setActive?: boolean;
}

/**
 * In-Memory Rule Pack Registry supporting runtime hot-swapping of OIML standards-as-code packs.
 */
export class RulePackRegistry {
  private packs: Map<string, RulePack> = new Map();
  private activePackId: string | null = null;

  constructor(autoLoadDefault = true) {
    if (autoLoadDefault) {
      try {
        const defaultPack = loadDefaultRulePack();
        this.registerRulePack(defaultPack, { setActive: true });
      } catch {
        // Handled gracefully if environment is pure mock
      }
    }
  }

  /**
   * Registers a RulePack instance or raw JSON data into the registry.
   */
  public registerRulePack(
    packData: RulePack | unknown,
    options: RegisterRulePackOptions = {},
  ): RulePack {
    const validatedPack = validateRulePack(packData);
    this.packs.set(validatedPack.id, validatedPack);

    if (options.setActive || !this.activePackId) {
      this.activePackId = validatedPack.id;
    }

    return validatedPack;
  }

  /**
   * Loads a RulePack JSON file from disk and registers it.
   */
  public registerRulePackFromFile(
    filePath: string,
    options: RegisterRulePackOptions = {},
  ): RulePack {
    const loaded = loadRulePack(filePath);
    return this.registerRulePack(loaded, options);
  }

  /**
   * Retrieves a registered RulePack by its ID, or returns the currently active pack if no ID is specified.
   */
  public getRulePack(id?: string): RulePack {
    const targetId = id || this.activePackId;

    if (!targetId) {
      throw new Error("No rule pack specified and no active rule pack set in registry");
    }

    const pack = this.packs.get(targetId);
    if (!pack) {
      throw new Error(`Rule pack with ID "${targetId}" is not registered in the registry`);
    }

    return pack;
  }

  /**
   * Checks whether a rule pack with the specified ID exists in the registry.
   */
  public hasRulePack(id: string): boolean {
    return this.packs.has(id);
  }

  /**
   * Sets the active rule pack by its registered ID.
   */
  public setActiveRulePack(id: string): RulePack {
    const pack = this.getRulePack(id);
    this.activePackId = id;
    return pack;
  }

  /**
   * Gets the currently active rule pack.
   */
  public getActiveRulePack(): RulePack {
    return this.getRulePack();
  }

  /**
   * Lists metadata for all registered rule packs.
   */
  public listRulePacks(): RulePackMetadata[] {
    const result: RulePackMetadata[] = [];
    for (const pack of this.packs.values()) {
      result.push({
        id: pack.id,
        standard: pack.standard,
        title: pack.title,
        version: pack.version,
        effectiveFrom: pack.effectiveFrom,
        issuingBody: pack.issuingBody,
        description: pack.description,
        isActive: pack.id === this.activePackId,
      });
    }
    return result;
  }

  /**
   * Removes a rule pack by its ID. Cannot remove the currently active rule pack unless another is selected.
   */
  public removeRulePack(id: string): boolean {
    if (this.activePackId === id) {
      throw new Error(`Cannot remove active rule pack "${id}". Switch active pack before removal.`);
    }
    return this.packs.delete(id);
  }

  /**
   * Clears all registered packs and resets to default bundled pack.
   */
  public reset(): void {
    this.packs.clear();
    this.activePackId = null;
    const defaultPack = loadDefaultRulePack();
    this.registerRulePack(defaultPack, { setActive: true });
  }
}

// Default global registry singleton
export const rulePackRegistry = new RulePackRegistry();

// Export convenience functions bound to the default global registry
export function registerRulePack(packData: RulePack | unknown, options?: RegisterRulePackOptions): RulePack {
  return rulePackRegistry.registerRulePack(packData, options);
}

export function registerRulePackFromFile(filePath: string, options?: RegisterRulePackOptions): RulePack {
  return rulePackRegistry.registerRulePackFromFile(filePath, options);
}

export function getRulePack(id?: string): RulePack {
  return rulePackRegistry.getRulePack(id);
}

export function hasRulePack(id: string): boolean {
  return rulePackRegistry.hasRulePack(id);
}

export function setActiveRulePack(id: string): RulePack {
  return rulePackRegistry.setActiveRulePack(id);
}

export function getActiveRulePack(): RulePack {
  return rulePackRegistry.getActiveRulePack();
}

export function listRulePacks(): RulePackMetadata[] {
  return rulePackRegistry.listRulePacks();
}
