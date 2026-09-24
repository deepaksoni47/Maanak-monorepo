export interface AccuracyClassSeed {
  code: string;
  name: string;
  minVerificationScaleIntervals: number;
  maxVerificationScaleIntervals: number | null;
  description: string;
  displayOrder: number;
}

export interface RoleSeed {
  code: string;
  name: string;
  description: string;
  permissionsJson: string[];
}

export interface LaboratorySeed {
  code: string;
  name: string;
  type: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  contactEmail: string;
  contactPhone: string;
  nablAccreditationNo: string;
  nablValidUntil: Date;
}

export interface UserSeed {
  username: string;
  email: string;
  fullName: string;
  designation: string;
  mobileNumber: string;
  governmentIdNo: string;
  roleCode: string;
}

export interface CalibrationCertificateSeed {
  certificateNumber: string;
  calibratingAgency: string;
  nablCertNo: string;
  calibrationDate: Date;
  expiryDate: Date;
  expandedUncertaintyU: string;
  uncertaintyUnit: string;
  coverageFactorK: string;
}

export interface WeightSetSeed {
  identificationCode: string;
  oimlClass: string;
  manufacturerName: string;
  material: string;
  nominalMassMin: string;
  nominalMassMax: string;
  certificate: CalibrationCertificateSeed;
}

