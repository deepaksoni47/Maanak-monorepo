import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, prisma as defaultPrisma } from "@maanak/db";
import { validateSessionProvenanceChain } from "@maanak/crypto-provenance";

export interface VerifyRouterOptions {
  db?: PrismaClient;
}

export function createVerifyRouter(options: VerifyRouterOptions = {}): Router {
  const router = Router();
  const db = options.db || defaultPrisma;

  /**
   * GET /api/v1/verify/:hash
   * Public verification endpoint. Resolves any cryptographic hash (session hash,
   * provenance node hash, digital signature hash, or report PDF checksum)
   * and verifies the entire WELMEC 7.2 provenance chain for tampering.
   */
  router.get("/:hash", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hash } = req.params;

      if (!hash || hash.trim() === "") {
        res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "A valid cryptographic hash or identifier must be provided.",
        });
        return;
      }

      const cleanHash = hash.trim();
      const normalizedHex = cleanHash.toLowerCase().replace(/^0x/, "");
      const isHexHash = /^[0-9a-f]+$/i.test(normalizedHex);

      // 1. Resolve testSessionId from:
      // a) ProvenanceNode (currentNodeHashSha256 or payloadHashSha256)
      // b) DigitalSignature (pdfBinaryHashSha256)
      // c) ReportVersion (fileHashSha256)
      // d) Report (reportNumber)
      // e) TestSession (id, sessionNumber, or localId)
      let targetSessionId: string | null = null;

      // Try exact and 0x-normalized lookups first
      const searchHashes = [cleanHash, normalizedHex, `0x${normalizedHex}`];

      const provNode = await db.provenanceNode.findFirst({
        where: {
          OR: [
            { currentNodeHashSha256: { in: searchHashes } },
            { payloadHashSha256: { in: searchHashes } },
            ...(isHexHash && normalizedHex.length >= 8 && normalizedHex.length < 64
              ? [
                  { currentNodeHashSha256: { startsWith: normalizedHex } },
                  { payloadHashSha256: { startsWith: normalizedHex } },
                ]
              : []),
          ],
        },
      });

      if (provNode) {
        targetSessionId = provNode.testSessionId;
      } else {
        const sig = await db.digitalSignature.findFirst({
          where: {
            OR: [
              { pdfBinaryHashSha256: { in: searchHashes } },
              ...(isHexHash && normalizedHex.length >= 8 && normalizedHex.length < 64
                ? [{ pdfBinaryHashSha256: { startsWith: normalizedHex } }]
                : []),
            ],
          },
        });

        if (sig) {
          targetSessionId = sig.testSessionId;
        } else {
          const reportVer = await db.reportVersion.findFirst({
            where: {
              OR: [
                { fileHashSha256: { in: searchHashes } },
                ...(isHexHash && normalizedHex.length >= 8 && normalizedHex.length < 64
                  ? [{ fileHashSha256: { startsWith: normalizedHex } }]
                  : []),
              ],
            },
            include: { report: true },
          });

          if (reportVer && reportVer.report) {
            targetSessionId = reportVer.report.testSessionId;
          } else {
            const reportMatch = await db.report.findFirst({
              where: {
                reportNumber: { equals: cleanHash, mode: "insensitive" },
              },
            });

            if (reportMatch) {
              targetSessionId = reportMatch.testSessionId;
            } else {
              const sessionMatch = await db.testSession.findFirst({
                where: {
                  OR: [
                    { id: cleanHash },
                    { sessionNumber: { equals: cleanHash, mode: "insensitive" } },
                    { localId: cleanHash },
                  ],
                },
              });

              if (sessionMatch) {
                targetSessionId = sessionMatch.id;
              }
            }
          }
        }
      }

      if (!targetSessionId) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `No verification record found for hash or identifier: "${cleanHash}".`,
        });
        return;
      }

      // 2. Retrieve session graph
      const session = await db.testSession.findUnique({
        where: { id: targetSessionId },
        include: {
          laboratory: true,
          instrumentUnit: {
            include: {
              instrumentModel: {
                include: {
                  manufacturer: true,
                  accuracyClass: true,
                },
              },
            },
          },
          digitalSignatures: {
            orderBy: { signedAt: "desc" },
            include: {
              signerUser: true,
            },
          },
          reports: {
            include: {
              versions: {
                orderBy: { versionNumber: "desc" },
              },
            },
          },
          provenanceNodes: {
            orderBy: { nodeSequence: "asc" },
          },
        },
      });

      if (!session) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Associated test session "${targetSessionId}" could not be found.`,
        });
        return;
      }

      // 3. Cryptographically validate entire WELMEC 7.2 provenance chain
      const hasNodes = session.provenanceNodes && session.provenanceNodes.length > 0;
      const chainValidation = hasNodes
        ? validateSessionProvenanceChain(session.provenanceNodes as any)
        : {
            valid: true,
            totalNodesChecked: 0,
            failureReason: undefined,
            details: "Session initialized; provenance nodes pending logging.",
            brokenAtIndex: undefined,
          };

      const tamperDetected = hasNodes ? !chainValidation.valid : false;
      const latestSignature = session.digitalSignatures[0];
      const report = session.reports[0];
      const model = session.instrumentUnit.instrumentModel;
      const manufacturer = model.manufacturer;
      const accuracyClass = model.accuracyClass;

      const pdfSha256 =
        latestSignature?.pdfBinaryHashSha256 ||
        report?.versions[0]?.fileHashSha256 ||
        cleanHash;

      // Overall verification is valid only if provenance chain is intact AND (signed or completed or active)
      const isAuthentic =
        chainValidation.valid &&
        !tamperDetected &&
        (session.status === "COMPLETED" || session.status === "IN_PROGRESS" || !!latestSignature);

      res.status(200).json({
        valid: isAuthentic,
        sessionNumber: session.sessionNumber,
        instrumentModel: model.modelName,
        manufacturer: manufacturer?.companyName || "Standard Manufacturer",
        laboratoryName: session.laboratory.name,
        signedAt: latestSignature?.signedAt?.toISOString() || null,
        signerName:
          latestSignature?.signerUser?.fullName ||
          "Authorized Legal Metrology Signatory",
        pdfSha256,
        tamperDetected,
        chainValidation: {
          valid: chainValidation.valid,
          totalNodesChecked: chainValidation.totalNodesChecked,
          failureReason: chainValidation.failureReason,
          details: chainValidation.details,
          brokenAtIndex: chainValidation.brokenAtIndex,
        },
        certificate: {
          reportNumber: report?.reportNumber || `RRSL-${session.sessionNumber}`,
          accuracyClass: accuracyClass?.name || "Class III",
          maxCapacity: `${model.maxCapacity} ${model.unitOfMeasure}`,
          verificationIntervalE: `${model.verificationScaleIntervalE} ${model.unitOfMeasure}`,
          status: session.status,
          isSigned: report?.isSigned || !!latestSignature,
        },
        verifiedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const verifyRouter = createVerifyRouter();
