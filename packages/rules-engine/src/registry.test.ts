import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AccuracyClass } from "@maanak/types";
import { RulePackRegistry } from "./registry.js";
import { loadDefaultRulePack } from "./loader.js";
import { getMpe } from "./mpe.js";
import { classifyInstrument } from "./classifier.js";

describe("TASK-013: Dynamic Rule Pack In-Memory Registry & Hot-Swap (registry.ts)", () => {
  let registry: RulePackRegistry;

  beforeEach(() => {
    registry = new RulePackRegistry();
  });

  test("initializes with default OIML R-76 rule pack active", () => {
    assert.equal(registry.hasRulePack("oiml-r76-2006-v1"), true);
    const active = registry.getActiveRulePack();
    assert.equal(active.id, "oiml-r76-2006-v1");
    assert.equal(active.standard, "OIML R 76-1:2006");
  });

  test("lists registered rule packs with metadata and active state", () => {
    const list = registry.listRulePacks();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "oiml-r76-2006-v1");
    assert.equal(list[0].isActive, true);
    assert.equal(list[0].version, "1.0.0");
  });

  test("registers and hot-swaps to a new custom rule pack version at runtime", () => {
    const basePack = loadDefaultRulePack();
    const customPack = structuredClone(basePack);

    // Modify metadata and custom MPE bracket for Class III
    customPack.id = "oiml-r76-2026-v2";
    customPack.title = "OIML R 76-1:2026 Future Revision Draft";
    customPack.version = "2.0.0";
    customPack.table6MpeBrackets.initialVerification.III[0].mpeFactorE = "0.25"; // Tighter 0.25e tolerance

    // Register and set active
    registry.registerRulePack(customPack, { setActive: true });

    assert.equal(registry.hasRulePack("oiml-r76-2026-v2"), true);
    assert.equal(registry.getActiveRulePack().id, "oiml-r76-2026-v2");

    const list = registry.listRulePacks();
    assert.equal(list.length, 2);

    const oldPackMeta = list.find((p) => p.id === "oiml-r76-2006-v1");
    const newPackMeta = list.find((p) => p.id === "oiml-r76-2026-v2");

    assert.equal(oldPackMeta?.isActive, false);
    assert.equal(newPackMeta?.isActive, true);

    // Query MPE with default pack vs new hot-swapped pack
    const defaultMpe = getMpe("2.5 kg", "5 g", AccuracyClass.CLASS_III, {
      rulePack: registry.getRulePack("oiml-r76-2006-v1"),
    });
    assert.equal(defaultMpe.mpeFactorE, "0.5");
    assert.equal(defaultMpe.mpeInMass, "0.0025"); // 2.5 g

    const hotSwappedMpe = getMpe("2.5 kg", "5 g", AccuracyClass.CLASS_III, {
      rulePack: registry.getActiveRulePack(),
    });
    assert.equal(hotSwappedMpe.mpeFactorE, "0.25");
    assert.equal(hotSwappedMpe.mpeInMass, "0.00125"); // 1.25 g with tighter draft standard
  });

  test("switches active rule pack via setActiveRulePack()", () => {
    const basePack = loadDefaultRulePack();
    const futurePack = { ...basePack, id: "oiml-r76-future-v3", version: "3.0.0" };

    registry.registerRulePack(futurePack, { setActive: false });
    assert.equal(registry.getActiveRulePack().id, "oiml-r76-2006-v1");

    registry.setActiveRulePack("oiml-r76-future-v3");
    assert.equal(registry.getActiveRulePack().id, "oiml-r76-future-v3");
  });

  test("throws error when getting unregistered rule pack ID", () => {
    assert.throws(
      () => registry.getRulePack("unknown-id"),
      /not registered in the registry/,
    );
  });

  test("prevents removing the currently active rule pack", () => {
    assert.throws(
      () => registry.removeRulePack("oiml-r76-2006-v1"),
      /Cannot remove active rule pack/,
    );
  });

  test("allows removing non-active rule pack", () => {
    const basePack = loadDefaultRulePack();
    const tempPack = { ...basePack, id: "oiml-temp-v1" };

    registry.registerRulePack(tempPack, { setActive: false });
    assert.equal(registry.hasRulePack("oiml-temp-v1"), true);

    const removed = registry.removeRulePack("oiml-temp-v1");
    assert.equal(removed, true);
    assert.equal(registry.hasRulePack("oiml-temp-v1"), false);
  });

  test("resets registry back to clean single default pack", () => {
    const basePack = loadDefaultRulePack();
    const extraPack = { ...basePack, id: "oiml-extra-v1" };

    registry.registerRulePack(extraPack);
    assert.equal(registry.listRulePacks().length, 2);

    registry.reset();
    assert.equal(registry.listRulePacks().length, 1);
    assert.equal(registry.getActiveRulePack().id, "oiml-r76-2006-v1");
  });
});
