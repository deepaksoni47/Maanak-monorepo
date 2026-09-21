import { PrismaClient, Prisma } from '@prisma/client';
import {
  accuracyClassesSeed,
  rolesSeed,
  laboratorySeed,
  usersSeed,
  weightSetsSeed,
  manufacturersSeed,
  instrumentModelsSeed,
} from '../src/seed-data.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MAANAK Metrology Database Seeding...');

  // -----------------------------------------------------------------
  // 1. Accuracy Classes (OIML R 76-1:2006 Section 3.1)
  // -----------------------------------------------------------------
  console.log('  -> Seeding Accuracy Classes (I, II, III, IIII)...');
  const classMap = new Map<string, string>();
  for (const item of accuracyClassesSeed) {
    const record = await prisma.accuracyClass.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
    classMap.set(item.code, record.id);
  }

  // -----------------------------------------------------------------
  // 2. Roles & Permissions (ADMIN, DIRECTOR, REVIEWER, INSPECTOR)
  // -----------------------------------------------------------------
  console.log('  -> Seeding Roles (ADMIN, DIRECTOR, REVIEWER, INSPECTOR)...');
  const roleMap = new Map<string, string>();
  for (const role of rolesSeed) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        permissionsJson: role.permissionsJson,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        permissionsJson: role.permissionsJson,
      },
    });
    roleMap.set(role.code, record.id);
  }

  // -----------------------------------------------------------------
  // 3. Laboratory: Regional Reference Standard Laboratory (RRSL), Ahmedabad
  // -----------------------------------------------------------------
  console.log('  -> Seeding Laboratory (RRSL Ahmedabad)...');
  const lab = await prisma.laboratory.upsert({
    where: { code: laboratorySeed.code },
    update: {
      name: laboratorySeed.name,
      type: laboratorySeed.type,
      addressLine1: laboratorySeed.addressLine1,
      city: laboratorySeed.city,
      state: laboratorySeed.state,
      pincode: laboratorySeed.pincode,
      contactEmail: laboratorySeed.contactEmail,
      contactPhone: laboratorySeed.contactPhone,
      nablAccreditationNo: laboratorySeed.nablAccreditationNo,
      nablValidUntil: laboratorySeed.nablValidUntil,
      isActive: true,
    },
    create: {
      code: laboratorySeed.code,
      name: laboratorySeed.name,
      type: laboratorySeed.type,
      addressLine1: laboratorySeed.addressLine1,
      city: laboratorySeed.city,
      state: laboratorySeed.state,
      pincode: laboratorySeed.pincode,
      contactEmail: laboratorySeed.contactEmail,
      contactPhone: laboratorySeed.contactPhone,
      nablAccreditationNo: laboratorySeed.nablAccreditationNo,
      nablValidUntil: laboratorySeed.nablValidUntil,
      isActive: true,
    },
  });

  // -----------------------------------------------------------------
  // 4. Users: 4 Key RRSL Metrology Personas
  // -----------------------------------------------------------------
  console.log('  -> Seeding Users (inspector, reviewer, director, admin)...');
  const dummyArgon2Hash =
    '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQxMjM0NTY3OA$YVbM7qY8eQ7aK0eF2aD3vP8kE1mR5tY9uI3oP7sA2wE';

  const userMap = new Map<string, string>();
  for (const u of usersSeed) {
    const roleId = roleMap.get(u.roleCode)!;
    const record = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        email: u.email,
        fullName: u.fullName,
        designation: u.designation,
        mobileNumber: u.mobileNumber,
        governmentIdNo: u.governmentIdNo,
        laboratoryId: lab.id,
        roleId: roleId,
        passwordHash: dummyArgon2Hash,
        isActive: true,
      },
      create: {
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        designation: u.designation,
        mobileNumber: u.mobileNumber,
        governmentIdNo: u.governmentIdNo,
        laboratoryId: lab.id,
        roleId: roleId,
        passwordHash: dummyArgon2Hash,
        isActive: true,
      },
    });
    userMap.set(u.username, record.id);
  }

  // -----------------------------------------------------------------
  // 5. Standard Weight Sets & NABL Calibration Certificates (E2, F1, M1)
  // -----------------------------------------------------------------
  console.log('  -> Seeding Standard Weight Sets & NABL Certificates (E2, F1, M1)...');
  for (const ws of weightSetsSeed) {
    const existingRef = await prisma.referenceStandard.findFirst({
      where: {
        laboratoryId: lab.id,
        identificationCode: ws.identificationCode,
      },
    });

    let refId = existingRef?.id;
    if (!existingRef) {
      const created = await prisma.referenceStandard.create({
        data: {
          laboratoryId: lab.id,
          identificationCode: ws.identificationCode,
          oimlClass: ws.oimlClass,
          manufacturerName: ws.manufacturerName,
          material: ws.material,
          nominalMassMin: new Prisma.Decimal(ws.nominalMassMin),
          nominalMassMax: new Prisma.Decimal(ws.nominalMassMax),
          isActive: true,
        },
      });
      refId = created.id;
    }

    await prisma.calibrationCertificate.upsert({
      where: { certificateNumber: ws.certificate.certificateNumber },
      update: {
        referenceStandardId: refId!,
        calibratingAgency: ws.certificate.calibratingAgency,
        nablCertNo: ws.certificate.nablCertNo,
        calibrationDate: ws.certificate.calibrationDate,
        expiryDate: ws.certificate.expiryDate,
        expandedUncertaintyU: new Prisma.Decimal(ws.certificate.expandedUncertaintyU),
        uncertaintyUnit: ws.certificate.uncertaintyUnit,
        coverageFactorK: new Prisma.Decimal(ws.certificate.coverageFactorK),
        isActive: true,
      },
      create: {
        referenceStandardId: refId!,
        certificateNumber: ws.certificate.certificateNumber,
        calibratingAgency: ws.certificate.calibratingAgency,
        nablCertNo: ws.certificate.nablCertNo,
        calibrationDate: ws.certificate.calibrationDate,
        expiryDate: ws.certificate.expiryDate,
        expandedUncertaintyU: new Prisma.Decimal(ws.certificate.expandedUncertaintyU),
        uncertaintyUnit: ws.certificate.uncertaintyUnit,
        coverageFactorK: new Prisma.Decimal(ws.certificate.coverageFactorK),
        isActive: true,
      },
    });
  }

  // -----------------------------------------------------------------
  // 6. Manufacturers
  // -----------------------------------------------------------------
  console.log('  -> Seeding Manufacturers (Mettler-Toledo, Essae)...');
  const manufacturerMap = new Map<string, string>();
  for (const mfr of manufacturersSeed) {
    const record = await prisma.manufacturer.upsert({
      where: { registrationNumber: mfr.registrationNumber },
      update: {
        companyName: mfr.companyName,
        tradeLicenseNo: mfr.tradeLicenseNo,
        addressLine1: mfr.addressLine1,
        city: mfr.city,
        state: mfr.state,
        country: mfr.country,
        pincode: mfr.pincode,
        contactPerson: mfr.contactPerson,
        contactEmail: mfr.contactEmail,
        contactPhone: mfr.contactPhone,
      },
      create: {
        companyName: mfr.companyName,
        tradeLicenseNo: mfr.tradeLicenseNo,
        registrationNumber: mfr.registrationNumber,
        addressLine1: mfr.addressLine1,
        city: mfr.city,
        state: mfr.state,
        country: mfr.country,
        pincode: mfr.pincode,
        contactPerson: mfr.contactPerson,
        contactEmail: mfr.contactEmail,
        contactPhone: mfr.contactPhone,
      },
    });
    manufacturerMap.set(mfr.registrationNumber, record.id);
  }

  // -----------------------------------------------------------------
  // 7. Sample NAWI Models (Class I Analytical Balance & Class III Retail Scale)
  // -----------------------------------------------------------------
  console.log('  -> Seeding NAWI Models & Physical Units (Class I 220g & Class III 15kg)...');
  for (const model of instrumentModelsSeed) {
    const mfrId = manufacturerMap.get(model.manufacturerRegNo)!;
    const classId = classMap.get(model.accuracyClassCode)!;

    const record = await prisma.instrumentModel.upsert({
      where: { patternDesignation: model.patternDesignation },
      update: {
        modelName: model.modelName,
        manufacturerId: mfrId,
        accuracyClassId: classId,
        instrumentType: model.instrumentType,
        weighingPrinciple: model.weighingPrinciple,
        maxCapacity: new Prisma.Decimal(model.maxCapacity),
        minCapacity: new Prisma.Decimal(model.minCapacity),
        verificationScaleIntervalE: new Prisma.Decimal(model.verificationScaleIntervalE),
        actualScaleIntervalD: new Prisma.Decimal(model.actualScaleIntervalD),
        scaleDivisionCountN: model.scaleDivisionCountN,
        unitOfMeasure: model.unitOfMeasure,
        isMultiInterval: model.isMultiInterval,
        isMultipleRange: model.isMultipleRange,
        numberOfPartialRanges: model.numberOfPartialRanges,
        tempRangeMinC: new Prisma.Decimal(model.tempRangeMinC),
        tempRangeMaxC: new Prisma.Decimal(model.tempRangeMaxC),
        powerSupplyVoltageNominal: new Prisma.Decimal(model.powerSupplyVoltageNominal),
        powerSupplyFrequencyHz: new Prisma.Decimal(model.powerSupplyFrequencyHz),
        firmwareVersionId: model.firmwareVersionId,
      },
      create: {
        modelName: model.modelName,
        patternDesignation: model.patternDesignation,
        manufacturerId: mfrId,
        accuracyClassId: classId,
        instrumentType: model.instrumentType,
        weighingPrinciple: model.weighingPrinciple,
        maxCapacity: new Prisma.Decimal(model.maxCapacity),
        minCapacity: new Prisma.Decimal(model.minCapacity),
        verificationScaleIntervalE: new Prisma.Decimal(model.verificationScaleIntervalE),
        actualScaleIntervalD: new Prisma.Decimal(model.actualScaleIntervalD),
        scaleDivisionCountN: model.scaleDivisionCountN,
        unitOfMeasure: model.unitOfMeasure,
        isMultiInterval: model.isMultiInterval,
        isMultipleRange: model.isMultipleRange,
        numberOfPartialRanges: model.numberOfPartialRanges,
        tempRangeMinC: new Prisma.Decimal(model.tempRangeMinC),
        tempRangeMaxC: new Prisma.Decimal(model.tempRangeMaxC),
        powerSupplyVoltageNominal: new Prisma.Decimal(model.powerSupplyVoltageNominal),
        powerSupplyFrequencyHz: new Prisma.Decimal(model.powerSupplyFrequencyHz),
        firmwareVersionId: model.firmwareVersionId,
      },
    });

    // Sample unit
    await prisma.instrumentUnit.upsert({
      where: { serialNumber: model.sampleUnit.serialNumber },
      update: {
        instrumentModelId: record.id,
        yearOfManufacture: model.sampleUnit.yearOfManufacture,
        indicatorSerialNo: model.sampleUnit.indicatorSerialNo,
        loadCellModelNo: model.sampleUnit.loadCellModelNo,
        loadCellSerialNo: model.sampleUnit.loadCellSerialNo,
        sealingArrangementDetails: model.sampleUnit.sealingArrangementDetails,
      },
      create: {
        serialNumber: model.sampleUnit.serialNumber,
        instrumentModelId: record.id,
        yearOfManufacture: model.sampleUnit.yearOfManufacture,
        indicatorSerialNo: model.sampleUnit.indicatorSerialNo,
        loadCellModelNo: model.sampleUnit.loadCellModelNo,
        loadCellSerialNo: model.sampleUnit.loadCellSerialNo,
        sealingArrangementDetails: model.sampleUnit.sealingArrangementDetails,
      },
    });
  }

  // -----------------------------------------------------------------
  // 8. OIML R-76 Standards-as-Code Rule Pack & Active Version
  // -----------------------------------------------------------------
  console.log('  -> Seeding OIML R-76 Rule Pack & Version...');
  const rulePack = await prisma.rulePack.upsert({
    where: { code: 'OIML_R76_2006' },
    update: {
      title: 'Non-automatic weighing instruments - Part 1: Metrological and technical requirements - Tests',
      issuingBody: 'International Organization of Legal Metrology (OIML)',
      description: 'Official international standard for verification of non-automatic weighing instruments (NAWI)',
    },
    create: {
      code: 'OIML_R76_2006',
      title: 'Non-automatic weighing instruments - Part 1: Metrological and technical requirements - Tests',
      issuingBody: 'International Organization of Legal Metrology (OIML)',
      description: 'Official international standard for verification of non-automatic weighing instruments (NAWI)',
    },
  });

  const adminUserId = userMap.get('admin');

  const existingVersion = await prisma.rulePackVersion.findFirst({
    where: {
      rulePackId: rulePack.id,
      versionTag: '2006-v1.0',
    },
  });

  const rulePackPayload = {
    rulePackId: rulePack.id,
    versionTag: '2006-v1.0',
    effectiveFrom: new Date('2006-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    isActive: true,
    ruleSchemaVersion: '1.0',
    table3ClassificationJson: {
      classes: {
        I: { minE: 0.001, minN: 50000, maxN: null, minLoadMultiplier: 100 },
        II: { minE: 0.001, maxE: 0.05, minN: 100, maxN: 100000, minLoadMultiplier: 20 },
        III: { minE: 0.1, maxE: 2.0, minN: 100, maxN: 10000, minLoadMultiplier: 20 },
        IIII: { minE: 5.0, minN: 100, maxN: 1000, minLoadMultiplier: 10 },
      },
    },
    table6MpeBracketsJson: {
      initialVerification: {
        I: [
          { maxDivision: 50000, mpeMultiplier: 0.5 },
          { maxDivision: 200000, mpeMultiplier: 1.0 },
          { maxDivision: null, mpeMultiplier: 1.5 },
        ],
        II: [
          { maxDivision: 5000, mpeMultiplier: 0.5 },
          { maxDivision: 20000, mpeMultiplier: 1.0 },
          { maxDivision: 100000, mpeMultiplier: 1.5 },
        ],
        III: [
          { maxDivision: 500, mpeMultiplier: 0.5 },
          { maxDivision: 2000, mpeMultiplier: 1.0 },
          { maxDivision: 10000, mpeMultiplier: 1.5 },
        ],
        IIII: [
          { maxDivision: 50, mpeMultiplier: 0.5 },
          { maxDivision: 200, mpeMultiplier: 1.0 },
          { maxDivision: 1000, mpeMultiplier: 1.5 },
        ],
      },
    },
    formulaDefinitionsJson: {
      indicationP: 'I + 0.5 * e - deltaL',
      rawErrorE: 'P - L',
      correctedErrorEc: 'E - E0',
      hysteresis: 'E_decreasing - E_increasing',
      nabl129UncertaintyGate: 'U <= (1 / 3) * MPE',
    },
    environmentalLimitsJson: {
      standardTemperatureRange: { min: 10.0, max: 30.0, unit: 'C' },
      maxThermalDriftRatePerHour: 5.0,
      relativeHumidity: { min: 20.0, max: 85.0, unit: '%' },
      warmupTimeMinutes: 30,
    },
    createdByUserId: adminUserId,
  };

  if (!existingVersion) {
    await prisma.rulePackVersion.create({
      data: rulePackPayload,
    });
  } else {
    await prisma.rulePackVersion.update({
      where: { id: existingVersion.id },
      data: rulePackPayload,
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log('   - 4 Accuracy Classes (I, II, III, IIII)');
  console.log('   - 4 System Roles (ADMIN, DIRECTOR, REVIEWER, INSPECTOR)');
  console.log('   - 1 Laboratory (RRSL Ahmedabad)');
  console.log('   - 4 Users (admin, director, reviewer, inspector)');
  console.log('   - 3 Standard Weight Sets (E2, F1, M1) with NABL Certificates');
  console.log('   - 2 Manufacturers (Mettler-Toledo, Essae)');
  console.log('   - 2 NAWI Models (Class I Analytical 220g & Class III Retail 15kg) with test units');
  console.log('   - 1 OIML R-76 Rule Pack with active version');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
