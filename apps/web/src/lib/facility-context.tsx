"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";

export interface Facility {
  id: string;
  code: string;
  name: string;
  shortName: string;
  nablAccreditationNo: string;
  city: string;
  state: string;
  region: string;
  jurisdiction: string;
  status: "ACTIVE" | "MAINTENANCE";
}

export const ALL_FACILITIES_ID = "ALL";

export const ALL_FACILITIES_NODE: Facility = {
  id: ALL_FACILITIES_ID,
  code: "NATIONAL-GRID",
  name: "National Metrology Grid (All RRSLs)",
  shortName: "National Grid",
  nablAccreditationNo: "NABL Pan-India",
  city: "New Delhi",
  state: "Delhi",
  region: "National Headquarters",
  jurisdiction: "All Regional Reference Standard Laboratories (Pan-India)",
  status: "ACTIVE",
};

export const RRSL_FACILITIES: Facility[] = [
  {
    id: "rrsl-fbd",
    code: "RRSL-FBD",
    name: "RRSL Faridabad (NABL TC-5421)",
    shortName: "RRSL Faridabad",
    nablAccreditationNo: "NABL TC-5421",
    city: "Faridabad",
    state: "Haryana",
    region: "Northern Region",
    jurisdiction: "Northern Zone (Delhi-NCR, Haryana, Punjab, Rajasthan, HP)",
    status: "ACTIVE",
  },
  {
    id: "rrsl-amd",
    code: "RRSL-AMD",
    name: "RRSL Ahmedabad (NABL CC-2894)",
    shortName: "RRSL Ahmedabad",
    nablAccreditationNo: "NABL CC-2894",
    city: "Ahmedabad",
    state: "Gujarat",
    region: "Western Region",
    jurisdiction: "Western Zone (Gujarat, Maharashtra, Goa, Madhya Pradesh)",
    status: "ACTIVE",
  },
  {
    id: "rrsl-blr",
    code: "RRSL-BLR",
    name: "RRSL Bengaluru (NABL CC-3102)",
    shortName: "RRSL Bengaluru",
    nablAccreditationNo: "NABL CC-3102",
    city: "Bengaluru",
    state: "Karnataka",
    region: "Southern Region",
    jurisdiction: "Southern Zone (Karnataka, Tamil Nadu, Kerala, AP, Telangana)",
    status: "ACTIVE",
  },
  {
    id: "rrsl-bbi",
    code: "RRSL-BBI",
    name: "RRSL Bhubaneswar (NABL CC-4015)",
    shortName: "RRSL Bhubaneswar",
    nablAccreditationNo: "NABL CC-4015",
    city: "Bhubaneswar",
    state: "Odisha",
    region: "Eastern Region",
    jurisdiction: "Eastern Zone (Odisha, West Bengal, Bihar, Jharkhand, Chhattisgarh)",
    status: "ACTIVE",
  },
  {
    id: "rrsl-vns",
    code: "RRSL-VNS",
    name: "RRSL Varanasi (NABL CC-3891)",
    shortName: "RRSL Varanasi",
    nablAccreditationNo: "NABL CC-3891",
    city: "Varanasi",
    state: "Uttar Pradesh",
    region: "Central Region",
    jurisdiction: "Central Zone (Uttar Pradesh, Uttarakhand, Central Terai)",
    status: "ACTIVE",
  },
  {
    id: "rrsl-gau",
    code: "RRSL-GAU",
    name: "RRSL Guwahati (NABL CC-4210)",
    shortName: "RRSL Guwahati",
    nablAccreditationNo: "NABL CC-4210",
    city: "Guwahati",
    state: "Assam",
    region: "North-Eastern Region",
    jurisdiction: "North-Eastern Zone (Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura)",
    status: "ACTIVE",
  },
];

export function getFacilityById(id: string): Facility {
  if (id === ALL_FACILITIES_ID) return ALL_FACILITIES_NODE;
  const match = RRSL_FACILITIES.find((f) => f.id === id || f.code.toLowerCase() === id.toLowerCase());
  return match || RRSL_FACILITIES[0];
}

export function detectFacilityFromUser(userFacility?: string | null): Facility {
  if (!userFacility) return RRSL_FACILITIES[0]; // Default to RRSL Faridabad
  const lower = userFacility.toLowerCase();
  if (lower.includes("ahmedabad") || lower.includes("amd")) {
    return RRSL_FACILITIES[1];
  }
  if (lower.includes("bengaluru") || lower.includes("bangalore") || lower.includes("blr")) {
    return RRSL_FACILITIES[2];
  }
  if (lower.includes("bhubaneswar") || lower.includes("bbi")) {
    return RRSL_FACILITIES[3];
  }
  if (lower.includes("varanasi") || lower.includes("vns")) {
    return RRSL_FACILITIES[4];
  }
  if (lower.includes("guwahati") || lower.includes("gau")) {
    return RRSL_FACILITIES[5];
  }
  return RRSL_FACILITIES[0]; // Faridabad
}

export interface FacilityContextType {
  currentFacility: Facility;
  selectedFacilityId: string;
  setSelectedFacilityId: (id: string) => void;
  facilities: Facility[];
  isAllFacilities: boolean;
  canSwitchFacility: boolean;
  userHomeFacility: Facility;
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

const FACILITY_STORAGE_KEY = "maanak_selected_facility_id";

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "ROLE_ADMIN";

  // Determine user's assigned home facility
  const userHomeFacility = detectFacilityFromUser(
    (user as any)?.facility || user?.designation || "Faridabad"
  );

  const [selectedFacilityId, setSelectedFacilityIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(FACILITY_STORAGE_KEY);
      if (stored) return stored;
    }
    return "rrsl-fbd";
  });

  // When user changes role: if not admin, anchor to their home facility
  useEffect(() => {
    if (user && !isAdmin) {
      setSelectedFacilityIdState(userHomeFacility.id);
    }
  }, [user, isAdmin, userHomeFacility]);

  const setSelectedFacilityId = useCallback(
    (id: string) => {
      setSelectedFacilityIdState(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(FACILITY_STORAGE_KEY, id);
      }
    },
    []
  );

  const currentFacility = getFacilityById(
    !isAdmin && user ? userHomeFacility.id : selectedFacilityId
  );

  const isAllFacilities = currentFacility.id === ALL_FACILITIES_ID;

  return (
    <FacilityContext.Provider
      value={{
        currentFacility,
        selectedFacilityId,
        setSelectedFacilityId,
        facilities: RRSL_FACILITIES,
        isAllFacilities,
        canSwitchFacility: isAdmin || !user,
        userHomeFacility,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility(): FacilityContextType {
  const context = useContext(FacilityContext);
  if (!context) {
    return {
      currentFacility: RRSL_FACILITIES[0],
      selectedFacilityId: RRSL_FACILITIES[0].id,
      setSelectedFacilityId: () => {},
      facilities: RRSL_FACILITIES,
      isAllFacilities: false,
      canSwitchFacility: true,
      userHomeFacility: RRSL_FACILITIES[0],
    };
  }
  return context;
}
