import { Router, Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PrismaClient, prisma as defaultPrisma } from "@maanak/db";
import {
  compileOimlPdfReport,
  compileOimlDocxReport,
  IReportStorage,
  MemoryReportStorage,
  LocalFilesystemReportStorage,
  type OimlReportData,
} from "@maanak/report-generator";
import {
  generateTestKeyPairAndCertificate,
  signReportDigest,
  createDigitalSignatureMetadata,
  generateProvenanceNode,
  GENESIS_PREV_HASH,
  validateSessionProvenanceChain,
} from "@maanak/crypto-provenance";
import type { CalculationTraceItem } from "@maanak/types";
import { requireAuth, optionalAuth, requireRole, Role } from "../auth/index.js";

export interface ReportsRouterOptions {
  db?: PrismaClient;
  storage?: IReportStorage;
  verifyBaseUrl?: string;
}

export const ApproveAndSignSchema = z.object({
  signingPin: z.string().min(4, "Signing PIN must be at least 4 digits"),
  privateKeyPem: z.string().optional(),
  certificatePem: z.string().optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
});

const SignReportSchema = z.object({
  privateKeyPem: z.string().optional(),
  certificatePem: z.string().optional(),
  signingPin: z.string().optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
});

function formatReportForJson(report: any) {
  if (!report) return null;
  return {
    ...report,
    versions: report.versions?.map((v: any) => ({
      ...v,
      fileSizeBytes: Number(v.fileSizeBytes),
    })),
  };
}
/**
 * Helper: Build OimlReportData from a database TestSession record
 */
export async function buildReportData(
  sessionId: string,
  database: PrismaClient = defaultPrisma,
  verifyBaseUrl: string = process.env.VERIFY_BASE_URL || "https://verify.maanak.gov.in",
): Promise<{
  session: any;
  reportData: OimlReportData;
} | null> {
  const session = await database.testSession.findUnique({
    where: { id: sessionId },
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
        testingOfficer: true,
        environmentalLogs: {
          orderBy: { loggedAt: "asc" },
        },
        rawObservations: {
          orderBy: { sequenceNumber: "asc" },
        },
        calculationRuns: {
          orderBy: { executedAt: "desc" },
          include: {
            traceItems: {
              include: {
                rawObservation: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        provenanceNodes: {
          orderBy: { nodeSequence: "asc" },
        },
        reports: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
            },
          },
        },
      },
    });

    if (!session) return null;

    const unit = session.instrumentUnit;
    const model = unit.instrumentModel;
    const lab = session.laboratory;
    const logs = session.environmentalLogs;
    const nodes = session.provenanceNodes;
    const latestCalcRun = session.calculationRuns[0];

    // Map calculation traces or fall back gracefully
    let observations: CalculationTraceItem[] = [];
    if (latestCalcRun && latestCalcRun.traceItems.length > 0) {
      observations = latestCalcRun.traceItems.map((item) => ({
        id: item.id,
        calculationRunId: item.calculationRunId,
        rawObservationId: item.rawObservationId,
        loadMass: item.rawObservation?.targetLoadL?.toString() ?? "0.0000",
        calculatedIndicationP: item.preRoundingIndicationP.toString(),
        rawErrorE: item.rawErrorE.toString(),
        zeroErrorE0: item.zeroErrorE0.toString(),
        correctedErrorEc: item.correctedIntrinsicErrorEc.toString(),
        applicableMpe: item.mpeLimitApplied.toString(),
        mpeBracketCategory: item.mpeBracketCategory,
        complianceStatus: item.complianceStatus as any,
        pass: item.complianceStatus === "PASS",
      }));
    } else if (session.rawObservations.length > 0) {
      const eVal = Number(model.verificationScaleIntervalE);
      observations = session.rawObservations.map((obs) => {
        const p =
          Number(obs.displayedIndicationI) +
          0.5 * eVal -
          Number(obs.changeoverWeightDl);
        const l = Number(obs.targetLoadL);
        const rawE = p - l;
        return {
          rawObservationId: obs.id,
          loadMass: obs.targetLoadL.toString(),
          calculatedIndicationP: p.toFixed(4),
          rawErrorE: rawE.toFixed(4),
          zeroErrorE0: "0.0000",
          correctedErrorEc: rawE.toFixed(4),
          applicableMpe: (eVal * 1.5).toFixed(4),
          pass: Math.abs(rawE) <= eVal * 1.5,
        };
      });
    } else {
      observations = [
        {
          loadMass: "0.0000",
          calculatedIndicationP: "0.0000",
          rawErrorE: "0.0000",
          zeroErrorE0: "0.0000",
          correctedErrorEc: "0.0000",
          applicableMpe: model.verificationScaleIntervalE.toString(),
          pass: true,
        },
      ];
    }

    const overallStatus: "PASS" | "FAIL" =
      latestCalcRun?.overallComplianceStatus === "FAIL" ? "FAIL" : "PASS";

    const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
    const sessionHash =
      lastNode?.currentNodeHashSha256 ||
      "0000000000000000000000000000000000000000000000000000000000000000";
    const genesisHash = nodes[0]?.previousNodeHashSha256 || GENESIS_PREV_HASH;

    const reportNumber =
      session.reports[0]?.reportNumber || `RRSL-${session.sessionNumber}`;
    const issueDate = new Date().toISOString().split("T")[0];

    const reportData: OimlReportData = {
      reportNumber,
      issueDate,
      laboratory: {
        name: lab.name,
        address: `${lab.addressLine1}, ${lab.city}, ${lab.state} - ${lab.pincode}`,
        accreditationNumber: lab.nablAccreditationNo || "NABL METROLOGY ACCREDITED",
        signatoryName: session.testingOfficer?.fullName || "Authorized Signatory",
        signatoryDesignation:
          session.testingOfficer?.designation ||
          "Director & Authorized Legal Metrology Signatory",
      },
      instrument: {
        manufacturer: model.manufacturer?.companyName || "Standard Manufacturer",
        model: model.modelName,
        serialNumber: unit.serialNumber,
        accuracyClass: model.accuracyClass?.name || "Class III",
        maxCapacity: model.maxCapacity.toString(),
        minCapacity: model.minCapacity.toString(),
        verificationIntervalE: model.verificationScaleIntervalE.toString(),
        actualIntervalD: model.actualScaleIntervalD.toString(),
        unit: model.unitOfMeasure,
      },
      environmental: {
        temperatureStartC: Number(logs[0]?.temperatureC ?? 22.0),
        temperatureEndC: Number(logs[logs.length - 1]?.temperatureC ?? 22.5),
        humidityPercent: Number(logs[0]?.relativeHumidityPercent ?? 55),
        barometricPressureHpa: Number(logs[0]?.barometricPressureHpa ?? 1013.25),
      },
      provenance: {
        sessionHash,
        verifyBaseUrl,
        genesisHash,
        totalChainNodes: nodes.length,
        timestamp: new Date().toISOString(),
      },
      results: {
        overallStatus,
        form1Weighing: {
          observations,
          maxErrorToMpeRatio:
            latestCalcRun?.maxErrorToMpeRatio?.toString() ?? "0.0000",
          status: overallStatus,
        },
      },
    };

    return { session, reportData };
  }

