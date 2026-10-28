export type Language = "en" | "hi";

export interface TranslationKeys {
  nav: {
    deptNameFull: string;
    deptNameShort: string;
    skipToMain: string;
    home: string;
    dashboard: string;
    instruments: string;
    reports: string;
    weights: string;
    rulePacks: string;
    provenance: string;
    verifyReport: string;
    startSession: string;
    portalName: string;
    portalSub: string;
    signOut: string;
    selectLanguage: string;
  };
  carousel: {
    slide1: {
      badge: string;
      title: string;
      subtitle: string;
      primaryBtn: string;
      secondaryBtn: string;
    };
    slide2: {
      badge: string;
      title: string;
      subtitle: string;
      primaryBtn: string;
      secondaryBtn: string;
    };
    slide3: {
      badge: string;
      title: string;
      subtitle: string;
      primaryBtn: string;
      secondaryBtn: string;
    };
  };
  landing: {
    interactiveDemoTitle: string;
    interactiveDemoSubtitle: string;
    selectLoad: string;
    loadDivisions: string;
    mpeLimit: string;
    simulatedError: string;
    evaluationResult: string;
    pass: string;
    fail: string;
    featuresTitle: string;
    featuresSubtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    feature4Title: string;
    feature4Desc: string;
    standardsTitle: string;
    standardsSubtitle: string;
    workflowTitle: string;
    workflowSubtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaPrimaryBtn: string;
    ctaSecondaryBtn: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    activeSessions: string;
    pendingVerification: string;
    issuedCertificates: string;
    complianceRate: string;
    quickActions: string;
    newTestSession: string;
    registerInstrument: string;
    calibrateWeights: string;
    activeTestingQueue: string;
    recentReports: string;
    viewAll: string;
  };
  instruments: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterClass: string;
    filterStatus: string;
    registerNew: string;
    instrumentId: string;
    model: string;
    manufacturer: string;
    accuracyClass: string;
    maxCapacity: string;
    verificationStatus: string;
    actions: string;
  };
  reports: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    certificateNo: string;
    instrument: string;
    verificationDate: string;
    inspector: string;
    status: string;
    downloadPdf: string;
    verifyQr: string;
  };
  weights: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    classE2: string;
    classF1: string;
    classF2: string;
    classM1: string;
    serialNo: string;
    nominalMass: string;
    conventionalMass: string;
    uncertainty: string;
    calibrationExpiry: string;
    status: string;
  };
  rulePacks: {
    title: string;
    subtitle: string;
    statutoryFrameworks: string;
    activeRules: string;
    tolerances: string;
    version: string;
    viewDetails: string;
  };
  provenance: {
    title: string;
    subtitle: string;
    merkleRoot: string;
    blockHeight: string;
    cryptographicLedger: string;
    transactionHash: string;
    verificationAuditTrail: string;
    verifiedState: string;
  };
  verify: {
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    verifyBtn: string;
    scanQrBtn: string;
    verificationResult: string;
    validSeal: string;
    invalidSeal: string;
    certificateDetails: string;
  };
  footer: {
    ministry: string;
    copyright: string;
    rights: string;
    siteMap: string;
    feedback: string;
    suggestions: string;
  };
  common: {
    search: string;
    filter: string;
    back: string;
    loading: string;
    save: string;
    cancel: string;
    confirm: string;
    view: string;
    details: string;
    status: string;
  };
}

