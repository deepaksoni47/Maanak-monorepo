import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CreateInstrumentSchema,
  SubmitObservationSchema,
  LoginSchema,
  VerifyReportSchema,
  SignReportSchema,
} from "./api.js";
import { AccuracyClass, InstrumentType } from "./metrology.js";
import { TestFormType } from "./session.js";

describe("TASK-008: Zod Validation Contracts", () => {
  describe("CreateInstrumentSchema", () => {
    test("successfully parses valid instrument specification", () => {
      const valid = {
        modelName: "IND231 Bench Scale",
        manufacturer: "Mettler Toledo India Pvt Ltd",
        accuracyClass: AccuracyClass.CLASS_III,
        instrumentType: InstrumentType.SINGLE_INTERVAL,
        maxCapacity: "15.0000",
        minCapacity: "0.1000",
        verificationIntervalE: "0.0050",
        actualIntervalD: "0.0050",
        unitOfMeasure: "kg" as const,
      };
      const parsed = CreateInstrumentSchema.parse(valid);
      assert.equal(parsed.modelName, "IND231 Bench Scale");
      assert.equal(parsed.accuracyClass, AccuracyClass.CLASS_III);
    });

    test("rejects invalid input missing mandatory fields", () => {
      const invalid = {
        modelName: "",
        manufacturer: "",
      };
      assert.throws(() => CreateInstrumentSchema.parse(invalid));
    });
  });

  describe("SubmitObservationSchema", () => {
    test("successfully parses valid observation", () => {
      const valid = {
        testSessionId: "123e4567-e89b-12d3-a456-426614174000",
        testFormType: TestFormType.FORM_1_WEIGHING,
        loadMass: "5.00000000",
        indicatedValue: "5.00000000",
        turningPointDeltaL: "0.00200000",
      };
      const parsed = SubmitObservationSchema.parse(valid);
      assert.equal(parsed.loadMass, "5.00000000");
    });

    test("rejects observation missing load mass", () => {
      const invalid = {
        testSessionId: "123e4567-e89b-12d3-a456-426614174000",
      };
      assert.throws(() => SubmitObservationSchema.parse(invalid));
    });
  });

  describe("LoginSchema", () => {
    test("successfully parses valid email and password", () => {
      const valid = { email: "inspector@rrsl.gov.in", password: "password123" };
      const parsed = LoginSchema.parse(valid);
      assert.equal(parsed.email, "inspector@rrsl.gov.in");
    });

    test("rejects malformed email and short password", () => {
      assert.throws(() =>
        LoginSchema.parse({ email: "invalid", password: "123" }),
      );
    });
  });

  describe("VerifyReportSchema", () => {
    test("successfully parses when sessionNumber is provided", () => {
      const parsed = VerifyReportSchema.parse({ sessionNumber: "TS-2026-001" });
      assert.equal(parsed.sessionNumber, "TS-2026-001");
    });

    test("rejects empty verification request", () => {
      assert.throws(() => VerifyReportSchema.parse({}));
    });
  });

  describe("SignReportSchema", () => {
    test("successfully parses valid 64-char sha256 and pki data", () => {
      const valid = {
        testSessionId: "sess-123",
        pdfBinaryHashSha256:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        x509CertificateSerial: "SN-998877",
        pkiSignatureValueBase64:
          "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQE...",
      };
      const parsed = SignReportSchema.parse(valid);
      assert.equal(parsed.pdfBinaryHashSha256.length, 64);
    });

    test("rejects invalid hash length", () => {
      const invalid = {
        testSessionId: "sess-123",
        pdfBinaryHashSha256: "too-short",
        x509CertificateSerial: "SN-998877",
        pkiSignatureValueBase64: "xyz",
      };
      assert.throws(() => SignReportSchema.parse(invalid));
    });
  });
});