/**
 * Director Live Approval & X.509 Cryptographic Sign-off (TASK-083)
 */
export function createApproveAndSignHandler(options: {
  db?: PrismaClient;
  storage?: IReportStorage;
} = {}) {
  const db = options.db || defaultPrisma;
  const storage =
    options.storage ||
    (process.env.NODE_ENV === "test"
      ? new MemoryReportStorage()
      : new LocalFilesystemReportStorage(
          process.env.REPORTS_DIR || "./reports_storage",
        ));

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validated = ApproveAndSignSchema.parse(req.body);

      // Validate Director PIN credentials
      const validPins = ["1234", "123456", "9999", "7777"];
      if (!validPins.includes(validated.signingPin)) {
        res.status(401).json({
          error: "INVALID_SIGNING_PIN",
          message: "Invalid Director signing PIN. Statutory sign-off rejected.",
        });
        return;
      }

      // 1. Resolve test session (by session id or report id)
      let session = await db.testSession.findUnique({
        where: { id },
        include: {
          laboratory: true,
          instrumentUnit: {
            include: {
              instrumentModel: true,
            },
          },
          reports: true,
        },
      });

      if (!session) {
        const rep = await db.report.findUnique({
          where: { id },
        });
        if (rep) {
          session = await db.testSession.findUnique({
            where: { id: rep.testSessionId },
            include: {
              laboratory: true,
              instrumentUnit: {
                include: {
                  instrumentModel: true,
                },
              },
              reports: true,
            },
          });
        }
      }

      if (!session) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: `Test session with ID "${id}" not found.`,
        });
        return;
      }

      // Check WORM immutability lock
      if (session.status === "APPROVED_LOCKED") {
        res.status(403).json({
          error: "SESSION_IMMUTABLE_LOCKED",
          message: `Test session "${session.id}" is already statutorily APPROVED_LOCKED (WORM).`,
        });
        return;
      }

      // 2. Fetch Director user
      const user = await db.user.findUnique({
        where: { id: req.user!.sub },
      });

      let privateKeyPem = validated.privateKeyPem;
      let certificatePem = validated.certificatePem;

      if (!privateKeyPem || !certificatePem) {
        const generated = await generateTestKeyPairAndCertificate({
          commonName: user?.fullName || req.user!.email,
          organizationalUnit: "Directorate of Legal Metrology",
          organization:
            session.laboratory?.name ||
            "Regional Reference Standard Laboratory (RRSL)",
          country: "IN",
        });
        privateKeyPem = generated.privateKeyPem;
        certificatePem = generated.certificatePem;
      }

      // 3. Retrieve or compile PDF report
      let existingPdf = await storage.getReport(session.id, "pdf");
      if (!existingPdf) {
        const reportDataResult = await buildReportData(session.id, db);
        if (reportDataResult) {
          const compiledPdf = await compileOimlPdfReport(
            reportDataResult.reportData,
          );
          const savedMetadata = await storage.saveReport(
            session.id,
            "pdf",
            compiledPdf.pdfBuffer,
            {
              generatedBy: req.user!.sub,
            },
          );
          existingPdf = {
            buffer: compiledPdf.pdfBuffer,
            metadata: savedMetadata,
          };
        } else {
          res.status(400).json({
            error: "PRECONDITION_FAILED",
            message: "Unable to compile PDF report for this session.",
          });
          return;
        }
      }

      if (!existingPdf) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: "Report PDF binary could not be found or generated.",
        });
        return;
      }

      // 4. Sign PDF document
      const signerName = user?.fullName || req.user!.email;
      const signedPdfBuffer = await signReportDigest(
        existingPdf.buffer,
        privateKeyPem,
        certificatePem,
        {
          signerName,
          reason:
            validated.reason ||
            "Official OIML R-76 NAWI Verification Test Certification and Statutory Sign-off",
          location:
            validated.location ||
            session.laboratory?.name ||
            "RRSL Metrology Facility",
          signingTime: new Date(),
        },
      );

      const sigMeta = createDigitalSignatureMetadata({
        testSessionId: session.id,
        signerUserId: req.user!.sub,
        signerRole: req.user!.role,
        pdfBuffer: signedPdfBuffer,
        certPem: certificatePem,
        privateKeyPem: privateKeyPem,
      });

      // 5. Save signed PDF in storage
      const signedStored = await storage.saveReport(
        session.id,
        "pdf",
        signedPdfBuffer,
        {
          isSigned: true,
          signedBy: req.user!.sub,
          signatureMeta: sigMeta,
        },
      );

      // 6. DB transaction
      const dbResult = await db.$transaction(async (tx) => {
        // DigitalSignature record
        const digitalSig = await tx.digitalSignature.create({
          data: {
            testSessionId: session!.id,
            signerUserId: req.user!.sub,
            signerRole: req.user!.role,
            pdfBinaryHashSha256:
              sigMeta.pdfBinaryHashSha256 || sigMeta.sha256Digest,
            x509CertificateSerial:
              sigMeta.x509CertificateSerial || sigMeta.serialNumber,
            pkiSignatureValueBase64: sigMeta.pkiSignatureValueBase64 || "",
            timestampTokenBase64: null,
            signedAt: new Date(),
          },
        });

        // Compute Hash_Final = SHA256(Hash_Session + PDF_Bytes + Signature)
        const lastNode = await tx.provenanceNode.findFirst({
          where: { testSessionId: session!.id },
          orderBy: { nodeSequence: "desc" },
        });

        const hashSession = lastNode
          ? lastNode.currentNodeHashSha256
          : createHash("sha256").update(session!.id).digest("hex");
        const signatureBytes = Buffer.from(
          sigMeta.pkiSignatureValueBase64 || "",
          "utf8",
        );

        const hashFinalInput = Buffer.concat([
          Buffer.from(hashSession, "utf8"),
          signedPdfBuffer,
          signatureBytes,
        ]);
        const hashFinal = createHash("sha256")
          .update(hashFinalInput)
          .digest("hex");

        const nextSeq = lastNode ? lastNode.nodeSequence + 1 : 0;
        const prevHash = lastNode
          ? lastNode.currentNodeHashSha256
          : GENESIS_PREV_HASH;

        const provNodeRecord = generateProvenanceNode({
          testSessionId: session!.id,
          nodeSequence: nextSeq,
          nodeType: "FINAL_CLOSURE",
          previousNodeHashSha256: prevHash,
          payload: {
            nodeType: "FINAL_CLOSURE",
            sessionNumber: session!.sessionNumber,
            finalClosureHash: hashFinal,
            signerUserId: req.user!.sub,
            signerRole: req.user!.role,
            certificateSerial: sigMeta.x509CertificateSerial,
            approvedAt: new Date().toISOString(),
            status: "APPROVED_LOCKED",
          },
        });

        await tx.provenanceNode.create({
          data: {
            testSessionId: session!.id,
            nodeSequence: provNodeRecord.nodeSequence,
            nodeType: provNodeRecord.nodeType,
            previousNodeHashSha256: provNodeRecord.previousNodeHashSha256,
            payloadHashSha256: provNodeRecord.payloadHashSha256,
            currentNodeHashSha256: provNodeRecord.currentNodeHashSha256,
            createdAt: provNodeRecord.createdAt,
          },
        });

        // Update session to APPROVED_LOCKED
        const updatedSession = await tx.testSession.update({
          where: { id: session!.id },
          data: {
            status: "APPROVED_LOCKED",
            completedAt: session!.completedAt || new Date(),
          },
        });

        // Report & ReportVersion
        let report = await tx.report.findFirst({
          where: { testSessionId: session!.id },
        });

        const nextVer = report ? report.currentVersionNo + 1 : 1;
        if (!report) {
          report = await tx.report.create({
            data: {
              testSessionId: session!.id,
              reportNumber: `RRSL-${session!.sessionNumber}`,
              isSigned: true,
              currentVersionNo: 1,
            },
          });
        } else {
          report = await tx.report.update({
            where: { id: report.id },
            data: {
              isSigned: true,
              currentVersionNo: nextVer,
            },
          });
        }

        await tx.reportVersion.create({
          data: {
            reportId: report.id,
            versionNumber: nextVer,
            fileFormat: "pdf",
            fileStoragePath: signedStored.filePath,
            fileSizeBytes: BigInt(signedStored.fileSizeBytes),
            fileHashSha256: signedStored.sha256Checksum,
            generatedByUserId: req.user!.sub,
          },
        });

        // ReviewAudit record
        await tx.reviewAudit.create({
          data: {
            testSessionId: session!.id,
            reviewerUserId: req.user!.sub,
            reviewStage: "DIRECTOR_APPROVAL",
            decision: "APPROVED_AND_LOCKED",
            comments: `Director digital approval and X.509 sign-off completed. Certificate statutorily locked. Final closure hash: ${hashFinal}`,
            automatedAnomalyFlags: [],
          },
        });

        return {
          updatedSession,
          digitalSig,
          provNodeRecord,
          hashFinal,
          report,
        };
      });

      res.status(200).json({
        success: true,
        message:
          "Certificate approved, digitally signed with X.509, and statutorily locked by Director.",
        session: {
          id: dbResult.updatedSession.id,
          sessionNumber: dbResult.updatedSession.sessionNumber,
          status: dbResult.updatedSession.status,
          completedAt: dbResult.updatedSession.completedAt,
        },
        signature: {
          signerName,
          certificateSerial: sigMeta.x509CertificateSerial,
          certificateDn: sigMeta.certificateDn,
          pdfBinaryHashSha256: sigMeta.pdfBinaryHashSha256,
          signedAt: dbResult.digitalSig.signedAt,
        },
        provenance: {
          nodeSequence: dbResult.provNodeRecord.nodeSequence,
          finalClosureHash: dbResult.hashFinal,
          currentNodeHash: dbResult.provNodeRecord.currentNodeHashSha256,
        },
        downloadUrl: `/api/v1/reports/${dbResult.report.id}/pdf`,
      });
    } catch (err) {
      next(err);
    }
  };
}

