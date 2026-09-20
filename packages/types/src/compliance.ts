export interface NABLPreCheckResult {
  compliant: boolean;
  actualUncertainty: string;
  maxAllowedUncertainty: string;
  warningMessage?: string;
}

export interface ProvenanceNode {
  nodeId: string;
  parentNodeId?: string;
  eventType: string;
  payloadHash: string;
  timestamp: string;
}

export interface DigitalSignatureMetadata {
  certificateDn: string;
  serialNumber: string;
  signingTime: string;
  sha256Digest: string;
  valid: boolean;
}
