import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  accuracyClassesSeed,
  rolesSeed,
  laboratorySeed,
  usersSeed,
  weightSetsSeed,
  manufacturersSeed,
  instrumentModelsSeed,
} from './seed-data.js';

describe('TASK-027: Database Seed Data Specification & Integrity', () => {
  describe('Accuracy Classes (OIML R 76 Table 3)', () => {
    it('seeds exactly 4 accuracy classes: I, II, III, IIII', () => {
      assert.equal(accuracyClassesSeed.length, 4);
      const codes = accuracyClassesSeed.map((c) => c.code);
      assert.deepEqual(codes, ['I', 'II', 'III', 'IIII']);
    });

    it('validates Class I verification intervals n >= 50,000 without upper limit', () => {
      const classI = accuracyClassesSeed.find((c) => c.code === 'I');
      assert.ok(classI);
      assert.equal(classI!.minVerificationScaleIntervals, 50000);
      assert.equal(classI!.maxVerificationScaleIntervals, null);
    });

    it('validates Class III verification intervals 100 <= n <= 10,000', () => {
      const classIII = accuracyClassesSeed.find((c) => c.code === 'III');
      assert.ok(classIII);
      assert.equal(classIII!.minVerificationScaleIntervals, 100);
      assert.equal(classIII!.maxVerificationScaleIntervals, 10000);
    });
  });

  describe('Roles and Permissions (RBAC)', () => {
    it('seeds 4 roles: ADMIN, DIRECTOR, REVIEWER, INSPECTOR', () => {
      assert.equal(rolesSeed.length, 4);
      const codes = rolesSeed.map((r) => r.code);
      assert.deepEqual(codes, ['ADMIN', 'DIRECTOR', 'REVIEWER', 'INSPECTOR']);
    });

    it('ensures DIRECTOR role possesses signing and publishing permissions', () => {
      const director = rolesSeed.find((r) => r.code === 'DIRECTOR');
      assert.ok(director);
      assert.ok(director!.permissionsJson.includes('reports:sign'));
      assert.ok(director!.permissionsJson.includes('reports:publish'));
    });

    it('ensures REVIEWER role possesses review and approval permissions', () => {
      const reviewer = rolesSeed.find((r) => r.code === 'REVIEWER');
      assert.ok(reviewer);
      assert.ok(reviewer!.permissionsJson.includes('sessions:review'));
      assert.ok(reviewer!.permissionsJson.includes('reviews:approve'));
    });

    it('ensures INSPECTOR role possesses session execution and observation creation permissions', () => {
      const inspector = rolesSeed.find((r) => r.code === 'INSPECTOR');
      assert.ok(inspector);
      assert.ok(inspector!.permissionsJson.includes('sessions:execute'));
      assert.ok(inspector!.permissionsJson.includes('observations:create'));
    });
  });

  describe('Laboratory (RRSL Ahmedabad)', () => {
    it('seeds RRSL Ahmedabad with valid NABL accreditation', () => {
      assert.equal(laboratorySeed.code, 'RRSL-AMD');
      assert.equal(
        laboratorySeed.name,
        'Regional Reference Standard Laboratory (RRSL), Ahmedabad'
      );
      assert.equal(laboratorySeed.type, 'RRSL');
      assert.equal(laboratorySeed.city, 'Ahmedabad');
      assert.equal(laboratorySeed.state, 'Gujarat');
      assert.equal(laboratorySeed.nablAccreditationNo, 'NABL-CC-2894');
      assert.ok(laboratorySeed.nablValidUntil instanceof Date);
      assert.ok(laboratorySeed.nablValidUntil.getTime() > Date.now());
    });
  });

  describe('Users (Inspector, Reviewer, Director, Admin)', () => {
    it('seeds exactly 4 users matching RRSL personas with @rrsl.gov.in emails', () => {
      assert.equal(usersSeed.length, 4);
      const expectedUsers = [
        { username: 'admin', role: 'ADMIN', email: 'admin@rrsl.gov.in' },
        { username: 'director', role: 'DIRECTOR', email: 'director@rrsl.gov.in' },
        { username: 'reviewer', role: 'REVIEWER', email: 'reviewer@rrsl.gov.in' },
        { username: 'inspector', role: 'INSPECTOR', email: 'inspector@rrsl.gov.in' },
      ];

      for (const expected of expectedUsers) {
        const u = usersSeed.find((x) => x.username === expected.username);
        assert.ok(u, `User ${expected.username} should exist`);
        assert.equal(u!.roleCode, expected.role);
        assert.equal(u!.email, expected.email);
        assert.ok(u!.mobileNumber.startsWith('+91-'));
        assert.ok(u!.governmentIdNo.startsWith('GOV-AMD-'));
      }
    });
  });

  describe('Standard Weight Sets (E2, F1, M1) & Calibration Certificates', () => {
    it('seeds 3 reference standard weight sets: E2, F1, M1', () => {
      assert.equal(weightSetsSeed.length, 3);
      const classes = weightSetsSeed.map((w) => w.oimlClass);
      assert.deepEqual(classes, ['E2', 'F1', 'M1']);
    });

    it('validates E2 set coverage (1 mg to 500 g) with NPLI certificate', () => {
      const e2 = weightSetsSeed.find((w) => w.oimlClass === 'E2');
      assert.ok(e2);
      assert.equal(e2!.nominalMassMin, '0.00000100'); // 1 mg
      assert.equal(e2!.nominalMassMax, '0.50000000'); // 500 g
      assert.equal(e2!.certificate.certificateNumber, 'NPLI/CS/2024/E2/0942');
      assert.equal(e2!.certificate.calibratingAgency, 'National Physical Laboratory of India (NPL-CSIR)');
      assert.equal(e2!.certificate.expandedUncertaintyU, '0.00005000');
      assert.equal(e2!.certificate.uncertaintyUnit, 'mg');
    });

    it('validates F1 set coverage (1 g to 10 kg) with RRSL certificate', () => {
      const f1 = weightSetsSeed.find((w) => w.oimlClass === 'F1');
      assert.ok(f1);
      assert.equal(f1!.nominalMassMin, '0.00100000'); // 1 g
      assert.equal(f1!.nominalMassMax, '10.00000000'); // 10 kg
      assert.equal(f1!.certificate.certificateNumber, 'RRSL/CAL/2025/F1/1108');
      assert.equal(f1!.certificate.expandedUncertaintyU, '0.00150000');
      assert.equal(f1!.certificate.uncertaintyUnit, 'g');
    });

    it('validates M1 set coverage (1 kg to 20 kg) with RRSL certificate', () => {
      const m1 = weightSetsSeed.find((w) => w.oimlClass === 'M1');
      assert.ok(m1);
      assert.equal(m1!.nominalMassMin, '1.00000000'); // 1 kg
      assert.equal(m1!.nominalMassMax, '20.00000000'); // 20 kg
      assert.equal(m1!.certificate.certificateNumber, 'RRSL/CAL/2025/M1/0455');
      assert.equal(m1!.certificate.expandedUncertaintyU, '0.05000000');
      assert.equal(m1!.certificate.uncertaintyUnit, 'g');
    });
  });

  describe('Manufacturers & Sample NAWI Models', () => {
    it('seeds 2 manufacturers: Mettler-Toledo and Essae-Teraoka', () => {
      assert.equal(manufacturersSeed.length, 2);
      const regNos = manufacturersSeed.map((m) => m.registrationNumber);
      assert.ok(regNos.includes('REG-MT-IND-2015-09'));
      assert.ok(regNos.includes('REG-ESS-IND-1996-01'));
    });

    it('seeds Class I Analytical Balance (220 g, e=1mg, d=0.1mg, n=220,000)', () => {
      const classIModel = instrumentModelsSeed.find((m) => m.accuracyClassCode === 'I');
      assert.ok(classIModel);
      assert.equal(classIModel!.modelName, 'XPR226 Analytical Balance');
      assert.equal(classIModel!.maxCapacity, '220.00000000');
      assert.equal(classIModel!.minCapacity, '0.01000000'); // 10 mg
      assert.equal(classIModel!.verificationScaleIntervalE, '0.00100000'); // 1 mg
      assert.equal(classIModel!.actualScaleIntervalD, '0.00010000'); // 0.1 mg
      assert.equal(classIModel!.scaleDivisionCountN, 220000);
      assert.equal(classIModel!.unitOfMeasure, 'g');
      assert.ok(classIModel!.sampleUnit.serialNumber.startsWith('SN-XPR226-'));
    });

    it('seeds Class III Retail Scale (15 kg, e=5g, d=5g, n=3,000)', () => {
      const classIIIModel = instrumentModelsSeed.find((m) => m.accuracyClassCode === 'III');
      assert.ok(classIIIModel);
      assert.equal(classIIIModel!.modelName, 'DS-215 Retail Price Computing Scale');
      assert.equal(classIIIModel!.maxCapacity, '15.00000000');
      assert.equal(classIIIModel!.minCapacity, '0.10000000'); // 100 g
      assert.equal(classIIIModel!.verificationScaleIntervalE, '0.00500000'); // 5 g
      assert.equal(classIIIModel!.actualScaleIntervalD, '0.00500000'); // 5 g
      assert.equal(classIIIModel!.scaleDivisionCountN, 3000);
      assert.equal(classIIIModel!.unitOfMeasure, 'kg');
      assert.ok(classIIIModel!.sampleUnit.serialNumber.startsWith('SN-DS215-'));
    });
  });
});
