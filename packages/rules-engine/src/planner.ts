import { Decimal } from "decimal.js";
import {
  AccuracyClass,
  InstrumentModelSpecification,
  TestPlan,
  TestPlanItem,
  PlannedLoadPoint,
  TestFormType,
  UnitOfMeasurement,
} from "@maanak/types";
import { RulePack, Table6MpeBracketItem, loadDefaultRulePack } from "./loader.js";
import { parseMass, normalizeAccuracyClass, UNIT_TO_KG_FACTORS } from "./classifier.js";
import { getMpe } from "./mpe.js";

/**
 * Options for test plan generation.
 */
export interface GenerateTestPlanOptions {
  rulePack?: RulePack;
  title?: string;
  repeatabilityRepetitions?: number;
  intermediatePointsCount?: number;
}

/**
 * Dynamic Test Plan Generator
 *
 * Generates official OIML R 76-1 / R 76-2 compliant test plans for Forms 1 through 6
 * tailored to an instrument's metrological specifications (Class, Max, Min, e, d).
 */
export function generateTestPlan(
  instrument: InstrumentModelSpecification,
  optionsOrRulePack?: GenerateTestPlanOptions | RulePack,
): TestPlan {
  let options: GenerateTestPlanOptions = {};
  let rulePack: RulePack;

  if (optionsOrRulePack) {
    if ("table6MpeBrackets" in optionsOrRulePack) {
      rulePack = optionsOrRulePack as RulePack;
    } else {
      options = optionsOrRulePack as GenerateTestPlanOptions;
      rulePack = options.rulePack || loadDefaultRulePack();
    }
  } else {
    rulePack = loadDefaultRulePack();
  }

  const normClass = normalizeAccuracyClass(instrument.accuracyClass);
  const enumClass = (AccuracyClass[`CLASS_${normClass}` as keyof typeof AccuracyClass] ||
    normClass) as AccuracyClass;

  const unit: UnitOfMeasurement = instrument.unitOfMeasure || "kg";
  const unitFactor = UNIT_TO_KG_FACTORS[unit];

  // Parse capacities and intervals
  const parsedMax = parseMass(instrument.maxCapacity, unit);
  const parsedE = parseMass(instrument.verificationIntervalE, unit);
  const parsedD = instrument.actualIntervalD
    ? parseMass(instrument.actualIntervalD, unit)
    : parsedE;

  if (parsedE.valueInKg.lte(0)) {
    throw new Error("Verification scale interval (e) must be strictly positive (> 0)");
  }
  if (parsedMax.valueInKg.lte(0)) {
    throw new Error("Maximum capacity (Max) must be strictly positive (> 0)");
  }

  // Min capacity
  let parsedMin = instrument.minCapacity
    ? parseMass(instrument.minCapacity, unit)
    : null;

  if (!parsedMin || parsedMin.valueInKg.lte(0)) {
    // Look up Table 3 min capacity factor e
    const classLimits = rulePack.table3Classification[normClass];
    const minFactor = classLimits && classLimits.length > 0 ? classLimits[0].minCapacityFactorE : 20;
    const minValInKg = parsedE.valueInKg.mul(minFactor);
    const minValInUnit = minValInKg.div(unitFactor);
    parsedMin = {
      value: minValInUnit,
      unit,
      valueInKg: minValInKg,
    };
  }

  const maxKg = parsedMax.valueInKg;
  const minKg = parsedMin.valueInKg;
  const eKg = parsedE.valueInKg;
  const dKg = parsedD.valueInKg;
  const n = maxKg.div(eKg).round().toNumber();

  // -------------------------------------------------------------
  // 1. Form 1: Weighing Performance (OIML R 76-1 A.4.4)
  // -------------------------------------------------------------
  // Find MPE step change points from Table 6
  const brackets: Table6MpeBracketItem[] = rulePack.table6MpeBrackets.initialVerification[normClass] || [];
  const uniqueLoadsSet = new Set<string>();

  // Helper to add load
  const addLoad = (valKg: Decimal) => {
    if (valKg.gte(0) && valKg.lte(maxKg)) {
      uniqueLoadsSet.add(valKg.toFixed(8));
    }
  };

  addLoad(new Decimal(0)); // Zero
  addLoad(minKg);          // Min

  // Add Table 6 step change points (e.g. 500e, 2000e for Class III)
  for (const bracket of brackets) {
    if (bracket.maxMInDivisions !== null) {
      const stepChangeKg = eKg.mul(bracket.maxMInDivisions);
      addLoad(stepChangeKg);
    }
  }

  // Add 50% Max and 100% Max
  const halfMaxKg = maxKg.mul("0.5");
  addLoad(halfMaxKg);
  addLoad(maxKg);

  // If fewer than 5 non-zero points exist between Min and Max, interpolate
  const currentSorted = Array.from(uniqueLoadsSet)
    .map((s) => new Decimal(s))
    .sort((a, b) => a.minus(b).toNumber());

  if (currentSorted.length < 6) {
    addLoad(maxKg.mul("0.25"));
    addLoad(maxKg.mul("0.75"));
  }

  // Sort ascending unique loads
  const ascendingKgList = Array.from(uniqueLoadsSet)
    .map((s) => new Decimal(s))
    .sort((a, b) => a.minus(b).toNumber());

  const form1WeighingPoints: PlannedLoadPoint[] = [];
  let seq = 1;

  // Ascending run
  for (const loadKg of ascendingKgList) {
    const loadInUnit = loadKg.div(unitFactor);
    const mpeRes = getMpe(loadKg, eKg, normClass, { loadUnit: "kg", eUnit: "kg", rulePack });

    let loadType: PlannedLoadPoint["loadType"] = "INTERMEDIATE";
    let desc = `Ascending load: ${loadInUnit.toFixed()} ${unit}`;

    if (loadKg.isZero()) {
      loadType = "ZERO";
      desc = "Zero load baseline (ascending)";
    } else if (loadKg.equals(minKg)) {
      loadType = "MIN";
      desc = `Minimum capacity Min (${parsedMin.value.toFixed()} ${unit})`;
    } else if (loadKg.equals(maxKg)) {
      loadType = "MAX";
      desc = `Maximum capacity Max (${parsedMax.value.toFixed()} ${unit})`;
    } else if (loadKg.equals(halfMaxKg)) {
      loadType = "HALF_MAX";
      desc = `50% Maximum capacity (0.5 Max = ${loadInUnit.toFixed()} ${unit})`;
    } else {
      // Check if matches a step change point
      const mDiv = loadKg.div(eKg).round().toNumber();
      const isMpeChange = brackets.some((b) => b.maxMInDivisions === mDiv);
      if (isMpeChange) {
        loadType = "MPE_CHANGE";
        desc = `MPE step change point (${mDiv}e = ${loadInUnit.toFixed()} ${unit})`;
      }
    }

    form1WeighingPoints.push({
      sequenceNumber: seq++,
      nominalLoad: loadInUnit.toFixed(),
      nominalLoadNumber: loadInUnit.toNumber(),
      unit,
      nominalLoadInKg: loadKg.toFixed(),
      loadType,
      direction: "ASCENDING",
      mpeExpected: new Decimal(mpeRes.mpeInMass).div(unitFactor).toFixed(),
      mpeExpectedFactorE: mpeRes.mpeFactorE,
      description: desc,
    });
  }

  // Descending run (from Max - 1 down to Zero)
  const descendingKgList = [...ascendingKgList].reverse().slice(1); // skip duplicate Max
  for (const loadKg of descendingKgList) {
    const loadInUnit = loadKg.div(unitFactor);
    const mpeRes = getMpe(loadKg, eKg, normClass, { loadUnit: "kg", eUnit: "kg", rulePack });

    let loadType: PlannedLoadPoint["loadType"] = "INTERMEDIATE";
    let desc = `Descending load: ${loadInUnit.toFixed()} ${unit}`;

    if (loadKg.isZero()) {
      loadType = "ZERO";
      desc = "Zero load return (descending)";
    } else if (loadKg.equals(minKg)) {
      loadType = "MIN";
      desc = `Minimum capacity Min (${parsedMin.value.toFixed()} ${unit})`;
    } else if (loadKg.equals(halfMaxKg)) {
      loadType = "HALF_MAX";
      desc = `50% Maximum capacity (0.5 Max = ${loadInUnit.toFixed()} ${unit})`;
    } else {
      const mDiv = loadKg.div(eKg).round().toNumber();
      const isMpeChange = brackets.some((b) => b.maxMInDivisions === mDiv);
      if (isMpeChange) {
        loadType = "MPE_CHANGE";
        desc = `MPE step change point (${mDiv}e = ${loadInUnit.toFixed()} ${unit})`;
      }
    }

    form1WeighingPoints.push({
      sequenceNumber: seq++,
      nominalLoad: loadInUnit.toFixed(),
      nominalLoadNumber: loadInUnit.toNumber(),
      unit,
      nominalLoadInKg: loadKg.toFixed(),
      loadType,
      direction: "DESCENDING",
      mpeExpected: new Decimal(mpeRes.mpeInMass).div(unitFactor).toFixed(),
      mpeExpectedFactorE: mpeRes.mpeFactorE,
      description: desc,
    });
  }

  // -------------------------------------------------------------
  // 2. Form 2: Temperature Effect on No-Load (Clause A.5.3.2)
  // -------------------------------------------------------------
  const tMin = instrument.tempRangeMinC !== undefined
    ? Number(instrument.tempRangeMinC)
    : rulePack.environmentalConstraints.defaultOperatingTempMinC;
  const tMax = instrument.tempRangeMaxC !== undefined
    ? Number(instrument.tempRangeMaxC)
    : rulePack.environmentalConstraints.defaultOperatingTempMaxC;
  const form2TemperatureDrift = {
    tempPointsC: [20.0, tMax, tMin, 20.0],
    maxDriftRateCPerHour: rulePack.environmentalConstraints.maxTemperatureDriftRateCPerHour,
  };

  // -------------------------------------------------------------
  // 3. Form 3: Eccentricity Corner Load (Clause A.4.7)
  // -------------------------------------------------------------
  // L = Max / 3
  const cornerLoadKg = maxKg.div(3);
  const cornerLoadInUnit = cornerLoadKg.div(unitFactor);
  const cornerMpe = getMpe(cornerLoadKg, eKg, normClass, { loadUnit: "kg", eUnit: "kg", rulePack });

  const form3EccentricityLoad: PlannedLoadPoint = {
    sequenceNumber: 1,
    nominalLoad: cornerLoadInUnit.toFixed(),
    nominalLoadNumber: cornerLoadInUnit.toNumber(),
    unit,
    nominalLoadInKg: cornerLoadKg.toFixed(),
    loadType: "CORNER",
    position: "CENTER",
    mpeExpected: new Decimal(cornerMpe.mpeInMass).div(unitFactor).toFixed(),
    mpeExpectedFactorE: cornerMpe.mpeFactorE,
    description: `Eccentricity corner load (1/3 Max = ${cornerLoadInUnit.toFixed()} ${unit})`,
  };

  // 5 Positions for Form 3
  const cornerPositions = [
    { pos: "CENTER", desc: "Position 1: Center of platform" },
    { pos: "FRONT_LEFT", desc: "Position 2: Front-left corner" },
    { pos: "BACK_LEFT", desc: "Position 3: Back-left corner" },
    { pos: "BACK_RIGHT", desc: "Position 4: Back-right corner" },
    { pos: "FRONT_RIGHT", desc: "Position 5: Front-right corner" },
  ];

  const form3Points: PlannedLoadPoint[] = cornerPositions.map((cp, idx) => ({
    sequenceNumber: idx + 1,
    nominalLoad: cornerLoadInUnit.toFixed(),
    nominalLoadNumber: cornerLoadInUnit.toNumber(),
    unit,
    nominalLoadInKg: cornerLoadKg.toFixed(),
    loadType: "CORNER",
    position: cp.pos,
    mpeExpected: new Decimal(cornerMpe.mpeInMass).div(unitFactor).toFixed(),
    mpeExpectedFactorE: cornerMpe.mpeFactorE,
    description: cp.desc,
  }));

  // -------------------------------------------------------------
  // 4. Form 4: Discrimination 1.4d (Clause A.4.8)
  // -------------------------------------------------------------
  const extra14dKg = dKg.mul("1.4");
  const extra14dInUnit = extra14dKg.div(unitFactor);
  const discLoadsKg = [minKg, halfMaxKg, maxKg];

  const form4DiscriminationLoads: PlannedLoadPoint[] = discLoadsKg.map((lKg, idx) => {
    const lUnit = lKg.div(unitFactor);
    const mpe = getMpe(lKg, eKg, normClass, { loadUnit: "kg", eUnit: "kg", rulePack });
    const label = lKg.equals(minKg) ? "Min" : lKg.equals(halfMaxKg) ? "50% Max" : "Max";
    return {
      sequenceNumber: idx + 1,
      nominalLoad: lUnit.toFixed(),
      nominalLoadNumber: lUnit.toNumber(),
      unit,
      nominalLoadInKg: lKg.toFixed(),
      loadType: lKg.equals(minKg) ? "MIN" : lKg.equals(halfMaxKg) ? "HALF_MAX" : "MAX",
      mpeExpected: new Decimal(mpe.mpeInMass).div(unitFactor).toFixed(),
      mpeExpectedFactorE: mpe.mpeFactorE,
      extraLoad14d: extra14dInUnit.toFixed(),
      description: `Discrimination test at ${label} (${lUnit.toFixed()} ${unit}) + 1.4d (${extra14dInUnit.toFixed()} ${unit})`,
    };
  });

  // -------------------------------------------------------------
  // 5. Form 5: Repeatability (Clause A.4.10)
  // -------------------------------------------------------------
  const reps = options.repeatabilityRepetitions || 10;
  const repLoadsKg = [halfMaxKg, maxKg];

  const form5RepeatabilityLoads: PlannedLoadPoint[] = [];
  let repSeq = 1;
  for (const lKg of repLoadsKg) {
    const lUnit = lKg.div(unitFactor);
    const mpe = getMpe(lKg, eKg, normClass, { loadUnit: "kg", eUnit: "kg", rulePack });
    const label = lKg.equals(halfMaxKg) ? "50% Max" : "Max";

    for (let r = 1; r <= reps; r++) {
      form5RepeatabilityLoads.push({
        sequenceNumber: repSeq++,
        nominalLoad: lUnit.toFixed(),
        nominalLoadNumber: lUnit.toNumber(),
        unit,
        nominalLoadInKg: lKg.toFixed(),
        loadType: lKg.equals(halfMaxKg) ? "HALF_MAX" : "MAX",
        mpeExpected: new Decimal(mpe.mpeInMass).div(unitFactor).toFixed(),
        mpeExpectedFactorE: mpe.mpeFactorE,
        description: `Repeatability run #${r} at ${label} (${lUnit.toFixed()} ${unit})`,
      });
    }
  }

  // -------------------------------------------------------------
  // 6. Form 6: 30-min Creep & Zero Return (Clause A.4.11)
  // -------------------------------------------------------------
  const creepMpe = getMpe(maxKg, eKg, normClass, { loadUnit: "kg", eUnit: "kg", rulePack });
  const form6CreepLoad: PlannedLoadPoint = {
    sequenceNumber: 1,
    nominalLoad: parsedMax.value.toFixed(),
    nominalLoadNumber: parsedMax.value.toNumber(),
    unit,
    nominalLoadInKg: maxKg.toFixed(),
    loadType: "MAX",
    mpeExpected: new Decimal(creepMpe.mpeInMass).div(unitFactor).toFixed(),
    mpeExpectedFactorE: creepMpe.mpeFactorE,
    description: `30-minute creep test at Max (${parsedMax.value.toFixed()} ${unit}) with zero return`,
  };

  // Creep time observation points
  const creepTimePoints = [
    { min: "0", desc: "Initial load application (t = 0 min)" },
    { min: "5", desc: "Creep reading at t = 5 min" },
    { min: "10", desc: "Creep reading at t = 10 min" },
    { min: "15", desc: "Creep reading at t = 15 min" },
    { min: "20", desc: "Creep reading at t = 20 min" },
    { min: "30", desc: "Creep reading at t = 30 min" },
    { min: "30.5", desc: "Zero return reading at t = 30.5 min (unloaded)" },
  ];

  const form6Points: PlannedLoadPoint[] = creepTimePoints.map((tp, idx) => ({
    sequenceNumber: idx + 1,
    nominalLoad: tp.min === "30.5" ? "0" : parsedMax.value.toFixed(),
    nominalLoadNumber: tp.min === "30.5" ? 0 : parsedMax.value.toNumber(),
    unit,
    nominalLoadInKg: tp.min === "30.5" ? "0" : maxKg.toFixed(),
    loadType: tp.min === "30.5" ? "ZERO" : "MAX",
    mpeExpected: new Decimal(creepMpe.mpeInMass).div(unitFactor).toFixed(),
    mpeExpectedFactorE: creepMpe.mpeFactorE,
    description: tp.desc,
  }));

  // -------------------------------------------------------------
  // Test Plan Items (Forms 1 to 6)
  // -------------------------------------------------------------
  const items: TestPlanItem[] = [
    {
      clauseNumber: "A.4.4",
      formNumber: "Form 1",
      formType: TestFormType.FORM_1_WEIGHING,
      title: "Weighing Performance Test (Ascending & Descending)",
      executionOrder: 1,
      isMandatory: true,
      targetLoads: form1WeighingPoints,
    },
    {
      clauseNumber: "A.5.3.2",
      formNumber: "Form 2",
      formType: TestFormType.FORM_2_TEMP_DRIFT,
      title: "Temperature Effect on No-Load Indication",
      executionOrder: 2,
      isMandatory: true,
      targetLoads: [
        {
          sequenceNumber: 1,
          nominalLoad: "0",
          nominalLoadNumber: 0,
          unit,
          nominalLoadInKg: "0",
          loadType: "ZERO",
          description: "No-load baseline across thermal cycle (20°C -> Tmax -> Tmin -> 20°C)",
        },
      ],
      metadata: form2TemperatureDrift,
    },
    {
      clauseNumber: "A.4.7",
      formNumber: "Form 3",
      formType: TestFormType.FORM_3_ECCENTRICITY,
      title: "Eccentricity (Corner Loading) Test",
      executionOrder: 3,
      isMandatory: true,
      targetLoads: form3Points,
      metadata: { cornerLoad: form3EccentricityLoad },
    },
    {
      clauseNumber: "A.4.8",
      formNumber: "Form 4",
      formType: TestFormType.FORM_4_DISCRIMINATION,
      title: "Discrimination Test (1.4d Displacement)",
      executionOrder: 4,
      isMandatory: true,
      targetLoads: form4DiscriminationLoads,
      metadata: { extraLoad14d: extra14dInUnit.toFixed() },
    },
    {
      clauseNumber: "A.4.10",
      formNumber: "Form 5",
      formType: TestFormType.FORM_5_REPEATABILITY,
      title: "Repeatability Test (0.5 Max and Max Series)",
      executionOrder: 5,
      isMandatory: true,
      targetLoads: form5RepeatabilityLoads,
      metadata: { repetitionsPerSeries: reps },
    },
    {
      clauseNumber: "A.4.11",
      formNumber: "Form 6",
      formType: TestFormType.FORM_6_CREEP,
      title: "Creep and Zero Return Test (30 minutes at Max)",
      executionOrder: 6,
      isMandatory: true,
      targetLoads: form6Points,
      metadata: { testLoad: form6CreepLoad },
    },
  ];

  const totalLoadPoints = items.reduce((acc, item) => acc + item.targetLoads.length, 0);
  const planTitle = options.title || `OIML R 76 Evaluation Test Plan: ${instrument.modelName || "NAWI"} (Class ${normClass})`;

  return {
    title: planTitle,
    instrumentModelId: instrument.id,
    accuracyClass: enumClass,
    maxCapacity: parsedMax.value.toFixed(),
    minCapacity: parsedMin.value.toFixed(),
    verificationIntervalE: parsedE.value.toFixed(),
    actualIntervalD: parsedD.value.toFixed(),
    unit,
    scaleDivisionCountN: n,
    totalTestClauses: items.length,
    totalLoadPoints,
    items,
    form1WeighingPoints,
    form2TemperatureDrift,
    form3EccentricityLoad,
    form4DiscriminationLoads,
    form5RepeatabilityLoads,
    form6CreepLoad,
    createdAt: new Date().toISOString(),
  };
}