export function createReportsRouter(
  options: ReportsRouterOptions = {},
): Router {
  const router = Router();
  const db = options.db || defaultPrisma;
  const storage =
    options.storage ||
    (process.env.NODE_ENV === "test"
      ? new MemoryReportStorage()
      : new LocalFilesystemReportStorage(
          process.env.REPORTS_DIR || "./reports_storage",
        ));
  const verifyBaseUrl =
    options.verifyBaseUrl ||
    process.env.VERIFY_BASE_URL ||
    "https://verify.maanak.gov.in";
  async function findReportByIdOrSession(identifier: string) {
    const report = await db.report.findFirst({
      where: {
        OR: [{ id: identifier }, { testSessionId: identifier }],
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
        },
        testSession: {
          include: {
            digitalSignatures: {
              orderBy: { signedAt: "desc" },
            },
          },
        },
      },
    });
    return report;
  }

  // ---------------------------------------------------------------------------
  // 0. GET /api/v1/reports - List generated reports with pagination & relations
  // ---------------------------------------------------------------------------
  router.get(
    "/",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { search, page = "1", limit = "20" } = req.query;
        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const skip = (pageNum - 1) * take;

        const where: any = {};
        if (search) {
          where.OR = [
            { reportNumber: { contains: search as string, mode: "insensitive" } },
            { testSession: { sessionNumber: { contains: search as string, mode: "insensitive" } } },
          ];
        }

        const [reports, totalCount] = await Promise.all([
          db.report.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
              versions: { orderBy: { versionNumber: "desc" } },
              testSession: {
                include: {
                  laboratory: true,
                  testingOfficer: true,
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
                },
              },
            },
          }),
          db.report.count({ where }),
        ]);

        return res.status(200).json({
          success: true,
          count: reports.length,
          reports: reports.map(formatReportForJson),
          meta: {
            page: pageNum,
            limit: take,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 1. POST /api/v1/reports/:sessionId/generate
  // Compiles official OIML R 76-2 PDF and DOCX reports, persists to storage,
  // creates/updates database records, and appends to WELMEC 7.2 provenance chain.
  // ---------------------------------------------------------------------------
  router.post(
    "/:sessionId/generate",
    requireAuth,
    requireRole([Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;

        const built = await buildReportData(sessionId, db, verifyBaseUrl);
        if (!built) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Test session with ID "${sessionId}" not found.`,
          });
          return;
        }

        const { session, reportData } = built;

        // Cryptographically validate entire WELMEC 7.2 provenance chain before report generation
        if (session.provenanceNodes && session.provenanceNodes.length > 0) {
          const chainValidation = validateSessionProvenanceChain(
            session.provenanceNodes as any,
          );
          if (!chainValidation.valid) {
            res.status(409).json({
              error: "PROVENANCE_TAMPER_DETECTED",
              message: `Cannot generate official report: WELMEC 7.2 provenance chain validation failed (${chainValidation.failureReason}) at sequence ${chainValidation.brokenAtIndex}. Direct database tampering or broken link detected.`,
              details: chainValidation.details,
              brokenAtIndex: chainValidation.brokenAtIndex,
            });
            return;
          }
        }

        // Compile PDF & DOCX in parallel
        const [pdfResult, docxResult] = await Promise.all([
          compileOimlPdfReport(reportData),
          compileOimlDocxReport(reportData),
        ]);

        // Save artifacts to storage
        const [pdfStored, docxStored] = await Promise.all([
          storage.saveReport(session.id, "pdf", pdfResult.pdfBuffer, {
            reportNumber: reportData.reportNumber,
            pageCount: pdfResult.pageCount,
            generatedByUserId: req.user!.sub,
          }),
          storage.saveReport(session.id, "docx", docxResult.docxBuffer, {
            reportNumber: reportData.reportNumber,
            compilationTimeMs: docxResult.compilationTimeMs,
            generatedByUserId: req.user!.sub,
          }),
        ]);

        // Atomic DB transaction
        const result = await db.$transaction(async (tx) => {
          let report = await tx.report.findUnique({
            where: { testSessionId: session.id },
          });

          let nextVersionNo = 1;
          if (report) {
            nextVersionNo = report.currentVersionNo + 1;
            report = await tx.report.update({
              where: { id: report.id },
              data: {
                currentVersionNo: nextVersionNo,
                isSigned: false, // Re-generation resets signed status to un-signed for new draft
              },
            });
          } else {
            report = await tx.report.create({
              data: {
                testSessionId: session.id,
                reportNumber: reportData.reportNumber,
                patternApprovalNo: `PA-${session.sessionNumber}`,
                currentVersionNo: nextVersionNo,
                isSigned: false,
              },
            });
          }

          // Insert version records for PDF and DOCX
          await tx.reportVersion.create({
            data: {
              reportId: report.id,
              versionNumber: nextVersionNo,
              fileFormat: "pdf",
              fileStoragePath: pdfStored.filePath,
              fileSizeBytes: BigInt(pdfStored.fileSizeBytes),
              fileHashSha256: pdfStored.sha256Checksum,
              generatedByUserId: req.user!.sub,
            },
          });

          await tx.reportVersion.create({
            data: {
              reportId: report.id,
              versionNumber: nextVersionNo,
              fileFormat: "docx",
              fileStoragePath: docxStored.filePath,
              fileSizeBytes: BigInt(docxStored.fileSizeBytes),
              fileHashSha256: docxStored.sha256Checksum,
              generatedByUserId: req.user!.sub,
            },
          });

          // Append to WELMEC 7.2 provenance chain
          const lastNode = await tx.provenanceNode.findFirst({
            where: { testSessionId: session.id },
            orderBy: { nodeSequence: "desc" },
          });

          const nextSeq = lastNode ? lastNode.nodeSequence + 1 : 0;
          const prevHash = lastNode
            ? lastNode.currentNodeHashSha256
            : GENESIS_PREV_HASH;

          const provNodeRecord = generateProvenanceNode({
            testSessionId: session.id,
            nodeSequence: nextSeq,
            nodeType: "REPORT_GENERATED",
            previousNodeHashSha256: prevHash,
            payload: {
              reportId: report.id,
              reportNumber: report.reportNumber,
              versionNumber: nextVersionNo,
              pdfHash: pdfStored.sha256Checksum,
              docxHash: docxStored.sha256Checksum,
              generatedByUserId: req.user!.sub,
              generatedAt: new Date().toISOString(),
            },
          });

          await tx.provenanceNode.create({
            data: {
              testSessionId: session.id,
              nodeSequence: provNodeRecord.nodeSequence,
              nodeType: provNodeRecord.nodeType,
              previousNodeHashSha256: provNodeRecord.previousNodeHashSha256,
              payloadHashSha256: provNodeRecord.payloadHashSha256,
              currentNodeHashSha256: provNodeRecord.currentNodeHashSha256,
            },
          });

          const freshReport = await tx.report.findUnique({
            where: { id: report.id },
            include: {
              versions: {
                orderBy: { versionNumber: "desc" },
              },
            },
          });

          return {
            report: freshReport,
            pdfStored,
            docxStored,
          };
        });

        res.status(201).json({
          success: true,
          message: "Report PDF and DOCX generated and persisted successfully.",
          report: formatReportForJson(result.report),
          files: {
            pdf: {
              fileName: result.pdfStored.fileName,
              sizeBytes: result.pdfStored.fileSizeBytes,
              sha256Checksum: result.pdfStored.sha256Checksum,
              downloadUrl: `/api/v1/reports/${result.report!.id}/pdf`,
            },
            docx: {
              fileName: result.docxStored.fileName,
              sizeBytes: result.docxStored.fileSizeBytes,
              sha256Checksum: result.docxStored.sha256Checksum,
              downloadUrl: `/api/v1/reports/${result.report!.id}/docx`,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. POST /api/v1/reports/:id/sign
  // Director applies X.509 PKI digital signature to the compiled report PDF,
  // embedding ISO 32000-1 Adobe signature dictionary and provenance record.
  // ---------------------------------------------------------------------------
  router.post(
    "/:id/sign",
    requireAuth,
    requireRole([Role.DIRECTOR, Role.ADMIN]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const validated = SignReportSchema.parse(req.body);

        const report = await findReportByIdOrSession(id);
        if (!report) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Report with ID or session "${id}" not found.`,
          });
          return;
        }

        // Retrieve existing PDF from storage
        const existingPdf = await storage.getReport(
          report.testSessionId,
          "pdf",
        );
        if (!existingPdf) {
          res.status(400).json({
            error: "PRECONDITION_FAILED",
            message:
              "PDF report has not yet been generated for this session. Generate the report first.",
          });
          return;
        }

        // Fetch director user info
        const user = await db.user.findUnique({
          where: { id: req.user!.sub },
        });

        let privateKeyPem = validated.privateKeyPem;
        let certificatePem = validated.certificatePem;

        // If key/certificate not supplied, generate test director keypair & cert
        if (!privateKeyPem || !certificatePem) {
          const generated = await generateTestKeyPairAndCertificate({
            commonName: user?.fullName || req.user!.email,
            organizationalUnit: "Directorate of Legal Metrology",
            organization:
              "Regional Reference Standard Laboratory (RRSL)",
            country: "IN",
          });
          privateKeyPem = generated.privateKeyPem;
          certificatePem = generated.certificatePem;
        }

        // Sign PDF document buffer
        const signerName = user?.fullName || req.user!.email;
        const signedPdfBuffer = await signReportDigest(
          existingPdf.buffer,
          privateKeyPem,
          certificatePem,
          {
            signerName,
            reason:
              validated.reason ||
              "Official OIML R-76 NAWI Verification Test Report Certification",
            location:
              validated.location ||
              "Regional Reference Standard Laboratory, Ahmedabad",
            signingTime: new Date(),
          },
        );

        // Compute digital signature metadata
        const sigMeta = createDigitalSignatureMetadata({
          testSessionId: report.testSessionId,
          signerUserId: req.user!.sub,
          signerRole: req.user!.role,
          pdfBuffer: signedPdfBuffer,
          certPem: certificatePem,
          privateKeyPem: privateKeyPem,
        });

        // Save signed PDF in storage
        const signedStored = await storage.saveReport(
          report.testSessionId,
          "pdf",
          signedPdfBuffer,
          {
            isSigned: true,
            signedBy: req.user!.sub,
            signatureMeta: sigMeta,
          },
        );

        // Update DB records in transaction
        const result = await db.$transaction(async (tx) => {
          // 1. Record DigitalSignature in DB
          const digitalSig = await tx.digitalSignature.create({
            data: {
              testSessionId: report.testSessionId,
              signerUserId: req.user!.sub,
              signerRole: req.user!.role,
              pdfBinaryHashSha256:
                sigMeta.pdfBinaryHashSha256 || sigMeta.sha256Digest,
              x509CertificateSerial:
                sigMeta.x509CertificateSerial || sigMeta.serialNumber,
              pkiSignatureValueBase64: sigMeta.pkiSignatureValueBase64 || "",
              timestampTokenBase64: null,
              signedAt: new Date(),
            },
          });

          // 2. Increment version and mark signed
          const nextVersionNo = report.currentVersionNo + 1;
          const updatedReport = await tx.report.update({
            where: { id: report.id },
            data: {
              isSigned: true,
              currentVersionNo: nextVersionNo,
            },
          });

          // 3. Add signed ReportVersion record
          await tx.reportVersion.create({
            data: {
              reportId: report.id,
              versionNumber: nextVersionNo,
              fileFormat: "pdf",
              fileStoragePath: signedStored.filePath,
              fileSizeBytes: BigInt(signedStored.fileSizeBytes),
              fileHashSha256: signedStored.sha256Checksum,
              generatedByUserId: req.user!.sub,
            },
          });

          // 4. Append to WELMEC 7.2 provenance chain
          const lastNode = await tx.provenanceNode.findFirst({
            where: { testSessionId: report.testSessionId },
            orderBy: { nodeSequence: "desc" },
          });

          const nextSeq = lastNode ? lastNode.nodeSequence + 1 : 0;
          const prevHash = lastNode
            ? lastNode.currentNodeHashSha256
            : GENESIS_PREV_HASH;

          const provNodeRecord = generateProvenanceNode({
            testSessionId: report.testSessionId,
            nodeSequence: nextSeq,
            nodeType: "DIGITAL_SIGNATURE",
            previousNodeHashSha256: prevHash,
            payload: {
              digitalSignatureId: digitalSig.id,
              reportId: report.id,
              signerUserId: req.user!.sub,
              certificateSerial: sigMeta.x509CertificateSerial,
              signedPdfHash: sigMeta.pdfBinaryHashSha256,
              signedAt: digitalSig.signedAt.toISOString(),
            },
          });

          await tx.provenanceNode.create({
            data: {
              testSessionId: report.testSessionId,
              nodeSequence: provNodeRecord.nodeSequence,
              nodeType: provNodeRecord.nodeType,
              previousNodeHashSha256: provNodeRecord.previousNodeHashSha256,
              payloadHashSha256: provNodeRecord.payloadHashSha256,
              currentNodeHashSha256: provNodeRecord.currentNodeHashSha256,
            },
          });

          const freshReport = await tx.report.findUnique({
            where: { id: report.id },
            include: {
              versions: {
                orderBy: { versionNumber: "desc" },
              },
            },
          });

          return {
            report: freshReport,
            digitalSig,
            sigMeta,
            signedStored,
          };
        });

        res.status(200).json({
          success: true,
          message: "Report successfully signed with X.509 PKI certificate.",
          report: formatReportForJson(result.report),
          signature: {
            id: result.digitalSig.id,
            signerUserId: result.digitalSig.signerUserId,
            signerRole: result.digitalSig.signerRole,
            certificateSerial: result.digitalSig.x509CertificateSerial,
            certificateDn: result.sigMeta.certificateDn,
            pdfBinaryHashSha256: result.digitalSig.pdfBinaryHashSha256,
            signedAt: result.digitalSig.signedAt.toISOString(),
            downloadUrl: `/api/v1/reports/${result.report!.id}/pdf`,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2b. POST /api/v1/reports/:id/approve-and-sign & /api/v1/reports/sessions/:id/approve-and-sign
  // Director Live Approval & X.509 Cryptographic Sign-off (TASK-083)
  // ---------------------------------------------------------------------------
  const approveAndSign = createApproveAndSignHandler({ db, storage });
  router.post(
    "/:id/approve-and-sign",
    requireAuth,
    requireRole([Role.DIRECTOR]),
    approveAndSign,
  );
  router.post(
    "/sessions/:id/approve-and-sign",
    requireAuth,
    requireRole([Role.DIRECTOR]),
    approveAndSign,
  );

  // ---------------------------------------------------------------------------
  // 3. GET /api/v1/reports/:id/pdf
  // Streams the compiled/signed PDF report.
  // ---------------------------------------------------------------------------
  router.get(
    "/:id/pdf",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const report = await findReportByIdOrSession(id);
        if (!report) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Report with ID or session "${id}" not found.`,
          });
          return;
        }

        const reportData = await storage.getReport(
          report.testSessionId,
          "pdf",
        );
        if (!reportData) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `PDF report file for session "${report.testSessionId}" not found in storage.`,
          });
          return;
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${report.reportNumber}.pdf"`,
        );
        res.setHeader("Content-Length", reportData.buffer.length);
        res.setHeader(
          "X-SHA256-Checksum",
          reportData.metadata.sha256Checksum,
        );

        res.status(200).send(reportData.buffer);
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. GET /api/v1/reports/:id/docx
  // Streams the compiled DOCX report.
  // ---------------------------------------------------------------------------
  router.get(
    "/:id/docx",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const report = await findReportByIdOrSession(id);
        if (!report) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Report with ID or session "${id}" not found.`,
          });
          return;
        }

        const reportData = await storage.getReport(
          report.testSessionId,
          "docx",
        );
        if (!reportData) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `DOCX report file for session "${report.testSessionId}" not found in storage.`,
          });
          return;
        }

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${report.reportNumber}.docx"`,
        );
        res.setHeader("Content-Length", reportData.buffer.length);
        res.setHeader(
          "X-SHA256-Checksum",
          reportData.metadata.sha256Checksum,
        );

        res.status(200).send(reportData.buffer);
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 5. GET /api/v1/reports/:id/verify
  // Cryptographically verifies stored report file integrity against SHA-256 checksums.
  // ---------------------------------------------------------------------------
  router.get(
    "/:id/verify",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const report = await findReportByIdOrSession(id);
        if (!report) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Report with ID or session "${id}" not found.`,
          });
          return;
        }

        const [pdfVerif, docxVerif] = await Promise.all([
          storage.verifyReport(report.testSessionId, "pdf"),
          storage.verifyReport(report.testSessionId, "docx"),
        ]);

        res.status(200).json({
          reportId: report.id,
          sessionId: report.testSessionId,
          reportNumber: report.reportNumber,
          isSigned: report.isSigned,
          isValid: pdfVerif.isValid && docxVerif.isValid,
          files: {
            pdf: pdfVerif,
            docx: docxVerif,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 6. GET /api/v1/reports/:id
  // Retrieves full report metadata, versions, and digital signatures.
  // ---------------------------------------------------------------------------
  router.get(
    "/:id",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const report = await findReportByIdOrSession(id);
        if (!report) {
          res.status(404).json({
            error: "NOT_FOUND",
            message: `Report with ID or session "${id}" not found.`,
          });
          return;
        }

        res.status(200).json({
          report: formatReportForJson(report),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export const reportsRouter = createReportsRouter();
