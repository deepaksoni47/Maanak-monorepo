import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTestKeyPairAndCertificate,
  parseCertificate,
  signDigest,
  verifyDigestSignature,
  signReportDigest,
  extractPdfSignatureMetadata,
  createDigitalSignatureMetadata,
} from './signer.js';

describe('TASK-031: X.509 PKI Digital Signature Service', () => {
  describe('In-Memory Key Pair & X.509 Certificate Generation', () => {
    it('generates valid RSA key pair and self-signed X.509 certificate', async () => {
      const { privateKeyPem, publicKeyPem, certificatePem, certificate } =
        await generateTestKeyPairAndCertificate({
          commonName: 'Dr. A. K. Sharma (Director)',
          organization: 'Regional Reference Standard Laboratory, Ahmedabad',
          organizationalUnit: 'Legal Metrology Division',
          serialNumber: '20260001aabbccdd',
          validityDays: 365,
        });

      assert.ok(privateKeyPem.includes('BEGIN PRIVATE KEY'));
      assert.ok(publicKeyPem.includes('BEGIN PUBLIC KEY'));
      assert.ok(certificatePem.includes('BEGIN CERTIFICATE'));
      assert.ok(certificate.subject.includes('Dr. A. K. Sharma'));
      assert.equal(certificate.serialNumber.toLowerCase(), '20260001aabbccdd');
    });

    it('parses certificate metadata accurately', async () => {
      const { certificatePem } = await generateTestKeyPairAndCertificate({
        commonName: 'S. P. Patel (Reviewer)',
        serialNumber: '9988776655443322',
      });

      const meta = parseCertificate(certificatePem);

      assert.ok(meta.subject.includes('S. P. Patel'));
      assert.equal(meta.serialNumber.toLowerCase(), '9988776655443322');
      assert.equal(meta.isExpired, false);
      assert.equal(meta.sha256Fingerprint.length, 64);
      assert.match(meta.sha256Fingerprint, /^[0-9a-f]{64}$/);
      assert.ok(meta.validTo.getTime() > meta.validFrom.getTime());
    });
  });

  describe('Cryptographic Sign & Verify Operations', () => {
    it('signs data buffer and verifies with public key and certificate PEM', async () => {
      const { privateKeyPem, publicKeyPem, certificatePem } =
        await generateTestKeyPairAndCertificate();

      const testData = Buffer.from('MAANAK_OFFICIAL_TEST_REPORT_HASH_1234567890');
      const signatureBase64 = signDigest(testData, privateKeyPem);

      assert.ok(signatureBase64.length > 0);

      // Verify with public key PEM
      const validWithPubKey = verifyDigestSignature(testData, signatureBase64, publicKeyPem);
      assert.equal(validWithPubKey, true);

      // Verify with certificate PEM
      const validWithCert = verifyDigestSignature(testData, signatureBase64, certificatePem);
      assert.equal(validWithCert, true);
    });

    it('rejects signature when data has been modified', async () => {
      const { privateKeyPem, publicKeyPem } = await generateTestKeyPairAndCertificate();

      const originalData = Buffer.from('APPROVED_INDICATION_2.50000000');
      const signatureBase64 = signDigest(originalData, privateKeyPem);

      const tamperedData = Buffer.from('APPROVED_INDICATION_2.50000001');
      const isValid = verifyDigestSignature(tamperedData, signatureBase64, publicKeyPem);

      assert.equal(isValid, false);
    });
  });

  describe('PDF Report Digital Signing & Adobe Signature Inspection (Acceptance Criteria)', () => {
    it('embeds Adobe-compliant /Type /Sig dictionary into PDF and extracts valid metadata', async () => {
      const { privateKeyPem, certificatePem } = await generateTestKeyPairAndCertificate({
        commonName: 'Dr. A. K. Sharma (Director)',
        organization: 'RRSL Ahmedabad',
      });

      // Sample raw PDF buffer
      const samplePdf = Buffer.from(
        '%PDF-1.7\n' +
          '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
          '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
          '3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n' +
          'xref\n0 4\n' +
          '0000000000 65535 f \n' +
          '0000000010 00000 n \n' +
          '0000000060 00000 n \n' +
          '0000000115 00000 n \n' +
          'trailer\n<< /Size 4 /Root 1 0 R >>\n' +
          'startxref\n165\n' +
          '%%EOF\n',
        'utf8'
      );

      const signedPdf = await signReportDigest(samplePdf, privateKeyPem, certificatePem, {
        signerName: 'Dr. A. K. Sharma',
        reason: 'Official OIML R-76 NAWI Verification Test Report Certification',
        location: 'RRSL Ahmedabad Laboratory',
      });

      // Assert signed PDF characteristics
      assert.ok(signedPdf.length > samplePdf.length);
      assert.ok(signedPdf.toString('utf8').startsWith('%PDF-1.7'));
      assert.ok(signedPdf.toString('utf8').includes('/Type /Sig'));
      assert.ok(signedPdf.toString('utf8').includes('/Filter /Adobe.PPKLite'));
      assert.ok(signedPdf.toString('utf8').includes('/SubFilter /adbe.pkcs7.detached'));

      // Acceptance Criteria: Generated PDF displays valid signature metadata when inspected
      const extractedSignatures = extractPdfSignatureMetadata(signedPdf, certificatePem);
      assert.equal(extractedSignatures.length, 1);

      const sig = extractedSignatures[0];
      assert.equal(sig.name, 'Dr. A. K. Sharma');
      assert.equal(sig.reason, 'Official OIML R-76 NAWI Verification Test Report Certification');
      assert.equal(sig.location, 'RRSL Ahmedabad Laboratory');
      assert.equal(sig.filter, 'Adobe.PPKLite');
      assert.equal(sig.subFilter, 'adbe.pkcs7.detached');
      assert.ok(sig.byteRange && sig.byteRange.length === 4);
      assert.ok(sig.signatureHex && sig.signatureHex.length > 0);
      assert.equal(sig.isValidSignature, true);
    });

    it('creates structured DigitalSignatureMetadata for database persistence', async () => {
      const { privateKeyPem, certificatePem } = await generateTestKeyPairAndCertificate({
        serialNumber: '202699aabbcc',
      });

      const pdf = Buffer.from('%PDF-1.7 Mock Report Content %%EOF', 'utf8');

      const meta = createDigitalSignatureMetadata({
        testSessionId: 'sess-sign-01',
        signerUserId: 'user-director-01',
        signerRole: 'DIRECTOR',
        pdfBuffer: pdf,
        certPem: certificatePem,
        privateKeyPem: privateKeyPem,
      });

      assert.equal(meta.testSessionId, 'sess-sign-01');
      assert.equal(meta.signerUserId, 'user-director-01');
      assert.equal(meta.signerRole, 'DIRECTOR');
      assert.equal(meta.serialNumber.toLowerCase(), '202699aabbcc');
      assert.equal(meta.valid, true);
      assert.equal(meta.sha256Digest.length, 64);
      assert.equal(meta.pdfBinaryHashSha256, meta.sha256Digest);
      assert.ok(meta.pkiSignatureValueBase64 && meta.pkiSignatureValueBase64.length > 0);
    });
  });
});
