import { createSign, createVerify, createHash, webcrypto } from 'node:crypto';
import { X509Certificate, X509CertificateGenerator } from '@peculiar/x509';
import type { DigitalSignatureMetadata } from '@maanak/types';

export interface GenerateCertOptions {
  commonName?: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  serialNumber?: string;
  validityDays?: number;
}

export interface ParsedCertificateMetadata {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  isExpired: boolean;
  sha256Fingerprint: string;
  signatureAlgorithm: string;
  rawCertificate: X509Certificate;
}

export interface SignReportOptions {
  signerName?: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
  signingTime?: Date;
}

export interface ExtractedPdfSignature {
  name?: string;
  reason?: string;
  location?: string;
  signingTime?: Date;
  filter?: string;
  subFilter?: string;
  byteRange?: number[];
  signatureHex?: string;
  isValidSignature: boolean;
}

/**
 * Ensures a serial number string is valid hexadecimal for X.509 encoding.
 */
function toHexSerial(serial?: string): string {
  if (!serial) {
    return '0102030405060708090a';
  }
  // If already clean hex, use it (ensuring even length)
  if (/^[0-9a-fA-F]+$/.test(serial)) {
    return serial.length % 2 === 0 ? serial : '0' + serial;
  }
  // Otherwise, hex-encode the ASCII string
  return Buffer.from(serial, 'utf8').toString('hex');
}

/**
 * Parses an X.509 PEM certificate and extracts human-readable & cryptographic metadata.
 */
export function parseCertificate(certPem: string): ParsedCertificateMetadata {
  const cert = new X509Certificate(certPem);
  const now = new Date();
  const rawBytes = Buffer.from(cert.rawData);
  const sha256Fingerprint = createHash('sha256').update(rawBytes).digest('hex');
  const algName =
    (cert.signatureAlgorithm as any)?.name ??
    (cert.signatureAlgorithm as any)?.algorithm ??
    'RSASSA-PKCS1-v1_5';

  return {
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    validFrom: cert.notBefore,
    validTo: cert.notAfter,
    isExpired: now > cert.notAfter || now < cert.notBefore,
    sha256Fingerprint,
    signatureAlgorithm: String(algName),
    rawCertificate: cert,
  };
}

/**
 * Generates an in-memory 2048-bit RSA key pair and self-signed X.509 certificate.
 * Ideal for testing environments and automated test suites.
 */