export const translations: Record<Language, TranslationKeys> = {
  en: {
    nav: {
      deptNameFull: "DEPARTMENT OF CONSUMER AFFAIRS | GOVERNMENT OF INDIA",
      deptNameShort: "DCA | GOVT OF INDIA",
      skipToMain: "Skip to Main",
      home: "Home",
      dashboard: "Dashboard",
      instruments: "Instruments",
      reports: "Reports",
      weights: "Standard Weights",
      rulePacks: "Rule Packs",
      provenance: "Provenance",
      verifyReport: "Verify Report",
      startSession: "Start Session",
      portalName: "MAANAK",
      portalSub: "Legal Metrology Testing Portal",
      signOut: "Sign Out",
      selectLanguage: "Select Language",
    },
    carousel: {
      slide1: {
        badge: "OIML R-76 Statutory Workbench",
        title: "Automated Non-Automatic Weighing Instrument Testing",
        subtitle: "Government of India Legal Metrology Portal under Section 22 of the Legal Metrology Act, 2009.",
        primaryBtn: "Open Testing Console",
        secondaryBtn: "Verify Certificate",
      },
      slide2: {
        badge: "NABL 129 Standard Weights Gatekeeper",
        title: "Precision Error Calculation & Class I–IIII Evaluation",
        subtitle: "Zero-error turning point calculations, MPE compliance enforcement, and real-time tolerance safety margins.",
        primaryBtn: "Start Test Battery",
        secondaryBtn: "Standard Weights",
      },
      slide3: {
        badge: "Cryptographic Merkle Provenance",
        title: "Tamper-Evident Digital Certificates & QR Verification",
        subtitle: "Every observation is cryptographically sealed with SHA-256 Merkle provenance chains and e-Sign PIN authorization.",
        primaryBtn: "Public QR Verification",
        secondaryBtn: "View Reports",
      },
    },
    landing: {
      interactiveDemoTitle: "Interactive Statutory Load & MPE Calculator",
      interactiveDemoSubtitle: "Simulate OIML R-76 Class III (e = 5g, Max = 15kg) verification tests with automatic tolerance limit check.",
      selectLoad: "Select Test Mass Load (kg):",
      loadDivisions: "Verification Scale Intervals (n = Load / e):",
      mpeLimit: "Statutory Maximum Permissible Error (MPE):",
      simulatedError: "Observed Indication Error:",
      evaluationResult: "OIML R-76 Compliance Result:",
      pass: "PASS (Within Tolerances)",
      fail: "FAIL (Exceeds Limits)",
      featuresTitle: "Enterprise Legal Metrology Features",
      featuresSubtitle: "Built for RRSL laboratories, state legal metrology officers, and accredited verification centers.",
      feature1Title: "Automated OIML R-76 Test Batteries",
      feature1Desc: "Form 1 through Form 6 automated verification routines with turning-point error determination.",
      feature2Title: "NABL 129 Standards Chain",
      feature2Desc: "Class E2, F1, F2, M1 reference standard weight management with recalibration expiry locks.",
      feature3Title: "WELMEC 7.2 Cryptographic Seal",
      feature3Desc: "SHA-256 Merkle root provenance chains and e-Sign authorization for tamper-proof reports.",
      feature4Title: "Offline-First PWA Synchronization",
      feature4Desc: "Full bench testing capability in remote field sites with local IndexedDB queuing and auto-sync.",
      standardsTitle: "Statutory Compliance Standards",
      standardsSubtitle: "Enforcing statutory legal metrology guidelines across India.",
      workflowTitle: "Verification Workflow Architecture",
      workflowSubtitle: "Four seamless steps from physical intake to tamper-proof certificate issuance.",
      step1Title: "Instrument & Weights Intake",
      step1Desc: "Register NAWI model approval, verify serial numbers, and assign NABL certified mass standards.",
      step2Title: "Automated Bench Testing",
      step2Desc: "Perform repeatability, eccentricity, discrimination, and temperature drift tests in real time.",
      step3Title: "Officer Review & E-Sign",
      step3Desc: "Legal Metrology Officer reviews statutory compliance, verifies tolerances, and applies PIN e-signature.",
      step4Title: "QR Certificate & Provenance",
      step4Desc: "Generate tamper-evident PDF verification certificate backed by SHA-256 cryptographic provenance.",
      ctaTitle: "Ready for Statutory Legal Metrology Testing?",
      ctaSubtitle: "Access the Government of India MAANAK Portal to begin NAWI verification or check public certificates.",
      ctaPrimaryBtn: "Open Testing Console",
      ctaSecondaryBtn: "Verify QR Certificate",
    },
    dashboard: {
      title: "Legal Metrology Control Dashboard",
      subtitle: "Overview of active testing sessions, standard weight calibration, and statutory report issuance.",
      activeSessions: "Active Test Sessions",
      pendingVerification: "Pending Officer Review",
      issuedCertificates: "Issued Certificates",
      complianceRate: "Statutory Compliance Rate",
      quickActions: "Quick Actions",
      newTestSession: "New Test Session",
      registerInstrument: "Register Instrument",
      calibrateWeights: "Calibrate Weights",
      activeTestingQueue: "Active Instrument Testing Queue",
      recentReports: "Recent Verification Reports",
      viewAll: "View All",
    },
    instruments: {
      title: "Weighing Instrument Inventory",
      subtitle: "Management of NAWI instruments, model approvals, and accuracy class classifications.",
      searchPlaceholder: "Search by Serial No, Model Approval, or Manufacturer...",
      filterClass: "Accuracy Class",
      filterStatus: "Verification Status",
      registerNew: "Register New Instrument",
      instrumentId: "Instrument ID",
      model: "Model Approval",
      manufacturer: "Manufacturer",
      accuracyClass: "Accuracy Class",
      maxCapacity: "Max Capacity",
      verificationStatus: "Status",
      actions: "Actions",
    },
    reports: {
      title: "Verification Reports & Certificates",
      subtitle: "Tamper-evident OIML R-76 verification certificates with QR verification links.",
      searchPlaceholder: "Search report by Certificate No or Serial Number...",
      certificateNo: "Certificate No.",
      instrument: "Instrument",
      verificationDate: "Date of Verification",
      inspector: "Verification Officer",
      status: "Status",
      downloadPdf: "Download PDF",
      verifyQr: "Verify QR",
    },
    weights: {
      title: "NABL 129 Standard Weights Inventory",
      subtitle: "Reference standard masses (Class E2, F1, F2, M1) for legal metrology verification.",
      searchPlaceholder: "Search standard weights by Serial No or Class...",
      classE2: "Class E2",
      classF1: "Class F1",
      classF2: "Class F2",
      classM1: "Class M1",
      serialNo: "Serial Number",
      nominalMass: "Nominal Mass",
      conventionalMass: "Conventional Mass",
      uncertainty: "Expanded Uncertainty",
      calibrationExpiry: "Calibration Expiry",
      status: "Status",
    },
    rulePacks: {
      title: "Statutory Rule Packs & Tolerances",
      subtitle: "OIML R-76-1:2006, WELMEC 7.2, and Legal Metrology General Rules 2011.",
      statutoryFrameworks: "Statutory Frameworks",
      activeRules: "Active Rules",
      tolerances: "MPE Tolerance Limits",
      version: "Version",
      viewDetails: "View Details",
    },
    provenance: {
      title: "Cryptographic Provenance Ledger",
      subtitle: "SHA-256 Merkle root tree logs validating observation data integrity under WELMEC 7.2.",
      merkleRoot: "Merkle Root Hash",
      blockHeight: "Chain Height",
      cryptographicLedger: "Cryptographic Audit Ledger",
      transactionHash: "Transaction Hash",
      verificationAuditTrail: "Audit Trail",
      verifiedState: "VERIFIED TAMPER-FREE",
    },
    verify: {
      title: "Public Verification Portal",
      subtitle: "Verify the authenticity of any MAANAK Legal Metrology Verification Certificate.",
      inputPlaceholder: "Enter Certificate No. (e.g. CERT-2026-WELMEC-8910)...",
      verifyBtn: "Verify Certificate",
      scanQrBtn: "Scan QR Code",
      verificationResult: "Verification Result",
      validSeal: "OFFICIALLY VERIFIED & VALID",
      invalidSeal: "INVALID OR TAMPERED CERTIFICATE",
      certificateDetails: "Certificate Details & Audit Seal",
    },
    footer: {
      ministry: "Department of Consumer Affairs • Ministry of Consumer Affairs, Food & Public Distribution • Government of India",
      copyright: "Copyright © 2026 MAANAK. All rights reserved | Designed for Statutory Verification under Section 22 of the Legal Metrology Act, 2009.",
      rights: "All rights reserved.",
      siteMap: "Site Map",
      feedback: "Feedback",
      suggestions: "Have suggestions?",
    },
    common: {
      search: "Search",
      filter: "Filter",
      back: "Back",
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      view: "View",
      details: "Details",
      status: "Status",
    },
  },
  hi: {
    nav: {
      deptNameFull: "उपभोक्ता मामले विभाग | भारत सरकार",
      deptNameShort: "उपभोक्ता मामले | भारत सरकार",
      skipToMain: "मुख्य सामग्री पर जाएं",
      home: "मुख्य पृष्ठ",
      dashboard: "डैशबोर्ड",
      instruments: "उपकरण",
      reports: "रिपोर्ट्स",
      weights: "मानक बाट (Weights)",
      rulePacks: "नियम संग्रह",
      provenance: "प्रमाणिकता (Provenance)",
      verifyReport: "सत्यापन रिपोर्ट",
      startSession: "सत्र प्रारंभ करें",
      portalName: "मानक (MAANAK)",
      portalSub: "विधिक मापविज्ञान परीक्षण पोर्टल",
      signOut: "साइन आउट",
      selectLanguage: "भाषा चुनें",
    },
    carousel: {
      slide1: {
        badge: "ओआईएमएल आर-76 वैधानिक वर्कबेंच",
        title: "स्वचालित गैर-स्वचालित वजन उपकरण (NAWI) परीक्षण",
        subtitle: "विधिक मापविज्ञान अधिनियम, 2009 की धारा 22 के अंतर्गत भारत सरकार का विधिक मापविज्ञान पोर्टल।",
        primaryBtn: "परीक्षण कंसोल खोलें",
        secondaryBtn: "प्रमाणपत्र सत्यापित करें",
      },
      slide2: {
        badge: "एनएबीएल 129 मानक बाट द्वारपाल",
        title: "सटीक त्रुटि गणना एवं श्रेणी I–IIII मूल्यांकन",
        subtitle: "शून्य-त्रुटि टर्निंग प्वाइंट गणना, एमपीई अनुपालन, और रीयल-टाइम सहिष्णुता सुरक्षा मार्जिन।",
        primaryBtn: "परीक्षण बैटरी प्रारंभ करें",
        secondaryBtn: "मानक बाट सूची",
      },
      slide3: {
        badge: "क्रिप्टोग्राफिक मर्कल उत्पत्ति (Merkle Provenance)",
        title: "छेड़छाड़-रहित डिजिटल प्रमाणपत्र और क्यूआर सत्यापन",
        subtitle: "प्रत्येक अवलोकन एसएचए-256 मर्कल श्रृंखला और ई-हस्ताक्षर पिन प्राधिकरण से क्रिप्टोग्राफिक रूप से सुरक्षित है।",
        primaryBtn: "सार्वजनिक क्यूआर सत्यापन",
        secondaryBtn: "रिपोर्ट देखें",
      },
    },
    landing: {
      interactiveDemoTitle: "इंटरएक्टिव वैधानिक भार एवं एमपीई कैलकुलेटर",
      interactiveDemoSubtitle: "ओआईएमएल आर-76 श्रेणी III (e = 5g, अधिकतम = 15kg) सत्यापन परीक्षणों का स्वचालित सहिष्णुता जांच के साथ अनुकरण।",
      selectLoad: "परीक्षण भार चुनें (किलोग्राम):",
      loadDivisions: "सत्यापन स्केल अंतराल (n = भार / e):",
      mpeLimit: "वैधानिक अधिकतम अनुमेय त्रुटि (MPE):",
      simulatedError: "परीक्षण में पाई गई त्रुटि:",
      evaluationResult: "ओआईएमएल आर-76 अनुपालन परिणाम:",
      pass: "उत्तीर्ण (सीमाओं के भीतर)",
      fail: "अनुत्तीर्ण (सीमा से बाहर)",
      featuresTitle: "एंटरप्राइज विधिक मापविज्ञान सुविधाएं",
      featuresSubtitle: "आरआरएसएल प्रयोगशालाओं, राज्य विधिक मापविज्ञान अधिकारियों और मान्यता प्राप्त केंद्रों के लिए निर्मित।",
      feature1Title: "ऑटोमेटेड ओआईएमएल आर-76 टेस्ट बैटरियां",
      feature1Desc: "फॉर्म 1 से फॉर्म 6 तक स्वचालित सत्यापन प्रक्रियाएं और टर्निंग-पॉइंट त्रुटि निर्धारण।",
      feature2Title: "एनएबीएल 129 मानक बाट श्रृंखला",
      feature2Desc: "श्रेणी E2, F1, F2, M1 संदर्भ मानक बाट प्रबंधन और पुनर्मूल्यांकन समाप्ति चेतावनी।",
      feature3Title: "वेलमेक 7.2 क्रिप्टोग्राफिक सील",
      feature3Desc: "सुरक्षित रिपोर्टों के लिए SHA-256 मर्कल उत्पत्ति श्रृंखला और ई-हस्ताक्षर प्राधिकरण।",
      feature4Title: "ऑफलाइन-फर्स्ट पीडब्लूए सिंक्रोनाइज़ेशन",
      feature4Desc: "स्थानीय IndexedDB कतारबद्धता और ऑटो-सिंक के साथ दूरस्थ क्षेत्रों में पूर्ण परीक्षण क्षमता।",
      standardsTitle: "वैधानिक अनुपालन मानक",
      standardsSubtitle: "पूरे भारत में वैधानिक विधिक मापविज्ञान दिशानिर्देशों का प्रवर्तन।",
      workflowTitle: "सत्यापन कार्यप्रवाह संरचना",
      workflowSubtitle: "भौतिक आवक से लेकर छेड़छाड़-रहित प्रमाणपत्र जारी करने तक चार निर्बाध चरण।",
      step1Title: "उपकरण एवं बाट आवक",
      step1Desc: "NAWI मॉडल अनुमोदन पंजीकृत करें, क्रमांक सत्यापित करें, और NABL प्रमाणित द्रव्यमान मानक आवंटित करें।",
      step2Title: "स्वचालित बेंच परीक्षण",
      step2Desc: "रीयल टाइम में पुनरावृत्ति, उत्केंद्रता, भेदभाव, और तापमान बहाव परीक्षण करें।",
      step3Title: "अधिकारी समीक्षा एवं ई-हस्ताक्षर",
      step3Desc: "विधिक मापविज्ञान अधिकारी वैधानिक अनुपालन की समीक्षा करते हैं और पिन ई-हस्ताक्षर लागू करते हैं।",
      step4Title: "क्यूआर प्रमाणपत्र एवं प्रमाणिकता",
      step4Desc: "SHA-256 क्रिप्टोग्राफिक प्रमाणिकता द्वारा समर्थित छेड़छाड़-रहित पीडीएफ सत्यापन प्रमाणपत्र उत्पन्न करें।",
      ctaTitle: "वैधानिक विधिक मापविज्ञान परीक्षण के लिए तैयार हैं?",
      ctaSubtitle: "NAWI सत्यापन शुरू करने या सार्वजनिक प्रमाणपत्रों की जांच के लिए भारत सरकार के मानक पोर्टल का उपयोग करें।",
      ctaPrimaryBtn: "परीक्षण कंसोल खोलें",
      ctaSecondaryBtn: "क्यूआर प्रमाणपत्र सत्यापित करें",
    },
    dashboard: {
      title: "विधिक मापविज्ञान नियंत्रण डैशबोर्ड",
      subtitle: "सक्रिय परीक्षण सत्रों, मानक बाट अंशांकन, और वैधानिक रिपोर्ट जारी करने का अवलोकन।",
      activeSessions: "सक्रिय परीक्षण सत्र",
      pendingVerification: "समीक्षा हेतु लंबित",
      issuedCertificates: "जारी किए गए प्रमाणपत्र",
      complianceRate: "वैधानिक अनुपालन दर",
      quickActions: "त्वरित कार्रवाई",
      newTestSession: "नया परीक्षण सत्र",
      registerInstrument: "उपकरण पंजीकृत करें",
      calibrateWeights: "मानक बाट अंशांकन",
      activeTestingQueue: "सक्रिय उपकरण परीक्षण कतार",
      recentReports: "हाल की सत्यापन रिपोर्टें",
      viewAll: "सभी देखें",
    },
    instruments: {
      title: "वजन उपकरण सूची (Instruments)",
      subtitle: "NAWI उपकरण, मॉडल अनुमोदन, और सटीकता श्रेणी वर्गीकरण का प्रबंधन।",
      searchPlaceholder: "क्रमांक, मॉडल अनुमोदन या निर्माता द्वारा खोजें...",
      filterClass: "सटीकता श्रेणी",
      filterStatus: "सत्यापन स्थिति",
      registerNew: "नया उपकरण पंजीकृत करें",
      instrumentId: "उपकरण आईडी",
      model: "मॉडल अनुमोदन",
      manufacturer: "निर्माता",
      accuracyClass: "सटीकता श्रेणी",
      maxCapacity: "अधिकतम क्षमता",
      verificationStatus: "स्थिति",
      actions: "कार्रवाई",
    },
    reports: {
      title: "सत्यापन रिपोर्ट एवं प्रमाणपत्र",
      subtitle: "क्यूआर सत्यापन लिंक के साथ ओआईएमएल आर-76 सत्यापन प्रमाणपत्र।",
      searchPlaceholder: "प्रमाणपत्र संख्या या क्रमांक द्वारा खोजें...",
      certificateNo: "प्रमाणपत्र संख्या",
      instrument: "उपकरण",
      verificationDate: "सत्यापन की तिथि",
      inspector: "सत्यापन अधिकारी",
      status: "स्थिति",
      downloadPdf: "पीडीएफ डाउनलोड करें",
      verifyQr: "क्यूआर जांचें",
    },
    weights: {
      title: "एनएबीएल 129 मानक बाट सूची",
      subtitle: "विधिक मापविज्ञान सत्यापन हेतु संदर्भ मानक बाट (श्रेणी E2, F1, F2, M1)।",
      searchPlaceholder: "क्रमांक या श्रेणी द्वारा मानक बाट खोजें...",
      classE2: "श्रेणी E2",
      classF1: "श्रेणी F1",
      classF2: "श्रेणी F2",
      classM1: "श्रेणी M1",
      serialNo: "क्रमांक (Serial No)",
      nominalMass: "अंकित द्रव्यमान (Nominal Mass)",
      conventionalMass: "पारंपरिक द्रव्यमान",
      uncertainty: "विस्तारित अनिश्चितता",
      calibrationExpiry: "अंशांकन समाप्ति तिथि",
      status: "स्थिति",
    },
    rulePacks: {
      title: "वैधानिक नियम संग्रह एवं सहिष्णुता (Rule Packs)",
      subtitle: "ओआईएमएल आर-76-1:2006, वेलमेक 7.2, और विधिक मापविज्ञान सामान्य नियम 2011।",
      statutoryFrameworks: "वैधानिक ढांचा",
      activeRules: "सक्रिय नियम",
      tolerances: "एमपीई सहिष्णुता सीमाएं",
      version: "संस्करण",
      viewDetails: "विवरण देखें",
    },
    provenance: {
      title: "क्रिप्टोग्राफिक प्रमाणिकता बही (Provenance Ledger)",
      subtitle: "वेलमेक 7.2 के तहत अवलोकन डेटा अखंडता को सत्यापित करने वाले SHA-256 मर्कल रूट लॉग।",
      merkleRoot: "मर्कल रूट हैश",
      blockHeight: "श्रृंखला ऊंचाई",
      cryptographicLedger: "क्रिप्टोग्राफिक ऑडिट लेजर",
      transactionHash: "लेन-देन हैश",
      verificationAuditTrail: "ऑडिट ट्रेल",
      verifiedState: "सत्यापित - छेड़छाड़ मुक्त",
    },
    verify: {
      title: "सार्वजनिक सत्यापन पोर्टल",
      subtitle: "किसी भी मानक विधिक मापविज्ञान सत्यापन प्रमाणपत्र की प्रामाणिकता की जांच करें।",
      inputPlaceholder: "प्रमाणपत्र संख्या दर्ज करें (जैसे CERT-2026-WELMEC-8910)...",
      verifyBtn: "प्रमाणपत्र सत्यापित करें",
      scanQrBtn: "क्यूआर कोड स्कैन करें",
      verificationResult: "सत्यापन परिणाम",
      validSeal: "आधिकारिक रूप से सत्यापित एवं मान्य",
      invalidSeal: "अमान्य या अमान्य प्रमाणपत्र",
      certificateDetails: "प्रमाणपत्र विवरण एवं ऑडिट सील",
    },
    footer: {
      ministry: "उपभोक्ता मामले विभाग • उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय • भारत सरकार",
      copyright: "कॉपीराइट © 2026 मानक (MAANAK)। सर्वाधिकार सुरक्षित | विधिक मापविज्ञान अधिनियम, 2009 की धारा 22 के अंतर्गत वैधानिक सत्यापन हेतु निर्मित।",
      rights: "सर्वाधिकार सुरक्षित।",
      siteMap: "साइट मैप",
      feedback: "प्रतिक्रिया",
      suggestions: "क्या आपके पास सुझाव हैं?",
    },
    common: {
      search: "खोजें",
      filter: "फ़िल्टर",
      back: "वापस जाएं",
      loading: "लोड हो रहा है...",
      save: "सहेजें",
      cancel: "रद्द करें",
      confirm: "पुष्टि करें",
      view: "देखें",
      details: "विवरण",
      status: "स्थिति",
    },
  },
};
