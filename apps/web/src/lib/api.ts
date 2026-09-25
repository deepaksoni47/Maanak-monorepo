/**
 * MAANAK Legal Metrology REST API Gateway Client
 * Centralized, type-safe client connecting Next.js frontend to Express API (/api/v1).
 */

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const API_BASE_URL =
  rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")
    ? rawApiUrl.replace(/\/+$/, "")
    : `https://${rawApiUrl.replace(/\/+$/, "")}`;

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      const trimmed = envUrl.replace(/\/+$/, "");
      return trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    }
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      // In production (behind reverse proxy like Render), use the origin directly
      // without appending an internal port — the proxy handles routing.
      return window.location.origin;
    }
  }
  return API_BASE_URL;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  [key: string]: any;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("maanak_access_token");
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Request-Id": typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg =
      (typeof data === "object" && (data.error || data.message)) ||
      `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).response = data;
    throw err;
  }

  return data as T;
}

// ----------------------------------------------------------------------
// Sub-APIs
// ----------------------------------------------------------------------

export const authApi = {
  login: (credentials: { email?: string; username?: string; password: string }) =>
    apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  getProfile: () => apiRequest("/api/v1/auth/me"),

  refreshToken: (refreshToken: string) =>
    apiRequest("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

export const sessionsApi = {
  list: (params: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiRequest(`/api/v1/sessions${qs ? `?${qs}` : ""}`);
  },

  getById: (id: string) => apiRequest(`/api/v1/sessions/${id}`),

  create: (sessionData: {
    instrumentId: string;
    sessionNumber?: string;
    laboratoryId?: string;
    testingBay?: string;
    ambientTempC?: number | string;
    relativeHumidityPct?: number | string;
    atmosphericPressureHpa?: number | string;
  }) =>
    apiRequest("/api/v1/sessions", {
      method: "POST",
      body: JSON.stringify(sessionData),
    }),

  getPlan: (sessionId: string) => apiRequest(`/api/v1/sessions/${sessionId}/plan`),

  updateStatus: (sessionId: string, status: string, notes?: string) =>
    apiRequest(`/api/v1/sessions/${sessionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }),

  approveAndSign: (
    sessionId: string,
    data: {
      signingPin: string;
      privateKeyPem?: string;
      certificatePem?: string;
      reason?: string;
      location?: string;
    },
  ) =>
    apiRequest(`/api/v1/sessions/${sessionId}/approve-and-sign`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const observationsApi = {
  logObservation: (observationData: {
    sessionId: string;
    formType?: string;
    loadStepIndex: number;
    nominalLoad: number | string;
    scaleIndication: number | string;
    vernierLoadAdded: number | string;
    e: number | string;
    e0?: number | string;
    accuracyClass?: string;
    loadUnit?: string;
    loadDirection?: "ASCENDING" | "DESCENDING";
    temperatureC?: number | string;
    pressureHpa?: number | string;
  }) =>
    apiRequest("/api/v1/observations", {
      method: "POST",
      body: JSON.stringify(observationData),
    }),

  getSessionObservations: (sessionId: string, formType?: string) => {
    const qs = formType ? `?formType=${encodeURIComponent(formType)}` : "";
    return apiRequest(`/api/v1/observations/session/${sessionId}${qs}`);
  },

  calculateTurningPoint: (calcData: {
    indication: number | string;
    deltaL: number | string;
    e: number | string;
    nominalLoad: number | string;
    e0?: number | string;
    accuracyClass?: string;
    loadUnit?: string;
  }) =>
    apiRequest("/api/v1/observations/calculate", {
      method: "POST",
      body: JSON.stringify(calcData),
    }),
};

export const weightsApi = {
  list: (params: { oimlClass?: string; laboratoryId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.oimlClass) query.append("oimlClass", params.oimlClass);
    if (params.laboratoryId) query.append("laboratoryId", params.laboratoryId);
    const qs = query.toString();
    return apiRequest(`/api/v1/weights${qs ? `?${qs}` : ""}`);
  },

  register: (weightData: any) =>
    apiRequest("/api/v1/weights", {
      method: "POST",
      body: JSON.stringify(weightData),
    }),

  precheck: (checkData: {
    uncertaintyU: number | string;
    targetLoad: number | string;
    e: number | string;
    accuracyClass: string;
    uncertaintyUnit?: string;
    loadUnit?: string;
    eUnit?: string;
    weightId?: string;
    weightClass?: string;
    mode?: string;
  }) =>
    apiRequest("/api/v1/weights/precheck", {
      method: "POST",
      body: JSON.stringify(checkData),
    }),

  batchPrecheck: (batchData: {
    e: number | string;
    accuracyClass: string;
    unit?: string;
    weights: Array<{
      targetLoad: number | string;
      uncertaintyU: number | string;
      weightId?: string;
    }>;
  }) =>
    apiRequest("/api/v1/weights/precheck/batch", {
      method: "POST",
      body: JSON.stringify(batchData),
    }),
};

export const instrumentsApi = {
  list: () => apiRequest("/api/v1/instruments"),

  register: (instrumentData: any) =>
    apiRequest("/api/v1/instruments", {
      method: "POST",
      body: JSON.stringify(instrumentData),
    }),

  classify: (spec: {
    maxCapacity: string | number;
    e: string | number;
    d?: string | number;
    accuracyClass: string;
    minCapacity?: string | number;
  }) =>
    apiRequest("/api/v1/instruments/classify", {
      method: "POST",
      body: JSON.stringify(spec),
    }),
};

export const rulesApi = {
  list: () => apiRequest("/api/v1/rules"),
  getActive: () => apiRequest("/api/v1/rules/active"),
  getById: (id: string) => apiRequest(`/api/v1/rules/${id}`),
};

export const reviewApi = {
  getAuditSummary: (sessionId: string) =>
    apiRequest(`/api/v1/review/sessions/${sessionId}/audit`),

  submitDecision: (decisionData: {
    sessionId?: string;
    testSessionId?: string;
    decision: "APPROVED" | "FLAGGED_FOR_CORRECTION" | "REJECTED";
    notes?: string;
    comments?: string;
    flaggedFormId?: string;
    rejectionReason?: string;
    reviewStage?: "INTAKE_REVIEW" | "SECOND_LEVEL_REVIEW" | "DIRECTOR_APPROVAL";
  }) => {
    const payload = {
      testSessionId: decisionData.testSessionId || decisionData.sessionId,
      decision: decisionData.decision,
      comments: decisionData.comments || decisionData.notes || "Senior Reviewer evaluation completed.",
      flaggedFormId: decisionData.flaggedFormId,
      rejectionReason: decisionData.rejectionReason,
      reviewStage: decisionData.reviewStage || "SECOND_LEVEL_REVIEW",
    };
    return apiRequest("/api/v1/review/decision", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const reportsApi = {
  list: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    const qs = query.toString();
    return apiRequest(`/api/v1/reports${qs ? `?${qs}` : ""}`);
  },

  generate: (sessionId: string, options: { format?: "PDF" | "DOCX"; includeCurves?: boolean } = {}) =>
    apiRequest(`/api/v1/reports/${sessionId}/generate`, {
      method: "POST",
      body: JSON.stringify(options),
    }),

  sign: (sessionId: string, signData: { pin: string; signatoryName?: string; signatoryRole?: string }) =>
    apiRequest(`/api/v1/reports/${sessionId}/sign`, {
      method: "POST",
      body: JSON.stringify(signData),
    }),

  approveAndSign: (
    sessionId: string,
    data: {
      signingPin: string;
      privateKeyPem?: string;
      certificatePem?: string;
      reason?: string;
      location?: string;
    },
  ) =>
    apiRequest(`/api/v1/reports/${sessionId}/approve-and-sign`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getById: (sessionId: string) => apiRequest(`/api/v1/reports/${sessionId}`),
};

export const verifyApi = {
  verifyHash: (hash: string) => apiRequest(`/api/v1/verify/${encodeURIComponent(hash)}`),
};

export const evidenceApi = {
  upload: async (formData: FormData) => {
    const url = `${getApiBaseUrl()}/api/v1/evidence/upload`;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },

  listBySession: (sessionId: string) =>
    apiRequest(`/api/v1/evidence/session/${sessionId}`),

  getProvenanceNodes: (sessionId: string) =>
    apiRequest(`/api/v1/evidence/session/${sessionId}/provenance`),
};

export const adminApi = {
  listUsers: (params: { role?: string; laboratoryId?: string; isActive?: boolean; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.append("role", params.role);
    if (params.laboratoryId) query.append("laboratoryId", params.laboratoryId);
    if (params.isActive !== undefined) query.append("isActive", String(params.isActive));
    if (params.search) query.append("search", params.search);
    const qs = query.toString();
    return apiRequest(`/api/v1/admin/users${qs ? `?${qs}` : ""}`);
  },

  createUser: (userData: {
    fullName: string;
    email: string;
    username?: string;
    password?: string;
    role: string;
    designation?: string;
    laboratoryId?: string;
    mobileNumber?: string;
    governmentIdNo?: string;
  }) =>
    apiRequest("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  updateUser: (
    id: string,
    updates: {
      fullName?: string;
      role?: string;
      designation?: string;
      laboratoryId?: string;
      mobileNumber?: string;
      isActive?: boolean;
    }
  ) =>
    apiRequest(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  listRoles: () => apiRequest("/api/v1/admin/roles"),

  listAuditLogs: (params: { action?: string; entityType?: string; limit?: number; offset?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.action) query.append("action", params.action);
    if (params.entityType) query.append("entityType", params.entityType);
    if (params.limit) query.append("limit", String(params.limit));
    if (params.offset) query.append("offset", String(params.offset));
    const qs = query.toString();
    return apiRequest(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
};