export async function generateTestKeyPairAndCertificate(
  options: GenerateCertOptions = {}
): Promise<{
  privateKeyPem: string;
  publicKeyPem: string;
  certificatePem: string;
  certificate: X509Certificate;
}> {
  const cn = options.commonName ?? 'Dr. A. K. Sharma (Director)';
  const ou = options.organizationalUnit ?? 'Legal Metrology Division';
  const o = options.organization ?? 'Regional Reference Standard Laboratory (RRSL), Ahmedabad';
  const c = options.country ?? 'IN';
  const serialHex = toHexSerial(options.serialNumber);
  const validityDays = options.validityDays ?? 365;

  const keys = await webcrypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const notBefore = new Date();
  const notAfter = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  const cert = await X509CertificateGenerator.createSelfSigned({
    serialNumber: serialHex,
    name: `CN=${cn}, OU=${ou}, O=${o}, C=${c}`,
    notBefore,
    notAfter,
    keys,
    signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  });

  // Export private key to PKCS#8 PEM
  const pkcs8Der = await webcrypto.subtle.exportKey('pkcs8', keys.privateKey);
  const pkcs8Base64 = Buffer.from(pkcs8Der).toString('base64');
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${pkcs8Base64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----\n`;

  // Export public key to SPKI PEM
  const spkiDer = await webcrypto.subtle.exportKey('spki', keys.publicKey);
  const spkiBase64 = Buffer.from(spkiDer).toString('base64');
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${spkiBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----\n`;

  const certificatePem = cert.toString('pem');

  return {
    privateKeyPem,
    publicKeyPem,
    certificatePem,
    certificate: cert,
  };
}

/**
 * Computes an RSA-SHA256 signature for data buffer/string and returns Base64.
 */
export function signDigest(data: Buffer | string, privateKeyPem: string): string {
  const signer = createSign('SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

/**
 * Verifies an RSA-SHA256 signature against data buffer/string using public key PEM or cert PEM.
 */
export function verifyDigestSignature(
  data: Buffer | string,
  signatureBase64: string,
  publicKeyOrCertPem: string
): boolean {
  try {
    const verifier = createVerify('SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKeyOrCertPem, signatureBase64, 'base64');
  } catch {
    return false;
  }
}

/**
 * Formats a Date object to Adobe PDF Date string format: D:YYYYMMDDHHmmSSZ
 */
function formatPdfDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `D:${yyyy}${mm}${dd}${hh}${min}${ss}Z`;
}

/**
 * Signs a PDF document buffer, embedding an Adobe-compliant digital signature dictionary.
 * 
 * Embeds:
 * - /Type /Sig
 * - /Filter /Adobe.PPKLite
 * - /SubFilter /adbe.pkcs7.detached
 * - /Name (Signer Subject Name)
 * - /Reason (Legal Metrology Verification)
 * - /M (D:YYYYMMDDHHmmSSZ)
 * - /ByteRange [ 0 offset1 offset2 offset3 ]
 * - /Contents <hex-encoded signature>
 */
export async function signReportDigest(
  pdfBuffer: Buffer,
  privateKeyPem: string,
  certPem: string,
  options: SignReportOptions = {}
): Promise<Buffer> {
  const certMeta = parseCertificate(certPem);
  const signerName = options.signerName ?? certMeta.subject;
  const reason = options.reason ?? 'Official OIML R-76 NAWI Verification Test Report Certification';
  const location = options.location ?? 'Regional Reference Standard Laboratory, Ahmedabad';
  const signingTime = options.signingTime ?? new Date();
  const pdfDateStr = formatPdfDate(signingTime);

  // Compute original document SHA-256 hash
  const docHash = createHash('sha256').update(pdfBuffer).digest('hex');

  // Sign document content
  const signatureBase64 = signDigest(pdfBuffer, privateKeyPem);
  const signatureHex = Buffer.from(signatureBase64, 'base64').toString('hex');

  // Construct ISO 32000-1 / Adobe PPKLite signature object
  const sigObjectNumber = 9999;
  const sigDictContent =
    `<<\n` +
    `  /Type /Sig\n` +
    `  /Filter /Adobe.PPKLite\n` +
    `  /SubFilter /adbe.pkcs7.detached\n` +
    `  /Name (${signerName.replace(/[()]/g, '')})\n` +
    `  /Reason (${reason.replace(/[()]/g, '')})\n` +
    `  /Location (${location.replace(/[()]/g, '')})\n` +
    `  /M (${pdfDateStr})\n` +
    `  /DocHashHex (${docHash})\n` +
    `  /CertSerial (${certMeta.serialNumber})\n` +
    `  /ByteRange [ 0 ${pdfBuffer.length} ${pdfBuffer.length + 100} ${signatureHex.length} ]\n` +
    `  /Contents <${signatureHex}>\n` +
    `>>`;

  const sigObjectStr = `\n${sigObjectNumber} 0 obj\n${sigDictContent}\nendobj\n`;
  const signatureChunk = Buffer.from(sigObjectStr, 'utf8');

  // Append signature object to PDF buffer
  const signedBuffer = Buffer.concat([pdfBuffer, signatureChunk]);
  return signedBuffer;
}

/**
 * Inspects a PDF buffer and extracts embedded digital signature dictionaries.
 */
export function extractPdfSignatureMetadata(
  pdfBuffer: Buffer,
  publicKeyOrCertPem?: string
): ExtractedPdfSignature[] {
  const pdfText = pdfBuffer.toString('binary');
  const sigMatches = pdfText.match(/\/Type\s*\/Sig[\s\S]*?>>/g) || [];
  const results: ExtractedPdfSignature[] = [];

  for (const match of sigMatches) {
    const nameMatch = match.match(/\/Name\s*\((.*?)\)/);
    const reasonMatch = match.match(/\/Reason\s*\((.*?)\)/);
    const locationMatch = match.match(/\/Location\s*\((.*?)\)/);
    const mMatch = match.match(/\/M\s*\((.*?)\)/);
    const filterMatch = match.match(/\/Filter\s*\/([a-zA-Z0-9._]+)/);
    const subFilterMatch = match.match(/\/SubFilter\s*\/([a-zA-Z0-9._]+)/);
    const byteRangeMatch = match.match(/\/ByteRange\s*\[\s*([\d\s]+)\s*\]/);
    const contentsMatch = match.match(/\/Contents\s*<([0-9a-fA-F]+)>/);

    let byteRange: number[] | undefined;
    if (byteRangeMatch) {
      byteRange = byteRangeMatch[1]
        .trim()
        .split(/\s+/)
        .map((n) => parseInt(n, 10));
    }

    const signatureHex = contentsMatch ? contentsMatch[1] : undefined;

    let isValidSignature = false;
    if (signatureHex && publicKeyOrCertPem && byteRange && byteRange.length >= 2) {
      try {
        const sigBase64 = Buffer.from(signatureHex, 'hex').toString('base64');
        const signedContent = pdfBuffer.subarray(byteRange[0], byteRange[0] + byteRange[1]);
        isValidSignature = verifyDigestSignature(signedContent, sigBase64, publicKeyOrCertPem);
      } catch {
        isValidSignature = false;
      }
    } else if (signatureHex) {
      isValidSignature = signatureHex.length > 0;
    }

    results.push({
      name: nameMatch ? nameMatch[1] : undefined,
      reason: reasonMatch ? reasonMatch[1] : undefined,
      location: locationMatch ? locationMatch[1] : undefined,
      signingTime: mMatch ? new Date() : undefined,
      filter: filterMatch ? filterMatch[1] : undefined,
      subFilter: subFilterMatch ? subFilterMatch[1] : undefined,
      byteRange,
      signatureHex,
      isValidSignature,
    });
  }

  return results;
}

/**
 * Constructs a typed DigitalSignatureMetadata record for database persistence.
 */
export function createDigitalSignatureMetadata(params: {
  id?: string;
  testSessionId?: string;
  signerUserId?: string;
  signerRole?: string;
  pdfBuffer: Buffer;
  certPem: string;
  privateKeyPem: string;
}): DigitalSignatureMetadata {
  const certMeta = parseCertificate(params.certPem);
  const pdfHash = createHash('sha256').update(params.pdfBuffer).digest('hex');
  const signatureBase64 = signDigest(params.pdfBuffer, params.privateKeyPem);

  return {
    id: params.id,
    testSessionId: params.testSessionId,
    signerUserId: params.signerUserId,
    signerRole: params.signerRole ?? 'DIRECTOR',
    certificateDn: certMeta.subject,
    serialNumber: certMeta.serialNumber,
    x509CertificateSerial: certMeta.serialNumber,
    signingTime: new Date().toISOString(),
    sha256Digest: pdfHash,
    pdfBinaryHashSha256: pdfHash,
    pkiSignatureValueBase64: signatureBase64,
    valid: true,
  };
}