export interface ManufacturerSeed {
  companyName: string;
  tradeLicenseNo: string;
  registrationNumber: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

export interface InstrumentModelSeed {
  modelName: string;
  patternDesignation: string;
  manufacturerRegNo: string;
  accuracyClassCode: string;
  instrumentType: string;
  weighingPrinciple: string;
  maxCapacity: string;
  minCapacity: string;
  verificationScaleIntervalE: string;
  actualScaleIntervalD: string;
  scaleDivisionCountN: number;
  unitOfMeasure: string;
  isMultiInterval: boolean;
  isMultipleRange: boolean;
  numberOfPartialRanges: number;
  tempRangeMinC: string;
  tempRangeMaxC: string;
  powerSupplyVoltageNominal: string;
  powerSupplyFrequencyHz: string;
  firmwareVersionId: string;
  sampleUnit: {
    serialNumber: string;
    yearOfManufacture: number;
    indicatorSerialNo: string;
    loadCellModelNo: string;
    loadCellSerialNo: string;
    sealingArrangementDetails: string;
  };
}

export const accuracyClassesSeed: AccuracyClassSeed[] = [
  {
    code: 'I',
    name: 'Special Accuracy Class I',
    minVerificationScaleIntervals: 50000,
    maxVerificationScaleIntervals: null,
    description: 'High precision analytical balances, mass comparators (OIML R 76 Table 3)',
    displayOrder: 1,
  },
  {
    code: 'II',
    name: 'High Accuracy Class II',
    minVerificationScaleIntervals: 100,
    maxVerificationScaleIntervals: 100000,
    description: 'Precision balances, laboratory balances (OIML R 76 Table 3)',
    displayOrder: 2,
  },
  {
    code: 'III',
    name: 'Medium Accuracy Class III',
    minVerificationScaleIntervals: 100,
    maxVerificationScaleIntervals: 10000,
    description: 'Commercial retail scales, industrial platform scales (OIML R 76 Table 3)',
    displayOrder: 3,
  },
  {
    code: 'IIII',
    name: 'Ordinary Accuracy Class IIII',
    minVerificationScaleIntervals: 100,
    maxVerificationScaleIntervals: 1000,
    description: 'Weighbridges, heavy industrial crane scales (OIML R 76 Table 3)',
    displayOrder: 4,
  },
];

export const rolesSeed: RoleSeed[] = [
  {
    code: 'ADMIN',
    name: 'System Administrator',
    description: 'Full system configuration, user provisioning, audit inspection',
    permissionsJson: ['*'],
  },
  {
    code: 'DIRECTOR',
    name: 'Laboratory Director',
    description: 'Final signatory for official OIML test reports and verification certificates',
    permissionsJson: [
      'reports:sign',
      'reports:publish',
      'reviews:override',
      'users:manage',
      'standards:approve',
    ],
  },
  {
    code: 'REVIEWER',
    name: 'Technical Reviewer',
    description: 'Senior metrologist reviewing raw observation traces, physical anomalies, and compliance',
    permissionsJson: [
      'sessions:review',
      'reviews:approve',
      'reviews:reject',
      'calculations:audit',
    ],
  },
  {
    code: 'INSPECTOR',
    name: 'Legal Metrology Officer / Testing Officer',
    description: 'Conducts verification tests, records raw turning points, logs environmental telemetry',
    permissionsJson: [
      'sessions:create',
      'sessions:execute',
      'observations:create',
      'observations:update',
      'calculations:run',
    ],
  },
];

export const laboratorySeed: LaboratorySeed = {
  code: 'RRSL-AMD',
  name: 'Regional Reference Standard Laboratory (RRSL), Ahmedabad',
  type: 'RRSL',
  addressLine1: 'Near Gujarat High Court, Sola Road',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '380060',
  contactEmail: 'rrsl.ahmedabad@gov.in',
  contactPhone: '+91-79-27663456',
  nablAccreditationNo: 'NABL-CC-2894',
  nablValidUntil: new Date('2028-12-31T00:00:00.000Z'),
};

export const usersSeed: UserSeed[] = [
  // Primary MAANAK Presets (used by frontend login buttons & quick-switch)
  {
    username: 'inspector',
    email: 'inspector@maanak.gov.in',
    fullName: 'R. K. Verma',
    designation: 'Legal Metrology Officer / Testing Officer',
    mobileNumber: '+91-9876543213',
    governmentIdNo: 'GOV-AMD-INS-004',
    roleCode: 'INSPECTOR',
  },
  {
    username: 'reviewer',
    email: 'reviewer@maanak.gov.in',
    fullName: 'S. P. Patel',
    designation: 'Senior Metrologist / Technical Reviewer',
    mobileNumber: '+91-9876543212',
    governmentIdNo: 'GOV-AMD-REV-003',
    roleCode: 'REVIEWER',
  },
  {
    username: 'director',
    email: 'director@maanak.gov.in',
    fullName: 'Dr. A. K. Sharma',
    designation: 'Director & Head of Laboratory (Signatory)',
    mobileNumber: '+91-9876543211',
    governmentIdNo: 'GOV-AMD-DIR-002',
    roleCode: 'DIRECTOR',
  },
  {
    username: 'admin',
    email: 'admin@maanak.gov.in',
    fullName: 'System Administrator',
    designation: 'Metrological IT Systems Head',
    mobileNumber: '+91-9876543210',
    governmentIdNo: 'GOV-AMD-ADM-001',
    roleCode: 'ADMIN',
  },
  // Secondary RRSL Regional Presets
  {
    username: 'inspector_rrsl',
    email: 'inspector@rrsl.gov.in',
    fullName: 'R. K. Verma',
    designation: 'Legal Metrology Officer / Testing Officer',
    mobileNumber: '+91-9876543213',
    governmentIdNo: 'GOV-AMD-INS-004',
    roleCode: 'INSPECTOR',
  },
  {
    username: 'reviewer_rrsl',
    email: 'reviewer@rrsl.gov.in',
    fullName: 'S. P. Patel',
    designation: 'Senior Metrologist / Technical Reviewer',
    mobileNumber: '+91-9876543212',
    governmentIdNo: 'GOV-AMD-REV-003',
    roleCode: 'REVIEWER',
  },
  {
    username: 'director_rrsl',
    email: 'director@rrsl.gov.in',
    fullName: 'Dr. A. K. Sharma',
    designation: 'Director & Head of Laboratory',
    mobileNumber: '+91-9876543211',
    governmentIdNo: 'GOV-AMD-DIR-002',
    roleCode: 'DIRECTOR',
  },
  {
    username: 'admin_rrsl',
    email: 'admin@rrsl.gov.in',
    fullName: 'System Administrator',
    designation: 'Metrological IT Systems Head',
    mobileNumber: '+91-9876543210',
    governmentIdNo: 'GOV-AMD-ADM-001',
    roleCode: 'ADMIN',
  },
];

export const weightSetsSeed: WeightSetSeed[] = [
  {
    identificationCode: 'RRSL/WT/E2/2024-01',
    oimlClass: 'E2',
    manufacturerName: 'Häfner Gewichte GmbH',
    material: 'Austenitic Stainless Steel (Density 8000 kg/m³)',
    nominalMassMin: '0.00000100', // 1 mg
    nominalMassMax: '0.50000000', // 500 g
    certificate: {
      certificateNumber: 'NPLI/CS/2024/E2/0942',
      calibratingAgency: 'National Physical Laboratory of India (NPL-CSIR)',
      nablCertNo: 'CC-NPL-001',
      calibrationDate: new Date('2025-01-15T00:00:00.000Z'),
      expiryDate: new Date('2027-01-14T00:00:00.000Z'),
      expandedUncertaintyU: '0.00005000',
      uncertaintyUnit: 'mg',
      coverageFactorK: '2.00',
    },
  },
  {
    identificationCode: 'RRSL/WT/F1/2024-02',
    oimlClass: 'F1',
    manufacturerName: 'Kern & Sohn GmbH',
    material: 'Polished Stainless Steel (Density 7950 kg/m³)',
    nominalMassMin: '0.00100000', // 1 g
    nominalMassMax: '10.00000000', // 10 kg
    certificate: {
      certificateNumber: 'RRSL/CAL/2025/F1/1108',
      calibratingAgency: 'Regional Reference Standard Laboratory, Ahmedabad',
      nablCertNo: 'NABL-CC-2894',
      calibrationDate: new Date('2025-06-10T00:00:00.000Z'),
      expiryDate: new Date('2026-06-09T00:00:00.000Z'),
      expandedUncertaintyU: '0.00150000',
      uncertaintyUnit: 'g',
      coverageFactorK: '2.00',
    },
  },
  {
    identificationCode: 'RRSL/WT/M1/2024-03',
    oimlClass: 'M1',
    manufacturerName: 'Avery India Ltd.',
    material: 'Cast Iron (Density 7200 kg/m³)',
    nominalMassMin: '1.00000000', // 1 kg
    nominalMassMax: '20.00000000', // 20 kg
    certificate: {
      certificateNumber: 'RRSL/CAL/2025/M1/0455',
      calibratingAgency: 'Regional Reference Standard Laboratory, Ahmedabad',
      nablCertNo: 'NABL-CC-2894',
      calibrationDate: new Date('2025-08-01T00:00:00.000Z'),
      expiryDate: new Date('2026-07-31T00:00:00.000Z'),
      expandedUncertaintyU: '0.05000000',
      uncertaintyUnit: 'g',
      coverageFactorK: '2.00',
    },
  },
];

export const manufacturersSeed: ManufacturerSeed[] = [
  {
    companyName: 'Mettler-Toledo India Pvt. Ltd.',
    tradeLicenseNo: 'TL-MT-MH-9941',
    registrationNumber: 'REG-MT-IND-2015-09',
    addressLine1: 'Amar Trinity, Hinjewadi Phase 1',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    pincode: '411057',
    contactPerson: 'K. S. Narayanan',
    contactEmail: 'sales.india@mt.com',
    contactPhone: '+91-20-67310000',
  },
  {
    companyName: 'Essae-Teraoka Ltd.',
    tradeLicenseNo: 'TL-ESS-KA-1024',
    registrationNumber: 'REG-ESS-IND-1996-01',
    addressLine1: '377/22, 6th Cross, Wilson Garden',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '560027',
    contactPerson: 'V. Ramanathan',
    contactEmail: 'info@essae.com',
    contactPhone: '+91-80-22221133',
  },
];

export const instrumentModelsSeed: InstrumentModelSeed[] = [
  {
    modelName: 'XPR226 Analytical Balance',
    patternDesignation: 'IND-OIML-2024-XPR226',
    manufacturerRegNo: 'REG-MT-IND-2015-09',
    accuracyClassCode: 'I',
    instrumentType: 'Analytical Laboratory Balance',
    weighingPrinciple: 'Electromagnetic Force Restoration (EMFR)',
    maxCapacity: '220.00000000',
    minCapacity: '0.01000000', // 10 mg
    verificationScaleIntervalE: '0.00100000', // 1 mg
    actualScaleIntervalD: '0.00010000', // 0.1 mg
    scaleDivisionCountN: 220000,
    unitOfMeasure: 'g',
    isMultiInterval: false,
    isMultipleRange: false,
    numberOfPartialRanges: 1,
    tempRangeMinC: '10.0',
    tempRangeMaxC: '30.0',
    powerSupplyVoltageNominal: '230.0',
    powerSupplyFrequencyHz: '50.0',
    firmwareVersionId: 'FW-XPR-v2.4.1',
    sampleUnit: {
      serialNumber: 'SN-XPR226-2024-001',
      yearOfManufacture: 2024,
      indicatorSerialNo: 'IND-XPR-99881',
      loadCellModelNo: 'EMFR-MONO-CELL-220',
      loadCellSerialNo: 'LC-EMFR-77112',
      sealingArrangementDetails:
        'Physical wire lead seal on calibration jumper switch & firmware hash verification audit trail',
    },
  },
  {
    modelName: 'DS-215 Retail Price Computing Scale',
    patternDesignation: 'IND-OIML-2023-DS215',
    manufacturerRegNo: 'REG-ESS-IND-1996-01',
    accuracyClassCode: 'III',
    instrumentType: 'Electronic Price Computing Counter Scale',
    weighingPrinciple: 'Strain Gauge Load Cell',
    maxCapacity: '15.00000000',
    minCapacity: '0.10000000', // 100 g (20e)
    verificationScaleIntervalE: '0.00500000', // 5 g
    actualScaleIntervalD: '0.00500000', // 5 g
    scaleDivisionCountN: 3000,
    unitOfMeasure: 'kg',
    isMultiInterval: false,
    isMultipleRange: false,
    numberOfPartialRanges: 1,
    tempRangeMinC: '-10.0',
    tempRangeMaxC: '40.0',
    powerSupplyVoltageNominal: '230.0',
    powerSupplyFrequencyHz: '50.0',
    firmwareVersionId: 'FW-DS215-v1.8.0',
    sampleUnit: {
      serialNumber: 'SN-DS215-2023-889',
      yearOfManufacture: 2023,
      indicatorSerialNo: 'IND-DS215-44321',
      loadCellModelNo: 'SGLC-ALUM-20KG',
      loadCellSerialNo: 'LC-SG-99321',
      sealingArrangementDetails:
        'Lead-and-wire stamping seal through side-casing lug to block calibration button access',
    },
  },
];
