/* ==========================================================================
   ASPEN — MAIN APPLICATION ENGINE & STATE MANAGEMENT
   ========================================================================== */

// ==========================================================================
// 0. API CONFIGURATION (Auto-detects local vs deployed environment)
// ==========================================================================

// Change this to your Railway backend URL after deployment:
// e.g. 'https://aspen-backend-production.up.railway.app'
const RAILWAY_BACKEND_URL = '';

const API_BASE_URL = RAILWAY_BACKEND_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'
    : '');  // Same-origin if self-hosted

// ==========================================================================
// 0.5. FASTAPI CLIENT (BIS Intelligence Backend)
// Change FASTAPI_BASE if the ngrok URL changes.
// ==========================================================================

const FASTAPI_BASE = 'https://silo-travel-habitant.ngrok-free.dev';
const FASTAPI_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
};

async function apiBISSearch(query) {
  const res = await fetch(`${FASTAPI_BASE}/api/search`, {
    method: 'POST',
    headers: FASTAPI_HEADERS,
    body: JSON.stringify({ text: query }),
  });
  if (!res.ok) throw new Error(`Search API error: ${res.status}`);
  return res.json(); // { search_query, results: [{is_code, title, category, match_metadata, specifications}] }
}

async function apiGetCategories() {
  const res = await fetch(`${FASTAPI_BASE}/api/categories`, { headers: FASTAPI_HEADERS });
  if (!res.ok) throw new Error(`Categories API error: ${res.status}`);
  return res.json(); // [{ category, sub_categories: [...] }]
}

async function apiBrowseItems(category, subCategory) {
  const cat = encodeURIComponent(category);
  const sub = encodeURIComponent(subCategory);
  const res = await fetch(`${FASTAPI_BASE}/api/browse/${cat}/${sub}`, { headers: FASTAPI_HEADERS });
  if (!res.ok) throw new Error(`Browse API error: ${res.status}`);
  return res.json(); // { total, items: [{id, is_code, title, status, specifications}] }
}

// Cache to avoid duplicate API calls within the same session
const _apiCache = {};
async function cachedApiGetCategories() {
  if (_apiCache.categories) return _apiCache.categories;
  const data = await apiGetCategories();
  _apiCache.categories = data;
  return data;
}

// ==========================================================================
// 1. MOCK DATABASES & CONFIG
// ==========================================================================

const MOCK_USERS = {
  public: {
    role: 'public',
    name: 'Guest User',
    subtext: 'Sign In',
    email: 'guest@aspen.gov',
    initials: 'G',
    org: 'Public Access Portal'
  },
  buyer: {
    role: 'buyer',
    name: 'Buyer',
    subtext: 'National Health Authority',
    email: 'buyer@aspen.gov.in',
    initials: 'B',
    org: 'NHA India',
    savedStandards: ['IS 758', 'IS 4381'],
    rfqs: [
      { id: 'RFQ-2026-004', product: 'Cotton Bandage Cloth', qty: '12,500 m', date: '2026-08-29', status: 'Active', bids: 3, standard: 'IS 758' },
      { id: 'RFQ-2026-002', product: 'Laboratory Glass Tubes', qty: '5,000 units', date: '2026-08-15', status: 'Bidding Closed', bids: 8, standard: 'IS 4381' }
    ]
  },
  seller: {
    role: 'seller',
    name: 'Seller',
    subtext: 'Certified Supplier',
    email: 'seller@aspen.gov.in',
    initials: 'S',
    org: 'Supreme Medical Manufacturers Ltd.',
    capacity: '50,000 units / month',
    products: [
      { id: 'PROD-702', name: 'Premium Cotton Dressings', category: 'Medical', standard: 'IS 758', status: 'Certified', code: 'IS 758 - C284' },
      { id: 'PROD-401', name: 'Borosilicate Glass Test Tubes', category: 'Laboratory', standard: 'IS 4381', status: 'Certified', code: 'IS 4381 - L912' },
      { id: 'PROD-119', name: 'Absorbent Cotton Balls', category: 'Medical', standard: 'IS 758', status: 'Pending Review', code: 'Under Audit' }
    ]
  },
  admin: {
    role: 'admin',
    name: 'Administrator Profile',
    subtext: 'System Controller',
    email: 'admin.support@aspen.gov.in',
    initials: 'AD',
    org: 'Ministry of Commerce & Industry'
  }
};

const MOCK_BIS_STANDARDS = [
  { 
    code: 'IS 758', 
    title: 'Surgical Dressings — Hand-woven Cotton Gauze Cloth Specification', 
    industry: 'Medical / Textiles', 
    relevance: 'Mandatory standard for all public hospital surgical supply tenders.', 
    date: '12 May 2023',
    committee: 'TXD 23 (Textile Dressings and Sanitary Products)',
    description: 'This standard prescribes the requirements and method of sampling and test for hand-woven cotton gauze, bleached, absorbent, intended for surgical dressings and wound care packaging.',
    manufacturers: [
      { name: 'Supreme Medical Ltd.', license: 'CM/L-829183', location: 'Ahmedabad, Gujarat' },
      { name: 'Aegis Biotech Supplies', license: 'CM/L-736254', location: 'Coimbatore, Tamil Nadu' }
    ]
  },
  { 
    code: 'IS 1520', 
    title: 'Horizontal Centrifugal Pumps for Clear, Cold, Fresh Water', 
    industry: 'Mechanical / Agriculture', 
    relevance: 'Mandatory for government irrigation projects and municipal water distribution.', 
    date: '04 Feb 2021',
    committee: 'MED 20 (Fluid Flow Systems & Pump Design)',
    description: 'Lays down requirements for design, construction, testing and performance of horizontal centrifugal pumps for clear, cold, fresh water with suction lifts up to 8 meters.',
    manufacturers: [
      { name: 'Kirloskar Brothers India', license: 'CM/L-102943', location: 'Pune, Maharashtra' },
      { name: 'Texmo Industries', license: 'CM/L-552819', location: 'Coimbatore, Tamil Nadu' }
    ]
  },
  { 
    code: 'IS 4381', 
    title: 'Laboratory Glass Tubing — Specification for Borosilicate Glass', 
    industry: 'Laboratory', 
    relevance: 'Applies to medical, research, and educational laboratory procurements.', 
    date: '18 Nov 2022',
    committee: 'CHD 18 (Laboratory Apparatus and Glassware)',
    description: 'Covers physical and chemical requirements, thickness tolerances, thermal shock resistance, and grade parameters for borosilicate glass tubes used in test tubes, pipettes, and columns.',
    manufacturers: [
      { name: 'Supreme Medical Ltd.', license: 'CM/L-912239', location: 'Bharuch, Gujarat' },
      { name: 'Borosil Glassworks India', license: 'CM/L-300481', location: 'Mumbai, Maharashtra' }
    ]
  },
  { 
    code: 'IS 302', 
    title: 'Safety of Household and Similar Electrical Appliances', 
    industry: 'Electrical', 
    relevance: 'Compulsory registration scheme (CRS) requirement for retail and institutional purchases.', 
    date: '30 Jun 2024',
    committee: 'LITD 08 (Domestic Electrical Appliances Safety)',
    description: 'Establishes safety standards and inspection directives guarding domestic electrical appliances against electric shock, mechanical hazards, fire hazard protection, and radiation safety limits.',
    manufacturers: [
      { name: 'Bajaj Electricals Ltd.', license: 'CM/L-119284', location: 'Noida, Uttar Pradesh' },
      { name: 'Havells India Limited', license: 'CM/L-449281', location: 'Alwar, Rajasthan' }
    ]
  },
  { 
    code: 'IS 1786', 
    title: 'High Strength Deformed Steel Bars for Concrete Reinforcement', 
    industry: 'Construction', 
    relevance: 'Strictly mandatory for all state and national highway and bridge infrastructure.', 
    date: '10 Jan 2022',
    committee: 'CED 54 (Reinforcement Steel and Concrete Structurals)',
    description: 'Covers requirements of high strength deformed steel bars and wires for concrete reinforcement of strength grades Fe 415, Fe 500, Fe 550, and Fe 600, including tensile, bending, and chemical testing limits.',
    manufacturers: [
      { name: 'Tata Steel Limited', license: 'CM/L-661203', location: 'Jamshedpur, Jharkhand' },
      { name: 'JSW Steel Limited', license: 'CM/L-719332', location: 'Bellary, Karnataka' }
    ]
  },
  { 
    code: 'IS 4985', 
    title: 'Unplasticized PVC Pipes for Potable Water Supplies', 
    industry: 'Construction', 
    relevance: 'Required standard for Har Ghar Jal rural water pipeline tenders.', 
    date: '28 Aug 2023',
    committee: 'CED 50 (Plastic Piping Systems)',
    description: 'Specifies dimensions, pressure ratings, material composition, density parameters, hydrostatic testing metrics, and mechanical properties of uPVC pipes used in municipal drinking water lines.',
    manufacturers: [
      { name: 'Supreme Industries Ltd.', license: 'CM/L-504938', location: 'Jalgaon, Maharashtra' },
      { name: 'Finolex Industries Ltd.', license: 'CM/L-228391', location: 'Ratnagiri, Maharashtra' }
    ]
  }
];

const MOCK_PRODUCTS = [
  { id: 'P-101', name: 'Cotton Bandage Cloth (Rolls)', category: 'Medical', standard: 'IS 758', manufacturer: 'Supreme Medical Ltd.', availability: 'In Stock' },
  { id: 'P-102', name: 'Sterilized Cotton Dressing pads', category: 'Medical', standard: 'IS 758', manufacturer: 'Supreme Medical Ltd.', availability: '3 Weeks Lead Time' },
  { id: 'P-103', name: 'Centrifugal Agriculture Pumps', category: 'Mechanical', standard: 'IS 1520', manufacturer: 'Texmo Industries', availability: 'In Stock' },
  { id: 'P-104', name: 'Heavy-Duty Horizontal Water Pumps', category: 'Mechanical', standard: 'IS 1520', manufacturer: 'Kirloskar Brothers India', availability: '4 Weeks Lead Time' },
  { id: 'P-105', name: 'Borosilicate Glass Test Tubes', category: 'Laboratory', standard: 'IS 4381', manufacturer: 'Supreme Medical Ltd.', availability: 'In Stock' },
  { id: 'P-106', name: 'Safety Electric Kettle (1.5L)', category: 'Electrical', standard: 'IS 302', manufacturer: 'Bajaj Electricals Ltd.', availability: 'In Stock' },
  { id: 'P-107', name: 'TMT Reinforcement Steel Rebars', category: 'Construction', standard: 'IS 1786', manufacturer: 'Tata Steel Limited', availability: 'In Stock' },
  { id: 'P-108', name: 'High-Pressure uPVC Water Pipes', category: 'Construction', standard: 'IS 4985', manufacturer: 'Supreme Industries Ltd.', availability: 'In Stock' }
];

const MOCK_VERIFICATION_LISTS = {
  buyers: [
    { id: 'B-883', org: 'National Health Authority', officer: 'Buyer Officer', email: 'buyer@aspen.gov.in', status: 'Verified', date: '2026-08-20' },
    { id: 'B-441', org: 'Central Public Works Dept (CPWD)', officer: 'Anil Saxena', email: 'a.saxena@cpwd.gov.in', status: 'Pending Review', date: '2026-08-27' },
    { id: 'B-109', org: 'Defense Research & Dev Org (DRDO)', officer: 'Dr. S. Nair', email: 's.nair@drdo.res.in', status: 'Verified', date: '2026-07-15' }
  ],
  sellers: [
    { id: 'S-209', org: 'Supreme Medical Ltd.', rep: 'Vijay Shinde', email: 'seller@aspen.gov.in', status: 'Verified', date: '2026-08-11' },
    { id: 'S-772', org: 'Apex Electricals Ltd.', rep: 'Harish Roy', email: 'sales@apexelectricals.com', status: 'Pending Review', date: '2026-08-28' },
    { id: 'S-014', org: 'Elite Piping Systems', rep: 'Nisha Gupta', email: 'nisha@elitepipes.co.in', status: 'Verified', date: '2026-06-30' }
  ]
};

const MOCK_AUDIT_LOGS = [
  { timestamp: '2026-08-29 21:12:44', user: 'admin.support@aspen.gov.in', action: 'Approved Seller registration for Apex Electricals Ltd.' },
  { timestamp: '2026-08-29 19:40:12', user: 'seller@aspen.gov.in', action: 'Uploaded test compliance reports for IS 758 Gauze audit' },
  { timestamp: '2026-08-29 18:05:33', user: 'buyer@aspen.gov.in', action: 'Created new tender/RFQ RFQ-2026-004 (Cotton Bandage Cloth)' },
  { timestamp: '2026-08-29 14:15:20', user: 'admin.support@aspen.gov.in', action: 'Updated BIS Database standard metadata: IS 4985' },
  { timestamp: '2026-08-28 10:29:11', user: 'a.saxena@cpwd.gov.in', action: 'Submitted buyer registration request for CPWD access' }
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'warning', text: 'New seller registration: Apex Electricals Ltd. requires profile audit.', time: '2 mins ago', unread: true },
  { id: 2, type: 'info', text: 'Audit Alert: Standard IS 302 revised with new thermal insulation rules.', time: '1 hr ago', unread: true },
  { id: 3, type: 'success', text: 'RFQ Verified: Supreme Medical submitted certified quote on RFQ-2026-004.', time: '4 hrs ago', unread: true }
];

// ==========================================================================
// 2. STATE VARIABLES
// ==========================================================================

// Restore saved role and session from localStorage (default to buyer so full search & role features are ready)
const savedRole = localStorage.getItem('aspen_role') || 'buyer';
let currentUser = MOCK_USERS[savedRole] || MOCK_USERS.buyer;
try {
  const savedUserJson = localStorage.getItem('aspen_user');
  if (savedUserJson) {
    const parsedUser = JSON.parse(savedUserJson);
    if (parsedUser && parsedUser.role) {
      currentUser = parsedUser;
    }
  }
} catch (e) {
  console.warn('Failed to parse saved user from localStorage:', e);
}

let activePage = 'home';
let notifications = [...MOCK_NOTIFICATIONS];
let systemAuditLogs = [...MOCK_AUDIT_LOGS];
let currentSearchQuery = '';
let parsedSearchResult = null;
let currentLang = localStorage.getItem('aspen_lang') || 'en';
let SYSTEM_ADMIN_OVERRIDES = JSON.parse(localStorage.getItem('aspen_admin_overrides') || '{}');

// ==========================================================================
// MULTI-LANGUAGE TRANSLATION DICTIONARY (English, Hindi, Telugu)
// ==========================================================================

const TRANSLATIONS = {
  en: {
    app_title: "ASPEN — AI Procurement Intelligence Platform",
    ai_active: "AI Active",
    guest_view: "Guest View",
    buyer_role: "Buyer Role",
    seller_role: "Seller Role",
    admin_role: "Administrator",
    home: "Home",
    category: "Category",
    bis_standards: "BIS Standards",
    buyer_rfq_oversight: "Buyer Drafted Tenders & RFQs Oversight",
    total_rfqs: "Total RFQs",
    view_bis_report: "View BIS Report",
    my_products: "My Products",
    audit_logs: "Audit Logs",
    settings: "Settings",
    back: "Back",
    hero_title: "AI Procurement & Standard Intelligence",
    hero_subtitle: "Instant BIS compliance verification, natural language requirement search, and PostgreSQL authenticated procurement portal.",
    search_placeholder: "Search product name, BIS standard (e.g. IS 758) or category...",
    search_btn: "Analyze Requirement",
    access_portal: "ASPEN Access Portal",
    login_tab: "Login",
    register_tab: "Register",
    connected_pg: "Connected to PostgreSQL: ASPEN Log",
    login_btn_buyer: "Login as Buyer",
    login_btn_seller: "Login as Seller",
    login_btn_admin: "Login as Administrator",
    reg_btn_buyer: "Register Buyer Account in PostgreSQL",
    reg_btn_seller: "Register Seller Account in PostgreSQL",
    reg_btn_admin: "Register Admin Account in PostgreSQL",
    full_name: "Full Name",
    email_addr: "Email Address",
    phone_num: "Phone Number",
    password: "Password",
    org_name: "Organization / Ministry",
    company_name: "Company / Business Name",
    dept_agency: "Department / Agency Name",
    gstin: "GSTIN / Business Reg No",
    category: "Supply Category",
    emp_id: "Admin Employee ID",
    auth_pin: "Admin Auth Pin",
    switched_lang: "Language updated to English",
    what_procure: "What do you need to procure?",
    describe_need: "Describe what you need",
    natural_lang_placeholder: "Describe your requirement in natural language...",
    buyer_placeholder: "We need 10,000 industrial water pumps...",
    analyze_btn: "Analyze",
    popular_categories: "Popular Categories",
    cat_medical: "Medical",
    cat_electrical: "Electrical",
    cat_mechanical: "Mechanical",
    cat_lab: "Lab",
    cat_construction: "Construction",
    ai_tip: "AI Tip: \"We need 5,000 water pumps for municipal use.\"",
    standards_widget: "Standards",
    specification_widget: "Specification",
    manufacturers_widget: "Manufacturers",
    new_opp_title: "New Procurement Opportunities",
    opp_cotton: "Cotton Bandage Cloth",
    opp_cotton_meta: "Match 96% • Government Hospital",
    opp_glass: "Laboratory Glass Tubes",
    opp_glass_meta: "Match 91% • Research Institute",
    active_rfqs_widget: "Active RFQs",
    bis_status_widget: "BIS Status",
    capacity_widget: "Capacity",
    my_requirements: "My Active Requirements",
    track_rfqs: "Track RFQs",
    bids_received: "Bids Received",
    cert_status: "Certification Status",
    products_btn: "Products",
    bis_highlight: "BIS Highlight",
    browse_registry: "Browse Registry",
    my_rfqs: "My Procurement RFQs",
    rfq_page_sub: "Manage and audit bids received against your active procurement standards.",
    create_req: "Create Requirement",
    rfq_id: "RFQ ID",
    requirement_details: "Requirement Details",
    required_standard: "Required Standard",
    qty_requested: "Quantity Requested",
    date_published: "Date Published",
    bids_count: "Bids Received",
    tender_status: "Tender Status",
    my_portfolio: "My Manufacturing Portfolio",
    portfolio_sub: "List and verify your products against national BIS standards to unlock active opportunities.",
    register_product: "Register New Product",
    product_code: "Product Code",
    product_designation: "Product Designation",
    audit_standard: "Audit Standard",
    registry_code: "National Registry Code",
    compliance_status: "Compliance Status",
    active_tenders: "Active Bidding Tenders",
    active_tenders_sub: "Browse active government requirements matching your certified standard capabilities.",
    required_product: "Required Product",
    qty_slated: "Quantity Slated",
    bid_close_date: "Bidding Close Date",
    std_qualification: "Your Standard Qualification",
    action: "Action",
    qualified_mfr: "✓ Qualified Manufacturer",
    std_uncertified: "✗ Standard Uncertified",
    submit_bid: "Submit Compliant Bid",
    pending_verifications: "Pending Verifications",
    active_rfqs_label: "Active RFQs",
    total_bis_codes: "Total BIS Codes",
    system_perf: "System Performance",
    audits_slated: "↑ Audits Slated",
    bidding_active: "↑ Bidding Active",
    active_registry: "Active Registry",
    sla_compliant: "↑ SLA Compliant",
    monthly_audit_chart: "Monthly Verification Bids Audited",
    year_overview: "2026 Year Overview",
    active_system_logs: "Active System Logs",
    view_logs: "View Logs",
    profile_ver_registry: "Profile Verification Registry",
    profile_ver_sub: "Review and verify identities for government purchasing officers and supplier organizations.",
    buyer_apps_pending: "Buyer Applications Pending Review",
    seller_apps_pending: "Seller Applications Pending Review",
    approved_btn: "Approved",
    verify_btn: "Verify",
    procurement_analytics: "Procurement & Compliance Analytics",
    analytics_sub: "Performance tracking metrics, standards validation logs, and activity index metrics.",
    total_vol_searched: "Total Volume Searched",
    std_match_rate: "Standards Audit Match Rate",
    unique_mfrs: "Unique Bidding Manufacturers",
    ai_match_title: "AI Natural Language Matching Accuracy by Segment",
    audit_page_title: "System Cryptographic Audit Logs",
    audit_page_sub: "Secure audit trails tracking dashboard transitions, verifications, registry modifications, and security overrides.",
    registered_events: "Registered Events",
    clear_security_log: "Clear Security Log",
    product_catalog_title: "Product & Component Catalog",
    product_catalog_sub: "Browse active procurement inventories mapping directly to validated standard requirements.",
    segment_filter: "Segment Filter",
    all_categories: "All Categories",
    availability: "Availability",
    all_stocks: "All Stocks",
    in_stock_only: "In Stock Only",
    search_products_placeholder: "Search standard products...",
    manufacturer: "Manufacturer",
    stock_status: "Stock Status",
    audit_compliance_btn: "Audit Compliance",
    no_products: "No products match selected audit parameters.",
    bis_page_title: "National Indian Standards Registry (BIS)",
    bis_page_sub: "Search official Bureau of Indian Standards (IS) certifications, directives, and verified manufacturer databases.",
    industrial_domain: "Industrial Domain",
    all_domains: "All Domains",
    search_bis_placeholder: "Search by Standard code or title...",
    mandatory_standard: "Mandatory Standard",
    view_protocol_btn: "View Verification Protocol",
    account_reg_title: "Account Registration",
    account_reg_sub: "Select an account type below to register for specialized platform capabilities and workflows.",
    available_accounts: "Available Portal Accounts",
    reg_as_buyer: "Register as Buyer",
    reg_as_buyer_desc: "Access procurement catalog, submit RFQs, and track BIS-certified vendors.",
    reg_as_seller: "Register as Seller",
    reg_as_seller_desc: "List your certified products, manage BIS certifications, and respond to buyer RFQs.",
    reg_as_admin: "Register as Admin",
    reg_as_admin_desc: "Manage platform users, review compliance audits, and oversee vendor certifications.",
    register_now: "Register Now →",
    already_have_account: "Already have an active account?",
    sign_in_aspen: "Sign In to ASPEN",
    settings_title: "Settings",
    settings_sub: "Manage your account preferences and session settings.",
    current_account: "Current Account",
    account_name: "Account Name",
    organization: "Organization",
    logout_session: "Logout & End Session",
    nlu_modal_title: "Intelligent Requirement Analysis",
    nlu_modal_sub: "AI engine parsed search query parameters successfully.",
    nlu_close: "Close Analysis",
    nlu_sign_in: "Sign In to Procure",
    nlu_save_req: "Save Requirement",
    nlu_draft_rfq: "Draft Official RFQ",
    nlu_view_tenders: "View Active Tenders",
    nlu_edit_std: "Edit Associated Standard"
  },
  hi: {
    app_title: "ASPEN — एआई खरीद बुद्धिमत्ता मंच",
    ai_active: "एआई सक्रिय",
    guest_view: "अतिथि दृष्टिकोण",
    buyer_role: "खरीदार भूमिका",
    seller_role: "विक्रेता भूमिका",
    admin_role: "प्रशासक भूमिका",
    home: "मुख्य पृष्ठ",
    category: "श्रेणी",
    bis_standards: "बीआईएस मानक",
    buyer_rfq_oversight: "खरीदार द्वारा तैयार निविदाएं एवं आरएफक्यू समीक्षा",
    total_rfqs: "कुल आरएफक्यू",
    my_products: "मेरे उत्पाद",
    audit_logs: "ऑडिट लॉग",
    settings: "सेटिंग्स",
    back: "वापस",
    hero_title: "एआई खरीद एवं मानक बुद्धिमत्ता मंच",
    hero_subtitle: "तत्काल बीआईएस अनुपालन सत्यापन, प्राकृतिक भाषा खोज, और पोस्टग्रेएसक्यूएल प्रामाणिक खरीद पोर्टल।",
    search_placeholder: "उत्पाद का नाम, बीआईएस मानक (जैसे IS 758) या श्रेणी खोजें...",
    search_btn: "आवश्यकता विश्लेषण करें",
    access_portal: "ASPEN एक्सेस पोर्टल",
    login_tab: "लॉगिन",
    register_tab: "पंजीकरण",
    connected_pg: "पोस्टग्रेएसक्यूएल से जुड़ा हुआ: ASPEN Log",
    login_btn_buyer: "खरीदार के रूप में लॉगिन करें",
    login_btn_seller: "विक्रेता के रूप में लॉगिन करें",
    login_btn_admin: "प्रशासक के रूप में लॉगिन करें",
    reg_btn_buyer: "पोस्टग्रेएसक्यूएल में खरीदार खाता पंजीकृत करें",
    reg_btn_seller: "पोस्टग्रेएसक्यूएल में विक्रेता खाता पंजीकृत करें",
    reg_btn_admin: "पोस्टग्रेएसक्यूएल में प्रशासक खाता पंजीकृत करें",
    full_name: "पूरा नाम",
    email_addr: "ईमेल पता",
    phone_num: "फ़ोन नंबर",
    password: "पासवर्ड",
    org_name: "संगठन / मंत्रालय",
    company_name: "कंपनी / व्यवसाय का नाम",
    dept_agency: "विभाग / एजेंसी का नाम",
    gstin: "जीएसटीआईएन / व्यवसाय पंजीकरण संख्या",
    category: "आपूर्ति श्रेणी",
    emp_id: "प्रशासक कर्मचारी आईडी",
    auth_pin: "प्रशासक प्रमाणीकरण पिन",
    switched_lang: "भाषा बदलकर हिंदी कर दी गई है",
    what_procure: "आपको क्या खरीदना है?",
    describe_need: "अपनी ज़रूरत का वर्णन करें",
    natural_lang_placeholder: "अपनी आवश्यकता का प्राकृतिक भाषा में वर्णन करें...",
    buyer_placeholder: "हमें 10,000 औद्योगिक जल पंप चाहिए...",
    analyze_btn: "विश्लेषण करें",
    popular_categories: "लोकप्रिय श्रेणियाँ",
    cat_medical: "चिकित्सा",
    cat_electrical: "विद्युत",
    cat_mechanical: "यांत्रिक",
    cat_lab: "प्रयोगशाला",
    cat_construction: "निर्माण",
    ai_tip: "एआई सुझाव: \"नगर पालिका के लिए 5,000 जल पंप चाहिए।\"",
    standards_widget: "मानक",
    specification_widget: "विशिष्टता",
    manufacturers_widget: "निर्माता",
    new_opp_title: "नए खरीद अवसर",
    opp_cotton: "कॉटन बैंडेज कपड़ा",
    opp_cotton_meta: "मिलान 96% • सरकारी अस्पताल",
    opp_glass: "प्रयोगशाला काँच ट्यूब",
    opp_glass_meta: "मिलान 91% • शोध संस्थान",
    active_rfqs_widget: "सक्रिय आरएफक्यू",
    bis_status_widget: "बीआईएस स्थिति",
    capacity_widget: "क्षमता",
    my_requirements: "मेरी सक्रिय आवश्यकताएं",
    track_rfqs: "आरएफक्यू ट्रैक करें",
    bids_received: "बोलियाँ प्राप्त",
    cert_status: "प्रमाणीकरण स्थिति",
    products_btn: "उत्पाद",
    bis_highlight: "बीआईएस मुख्य बिंदु",
    browse_registry: "रजिस्ट्री ब्राउज़ करें",
    my_rfqs: "मेरी खरीद आरएफक्यू",
    rfq_page_sub: "अपनी सक्रिय खरीद मानकों के विरुद्ध प्राप्त बोलियों का प्रबंधन और ऑडिट करें।",
    create_req: "आवश्यकता बनाएं",
    rfq_id: "आरएफक्यू आईडी",
    requirement_details: "आवश्यकता विवरण",
    required_standard: "आवश्यक मानक",
    qty_requested: "अनुरोधित मात्रा",
    date_published: "प्रकाशन तिथि",
    bids_count: "बोलियाँ प्राप्त",
    tender_status: "निविदा स्थिति",
    my_portfolio: "मेरा विनिर्माण पोर्टफोलियो",
    portfolio_sub: "सक्रिय अवसरों को अनलॉक करने के लिए राष्ट्रीय बीआईएस मानकों के विरुद्ध अपने उत्पादों को सूचीबद्ध और सत्यापित करें।",
    register_product: "नया उत्पाद पंजीकृत करें",
    product_code: "उत्पाद कोड",
    product_designation: "उत्पाद पदनाम",
    audit_standard: "ऑडिट मानक",
    registry_code: "राष्ट्रीय रजिस्ट्री कोड",
    compliance_status: "अनुपालन स्थिति",
    active_tenders: "सक्रिय बोली निविदाएं",
    active_tenders_sub: "अपनी प्रमाणित मानक क्षमताओं से मेल खाती सक्रिय सरकारी आवश्यकताएं ब्राउज़ करें।",
    required_product: "आवश्यक उत्पाद",
    qty_slated: "निर्धारित मात्रा",
    bid_close_date: "बोली बंद तिथि",
    std_qualification: "आपकी मानक योग्यता",
    action: "कार्यवाही",
    qualified_mfr: "✓ योग्य निर्माता",
    std_uncertified: "✗ मानक असत्यापित",
    submit_bid: "अनुपालन बोली जमा करें",
    pending_verifications: "लंबित सत्यापन",
    active_rfqs_label: "सक्रिय आरएफक्यू",
    total_bis_codes: "कुल बीआईएस कोड",
    system_perf: "सिस्टम प्रदर्शन",
    audits_slated: "↑ ऑडिट निर्धारित",
    bidding_active: "↑ बोली सक्रिय",
    active_registry: "सक्रिय रजिस्ट्री",
    sla_compliant: "↑ एसएलए अनुपालित",
    monthly_audit_chart: "मासिक सत्यापन बोलियाँ ऑडिट की गईं",
    year_overview: "2026 वार्षिक अवलोकन",
    active_system_logs: "सक्रिय सिस्टम लॉग",
    view_logs: "लॉग देखें",
    profile_ver_registry: "प्रोफ़ाइल सत्यापन रजिस्ट्री",
    profile_ver_sub: "सरकारी क्रय अधिकारियों और आपूर्तिकर्ता संगठनों की पहचान की समीक्षा और सत्यापन करें।",
    buyer_apps_pending: "खरीदार आवेदन समीक्षाधीन",
    seller_apps_pending: "विक्रेता आवेदन समीक्षाधीन",
    approved_btn: "स्वीकृत",
    verify_btn: "सत्यापित करें",
    procurement_analytics: "खरीद और अनुपालन विश्लेषण",
    analytics_sub: "प्रदर्शन ट्रैकिंग मेट्रिक्स, मानक सत्यापन लॉग और गतिविधि इंडेक्स मेट्रिक्स।",
    total_vol_searched: "कुल मात्रा खोजी गई",
    std_match_rate: "मानक ऑडिट मिलान दर",
    unique_mfrs: "अद्वितीय बोली निर्माता",
    ai_match_title: "खंड अनुसार एआई प्राकृतिक भाषा मिलान सटीकता",
    audit_page_title: "सिस्टम क्रिप्टोग्राफ़िक ऑडिट लॉग",
    audit_page_sub: "डैशबोर्ड संक्रमण, सत्यापन, रजिस्ट्री संशोधन और सुरक्षा ओवरराइड को ट्रैक करने वाले सुरक्षित ऑडिट ट्रेल।",
    registered_events: "पंजीकृत घटनाएं",
    clear_security_log: "सुरक्षा लॉग साफ़ करें",
    product_catalog_title: "उत्पाद और घटक कैटलॉग",
    product_catalog_sub: "सत्यापित मानक आवश्यकताओं से सीधे जुड़ी सक्रिय खरीद सूचियाँ ब्राउज़ करें।",
    segment_filter: "खंड फ़िल्टर",
    all_categories: "सभी श्रेणियाँ",
    availability: "उपलब्धता",
    all_stocks: "सभी स्टॉक",
    in_stock_only: "केवल स्टॉक में",
    search_products_placeholder: "मानक उत्पाद खोजें...",
    manufacturer: "निर्माता",
    stock_status: "स्टॉक स्थिति",
    audit_compliance_btn: "अनुपालन ऑडिट",
    no_products: "चयनित ऑडिट मापदंडों से कोई उत्पाद मेल नहीं खाता।",
    bis_page_title: "राष्ट्रीय भारतीय मानक रजिस्ट्री (बीआईएस)",
    bis_page_sub: "आधिकारिक भारतीय मानक ब्यूरो (IS) प्रमाणपत्र, निर्देश और सत्यापित निर्माता डेटाबेस खोजें।",
    industrial_domain: "औद्योगिक क्षेत्र",
    all_domains: "सभी क्षेत्र",
    search_bis_placeholder: "मानक कोड या शीर्षक द्वारा खोजें...",
    mandatory_standard: "अनिवार्य मानक",
    view_protocol_btn: "सत्यापन प्रोटोकॉल देखें",
    account_reg_title: "खाता पंजीकरण",
    account_reg_sub: "विशेष प्लेटफ़ॉर्म क्षमताओं के लिए पंजीकरण करने हेतु नीचे एक खाता प्रकार चुनें।",
    available_accounts: "उपलब्ध पोर्टल खाते",
    reg_as_buyer: "खरीदार के रूप में पंजीकरण करें",
    reg_as_buyer_desc: "खरीद कैटलॉग तक पहुंचें, आरएफक्यू जमा करें और बीआईएस-प्रमाणित विक्रेताओं को ट्रैक करें।",
    reg_as_seller: "विक्रेता के रूप में पंजीकरण करें",
    reg_as_seller_desc: "अपने प्रमाणित उत्पाद सूचीबद्ध करें, बीआईएस प्रमाणपत्र प्रबंधित करें और खरीदार आरएफक्यू का जवाब दें।",
    reg_as_admin: "प्रशासक के रूप में पंजीकरण करें",
    reg_as_admin_desc: "प्लेटफ़ॉर्म उपयोगकर्ताओं का प्रबंधन करें, अनुपालन ऑडिट की समीक्षा करें और विक्रेता प्रमाणन की निगरानी करें।",
    register_now: "अभी पंजीकरण करें →",
    already_have_account: "पहले से एक सक्रिय खाता है?",
    sign_in_aspen: "ASPEN में साइन इन करें",
    settings_title: "सेटिंग्स",
    settings_sub: "अपनी खाता प्राथमिकताएं और सत्र सेटिंग्स प्रबंधित करें।",
    current_account: "वर्तमान खाता",
    account_name: "खाता नाम",
    organization: "संगठन",
    logout_session: "लॉगआउट और सत्र समाप्त करें",
    nlu_modal_title: "बुद्धिमान आवश्यकता विश्लेषण",
    nlu_modal_sub: "एआई इंजन ने खोज क्वेरी मापदंडों को सफलतापूर्वक पार्स किया।",
    nlu_close: "विश्लेषण बंद करें",
    nlu_sign_in: "खरीदने के लिए साइन इन करें",
    nlu_save_req: "आवश्यकता सहेजें",
    nlu_draft_rfq: "आधिकारिक आरएफक्यू का मसौदा तैयार करें",
    nlu_view_tenders: "सक्रिय निविदाएं देखें",
    nlu_edit_std: "संबंधित मानक संपादित करें"
  },
  te: {
    app_title: "ASPEN — ఏఐ కొనుగోలు మేధస్సు ప్లాట్‌ఫారమ్",
    ai_active: "ఏఐ యాక్టివ్",
    guest_view: "అతిథి వీక్షణ",
    buyer_role: "కొనుగోలుదారు పాత్ర",
    seller_role: "విక్రేత పాత్ర",
    admin_role: "అడ్మినిస్ట్రేటర్",
    home: "ముఖ్య పేజీ",
    category: "వర్గం",
    bis_standards: "బిఐఎస్ ప్రమాణాలు",
    buyer_rfq_oversight: "కొనుగోలుదారు రూపొందించిన టెండర్లు మరియు RFQల పరిశీలన",
    total_rfqs: "మొత్తం RFQలు",
    my_products: "నా ఉత్పత్తులు",
    audit_logs: "ఆడిట్ లాగ్స్",
    settings: "సెట్టింగ్‌లు",
    back: "వెనకకు",
    hero_title: "ఏఐ సేకరణ మరియు ప్రమాణాల మేధస్సు ప్లాట్‌ఫారమ్",
    hero_subtitle: "తక్షణ బిఐఎస్ సమ్మతి తనిఖీ, శోధన మరియు పోస్ట్‌గ్రే-ఎస్క్యూఎల్ ప్రామాణీకరించబడిన సేకరణ పోర్టల్.",
    search_placeholder: "ఉత్పత్తి పేరు, బిఐఎస్ కోడ్ (ఉదా. IS 758) లేదా వర్గం వెతకండి...",
    search_btn: "అవసర విశ్లేషణ చేయండి",
    access_portal: "ASPEN యాక్సెస్ పోర్టల్",
    login_tab: "లాగిన్",
    register_tab: "రిజిస్ట్రేషన్",
    connected_pg: "పోస్ట్‌గ్రే-ఎస్క్యూఎల్ కనెక్ట్ చేయబడింది: ASPEN Log",
    login_btn_buyer: "కొనుగోలుదారుగా లాగిన్ అవ్వండి",
    login_btn_seller: "విక్రేతగా లాగిన్ అవ్వండి",
    login_btn_admin: "అడ్మినిస్ట్రేటర్‌గా లాగిన్ అవ్వండి",
    reg_btn_buyer: "పోస్ట్‌గ్రే-ఎస్క్యూఎల్‌లో కొనుగోలుదారు ఖాతా నమోదు చేయండి",
    reg_btn_seller: "పోస్ట్‌గ్రే-ఎస్క్యూఎల్‌లో విక్రేత ఖాతా నమోదు చేయండి",
    reg_btn_admin: "పోస్ట్‌గ్రే-ఎస్క్యూఎల్‌లో అడ్మినిస్ట్రేటర్ ఖాతా నమోదు చేయండి",
    full_name: "పూర్తి పేరు",
    email_addr: "ఇమెయిల్ చిరునామా",
    phone_num: "ఫోన్ నంబర్",
    password: "పాస్‌వర్డ్",
    org_name: "సంస్థ / మంత్రిత్వ శాఖ",
    company_name: "కంపెనీ / వ్యాపారం పేరు",
    dept_agency: "శాఖ / ఏజెన్సీ పేరు",
    gstin: "జీఎస్‌టీఐఎన్ / బిజినెస్ రిజిస్ట్రేషన్ నంబర్",
    category: "సరఫరా వర్గం",
    emp_id: "అడ్మిన్ ఉద్యోగి ఐడీ",
    auth_pin: "అడ్మిన్ ప్రామాణీకరణ పిన్",
    switched_lang: "భాష తెలుగుకి మార్చబడింది",
    what_procure: "మీకు ఏమి కొనుగోలు చేయాలి?",
    describe_need: "మీ అవసరాన్ని వివరించండి",
    natural_lang_placeholder: "మీ అవసరాన్ని సహజ భాషలో వివరించండి...",
    buyer_placeholder: "మాకు 10,000 పారిశ్రామిక జల పంపులు కావాలి...",
    analyze_btn: "విశ్లేషించండి",
    popular_categories: "ప్రముఖ వర్గాలు",
    cat_medical: "వైద్యం",
    cat_electrical: "విద్యుత్",
    cat_mechanical: "యాంత్రిక",
    cat_lab: "ప్రయోగశాల",
    cat_construction: "నిర్మాణం",
    ai_tip: "ఏఐ సూచన: \"నగర పాలనకు 5,000 జల పంపులు కావాలి.\"",
    standards_widget: "ప్రమాణాలు",
    specification_widget: "వివరణ",
    manufacturers_widget: "తయారీదారులు",
    new_opp_title: "కొత్త సేకరణ అవకాశాలు",
    opp_cotton: "పత్తి బ్యాండేజ్ వస్త్రం",
    opp_cotton_meta: "మ్యాచ్ 96% • ప్రభుత్వ ఆసుపత్రి",
    opp_glass: "ప్రయోగశాల గాజు గొట్టాలు",
    opp_glass_meta: "మ్యాచ్ 91% • పరిశోధన సంస్థ",
    active_rfqs_widget: "చురుకైన RFQలు",
    bis_status_widget: "బిఐఎస్ స్థితి",
    capacity_widget: "సామర్థ్యం",
    my_requirements: "నా చురుకైన అవసరాలు",
    track_rfqs: "RFQలు ట్రాక్ చేయండి",
    bids_received: "బిడ్లు వచ్చాయి",
    cert_status: "ధృవీకరణ స్థితి",
    products_btn: "ఉత్పత్తులు",
    bis_highlight: "బిఐఎస్ హైలైట్",
    browse_registry: "రిజిస్ట్రీ బ్రౌజ్ చేయండి",
    my_rfqs: "నా సేకరణ RFQలు",
    rfq_page_sub: "మీ చురుకైన సేకరణ ప్రమాణాలకు వ్యతిరేకంగా వచ్చిన బిడ్లను నిర్వహించండి.",
    create_req: "అవసరం సృష్టించండి",
    rfq_id: "RFQ ఐడీ",
    requirement_details: "అవసర వివరాలు",
    required_standard: "అవసర ప్రమాణం",
    qty_requested: "అభ్యర్థించిన పరిమాణం",
    date_published: "ప్రచురణ తేదీ",
    bids_count: "బిడ్లు వచ్చాయి",
    tender_status: "టెండర్ స్థితి",
    my_portfolio: "నా తయారీ పోర్ట్‌ఫోలియో",
    portfolio_sub: "చురుకైన అవకాశాలను అన్‌లాక్ చేయడానికి జాతీయ బిఐఎస్ ప్రమాణాలకు వ్యతిరేకంగా మీ ఉత్పత్తులను జాబితా చేయండి.",
    register_product: "కొత్త ఉత్పత్తి నమోదు చేయండి",
    product_code: "ఉత్పత్తి కోడ్",
    product_designation: "ఉత్పత్తి హోదా",
    audit_standard: "ఆడిట్ ప్రమాణం",
    registry_code: "జాతీయ రిజిస్ట్రీ కోడ్",
    compliance_status: "సమ్మతి స్థితి",
    active_tenders: "చురుకైన బిడ్డింగ్ టెండర్లు",
    active_tenders_sub: "మీ ధృవీకరించబడిన ప్రమాణ సామర్థ్యాలకు సరిపోయే చురుకైన ప్రభుత్వ అవసరాలు బ్రౌజ్ చేయండి.",
    required_product: "అవసర ఉత్పత్తి",
    qty_slated: "నిర్ణయించిన పరిమాణం",
    bid_close_date: "బిడ్ ముగింపు తేదీ",
    std_qualification: "మీ ప్రమాణ అర్హత",
    action: "చర్య",
    qualified_mfr: "✓ అర్హత గల తయారీదారు",
    std_uncertified: "✗ ప్రమాణం ధృవీకరించబడలేదు",
    submit_bid: "సమ్మతి బిడ్ సమర్పించండి",
    pending_verifications: "పెండింగ్ ధృవీకరణలు",
    active_rfqs_label: "చురుకైన RFQలు",
    total_bis_codes: "మొత్తం బిఐఎస్ కోడ్‌లు",
    system_perf: "సిస్టమ్ పనితీరు",
    audits_slated: "↑ ఆడిట్లు నిర్ణయించబడ్డాయి",
    bidding_active: "↑ బిడ్డింగ్ చురుకుగా ఉంది",
    active_registry: "చురుకైన రిజిస్ట్రీ",
    sla_compliant: "↑ SLA సమ్మతిలో ఉంది",
    monthly_audit_chart: "నెలవారీ ధృవీకరణ బిడ్లు ఆడిట్ చేయబడ్డాయి",
    year_overview: "2026 వార్షిక అవలోకనం",
    active_system_logs: "చురుకైన సిస్టమ్ లాగ్‌లు",
    view_logs: "లాగ్‌లు చూడండి",
    profile_ver_registry: "ప్రొఫైల్ ధృవీకరణ రిజిస్ట్రీ",
    profile_ver_sub: "ప్రభుత్వ కొనుగోలు అధికారులు మరియు సరఫరాదారు సంస్థల గుర్తింపులను సమీక్షించండి.",
    buyer_apps_pending: "కొనుగోలుదారు దరఖాస్తులు సమీక్షలో ఉన్నాయి",
    seller_apps_pending: "విక్రేత దరఖాస్తులు సమీక్షలో ఉన్నాయి",
    approved_btn: "ఆమోదించబడింది",
    verify_btn: "ధృవీకరించండి",
    procurement_analytics: "సేకరణ మరియు సమ్మతి విశ్లేషణ",
    analytics_sub: "పనితీరు ట్రాకింగ్ మెట్రిక్స్, ప్రమాణాల ధృవీకరణ లాగ్‌లు మరియు కార్యాచరణ సూచిక మెట్రిక్స్.",
    total_vol_searched: "మొత్తం పరిమాణం వెతకబడింది",
    std_match_rate: "ప్రమాణాల ఆడిట్ మ్యాచ్ రేటు",
    unique_mfrs: "ప్రత్యేక బిడ్డింగ్ తయారీదారులు",
    ai_match_title: "విభాగం వారీగా ఏఐ సహజ భాష మ్యాచింగ్ ఖచ్చితత్వం",
    audit_page_title: "సిస్టమ్ క్రిప్టోగ్రాఫిక్ ఆడిట్ లాగ్‌లు",
    audit_page_sub: "డ్యాష్‌బోర్డ్ మార్పులు, ధృవీకరణలు, రిజిస్ట్రీ మార్పులు మరియు భద్రతా ఓవర్‌రైడ్‌లను ట్రాక్ చేసే సురక్షిత ఆడిట్ ట్రెయిల్‌లు.",
    registered_events: "నమోదైన సంఘటనలు",
    clear_security_log: "భద్రతా లాగ్ క్లియర్ చేయండి",
    product_catalog_title: "ఉత్పత్తి మరియు భాగాల కేటలాగ్",
    product_catalog_sub: "ధృవీకరించబడిన ప్రమాణ అవసరాలకు నేరుగా మ్యాపింగ్ అయ్యే చురుకైన సేకరణ జాబితాలు బ్రౌజ్ చేయండి.",
    segment_filter: "విభాగం ఫిల్టర్",
    all_categories: "అన్ని వర్గాలు",
    availability: "అందుబాటు",
    all_stocks: "అన్ని స్టాక్‌లు",
    in_stock_only: "స్టాక్‌లో మాత్రమే",
    search_products_placeholder: "ప్రమాణ ఉత్పత్తులు వెతకండి...",
    manufacturer: "తయారీదారు",
    stock_status: "స్టాక్ స్థితి",
    audit_compliance_btn: "సమ్మతి ఆడిట్",
    no_products: "ఎంచుకున్న ఆడిట్ మాపదండాలకు ఏ ఉత్పత్తులూ సరిపోలలేదు.",
    bis_page_title: "జాతీయ భారత ప్రమాణాల రిజిస్ట్రీ (బిఐఎస్)",
    bis_page_sub: "అధికారిక భారతీయ ప్రమాణాల బ్యూరో (IS) ధృవీకరణలు, నిర్దేశాలు మరియు ధృవీకరించబడిన తయారీదారు డేటాబేస్‌లు వెతకండి.",
    industrial_domain: "పారిశ్రామిక రంగం",
    all_domains: "అన్ని రంగాలు",
    search_bis_placeholder: "ప్రమాణ కోడ్ లేదా శీర్షిక ద్వారా వెతకండి...",
    mandatory_standard: "తప్పనిసరి ప్రమాణం",
    view_protocol_btn: "ధృవీకరణ ప్రోటోకాల్ చూడండి",
    account_reg_title: "ఖాతా నమోదు",
    account_reg_sub: "విశేష ప్లాట్‌ఫారమ్ సామర్థ్యాల కోసం నమోదు చేయడానికి దిగువన ఒక ఖాతా రకాన్ని ఎంచుకోండి.",
    available_accounts: "అందుబాటులో ఉన్న పోర్టల్ ఖాతాలు",
    reg_as_buyer: "కొనుగోలుదారుగా నమోదు చేయండి",
    reg_as_buyer_desc: "సేకరణ కేటలాగ్‌ను యాక్సెస్ చేయండి, RFQలు సమర్పించండి మరియు బిఐఎస్-ధృవీకరించబడిన విక్రేతలను ట్రాక్ చేయండి.",
    reg_as_seller: "విక్రేతగా నమోదు చేయండి",
    reg_as_seller_desc: "మీ ధృవీకరించబడిన ఉత్పత్తులను జాబితా చేయండి, బిఐఎస్ ధృవీకరణలను నిర్వహించండి మరియు కొనుగోలుదారు RFQలకు స్పందించండి.",
    reg_as_admin: "అడ్మిన్‌గా నమోదు చేయండి",
    reg_as_admin_desc: "ప్లాట్‌ఫారమ్ వినియోగదారులను నిర్వహించండి, సమ్మతి ఆడిట్‌లను సమీక్షించండి మరియు విక్రేత ధృవీకరణలను పర్యవేక్షించండి.",
    register_now: "ఇప్పుడు నమోదు చేయండి →",
    already_have_account: "ఇప్పటికే చురుకైన ఖాతా ఉందా?",
    sign_in_aspen: "ASPEN లో సైన్ ఇన్ చేయండి",
    settings_title: "సెట్టింగ్‌లు",
    settings_sub: "మీ ఖాతా ప్రాధాన్యతలు మరియు సెషన్ సెట్టింగ్‌లను నిర్వహించండి.",
    current_account: "ప్రస్తుత ఖాతా",
    account_name: "ఖాతా పేరు",
    organization: "సంస్థ",
    logout_session: "లాగ్‌అవుట్ మరియు సెషన్ ముగించండి",
    nlu_modal_title: "తెలివైన అవసర విశ్లేషణ",
    nlu_modal_sub: "ఏఐ ఇంజిన్ శోధన క్వెరీ పారామితులను విజయవంతంగా పార్స్ చేసింది.",
    nlu_close: "విశ్లేషణ మూసివేయండి",
    nlu_sign_in: "కొనుగోలుకు సైన్ ఇన్ చేయండి",
    nlu_save_req: "అవసరం సేవ్ చేయండి",
    nlu_draft_rfq: "అధికారిక RFQ రూపొందించండి",
    nlu_view_tenders: "చురుకైన టెండర్లు చూడండి",
    nlu_edit_std: "సంబంధిత ప్రమాణం సవరించండి"
  },
  bn: {
    app_title: "ASPEN — এআই সংগ্রহ গোয়েন্দা প্ল্যাটফর্ম",
    ai_active: "এআই সক্রিয়",
    guest_view: "অতিথি ভিউ",
    buyer_role: "ক্রেতা ভূমিকা",
    seller_role: "বিক্রেতা ভূমিকা",
    admin_role: "প্রশাসক",
    home: "হোম",
    category: "বিভাগ",
    bis_standards: "বিআইএস মানদণ্ড",
    buyer_rfq_oversight: "ক্রেতার খসড়া দরপত্র ও আরএফকিউ পর্যবেক্ষণ",
    total_rfqs: "মোট আরএফকিউ",
    view_bis_report: "বিআইএস রিপোর্ট দেখুন",
    my_products: "আমার পণ্যসমূহ",
    audit_logs: "অডিট লগ",
    settings: "সেটিংস",
    back: "ফিরে যান",
    hero_title: "এআই সংগ্রহ ও মানদণ্ড গোয়েন্দা",
    hero_subtitle: "তাত্ক্ষণিক বিআইএস সম্মতি যাচাইকরণ, প্রাকৃতিক ভাষার প্রয়োজনীয়তা অনুসন্ধান এবং পোস্টগ্রেসকিউএল প্রমাণীকৃত সংগ্রহ পোর্টাল।",
    search_placeholder: "পণ্যের নাম, বিআইএস কোড (যেমন IS 758) বা বিভাগ অনুসন্ধান করুন...",
    search_btn: "প্রয়োজনীয়তা বিশ্লেষণ করুন",
    access_portal: "ASPEN এক্সেস পোর্টাল",
    login_tab: "লগইন",
    register_tab: "নিবন্ধন",
    connected_pg: "পোস্টগ্রেসকিউএল যুক্ত: ASPEN Log",
    login_btn_buyer: "ক্রেতা হিসেবে লগইন করুন",
    login_btn_seller: "বিক্রেতা হিসেবে লগইন করুন",
    login_btn_admin: "প্রশাসক হিসেবে লগইন করুন",
    reg_btn_buyer: "পোস্টগ্রেসকিউএল-এ ক্রেতা অ্যাকাউন্ট নিবন্ধন করুন",
    reg_btn_seller: "পোস্টগ্রেসকিউএল-এ বিক্রেতা অ্যাকাউন্ট নিবন্ধন করুন",
    reg_btn_admin: "পোস্টগ্রেসকিউএল-এ অ্যাডমিন অ্যাকাউন্ট নিবন্ধন করুন",
    full_name: "পূর্ণ নাম",
    email_addr: "ইমেল ঠিকানা",
    phone_num: "ফোন নম্বর",
    password: "পাসওয়ার্ড",
    org_name: "সংস্থা / মন্ত্রণালয়",
    company_name: "কোম্পানি / ব্যবসার নাম",
    dept_agency: "বিভাগ / এজেন্সির নাম",
    gstin: "জিএসটিআইএন / ব্যবসা নিবন্ধন নম্বর",
    category: "সরবরাহ বিভাগ",
    emp_id: "অ্যাডমিন কর্মী আইডি",
    auth_pin: "অ্যাডমিন পিন",
    switched_lang: "ভাষা বাংলায় পরিবর্তিত হয়েছে",
    what_procure: "আপনার কী সংগ্রহ করা প্রয়োজন?",
    describe_need: "আপনার প্রয়োজনীয়তার বিবরণ দিন",
    natural_lang_placeholder: "সহজ ভাষায় আপনার প্রয়োজনীয়তা বর্ণনা করুন...",
    buyer_placeholder: "আমাদের ১০,০০০টি শিল্প জলের পাম্প প্রয়োজন...",
    analyze_btn: "বিশ্লেষণ করুন",
    popular_categories: "জনপ্রিয় বিভাগসমূহ",
    cat_medical: "চিকিৎসা",
    cat_electrical: "বৈদ্যুতিক",
    cat_mechanical: "যান্ত্রিক",
    cat_lab: "ল্যাবরেটরি",
    cat_construction: "নির্মাণ",
    ai_tip: "এআই টিপ: \"পৌরসভার জন্য ৫,০০০ জলের পাম্প প্রয়োজন।\"",
    standards_widget: "মানদণ্ড",
    specification_widget: "স্পেসিফিকেশন",
    manufacturers_widget: "প্রস্তুতকারক",
    new_opp_title: "নতুন সংগ্রহের সুযোগ",
    opp_cotton: "সুতি ব্যান্ডেজ কাপড়",
    opp_cotton_meta: "মিল ৯৬% • সরকারি হাসপাতাল",
    opp_glass: "ল্যাবরেটরি কাঁচের টিউব",
    opp_glass_meta: "মিল ৯১% • গবেষণা ইনস্টিটিউট",
    active_rfqs_widget: "সক্রিয় আরএফকিউ",
    bis_status_widget: "বিআইএস স্থিতি",
    capacity_widget: "ক্ষমতা",
    my_requirements: "আমার সক্রিয় প্রয়োজনীয়তা",
    track_rfqs: "আরএফকিউ ট্র্যাকিং",
    bids_received: "প্রাপ্ত দরপত্র",
    cert_status: "সার্টিফিকেশন স্থিতি",
    products_btn: "পণ্যসমূহ",
    bis_highlight: "বিআইএস হাইলাইট",
    browse_registry: "রেজিস্ট্রি ব্রাউজ করুন",
    my_rfqs: "আমার সংগ্রহ আরএফকিউ",
    rfq_page_sub: "আপনার সক্রিয় সংগ্রহের মানদণ্ডের বিপরীতে প্রাপ্ত দরপত্র পরিচালনা ও অডিট করুন।",
    create_req: "প্রয়োজনীয়তা তৈরি করুন",
    rfq_id: "আরএফকিউ আইডি",
    requirement_details: "প্রয়োজনীয়তার বিবরণ",
    required_standard: "প্রয়োজনীয় মানদণ্ড",
    qty_requested: "অনুরোধকৃত পরিমাণ",
    date_published: "প্রকাশের তারিখ",
    bids_count: "প্রাপ্ত দরপত্র",
    tender_status: "টেন্ডারের স্থিতি",
    my_portfolio: "আমার ম্যানুফ্যাকচারিং পোর্টফোলিও",
    portfolio_sub: "জাতীয় বিআইএস মানদণ্ডের সাথে আপনার পণ্য তালিকাভুক্ত ও যাচাই করুন।",
    register_product: "নতুন পণ্য নিবন্ধন করুন",
    product_code: "পণ্য কোড",
    product_designation: "পণ্যের পদবী",
    audit_standard: "অডিট মানদণ্ড",
    registry_code: "জাতীয় রেজিস্ট্রি কোড",
    compliance_status: "সম্মতি স্থিতি",
    active_tenders: "সক্রিয় বিডিং টেন্ডার",
    active_tenders_sub: "আপনার সার্টিফাইড মানদণ্ডের সাথে মিলে যাওয়া সরকারি প্রয়োজনীয়তাগুলি ব্রাউজ করুন।",
    required_product: "প্রয়োজনীয় পণ্য",
    qty_slated: "নির্ধারিত পরিমাণ",
    bid_close_date: "বিডিং শেষের তারিখ",
    std_qualification: "আপনার মানদণ্ড যোগ্যতা",
    action: "পদক্ষেপ",
    qualified_mfr: "✓ যোগ্য প্রস্তুতকারক",
    std_uncertified: "✗ মানদণ্ড অসত্যয়িত",
    submit_bid: "সম্মতিমূলক বিড জমা দিন",
    pending_verifications: "বাকি থাকা যাচাইকরণ",
    active_rfqs_label: "সক্রিয় আরএফকিউ",
    total_bis_codes: "মোট বিআইএস কোড",
    system_perf: "সিস্টেম কার্যক্ষমতা",
    audits_slated: "↑ অডিট নির্ধারিত",
    bidding_active: "↑ বিডিং সক্রিয়",
    active_registry: "সক্রিয় রেজিস্ট্রি",
    sla_compliant: "↑ এসএলএ সম্মত",
    monthly_audit_chart: "মাসিক অডিটকৃত যাচাইকরণ দরপত্র",
    year_overview: "২০২৬ সালের পর্যালোচনা",
    active_system_logs: "সক্রিয় সিস্টেম লগ",
    view_logs: "লগ দেখুন",
    profile_ver_registry: "প্রোফাইল যাচাইকরণ রেজিস্ট্রি",
    profile_ver_sub: "সরকারি ক্রয় কর্মকর্তা ও সরবরাহকারী সংস্থার পরিচয় পর্যালোচনা করুন।",
    buyer_apps_pending: "ক্রেতার আবেদন পর্যালোচনার অপেক্ষায়",
    seller_apps_pending: "বিক্রেতার আবেদন পর্যালোচনার অপেক্ষায়",
    approved_btn: "অনুমোদিত",
    verify_btn: "যাচাই করুন",
    procurement_analytics: "সংগ্রহ ও সম্মতি বিশ্লেষণ",
    analytics_sub: "পারফরম্যান্স ট্র্যাকিং মেট্রিক্স, মানদণ্ড যাচাইকরণ লগ এবং অ্যাক্টিভিটি সূচক।",
    total_vol_searched: "মোট অনুসন্ধানের পরিমাণ",
    std_match_rate: "মানদণ্ড অডিট মিলের হার",
    unique_mfrs: "অনন্য বিডিং প্রস্তুতকারক",
    ai_match_title: "বিভাগ অনুযায়ী এআই প্রাকৃতিক ভাষা মেলানোর নির্ভুলতা",
    audit_page_title: "সিস্টেম ক্রিপ্টোগ্রাফিক অডিট লগ",
    audit_page_sub: "ড্যাশবোর্ড পরিবর্তন, যাচাইকরণ এবং নিরাপত্তা ওভাররাইড ট্র্যাকিংয়ের জন্য সুরক্ষিত অডিট ট্রেইল।",
    registered_events: "নিবন্ধিত ইভেন্ট",
    clear_security_log: "নিরাপত্তা লগ মুছুন",
    product_catalog_title: "পণ্য ও উপাদান ক্যাটালগ",
    product_catalog_sub: "যাচাইকৃত মানদণ্ড প্রয়োজনীয়তার সাথে সরাসরি ম্যাপিং হওয়া পণ্যসমূহ ব্রাউজ করুন।",
    segment_filter: "সেগমেন্ট ফিল্টার",
    all_categories: "সমস্ত বিভাগ",
    availability: "উপলব্ধতা",
    all_stocks: "সমস্ত স্টক",
    in_stock_only: "কেবল স্টকে থাকা",
    search_products_placeholder: "মানসম্মত পণ্য অনুসন্ধান করুন...",
    manufacturer: "প্রস্তুতকারক",
    stock_status: "স্টক স্থিতি",
    audit_compliance_btn: "অডিট সম্মতি",
    no_products: "নির্বাচিত অডিট পরামিতির সাথে কোন পণ্য মেলেনি।",
    bis_page_title: "জাতীয় ভারতীয় মানদণ্ড রেজিস্ট্রি (বিআইএস)",
    bis_page_sub: "অফিসিয়াল ব্যুরো অফ ইন্ডিয়ান স্ট্যান্ডার্ডস (IS) সার্টিফিকেশন এবং প্রস্তুতকারক ডাটাবেস অনুসন্ধান করুন।",
    industrial_domain: "শিল্প ডোমেইন",
    all_domains: "সমস্ত ডোমেইন",
    search_bis_placeholder: "কোড বা শিরোনাম দিয়ে অনুসন্ধান করুন...",
    mandatory_standard: "বাধ্যতামূলক মানদণ্ড",
    view_protocol_btn: "যাচাইকরণ প্রোটোকল দেখুন",
    account_reg_title: "অ্যাকাউন্ট নিবন্ধন",
    account_reg_sub: "বিশেষ সুবিধাপ্রাপ্ত প্ল্যাটফর্ম ব্যবহারের জন্য নিচে একটি অ্যাকাউন্টের ধরন নির্বাচন করুন।",
    available_accounts: "উপলব্ধ পোর্টাল অ্যাকাউন্টসমূহ",
    reg_as_buyer: "ক্রেতা হিসেবে নিবন্ধন করুন",
    reg_as_buyer_desc: "সংগ্রহ ক্যাটালগ এক্সেস করুন, আরএফকিউ জমা দিন এবং বিআইএস-সার্টিফাইড বিক্রেতাদের ট্র্যাক করুন।",
    reg_as_seller: "বিক্রেতা হিসেবে নিবন্ধন করুন",
    reg_as_seller_desc: "আপনার সার্টিফাইড পণ্য তালিকাভুক্ত করুন, বিআইএস সার্টিফিকেশন পরিচালনা করুন এবং উত্তর দিন।",
    reg_as_admin: "অ্যাডমিন হিসেবে নিবন্ধন করুন",
    reg_as_admin_desc: "ব্যবহারকারী পরিচালনা করুন, অডিট পর্যালোচনা করুন এবং প্ল্যাটফর্ম সম্মতি পর্যবেক্ষণ করুন।",
    register_now: "এখনই নিবন্ধন করুন →",
    already_have_account: "ইতিমধ্যেই একটি অ্যাকাউন্ট আছে?",
    sign_in_aspen: "ASPEN-এ সাইন ইন করুন",
    settings_title: "সেটিংস",
    settings_sub: "আপনার অ্যাকাউন্ট পছন্দ এবং সেশন সেটিংস পরিচালনা করুন।",
    current_account: "বর্তমান অ্যাকাউন্ট",
    account_name: "অ্যাকাউন্টের নাম",
    organization: "সংস্থা",
    logout_session: "লগআউট ও সেশন শেষ করুন",
    nlu_modal_title: "বুদ্ধিমান প্রয়োজনীয়তা বিশ্লেষণ",
    nlu_modal_sub: "এআই ইঞ্জিন অনুসন্ধান কোয়েরি সফলভাবে পার্স করেছে।",
    nlu_close: "বিশ্লেষণ বন্ধ করুন",
    nlu_sign_in: "সংগ্রহের জন্য সাইন ইন করুন",
    nlu_save_req: "প্রয়োজনীয়তা সংরক্ষণ করুন",
    nlu_draft_rfq: "অফিসিয়াল আরএফকিউ খসড়া করুন",
    nlu_view_tenders: "সক্রিয় টেন্ডার দেখুন",
    nlu_edit_std: "সংযুক্ত মানদণ্ড সম্পাদনা করুন"
  }
};

function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem('aspen_lang', lang);
  
  const langSelect = document.getElementById('language-select');
  if (langSelect) langSelect.value = lang;

  applyLanguageTranslations();
  showToast(t('switched_lang'), 'info');
}

function applyLanguageTranslations() {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Document Title
  document.title = dict.app_title;

  // Search input placeholder & search button
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) searchInput.placeholder = dict.search_placeholder;

  const searchBtnText = document.getElementById('search-btn-text');
  if (searchBtnText) searchBtnText.textContent = dict.search_btn;

  // Update Role Selector Dropdown options
  const roleSelect = document.getElementById('role-quick-select');
  if (roleSelect) {
    const opts = roleSelect.options;
    if (opts[0]) opts[0].textContent = dict.guest_view;
    if (opts[1]) opts[1].textContent = dict.buyer_role;
    if (opts[2]) opts[2].textContent = dict.seller_role;
    if (opts[3]) opts[3].textContent = dict.admin_role;
  }

  // Update Auth modal texts
  const modeLoginBtn = document.getElementById('auth-mode-login');
  if (modeLoginBtn) modeLoginBtn.textContent = dict.login_tab;

  const modeRegisterBtn = document.getElementById('auth-mode-register');
  if (modeRegisterBtn) modeRegisterBtn.textContent = dict.register_tab;

  const demoFillLink = document.getElementById('auth-demo-fill');
  if (demoFillLink) demoFillLink.textContent = dict.fill_sample;

  // Update role button text
  if (typeof setAuthRole === 'function' && currentAuthRole) {
    setAuthRole(currentAuthRole);
  }

  // Re-render sidebar to update nav item translations
  renderSidebarNav();

  // Re-render current page if active
  if (typeof renderPageContent === 'function' && activePage) {
    renderPageContent(activePage);
  }
}

// ==========================================================================
// 3. APPLICATION INITIALIZATION & CORE EVENTS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initUIComponents();
  applyLanguageTranslations();
  navigateTo('home');
});

function initUIComponents() {
  // Sidebar Collapse / Fold Toggle Handler
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const isFolded = localStorage.getItem('aspen_sidebar_folded') === 'true';
  if (isFolded) {
    document.body.classList.add('sidebar-folded');
  }

  if (collapseBtn) {
    collapseBtn.setAttribute('title', isFolded ? 'Expand Left Bar' : 'Fold Left Bar');
    collapseBtn.addEventListener('click', () => {
      const folded = document.body.classList.toggle('sidebar-folded');
      localStorage.setItem('aspen_sidebar_folded', folded ? 'true' : 'false');
      collapseBtn.setAttribute('title', folded ? 'Expand Left Bar' : 'Fold Left Bar');
      showToast(folded ? 'Left content bar folded in' : 'Left content bar expanded', 'info');
    });
  }

  // Theme Toggle Button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Language Selector Dropdown (Left of Role Selector)
  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  // Role Selector Dropdown - Opens modal for selected role or switches to guest
  const roleSelect = document.getElementById('role-quick-select');
  if (roleSelect) {
    roleSelect.value = currentUser.role;
    roleSelect.addEventListener('change', (e) => {
      const selectedRole = e.target.value;
      if (selectedRole === 'public') {
        switchRole('public');
      } else {
        openAuthModalForRole(selectedRole, 'login');
      }
    });
  }

  // Profile Dropdown Toggle
  const profileTrigger = document.getElementById('profile-trigger');
  const profileDropdown = document.getElementById('profile-dropdown');
  profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
    document.getElementById('notifications-dropdown').classList.remove('active');
  });
  profileDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Notifications Dropdown Toggle
  const notificationsTrigger = document.getElementById('notifications-trigger');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  notificationsTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsDropdown.classList.toggle('active');
    profileDropdown.classList.remove('active');
    
    // Mark notifications as read visually when opened
    markNotificationsRead();
  });
  notificationsDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Clear Notifications
  document.getElementById('clear-notifications').addEventListener('click', (e) => {
    e.stopPropagation();
    notifications = [];
    renderNotifications();
  });

  // Global document click to close dropdowns
  document.addEventListener('click', () => {
    profileDropdown.classList.remove('active');
    notificationsDropdown.classList.remove('active');
  });

  // Mobile navigation trigger
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  mobileMenuBtn.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });

  // Global Back Button Listener
  const globalBackBtn = document.getElementById('global-back-btn');
  if (globalBackBtn) {
    globalBackBtn.addEventListener('click', () => {
      navigateBack();
    });
  }

  // Setup Auth Modal & Postgres Backend Listeners
  setupAuthModalEvents();

  // Profile trigger authentication trigger fallback
  const authActionBtn = document.getElementById('auth-action-btn');
  authActionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUser.role === 'public') {
      openAuthModalForRole('buyer', 'login');
    } else {
      switchRole('public');
    }
  });

  // NLU Modal close trigger
  document.getElementById('nlu-modal-close').addEventListener('click', () => {
    toggleModal('nlu-modal', false);
  });

  // BIS Modal close trigger
  document.getElementById('bis-detail-close').addEventListener('click', () => {
    toggleModal('bis-detail-modal', false);
  });

  // BIS Suitability Modal close triggers
  document.getElementById('bis-suitability-close')?.addEventListener('click', () => {
    toggleModal('bis-suitability-modal', false);
  });
  document.getElementById('bis-suitability-modal-ok')?.addEventListener('click', () => {
    toggleModal('bis-suitability-modal', false);
  });

  // Buyer Submitted Bids Modal close triggers
  document.getElementById('buyer-bids-close')?.addEventListener('click', () => {
    toggleModal('buyer-bids-modal', false);
  });
  document.getElementById('buyer-bids-modal-close-btn')?.addEventListener('click', () => {
    toggleModal('buyer-bids-modal', false);
  });

  // BIS Modal tab switcher
  const bisTabs = document.querySelectorAll('.bis-tab-btn');
  bisTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      bisTabs.forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      
      const targetTab = tab.dataset.tab;
      document.querySelectorAll('.bis-tab-content').forEach(c => c.style.display = 'none');
      document.getElementById(`bis-tab-${targetTab}`).style.display = 'block';
    });
  });

  // Modal actions handlers
  document.getElementById('bis-modal-save-btn').addEventListener('click', handleSaveStandard);

  // Quantity Selector controls for bis-detail-modal
  const qtyInput = document.getElementById('bis-modal-qty-input');
  document.getElementById('bis-modal-qty-minus')?.addEventListener('click', () => {
    if (!qtyInput) return;
    let val = parseInt(qtyInput.value.replace(/[^0-9]/g, '')) || 10000;
    val = Math.max(1000, val - 1000);
    qtyInput.value = `${val.toLocaleString()} units`;
  });
  document.getElementById('bis-modal-qty-plus')?.addEventListener('click', () => {
    if (!qtyInput) return;
    let val = parseInt(qtyInput.value.replace(/[^0-9]/g, '')) || 10000;
    val += 1000;
    qtyInput.value = `${val.toLocaleString()} units`;
  });
  document.querySelectorAll('.bis-qty-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      if (qtyInput && btn.dataset.qty) {
        qtyInput.value = btn.dataset.qty;
      }
    });
  });
  document.getElementById('bis-modal-download-btn').addEventListener('click', () => {
    showToast('Mock standard PDF download started.', 'success');
  });

  // Render initial profile state and sidebar links
  updateRoleIdentityUI();
  renderNotifications();

  // Initialize registration modal
  initRegisterModal();
}

// ==========================================================================
// 4. THEME & IDENTITY ENGINE
// ==========================================================================

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  const lightIcon = document.querySelector('.theme-icon-light');
  const darkIcon = document.querySelector('.theme-icon-dark');
  const themeText = document.getElementById('theme-text');
  
  if (isDark) {
    lightIcon.style.display = 'none';
    darkIcon.style.display = 'block';
    themeText.textContent = 'Light Mode';
  } else {
    lightIcon.style.display = 'block';
    darkIcon.style.display = 'none';
    themeText.textContent = 'Dark Mode';
  }
}

function switchRole(role) {
  currentUser = MOCK_USERS[role] || MOCK_USERS.buyer;
  
  // Persist selected role and user session to localStorage
  localStorage.setItem('aspen_role', role);
  localStorage.setItem('aspen_user', JSON.stringify(currentUser));
  
  // Set dropdown indicator select sync
  const roleSelect = document.getElementById('role-quick-select');
  if (roleSelect) roleSelect.value = role;
  
  // Clear search results
  parsedSearchResult = null;
  
  updateRoleIdentityUI();
  renderSidebarNav();
  
  // Create audit log event
  addAuditLog(currentUser.email, `Switched dashboard perspective to ${role.toUpperCase()} mode.`);
  
  // Navigate automatically based on role default dashboard
  if (role === 'admin') {
    navigateTo('admin-dashboard');
  } else {
    navigateTo('home');
  }

  showToast(`Switched workspace perspective to ${role.toUpperCase()}`, 'info');
}

function updateRoleIdentityUI() {
  const badge = document.getElementById('role-badge');
  badge.textContent = currentUser.role === 'public' ? 'Public Guest' : `${currentUser.role.toUpperCase()} mode`;
  
  // Profile settings dropdown sync
  document.getElementById('profile-avatar-initials').textContent = currentUser.initials;
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-subtext').textContent = currentUser.subtext;
  
  // Auth CTA toggle in profile dropdown
  const authActionText = document.getElementById('auth-action-text');
  if (currentUser.role === 'public') {
    authActionText.textContent = 'Login';
  } else {
    authActionText.textContent = 'Logout & Exit';
  }
  
  renderSidebarNav();
}

// ==========================================================================
// AUTHENTICATION & POSTGRESQL API INTEGRATION ENGINE
// ==========================================================================

let currentAuthRole = 'buyer';
let currentAuthMode = 'login';

function setupAuthModalEvents() {
  // Modal Close Trigger
  const closeBtn = document.getElementById('auth-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleModal('auth-modal', false));
  }

  // Auth Mode Toggles (Login vs Register)
  const modeLoginBtn = document.getElementById('auth-mode-login');
  const modeRegisterBtn = document.getElementById('auth-mode-register');

  if (modeLoginBtn && modeRegisterBtn) {
    modeLoginBtn.addEventListener('click', () => setAuthMode('login'));
    modeRegisterBtn.addEventListener('click', () => setAuthMode('register'));
  }

  // Role Switcher Tabs (Buyer, Seller, Admin)
  const authTabs = document.querySelectorAll('.auth-tab-btn');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const role = tab.dataset.role;
      setAuthRole(role);
    });
  });

  // Demo Sample Fill Link
  const demoFillLink = document.getElementById('auth-demo-fill');
  if (demoFillLink) {
    demoFillLink.addEventListener('click', (e) => {
      e.preventDefault();
      fillDemoCredentials(currentAuthRole);
    });
  }

  // Login Form Submission
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', handleLoginSubmit);
  }

  // Registration Form Submission
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', handleRegisterSubmit);
  }

  // Initial DB status check
  checkDbHealth();
}

function openAuthModalForRole(role, mode = 'login') {
  setAuthRole(role);
  setAuthMode(mode);
  toggleModal('auth-modal', true);
}

function setAuthMode(mode) {
  currentAuthMode = mode;
  const loginBtn = document.getElementById('auth-mode-login');
  const regBtn = document.getElementById('auth-mode-register');
  const loginForm = document.getElementById('auth-form');
  const regForm = document.getElementById('register-form');
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');
  const alertBox = document.getElementById('auth-alert');

  if (alertBox) alertBox.style.display = 'none';

  if (mode === 'login') {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    loginForm.style.display = 'flex';
    regForm.style.display = 'none';
    if (title) title.textContent = `Access ASPEN (${currentAuthRole.toUpperCase()})`;
    if (subtitle) subtitle.textContent = `Sign in using your registered credentials in PostgreSQL database.`;
  } else {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    loginForm.style.display = 'none';
    regForm.style.display = 'flex';
    if (title) title.textContent = `Register ${currentAuthRole.toUpperCase()} Account`;
    if (subtitle) subtitle.textContent = `Register your details to create an account in PostgreSQL (ASPEN Log).`;
  }
}

function setAuthRole(role) {
  currentAuthRole = role;
  
  // Update role buttons active state
  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    if (btn.dataset.role === role) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update submit button text using current translation
  const loginSubmitBtn = document.getElementById('auth-submit-btn');
  const regSubmitBtn = document.getElementById('reg-submit-btn');
  const regOrgLabel = document.getElementById('reg-org-label');

  const loginKey = `login_btn_${role}`;
  const regKey = `reg_btn_${role}`;
  if (loginSubmitBtn) loginSubmitBtn.textContent = t(loginKey) || `Login as ${role.toUpperCase()}`;
  if (regSubmitBtn) regSubmitBtn.textContent = t(regKey) || `Register ${role.toUpperCase()} Account in PostgreSQL`;

  if (regOrgLabel) {
    if (role === 'seller') regOrgLabel.textContent = t('company_name') + ' *';
    else if (role === 'admin') regOrgLabel.textContent = t('dept_agency') + ' *';
    else regOrgLabel.textContent = t('org_name') + ' *';
  }

  // Show/Hide Role Specific Fields
  const buyerFields = document.getElementById('role-fields-buyer');
  const sellerFields = document.getElementById('role-fields-seller');
  const adminFields = document.getElementById('role-fields-admin');

  if (buyerFields) buyerFields.style.display = role === 'buyer' ? 'block' : 'none';
  if (sellerFields) sellerFields.style.display = role === 'seller' ? 'block' : 'none';
  if (adminFields) adminFields.style.display = role === 'admin' ? 'block' : 'none';

  // Set Demo defaults for login
  fillDemoCredentials(role);

  // Update title
  const title = document.getElementById('auth-modal-title');
  if (title) {
    title.textContent = currentAuthMode === 'register' ?
      `${t('register_tab')} ${role.toUpperCase()}` :
      `${t('access_portal')} (${role.toUpperCase()})`;
  }
}

function fillDemoCredentials(role) {
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  if (!emailInput || !passInput) return;

  if (role === 'buyer') {
    emailInput.value = 'buyer@aspen.gov';
    passInput.value = 'buyer123';
  } else if (role === 'seller') {
    emailInput.value = 'seller@aspen.gov';
    passInput.value = 'seller123';
  } else if (role === 'admin') {
    emailInput.value = 'admin@aspen.gov';
    passInput.value = 'admin123';
  }
}

async function checkDbHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    const data = await res.json();
    if (data.status === 'ok') {
      const banner = document.getElementById('db-status-banner');
      if (banner) {
        banner.style.backgroundColor = '#f0fdf4';
        banner.style.borderColor = '#bbf7d0';
        banner.style.color = '#166534';
        banner.innerHTML = `<span class="db-dot"></span><span>Connected to PostgreSQL: <strong>${data.database}</strong></span>`;
      }
    }
  } catch (err) {
    const banner = document.getElementById('db-status-banner');
    if (banner) {
      banner.style.backgroundColor = '#fef2f2';
      banner.style.borderColor = '#fecaca';
      banner.style.color = '#991b1b';
      banner.innerHTML = `<span style="width:8px; height:8px; background:#ef4444; border-radius:50%; display:inline-block;"></span><span>Express Server Disconnected (Ensure server is running on port 5001)</span>`;
    }
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  showAuthAlert('Authenticating credentials with PostgreSQL database...', 'info');

  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: currentAuthRole })
    });

    const data = await res.json();

    if (!res.ok) {
      showAuthAlert(data.error || 'Authentication failed.', 'error');
      return;
    }

    showAuthAlert(`Success! Authenticated as ${data.user.role.toUpperCase()}`, 'success');

    // Update currentUser state with authentic DB user
    currentUser = {
      role: data.user.role,
      name: data.user.fullName,
      email: data.user.email,
      org: data.user.organization || 'ASPEN Log Verified',
      initials: getInitials(data.user.fullName),
      subtext: `${data.user.role.toUpperCase()} • ${data.user.organization || 'Verified'}`,
      phone: data.user.phone,
      roleDetails: data.user.roleDetails,
      savedStandards: MOCK_USERS[data.user.role]?.savedStandards || [],
      rfqs: MOCK_USERS[data.user.role]?.rfqs || [],
      products: MOCK_USERS[data.user.role]?.products || []
    };

    setTimeout(() => {
      toggleModal('auth-modal', false);
      switchRole(data.user.role);
      showToast(`Welcome ${data.user.fullName}! Authenticated via PostgreSQL (ASPEN Log).`, 'success');
    }, 600);

  } catch (err) {
    showAuthAlert(`Connection Error: Could not reach backend server at ${API_BASE_URL} (${err.message})`, 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  showAuthAlert('Saving details to PostgreSQL database "ASPEN Log"...', 'info');

  const fullName = document.getElementById('reg-fullname').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;
  const organization = document.getElementById('reg-org').value;

  let roleDetails = {};
  if (currentAuthRole === 'buyer') {
    roleDetails = {
      dept: document.getElementById('reg-buyer-dept').value,
      authority: document.getElementById('reg-buyer-authority').value
    };
  } else if (currentAuthRole === 'seller') {
    roleDetails = {
      gstin: document.getElementById('reg-seller-gstin').value,
      category: document.getElementById('reg-seller-category').value
    };
  } else if (currentAuthRole === 'admin') {
    roleDetails = {
      empId: document.getElementById('reg-admin-empid').value,
      passcode: document.getElementById('reg-admin-passcode').value
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        password,
        role: currentAuthRole,
        organization,
        phone,
        roleDetails
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showAuthAlert(data.error || 'Registration failed.', 'error');
      return;
    }

    showAuthAlert(`Account successfully registered in PostgreSQL "ASPEN Log" database! Switching to Login...`, 'success');

    // Pre-fill login inputs with new credentials
    document.getElementById('auth-email').value = email;
    document.getElementById('auth-password').value = password;

    setTimeout(() => {
      setAuthMode('login');
      showAuthAlert(`Account ready! Click "Login as ${currentAuthRole.toUpperCase()}" to sign in.`, 'success');
    }, 1500);

  } catch (err) {
    showAuthAlert(`Connection Error: Could not reach Express server (${err.message})`, 'error');
  }
}

function showAuthAlert(msg, type = 'error') {
  const alertBox = document.getElementById('auth-alert');
  if (!alertBox) return;
  alertBox.style.display = 'block';
  alertBox.className = `auth-alert ${type}`;
  alertBox.textContent = msg;
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ==========================================================================
// 5. ROUTING & RENDER ENGINE
// ==========================================================================

let navigationHistory = [];
let activeCategoryFilter = null;

function navigateTo(pageId, pushToHistory = true) {
  // Guest View restriction: Public role is kept on Home screen overview
  if (currentUser.role === 'public' && pageId !== 'home') {
    showToast('Guest Overview Mode: Please sign in as a Buyer, Seller, or Administrator to access platform features.', 'info');
    toggleModal('auth-modal', true);
    pageId = 'home';
  }

  if (pushToHistory && activePage && activePage !== pageId) {
    navigationHistory.push(activePage);
  }
  activePage = pageId;
  document.body.classList.remove('sidebar-open'); // Close mobile menu if open
  
  // Sync sidebar active highlight
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.page === pageId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  renderPageContent(pageId);
  updateBackButton();
  window.scrollTo(0, 0);
}

function navigateBack() {
  if (navigationHistory.length > 0) {
    const prevPage = navigationHistory.pop();
    navigateTo(prevPage, false);
  } else {
    const homePage = currentUser.role === 'admin' ? 'admin-dashboard' : 'home';
    navigateTo(homePage, false);
  }
}

function updateBackButton() {
  const backBtn = document.getElementById('global-back-btn');
  if (!backBtn) return;
  
  // Show back button on any page that is NOT the home/root page
  const homePages = ['home', 'admin-dashboard'];
  if (!homePages.includes(activePage)) {
    backBtn.style.display = 'inline-flex';
  } else {
    backBtn.style.display = 'none';
  }
}

window.navigateBackGlobal = navigateBack;

const NAV_ICONS = {
  home: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"/><path d="M9 21V12h6v9"/></svg>`,
  categories: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h13a1 1 0 0 1 1 1v3H7z"/><path d="M5 7h15a1 1 0 0 1 1 1v3H5z"/><path d="M3 11h18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/><rect x="9" y="14" width="6" height="3" rx="0.5"/></svg>`,
  bis: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5"/><polyline points="8.5 12 11 14.5 15.5 9.5"/><rect x="10.5" y="1" width="3" height="3" rx="0.5"/><circle cx="21" cy="12" r="1.5"/><rect x="10.5" y="20" width="3" height="3" rx="0.5"/><circle cx="3" cy="12" r="1.5"/></svg>`,
  active: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="15" height="18" rx="2"/><line x1="2" y1="6" x2="6" y2="6"/><line x1="2" y1="10" x2="6" y2="10"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="2" y1="18" x2="6" y2="18"/><circle cx="12" cy="9.5" r="2.5"/><path d="M9.2 15c0-1.5 1.2-2.5 2.8-2.5s2.8 1 2.8 2.5"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
  products: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  settings: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  register: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`
};

function renderSidebarNav() {
  const navContainer = document.getElementById('sidebar-nav');
  if (!navContainer) return;
  navContainer.innerHTML = '';
  
  let menuItems = [];
  
  if (currentUser.role === 'public') {
    menuItems = [
      { id: 'home', label: t('home'), icon: NAV_ICONS.home },
      { id: 'categories', label: t('category'), icon: NAV_ICONS.categories },
      { id: 'bis', label: t('bis_standards'), icon: NAV_ICONS.bis },
      { id: 'register', label: t('register_tab'), icon: NAV_ICONS.register }
    ];
  } else if (currentUser.role === 'buyer') {
    menuItems = [
      { id: 'home', label: t('home'), icon: NAV_ICONS.home },
      { id: 'categories', label: t('category'), icon: NAV_ICONS.categories },
      { id: 'bis', label: t('bis_standards'), icon: NAV_ICONS.bis },
      { id: 'active', label: t('active_tenders'), icon: NAV_ICONS.active },
      { id: 'register', label: t('register_tab'), icon: NAV_ICONS.register },
      { id: 'settings', label: t('settings'), icon: NAV_ICONS.settings }
    ];
  } else if (currentUser.role === 'seller') {
    menuItems = [
      { id: 'home', label: t('home'), icon: NAV_ICONS.home },
      { id: 'categories', label: t('category'), icon: NAV_ICONS.categories },
      { id: 'bis', label: t('bis_standards'), icon: NAV_ICONS.bis },
      { id: 'my-products', label: t('my_products'), icon: NAV_ICONS.products },
      { id: 'register', label: t('register_tab'), icon: NAV_ICONS.register },
      { id: 'settings', label: t('settings'), icon: NAV_ICONS.settings }
    ];
  } else if (currentUser.role === 'admin') {
    menuItems = [
      { id: 'admin-dashboard', label: t('home'), icon: NAV_ICONS.home },
      { id: 'categories', label: t('category'), icon: NAV_ICONS.categories },
      { id: 'bis', label: t('bis_standards'), icon: NAV_ICONS.bis },
      { id: 'admin-users', label: t('audit_logs'), icon: NAV_ICONS.active },
      { id: 'settings', label: t('settings'), icon: NAV_ICONS.settings }
    ];
  }
  
  menuItems.forEach(item => {
    const navLink = document.createElement('a');
    navLink.className = `nav-item ${activePage === item.id ? 'active' : ''}`;
    navLink.dataset.page = item.id;
    navLink.title = item.label;
    navLink.innerHTML = `${item.icon || ''}<span>${item.label}</span>`;
    navLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.id);
    });
    navContainer.appendChild(navLink);
  });
}

function renderPageContent(pageId) {
  const content = document.getElementById('app-content-body');
  content.innerHTML = '';
  
  switch(pageId) {
    case 'home':
      renderHomePage(content);
      break;
    case 'categories':
      renderCategoriesPage(content);
      break;
    case 'bis':
      renderBISPage(content);
      break;
    case 'active':
      if (currentUser.role === 'buyer') {
        renderBuyerActiveRFQs(content);
      } else if (currentUser.role === 'seller') {
        renderSellerOpportunities(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'my-products':
      if (currentUser.role === 'seller') {
        renderSellerProducts(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'saved':
      if (currentUser.role === 'buyer') {
        renderBuyerSavedSearches(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'admin-dashboard':
      if (currentUser.role === 'admin') {
        renderAdminDashboard(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'admin-users':
      if (currentUser.role === 'admin') {
        renderAdminUsers(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'admin-analytics':
      if (currentUser.role === 'admin') {
        renderAdminAnalytics(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'admin-audit':
      if (currentUser.role === 'admin') {
        renderAdminAudit(content);
      } else {
        navigateTo('home');
      }
      break;
    case 'register':
      renderRegisterPage(content);
      break;
    case 'settings':
      renderSettingsPage(content);
      break;
    default:
      renderHomePage(content);
  }
}

// ==========================================================================
// 6. MAIN HOMEPAGE VIEW RENDERING
// ==========================================================================

function renderHomePage(container) {
  const role = currentUser.role;
  container.innerHTML = '';

  const homeWrapper = document.createElement('div');
  homeWrapper.className = 'home-container';

  if (role === 'public' || role === 'admin') {
    homeWrapper.innerHTML = `
      <h1 class="home-title">${t('what_procure')}</h1>
      
      <div class="pill-search-bar-wrapper">
        <svg class="search-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="main-search-input" class="pill-search-input" placeholder="${t('natural_lang_placeholder')}" value="${currentSearchQuery}">
      </div>
      
      <button id="search-action-btn-trigger" class="navy-analyze-btn">${t('analyze_btn')}</button>
      
      <div class="popular-categories-section">
        <h3 class="popular-categories-title">${t('popular_categories')}</h3>
        <div class="popular-categories-grid">
          <div class="popular-cat-card" data-cat="Medical">${t('cat_medical')}</div>
          <div class="popular-cat-card" data-cat="Electrical">${t('cat_electrical')}</div>
          <div class="popular-cat-card" data-cat="Mechanical">${t('cat_mechanical')}</div>
          <div class="popular-cat-card" data-cat="Laboratory">${t('cat_lab')}</div>
        </div>
      </div>
      
      <div class="ai-tip-banner" id="home-ai-tip-banner" style="cursor:pointer;">
        ${t('ai_tip')}
      </div>
    `;
  } 
  else if (role === 'buyer') {
    homeWrapper.innerHTML = `
      <h1 class="home-title">${t('describe_need')}</h1>
      
      <div class="pill-search-bar-wrapper">
        <svg class="search-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="main-search-input" class="pill-search-input" placeholder="${t('buyer_placeholder')}" value="${currentSearchQuery}">
      </div>
      
      <button id="search-action-btn-trigger" class="navy-analyze-btn">${t('analyze_btn')}</button>
      
      <div class="buyer-pill-row">
        <div class="buyer-pill-card standards" id="buyer-standards-widget">${t('standards_widget')}</div>
        <div class="buyer-pill-card specification" id="buyer-spec-widget">${t('specification_widget')}</div>
        <div class="buyer-pill-card manufacturers" id="buyer-mfrs-widget">${t('manufacturers_widget')}</div>
      </div>
    `;
  } 
  else if (role === 'seller') {
    homeWrapper.innerHTML = `
      <h1 class="home-title">${t('what_procure')}</h1>
      
      <div class="pill-search-bar-wrapper">
        <svg class="search-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="main-search-input" class="pill-search-input" placeholder="${t('search_placeholder')}" value="${currentSearchQuery}">
      </div>
      
      <button id="search-action-btn-trigger" class="navy-analyze-btn">${t('analyze_btn')}</button>

      <div class="seller-opp-section" style="margin-top:1.5rem;">
        <h2 class="seller-opp-title">${t('new_opp_title')}</h2>
        
        <div class="opp-rows-container">
          <div class="opp-row-item" data-query="We need cotton bandage cloth for government hospitals">
            <span class="opp-row-title">${t('opp_cotton')}</span>
            <span class="opp-row-meta">${t('opp_cotton_meta')}</span>
          </div>
          <div class="opp-row-item" data-query="Find BIS standards for laboratory glass tubes">
            <span class="opp-row-title">${t('opp_glass')}</span>
            <span class="opp-row-meta">${t('opp_glass_meta')}</span>
          </div>
        </div>
        
        <div class="seller-pill-row">
          <div class="seller-pill-card active-rfqs" id="seller-rfq-widget">${t('active_rfqs_widget')}</div>
          <div class="seller-pill-card bis-status" id="seller-bis-widget">${t('bis_status_widget')}</div>
          <div class="seller-pill-card capacity" id="seller-cap-widget">${t('capacity_widget')}</div>
        </div>
      </div>
    `;
  }

  container.appendChild(homeWrapper);

  // Bind homepage events
  const searchBtn = container.querySelector('#search-action-btn-trigger');
  const searchInput = container.querySelector('#main-search-input');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      handleSearch(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSearch(searchInput.value);
      }
    });
  }

  // Bind popular category clicks
  container.querySelectorAll('.popular-cat-card').forEach(card => {
    card.addEventListener('click', () => {
      activeCategoryFilter = card.dataset.cat;
      navigateTo('categories');
    });
  });

  // Bind AI Tip banner click
  const tipBanner = container.querySelector('#home-ai-tip-banner');
  if (tipBanner) {
    tipBanner.addEventListener('click', () => {
      const query = "We need 5,000 water pumps for municipal use.";
      if (searchInput) {
        searchInput.value = query;
      }
      handleSearch(query);
    });
  }

  // Bind Buyer widgets navigation
  if (role === 'buyer') {
    container.querySelector('#buyer-standards-widget').addEventListener('click', () => navigateTo('bis'));
    container.querySelector('#buyer-spec-widget').addEventListener('click', () => {
      activeCategoryFilter = 'All';
      navigateTo('categories');
    });
    container.querySelector('#buyer-mfrs-widget').addEventListener('click', () => {
      activeCategoryFilter = 'All';
      navigateTo('categories');
    });
  }

  // Bind Seller widgets navigation
  if (role === 'seller') {
    container.querySelector('#seller-rfq-widget').addEventListener('click', () => navigateTo('active'));
    container.querySelector('#seller-bis-widget').addEventListener('click', () => navigateTo('bis'));
    container.querySelector('#seller-cap-widget').addEventListener('click', () => navigateTo('my-products'));
    
    // Clicking on opportunities lists
    container.querySelectorAll('.opp-row-item').forEach(row => {
      row.addEventListener('click', () => {
        const query = row.dataset.query;
        handleSearch(query);
      });
    });
  }
}

// --------------------------------------------------------------------------
// HOMEPAGE WIDGETS
// --------------------------------------------------------------------------

function renderPublicHomeWidgets(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <h3>${t('bis_highlight')}</h3>
      <button class="text-btn" id="home-view-all-bis">${t('browse_registry')}</button>
    </div>
    <div class="bis-highlights-grid" id="home-bis-list">
      <div class="card bis-highlight-card" style="opacity:0.5; pointer-events:none;">
        <div class="bis-card-code">Loading...</div>
        <div class="bis-card-center"><div class="bis-card-title">Fetching live BIS standards...</div></div>
      </div>
    </div>
  `;

  container.querySelector('#home-view-all-bis').addEventListener('click', () => navigateTo('bis'));
  const bisList = container.querySelector('#home-bis-list');

  apiBISSearch('electrical wiring construction safety').then(data => {
    let results = data.results || [];
    // Sort by confidence_score descending (highest first)
    results.sort((a, b) => (b.match_metadata?.confidence_score || 0) - (a.match_metadata?.confidence_score || 0));
    results = results.slice(0, 3);
    bisList.innerHTML = '';
    if (results.length === 0) {
      bisList.innerHTML = `<div class="card bis-highlight-card"><div class="bis-card-title">No data available.</div></div>`;
      return;
    }
    results.forEach(r => {
      const score = r.match_metadata?.confidence_score || 0;
      const item = document.createElement('div');
      item.className = 'card bis-highlight-card';
      item.style.cursor = 'pointer';
      item.innerHTML = `
        <div class="bis-card-code">${r.is_code}</div>
        <div class="bis-card-center">
          <div class="bis-card-title">${r.title}</div>
          <div class="bis-card-sub" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="meta-tag">${r.category}</span>
            <span class="badge ${score >= 80 ? 'badge-success' : 'badge-info'} btn-sm" style="padding:0.1rem 0.4rem;">${score.toFixed(1)}% AI Match</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      `;
      item.addEventListener('click', () => showBISModalFromApiResult(r));
      bisList.appendChild(item);
    });
  }).catch(err => {
    bisList.innerHTML = `<div class="card bis-highlight-card"><div class="bis-card-title" style="color:var(--red-text);">FastAPI unavailable: ${err.message}</div></div>`;
  });
}

function renderBuyerHomeWidgets(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <h3>${t('my_requirements')}</h3>
      <button class="text-btn" id="home-view-all-rfqs">${t('track_rfqs')}</button>
    </div>
    <div class="activities-list">
      ${currentUser.rfqs.map(rfq => `
        <div class="card activity-item">
          <div class="activity-left">
            <span class="activity-indicator-dot ${rfq.status === 'Active' ? 'success' : 'warning'}"></span>
            <div class="activity-text-info">
              <span class="activity-title">${rfq.product}</span>
              <span class="activity-sub">${rfq.qty} • ${t('bids_received')}: ${rfq.bids}</span>
            </div>
          </div>
          <span class="badge ${rfq.status === 'Active' ? 'badge-success' : 'badge-warning'}">${rfq.status}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelector('#home-view-all-rfqs').addEventListener('click', () => {
    navigateTo('active');
  });
}

function renderSellerHomeWidgets(container) {
  // Compliance & Capacity Card widget
  container.innerHTML = `
    <div class="section-header-row">
      <h3>${t('cert_status')}</h3>
      <button class="text-btn" id="home-view-all-products">${t('products_btn')}</button>
    </div>
    <div class="activities-list">
      ${currentUser.products.map(prod => `
        <div class="card activity-item">
          <div class="activity-left">
            <span class="activity-indicator-dot ${prod.status === 'Certified' ? 'success' : 'warning'}"></span>
            <div class="activity-text-info">
              <span class="activity-title">${prod.name}</span>
              <span class="activity-sub">${prod.standard} • License: ${prod.code}</span>
            </div>
          </div>
          <span class="badge ${prod.status === 'Certified' ? 'badge-success' : 'badge-warning'}">${prod.status}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelector('#home-view-all-products').addEventListener('click', () => {
    navigateTo('my-products');
  });
}

// ==========================================================================
// 7. INTELLIGENT NLU PARSER AND CENTRAL SEARCH HANDLER
// ==========================================================================

async function handleSearch(query) {
  if (!query.trim()) {
    showToast('Please enter a procurement description to analyze.', 'warning');
    return;
  }

  currentSearchQuery = query;

  // Show "AI Active" indicator
  const indicator = document.getElementById('search-indicator');
  indicator.style.display = 'flex';

  try {
    // Call the real FastAPI AI search
    const data = await apiBISSearch(query);

    // Normalize API response into parsedSearchResult shape
    let results = data.results || [];
    // Sort results by confidence_score descending so highest match appears first
    results.sort((a, b) => (b.match_metadata?.confidence_score || 0) - (a.match_metadata?.confidence_score || 0));

    const topResult = results[0] || null;

    // Extract quantity from query (kept from before)
    const qtyMatch = query.match(/(\d{1,3}(,\d{3})*(\.\d+)?)\s*(meters|units|rolls|m|pumps|tubes|pieces|qty|quantity)?/i);
    const quantity = qtyMatch ? qtyMatch[0] : 'Not Specified';

    parsedSearchResult = {
      query,
      product: topResult ? topResult.title : query,
      industry: topResult ? topResult.category : 'General Industrial',
      quantity,
      application: topResult ? `${topResult.category} — AI Confidence: ${topResult.match_metadata?.confidence_score?.toFixed(1) || 'N/A'}%` : 'General Institutional Supply',
      // Map top result into the matchedStandard shape the NLU modal expects
      matchedStandard: topResult ? {
        code: topResult.is_code,
        title: topResult.title,
        industry: topResult.category,
        committee: `Confidence Score: ${topResult.match_metadata?.confidence_score?.toFixed(1) || 'N/A'}%`,
        description: buildSpecsDescription(topResult.specifications),
        date: topResult.match_metadata?.status || 'Active',
        relevance: `AI-matched with ${topResult.match_metadata?.confidence_score?.toFixed(1) || 'N/A'}% confidence`,
        manufacturers: [],
        apiResults: results, // store all results for the expanded view
      } : null,
    };

    indicator.style.display = 'none';
    showNLUModal();

    // Show all results in the NLU modal standards container
    if (results.length > 1) {
      populateAllSearchResults(results);
    }

  } catch (err) {
    indicator.style.display = 'none';
    console.error('FastAPI search error:', err);
    showToast(`Search error: ${err.message}. Check if FastAPI server is running.`, 'error');
  }
}

// Build a readable description from the specifications object
function buildSpecsDescription(specs) {
  if (!specs || typeof specs !== 'object') return 'No specifications available.';
  return Object.entries(specs)
    .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${Array.isArray(val) ? val.join(', ') : val}`)
    .join(' • ');
}

// Populate the standards container with all search results (not just top)
function populateAllSearchResults(results) {
  const container = document.getElementById('nlu-standards-container');
  if (!container) return;
  container.innerHTML = '';
  results.forEach((r, i) => {
    const score = r.match_metadata?.confidence_score || 85.0;
    const row = document.createElement('div');
    row.className = 'nlu-standard-row';
    row.style.cssText = 'margin-top:8px; cursor:pointer; transition:all 0.2s ease; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-line); border-radius:var(--radius-sm); padding:10px 14px; background:#fff; gap:10px; box-sizing:border-box; width:100%;';
    row.innerHTML = `
      <div class="nlu-standard-left" style="flex:1; min-width:0; overflow:hidden;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="bis-card-code">${r.is_code}</span>
          <span class="badge ${score >= 80 ? 'badge-success' : 'badge-info'} btn-sm" style="padding:0.1rem 0.5rem;">${score.toFixed(1)}% match</span>
          <span class="badge badge-success btn-sm" style="padding:0.1rem 0.5rem;">${r.match_metadata?.status || 'Active'}</span>
        </div>
        <div style="margin-top:4px;">
          <div class="bis-card-title" style="font-weight:700; font-size:0.92rem; color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${r.title}</div>
          <div class="bis-card-sub" style="display:flex; align-items:center; gap:8px; margin-top:2px; overflow:hidden;">
            <span class="meta-tag" style="font-size:0.75rem; flex-shrink:0;">${r.category}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${buildSpecsDescription(r.specifications)}</span>
          </div>
        </div>
      </div>
      <div class="nlu-standard-actions" style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
        <button class="secondary-btn btn-sm nlu-recommend-view-btn" style="font-size:0.75rem; padding:5px 10px; white-space:nowrap;">View Details</button>
        <button class="primary-btn btn-sm nlu-recommend-draft-btn" style="font-size:0.75rem; padding:5px 10px; white-space:nowrap; background:linear-gradient(135deg, #2563eb, #1d4ed8);">Draft RFQ</button>
      </div>
    `;

    // Row click opens the detailed pop-up container card
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal('nlu-modal', false);
      showBISModalFromApiResult(r);
    });

    // "Draft RFQ" button directly drafts this specific recommendation
    row.querySelector('.nlu-recommend-draft-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal('nlu-modal', false);
      if (currentUser.role === 'public') {
        showToast('Please sign in as a Buyer to draft official RFQs.', 'info');
        toggleModal('auth-modal', true);
      } else {
        draftSpecificRecommendation(r);
      }
    });

    container.appendChild(row);
  });
}

const SYSTEM_RFQ_BIDS = JSON.parse(localStorage.getItem('aspen_system_rfq_bids') || '{}');

// Pre-populate mock bids for sample RFQs if not already set
if (!SYSTEM_RFQ_BIDS['RFQ-2026-004']) {
  SYSTEM_RFQ_BIDS['RFQ-2026-004'] = [
    { id: 'BID-901', sellerEmail: 'sales@bharatmedical.in', sellerOrg: 'Bharat Medical Supplies Ltd.', quotePrice: '₹145 / m', date: '2026-08-29', status: '✓ BIS Certified Compliant' },
    { id: 'BID-902', sellerEmail: 'info@nationalsurgicals.com', sellerOrg: 'National Surgicals India', quotePrice: '₹142 / m', date: '2026-08-29', status: '✓ BIS Certified Compliant' },
    { id: 'BID-903', sellerEmail: 'bids@apexmedtech.com', sellerOrg: 'Apex MedTech Solutions', quotePrice: '₹148 / m', date: '2026-08-30', status: '✓ BIS Certified Compliant' }
  ];
}
if (!SYSTEM_RFQ_BIDS['RFQ-2026-002']) {
  SYSTEM_RFQ_BIDS['RFQ-2026-002'] = [
    { id: 'BID-801', sellerEmail: 'sales@borosil.com', sellerOrg: 'Borosil Scientific Ltd.', quotePrice: '₹85 / unit', date: '2026-08-16', status: '✓ BIS Certified Compliant' }
  ];
}

function draftSpecificRecommendation(r, customQty) {
  const confidenceScore = r.match_metadata?.confidence_score || r.bisSuitabilityScore || 85.0;
  const bisSatisfied = confidenceScore >= 80.0;
  const qty = customQty || (document.getElementById('bis-modal-qty-input')?.value) || '10,000 units';

  const newRfq = {
    id: `RFQ-2026-00${(currentUser.rfqs ? currentUser.rfqs.length : 0) + 5}`,
    product: r.title || 'Selected BIS Compliant Product',
    qty: qty,
    date: new Date().toISOString().split('T')[0],
    status: bisSatisfied ? 'Active' : 'Awaiting Admin Override',
    bids: 0,
    standard: r.is_code || r.code || 'IS 12345',
    buyer: currentUser.email || 'buyer@aspen.gov',
    org: currentUser.org || 'Verified Buyer',
    bisSuitabilityScore: confidenceScore,
    bisSatisfied: bisSatisfied,
    biddingAllowed: bisSatisfied,
    adminOverride: false,
    bisSuitabilityStatus: bisSatisfied ? '✓ Satisfies BIS Standards' : '⚠️ Below Threshold (Requires Admin Exemption)',
    bisSpecs: buildSpecsDescription(r.specifications) || 'Standard technical tolerances and lab testing rules apply.',
    bisSuitabilityDetails: `${confidenceScore.toFixed(1)}% suitability match calculated by AI engine against Bureau of Indian Standards testing guidelines.`
  };

  if (!currentUser.rfqs) currentUser.rfqs = [];
  currentUser.rfqs.unshift(newRfq);

  if (MOCK_USERS.buyer) {
    if (!MOCK_USERS.buyer.rfqs) MOCK_USERS.buyer.rfqs = [];
    if (!MOCK_USERS.buyer.rfqs.some(req => req.id === newRfq.id)) {
      MOCK_USERS.buyer.rfqs.unshift(newRfq);
    }
  }

  addNotification(bisSatisfied ? 'info' : 'warning', `Tender Drafted: RFQ for ${newRfq.product} (${newRfq.id}) published against ${newRfq.standard}. ${bisSatisfied ? 'Satisfies BIS Standards.' : 'Requires Admin Override Exemption.'}`);
  addAuditLog(currentUser.email || 'buyer@aspen.gov', `Published official tender RFQ ${newRfq.id} (${confidenceScore.toFixed(1)}% BIS score against ${newRfq.standard}).`);

  if (!bisSatisfied) {
    showToast(`Drafted RFQ ${newRfq.id}! Warning: Score ${confidenceScore.toFixed(1)}% is below 80% threshold. Sent to Administrator for Access Exemption.`, 'info');
  } else {
    showToast(`Drafted official RFQ ${newRfq.id} for "${newRfq.product}" (${qty})!`, 'success');
  }
  navigateTo('active');
}

function simulateNLUParser(query) {
  const lowercaseQuery = query.toLowerCase();
  
  let quantity = 'Not Specified';
  let product = 'Generic Requisition';
  let industry = 'Unclassified';
  let matchedStandard = null;
  let application = 'General Institutional Supply';
  
  // 1. Attempt Quantity Extraction (RegEx matching numbers)
  const qtyMatch = query.match(/(\d{1,3}(,\d{3})*(\.\d+)?)\s*(meters|units|rolls|units|m|pumps|tubes|pieces|qty|quantity)?/i);
  if (qtyMatch) {
    quantity = qtyMatch[0];
  }

  // 2. Map Keywords to Database categories
  if (lowercaseQuery.includes('bandage') || lowercaseQuery.includes('gauze') || lowercaseQuery.includes('dressing') || lowercaseQuery.includes('cloth')) {
    product = 'Cotton Gauze Dressing Cloth';
    industry = 'Medical / Textiles';
    matchedStandard = MOCK_BIS_STANDARDS.find(s => s.code === 'IS 758');
    if (lowercaseQuery.includes('hospital') || lowercaseQuery.includes('clinical')) {
      application = 'Government Hospital Wound Care Management';
    }
  } 
  else if (lowercaseQuery.includes('pump') || lowercaseQuery.includes('centrifugal') || lowercaseQuery.includes('rotor')) {
    product = 'Horizontal Centrifugal Water Pumps';
    industry = 'Mechanical / Agriculture';
    matchedStandard = MOCK_BIS_STANDARDS.find(s => s.code === 'IS 1520');
    if (lowercaseQuery.includes('irrigation') || lowercaseQuery.includes('farm') || lowercaseQuery.includes('field')) {
      application = 'Agricultural Water Distribution Networks';
    } else {
      application = 'Municipal Water Pipeline Systems';
    }
  } 
  else if (lowercaseQuery.includes('glass') || lowercaseQuery.includes('tube') || lowercaseQuery.includes('laboratory') || lowercaseQuery.includes('beaker')) {
    product = 'Borosilicate Glass Laboratory Tubes';
    industry = 'Laboratory Apparatus';
    matchedStandard = MOCK_BIS_STANDARDS.find(s => s.code === 'IS 4381');
    application = 'Laboratory Testing and Diagnostic Research';
  }
  else if (lowercaseQuery.includes('steel') || lowercaseQuery.includes('rebar') || lowercaseQuery.includes('concrete') || lowercaseQuery.includes('construction')) {
    product = 'High Strength Concrete Steel Reinforcement Rebars';
    industry = 'Construction Metals';
    matchedStandard = MOCK_BIS_STANDARDS.find(s => s.code === 'IS 1786');
    application = 'State Highway and Bridge Foundation Structurals';
  }
  else if (lowercaseQuery.includes('pvc') || lowercaseQuery.includes('pipe') || lowercaseQuery.includes('plumbing')) {
    product = 'Potable uPVC Pipelines';
    industry = 'Construction / Piping';
    matchedStandard = MOCK_BIS_STANDARDS.find(s => s.code === 'IS 4985');
    application = 'Rural Har Ghar Jal Drinking Water Supply Grid';
  }
  else if (lowercaseQuery.includes('kettle') || lowercaseQuery.includes('appliance') || lowercaseQuery.includes('household')) {
    product = 'Institutional Safety Electric Kettles';
    industry = 'Electrical Appliances';
    matchedStandard = MOCK_BIS_STANDARDS.find(s => s.code === 'IS 302');
    application = 'Hostel & Rest House Utility Procurements';
  }
  else {
    // Graceful fallback suggestions
    product = query.length > 30 ? query.substring(0, 30) + '...' : query;
    industry = 'Industrial Infrastructure';
    matchedStandard = MOCK_BIS_STANDARDS[0]; // default suggestion
    application = 'General Institutional Deployment';
  }

  return { query, product, industry, quantity, application, matchedStandard };
}

function showNLUModal() {
  if (!parsedSearchResult) return;
  
  document.getElementById('nlu-val-product').textContent = parsedSearchResult.product;
  document.getElementById('nlu-val-industry').textContent = parsedSearchResult.industry;
  document.getElementById('nlu-val-quantity').textContent = parsedSearchResult.quantity;
  document.getElementById('nlu-val-application').textContent = parsedSearchResult.application;

  const standardsContainer = document.getElementById('nlu-standards-container');
  standardsContainer.innerHTML = '';

  if (parsedSearchResult.matchedStandard) {
    const std = parsedSearchResult.matchedStandard;
    const stdRow = document.createElement('div');
    stdRow.className = 'nlu-standard-row';
    stdRow.innerHTML = `
      <div class="nlu-standard-left">
        <span class="bis-card-code">${std.code}</span>
        <div>
          <div class="bis-card-title">${std.title}</div>
          <div class="bis-card-sub">${std.committee} • Compliance Status: <span class="badge badge-success btn-sm" style="padding: 0.1rem 0.4rem;">Mandatory</span></div>
        </div>
      </div>
      <button class="secondary-btn btn-sm" id="nlu-view-std-btn">View Standard Rules</button>
    `;
    
    stdRow.querySelector('#nlu-view-std-btn').textContent = t('nlu_view_std');
    stdRow.querySelector('#nlu-view-std-btn').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      showBISModal(std.code);
    });
    
    standardsContainer.appendChild(stdRow);
  } else {
    standardsContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">${t('nlu_no_standard')}</p>`;
  }

  // Adjust modal actions based on user role
  const actionsContainer = document.getElementById('nlu-actions-container');
  actionsContainer.innerHTML = '';

  if (currentUser.role === 'public') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-close">${t('nlu_close')}</button>
      <button class="primary-btn" id="nlu-action-login">${t('nlu_sign_in')}</button>
    `;
    actionsContainer.querySelector('#nlu-action-close').addEventListener('click', () => toggleModal('nlu-modal', false));
    actionsContainer.querySelector('#nlu-action-login').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      toggleModal('auth-modal', true);
    });
  } 
  else if (currentUser.role === 'buyer') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-save">${t('nlu_save_req')}</button>
      <button class="primary-btn" id="nlu-action-rfq">${t('nlu_draft_rfq')}</button>
    `;
    actionsContainer.querySelector('#nlu-action-close-save')?.addEventListener('click', () => toggleModal('nlu-modal', false));
    actionsContainer.querySelector('#nlu-action-save').addEventListener('click', () => {
      addSavedSearch(parsedSearchResult.query, parsedSearchResult.product);
      toggleModal('nlu-modal', false);
    });
    actionsContainer.querySelector('#nlu-action-rfq').addEventListener('click', () => {
      createRFQFromParsed();
      toggleModal('nlu-modal', false);
    });
  } 
  else if (currentUser.role === 'seller') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-close">${t('nlu_close')}</button>
      <button class="primary-btn" id="nlu-action-opp">${t('nlu_view_tenders')}</button>
    `;
    actionsContainer.querySelector('#nlu-action-close').addEventListener('click', () => toggleModal('nlu-modal', false));
    actionsContainer.querySelector('#nlu-action-opp').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      navigateTo('active');
    });
  } 
  else if (currentUser.role === 'admin') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-close">${t('nlu_close')}</button>
      <button class="primary-btn" id="nlu-action-edit-std">${t('nlu_edit_std')}</button>
    `;
    actionsContainer.querySelector('#nlu-action-close').addEventListener('click', () => toggleModal('nlu-modal', false));
    actionsContainer.querySelector('#nlu-action-edit-std').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      showBISModal(parsedSearchResult.matchedStandard.code);
    });
  }

  toggleModal('nlu-modal', true);
}

// ==========================================================================
// 8. BUYER WORKFLOWS & ACTIONS
// ==========================================================================

function getAllSystemRFQs() {
  const map = new Map();
  const sampleRfqs = [
    { id: 'RFQ-2026-004', product: 'Cotton Bandage Cloth', qty: '12,500 m', date: '2026-08-29', status: 'Active', bids: 3, standard: 'IS 758', buyer: 'buyer@aspen.gov.in', org: 'National Health Authority', bisSuitabilityScore: 94.2, bisSatisfied: true, biddingAllowed: true, adminOverride: false },
    { id: 'RFQ-2026-002', product: 'Laboratory Glass Tubes', qty: '5,000 units', date: '2026-08-15', status: 'Bidding Closed', bids: 8, standard: 'IS 4381', buyer: 'a.saxena@cpwd.gov.in', org: 'Central Public Works Dept (CPWD)', bisSuitabilityScore: 88.0, bisSatisfied: true, biddingAllowed: true, adminOverride: false },
    { id: 'RFQ-2026-007', product: 'Unknown Medical Apparatus (Non-Standard Specs)', qty: '1,000 units', date: '2026-08-30', status: 'Awaiting Admin Override', bids: 0, standard: 'IS UNKNOWN', buyer: 'buyer@aspen.gov.in', org: 'NHA India', bisSuitabilityScore: 79.8, bisSatisfied: false, biddingAllowed: false, adminOverride: false },
    { id: 'RFQ-2026-009', product: 'Custom High-Pressure Oxygen Valve (Non-Standard Specs)', qty: '2,500 units', date: '2026-08-30', status: 'Awaiting Admin Override', bids: 0, standard: 'IS 1234', buyer: 'buyer@aspen.gov.in', org: 'Custom Medical Hub', bisSuitabilityScore: 68.4, bisSatisfied: false, biddingAllowed: false, adminOverride: false }
  ];
  sampleRfqs.forEach(r => map.set(r.id, r));

  if (MOCK_USERS.buyer && MOCK_USERS.buyer.rfqs) {
    MOCK_USERS.buyer.rfqs.forEach(r => map.set(r.id, {
      ...r,
      buyer: r.buyer || MOCK_USERS.buyer.email,
      org: r.org || MOCK_USERS.buyer.org || 'Ministry of Infrastructure'
    }));
  }

  if (currentUser && currentUser.rfqs) {
    currentUser.rfqs.forEach(r => map.set(r.id, {
      ...r,
      buyer: r.buyer || currentUser.email,
      org: r.org || currentUser.org || 'Verified Buyer'
    }));
  }

  // Merge any global Administrator overrides and submitted bids
  return Array.from(map.values()).map(r => {
    let updated = { ...r };
    if (SYSTEM_RFQ_BIDS[r.id]) {
      updated.bids = SYSTEM_RFQ_BIDS[r.id].length;
      if (updated.bids > 0 && updated.status !== 'Bidding Closed') {
        updated.status = `Active (${updated.bids} Bid${updated.bids > 1 ? 's' : ''} Received)`;
      }
    }
    if (SYSTEM_ADMIN_OVERRIDES[r.id]) {
      updated.adminOverride = true;
      updated.biddingAllowed = true;
      if (!updated.status || !updated.status.includes('Bid')) {
        updated.status = 'Active (Admin Override Granted)';
      }
    }
    return updated;
  });
}

function createRFQFromParsed() {
  const confidenceScore = (parsedSearchResult.matchedStandard && parsedSearchResult.matchedStandard.committee && parsedSearchResult.matchedStandard.committee.includes('Confidence Score:'))
    ? parseFloat(parsedSearchResult.matchedStandard.committee.replace(/[^0-9.]/g, '')) || 86.5
    : 86.5;

  const bisSatisfied = confidenceScore >= 80.0;
  const specsText = buildSpecsDescription(parsedSearchResult.matchedStandard?.specifications || {});

  const newRfq = {
    id: `RFQ-2026-00${(currentUser.rfqs ? currentUser.rfqs.length : 0) + 5}`,
    product: parsedSearchResult.product,
    qty: parsedSearchResult.quantity === 'Not Specified' ? '10,000 units' : parsedSearchResult.quantity,
    date: new Date().toISOString().split('T')[0],
    status: bisSatisfied ? 'Active' : 'Awaiting Admin Override',
    bids: 0,
    standard: parsedSearchResult.matchedStandard ? parsedSearchResult.matchedStandard.code : 'IS 758',
    buyer: currentUser.email || 'buyer@aspen.gov',
    org: currentUser.org || 'Verified Buyer',
    bisSuitabilityScore: confidenceScore,
    bisSatisfied: bisSatisfied,
    biddingAllowed: bisSatisfied,
    adminOverride: false,
    bisSuitabilityStatus: bisSatisfied ? '✓ Satisfies BIS Standards' : '⚠️ Below Threshold (Requires Admin Exemption)',
    bisSpecs: specsText || 'Standard technical tolerances and laboratory test rules apply.',
    bisSuitabilityDetails: `${confidenceScore.toFixed(1)}% suitability score calculated by AI NLU engine against active Bureau of Indian Standards parameters.`
  };

  if (!currentUser.rfqs) currentUser.rfqs = [];
  currentUser.rfqs.unshift(newRfq);

  if (MOCK_USERS.buyer) {
    if (!MOCK_USERS.buyer.rfqs) MOCK_USERS.buyer.rfqs = [];
    if (!MOCK_USERS.buyer.rfqs.some(r => r.id === newRfq.id)) {
      MOCK_USERS.buyer.rfqs.unshift(newRfq);
    }
  }

  // Add notification and audit log
  addNotification(bisSatisfied ? 'info' : 'warning', `Tender Drafted: RFQ for ${newRfq.product} (${newRfq.id}) published with ${newRfq.bisSuitabilityScore.toFixed(1)}% BIS Suitability score.`);
  addAuditLog(currentUser.email, `Published official tender RFQ ${newRfq.id} (${newRfq.bisSuitabilityScore.toFixed(1)}% BIS Suitability match against ${newRfq.standard}).`);

  if (!bisSatisfied) {
    showToast(`Drafted RFQ ${newRfq.id}! Score ${confidenceScore.toFixed(1)}% requires Administrator Access Exemption.`, 'info');
  } else {
    showToast(`Successfully created ${newRfq.id}! BIS Suitability Score: ${newRfq.bisSuitabilityScore.toFixed(1)}%`, 'success');
  }
  navigateTo('active');
}

function addSavedSearch(query, product) {
  if (!currentUser.savedStandards) {
    currentUser.savedStandards = [];
  }
  
  const searchRecord = `Search: "${query}" (Product: ${product})`;
  if (!currentUser.savedStandards.includes(searchRecord)) {
    currentUser.savedStandards.push(searchRecord);
    showToast('Procurement description saved successfully.', 'success');
    addAuditLog(currentUser.email, `Saved search template: "${query}".`);
  } else {
    showToast('Requirement already saved.', 'info');
  }
}

function renderBuyerActiveRFQs(container) {
  const allBuyerRfqs = getAllSystemRFQs();

  container.innerHTML = `
    <div class="page-actions-bar">
      <div class="page-title-area">
        <h1>${t('my_rfqs')}</h1>
        <p>Detailed listing of all requested drafts with Bureau of Indian Standards (BIS) suitability evaluations and submitted seller bids.</p>
      </div>
      <button class="primary-btn" id="buyer-new-rfq-btn">${t('create_req')}</button>
    </div>
    
    <div class="product-table-wrapper">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>${t('rfq_id')}</th>
            <th>${t('requirement_details')}</th>
            <th>${t('required_standard')} & BIS Suitability</th>
            <th>${t('qty_requested')}</th>
            <th>${t('date_published')}</th>
            <th>Bids Received</th>
            <th>BIS Suitability Report</th>
          </tr>
        </thead>
        <tbody>
          ${allBuyerRfqs.map(rfq => {
            const score = rfq.bisSuitabilityScore || 85.0;
            const bidsCount = rfq.bids || (SYSTEM_RFQ_BIDS[rfq.id] ? SYSTEM_RFQ_BIDS[rfq.id].length : 0);
            return `
            <tr>
              <td class="table-cell-title">${rfq.id}</td>
              <td>
                <strong>${rfq.product}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${rfq.bisSpecs ? rfq.bisSpecs.substring(0, 50) + '...' : 'Standard parameters verified'}</div>
              </td>
              <td>
                <span class="bis-card-code" style="cursor:pointer;" onclick="window.showBISModalGlobal('${rfq.standard}')">${rfq.standard}</span>
                <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
                  <span class="badge ${score >= 80 ? 'badge-success' : 'badge-info'} btn-sm">${score.toFixed(1)}% BIS Match</span>
                  <span style="font-size:0.72rem; color:var(--text-muted);">${rfq.bisSuitabilityStatus || 'Compliant'}</span>
                </div>
              </td>
              <td>${rfq.qty || rfq.quantity || '10,000 units'}</td>
              <td>${rfq.date}</td>
              <td>
                <button class="primary-btn btn-sm" style="background:${bidsCount > 0 ? '#10b981' : '#6b7280'}; border:none; padding:5px 12px; font-weight:700;" onclick="window.viewRFQBidsGlobal('${rfq.id}')">
                  ${bidsCount > 0 ? `✓ ${bidsCount} Bid(s) Received` : '0 Bids Received'}
                </button>
              </td>
              <td>
                <button class="secondary-btn btn-sm" onclick="window.showBISSuitabilityReportGlobal('${rfq.id}')">${t('view_bis_report')}</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector('#buyer-new-rfq-btn').addEventListener('click', () => {
    navigateTo('home');
    showToast(t('toast_search_use_bar'), 'info');
  });
}

function renderBuyerSavedSearches(container) {
  const savedItems = currentUser.savedStandards || [];
  container.innerHTML = `
    <div class="page-title-area">
      <h1>Saved Searches & Templates</h1>
      <p>Quick access to complex natural-language specifications you have configured.</p>
    </div>
    
    <div class="dashboard-section" style="max-width: 600px;">
      ${savedItems.length === 0 ? `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          No saved templates yet. Analyze a query on the Homepage and click "Save Requirement".
        </div>
      ` : savedItems.map((item, idx) => `
        <div class="card activity-item">
          <div class="activity-left">
            <span class="activity-indicator-dot success"></span>
            <div class="activity-text-info">
              <span class="activity-title">${item}</span>
              <span class="activity-sub">Configured on standard parameters</span>
            </div>
          </div>
          <button class="secondary-btn btn-sm" onclick="window.runSavedSearchGlobal(${idx})">Load Template</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.runSavedSearchGlobal = (index) => {
  const savedItems = currentUser.savedStandards || [];
  const item = savedItems[index];
  if (!item) return;

  // Extract raw query from format `Search: "[Query]" (Product: ...)`
  const match = item.match(/Search:\s*"([^"]+)"/);
  if (match && match[1]) {
    navigateTo('home');
    setTimeout(() => {
      const searchInput = document.getElementById('main-search-input');
      if (searchInput) {
        searchInput.value = match[1];
        handleSearch(match[1]);
      }
    }, 100);
  }
};

// ==========================================================================
// 9. SELLER WORKFLOWS & ACTIONS
// ==========================================================================

function renderSellerProducts(container) {
  container.innerHTML = `
    <div class="page-actions-bar">
      <div class="page-title-area">
        <h1>${t('my_portfolio')}</h1>
        <p>${t('portfolio_sub')}</p>
      </div>
      <button class="primary-btn" id="seller-add-prod-btn">${t('register_product')}</button>
    </div>

    <div class="product-table-wrapper">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>${t('product_code')}</th>
            <th>${t('product_designation')}</th>
            <th>${t('category')}</th>
            <th>${t('audit_standard')}</th>
            <th>${t('registry_code')}</th>
            <th>${t('compliance_status')}</th>
          </tr>
        </thead>
        <tbody>
          ${currentUser.products.map(prod => `
            <tr>
              <td class="table-cell-title">${prod.id}</td>
              <td>${prod.name}</td>
              <td>${prod.category}</td>
              <td><span class="bis-card-code" style="cursor:pointer;" onclick="window.showBISModalGlobal('${prod.standard}')">${prod.standard}</span></td>
              <td><code>${prod.code}</code></td>
              <td><span class="badge ${prod.status === 'Certified' ? 'badge-success' : 'badge-warning'}">${prod.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Add Product modal form
  container.querySelector('#seller-add-prod-btn').addEventListener('click', () => {
    showAddProductForm();
  });
}

function showAddProductForm() {
  const formModal = document.createElement('div');
  formModal.className = 'modal-overlay active';
  formModal.id = 'product-form-modal';
  formModal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" onclick="document.getElementById('product-form-modal').remove()">&times;</button>
      <div class="modal-header-section">
        <h2>Register Manufacturing Product</h2>
        <p>Enter specifications to submit for testing against National Bureau Standards.</p>
      </div>
      <form class="auth-form" id="seller-new-prod-form">
        <div class="form-group">
          <label>Product Name</label>
          <input type="text" id="new-prod-name" placeholder="e.g. Absorbent Cotton Surgical Dressing" required>
        </div>
        <div class="form-group">
          <label>BIS Standard Code (e.g. IS 1234, IS 12345, IS 758, IS 1786)</label>
          <input type="text" id="new-prod-std" placeholder="e.g. IS 12345" value="IS 12345" required style="padding: 0.75rem 1rem; border:1px solid var(--border-color); border-radius:var(--radius-md);">
        </div>
        <button type="submit" class="primary-btn btn-full">Submit for Certification</button>
      </form>
    </div>
  `;
  document.body.appendChild(formModal);

  formModal.querySelector('#seller-new-prod-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-prod-name').value;
    const std = document.getElementById('new-prod-std').value;
    
    const newProd = {
      id: `PROD-${currentUser.products.length + 800}`,
      name,
      category: std === 'IS 758' ? 'Medical' : std === 'IS 4381' ? 'Laboratory' : std === 'IS 1520' ? 'Mechanical' : 'Electrical',
      standard: std,
      status: 'Pending Review',
      code: 'Audit Slated'
    };

    currentUser.products.push(newProd);
    addAuditLog(currentUser.email, `Submitted manufacturing product "${name}" to registry under standard audit ${std}.`);
    addNotification('info', `Testing Slated: ${name} is queuing for testing under BIS certification.`);
    
    formModal.remove();
    showToast('Product submitted for compliance audit.', 'success');
    navigateTo('my-products');
  });
}

function renderSellerOpportunities(container) {
  // Sellers view all Buyer RFQs from the unified system store (including Admin Overrides)
  const allBuyerRfqs = getAllSystemRFQs();

  container.innerHTML = `
    <div class="page-title-area">
      <h1>${t('active_tenders')}</h1>
      <p>${t('active_tenders_sub')}</p>
    </div>

    <div class="product-table-wrapper">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>${t('rfq_id')}</th>
            <th>${t('required_product')}</th>
            <th>${t('required_standard')}</th>
            <th>${t('qty_slated')}</th>
            <th>${t('bid_close_date')}</th>
            <th>${t('std_qualification')}</th>
            <th>${t('action')}</th>
          </tr>
        </thead>
        <tbody>
          ${allBuyerRfqs.map(rfq => {
            const matchesExact = currentUser.products.some(p => p.standard === rfq.standard && p.status === 'Certified');
            const matchesCat = currentUser.products.some(p => p.category === rfq.industry || p.category === rfq.category);

            // Check if standard is satisfied (confidenceScore >= 80 and not IS UNKNOWN)
            const satisfiesBIS = rfq.bisSatisfied !== false && rfq.standard !== 'IS UNKNOWN';
            const hasAdminOverride = rfq.adminOverride === true || (SYSTEM_ADMIN_OVERRIDES && SYSTEM_ADMIN_OVERRIDES[rfq.id] === true);
            const isCertifiedMfr = matchesExact || matchesCat || (rfq.standard && rfq.standard.startsWith('IS') && rfq.standard !== 'IS UNKNOWN');

            // Bidding is explicitly allowed if Admin granted exemption (hasAdminOverride) OR if RFQ satisfies BIS standards and Seller is certified
            const biddingAllowed = hasAdminOverride || (satisfiesBIS && isCertifiedMfr);

            const hasSubmittedBid = SYSTEM_RFQ_BIDS[rfq.id] && SYSTEM_RFQ_BIDS[rfq.id].some(b => b.sellerEmail === (currentUser.email || 'seller@aspen.gov.in'));

            return `
              <tr>
                <td class="table-cell-title">${rfq.id}</td>
                <td>${rfq.product}</td>
                <td><span class="bis-card-code">${rfq.standard}</span></td>
                <td>${rfq.qty || rfq.quantity || '1,000 units'}</td>
                <td>${rfq.date}</td>
                <td>
                  ${hasAdminOverride 
                    ? `<span class="badge badge-success">✓ Admin Exemption Granted</span>` 
                    : satisfiesBIS 
                      ? `<span class="badge badge-success">${t('qualified_mfr')}</span>`
                      : `<span class="badge badge-warning">⚠️ Non-Standard (Awaiting Admin Exemption)</span>`
                  }
                </td>
                <td style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                  <button class="secondary-btn btn-sm" onclick="window.showBISSuitabilityReportGlobal('${rfq.id}')">View BIS Report</button>
                  ${hasSubmittedBid
                    ? `<span class="badge badge-success" style="font-size:0.8rem; padding:6px 12px; font-weight:700;">✓ Bid Submitted</span>`
                    : `<button class="primary-btn btn-sm" ${!biddingAllowed ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="window.submitSellerBidGlobal('${rfq.id}')">
                        ${biddingAllowed ? t('submit_bid') : 'Blocked: Awaiting Admin Exemption'}
                      </button>`
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.submitSellerBidGlobal = (rfqId) => {
  const allRfqs = getAllSystemRFQs();
  const rfq = allRfqs.find(r => r.id === rfqId);

  const isExemption = rfq && (rfq.adminOverride === true || SYSTEM_ADMIN_OVERRIDES[rfqId] === true);

  const newBid = {
    id: `BID-${Math.floor(100 + Math.random() * 900)}`,
    sellerEmail: currentUser.email || 'seller@aspen.gov.in',
    sellerOrg: currentUser.org || 'Bharat Medical Supplies Ltd.',
    quotePrice: '₹' + (Math.floor(Math.random() * 50) + 120).toLocaleString() + ' / unit',
    date: new Date().toISOString().split('T')[0],
    status: isExemption ? '✓ Admin Exemption Verified' : '✓ BIS Certified Compliant'
  };

  if (!SYSTEM_RFQ_BIDS[rfqId]) {
    SYSTEM_RFQ_BIDS[rfqId] = [];
  }

  // Record bid
  const existingIndex = SYSTEM_RFQ_BIDS[rfqId].findIndex(b => b.sellerEmail === newBid.sellerEmail);
  if (existingIndex >= 0) {
    SYSTEM_RFQ_BIDS[rfqId][existingIndex] = newBid;
  } else {
    SYSTEM_RFQ_BIDS[rfqId].unshift(newBid);
  }

  localStorage.setItem('aspen_system_rfq_bids', JSON.stringify(SYSTEM_RFQ_BIDS));
  const newBidCount = SYSTEM_RFQ_BIDS[rfqId].length;

  // Sync count to all user RFQs
  [currentUser, MOCK_USERS.buyer, MOCK_USERS.seller].forEach(u => {
    if (u && u.rfqs) {
      const match = u.rfqs.find(r => r.id === rfqId);
      if (match) {
        match.bids = newBidCount;
        match.status = `Active (${newBidCount} Bid${newBidCount > 1 ? 's' : ''} Received)`;
      }
    }
  });

  addNotification('info', `New Compliant Bid: ${newBid.sellerOrg} submitted bid ${newBid.id} for tender ${rfqId}. Total Bids: ${newBidCount}.`);
  addAuditLog(currentUser.email || 'seller@aspen.gov.in', `Submitted certified bid ${newBid.id} for tender ${rfqId}. Price: ${newBid.quotePrice}.`);
  showToast(`Compliant bid (${newBid.id}) submitted successfully for ${rfqId}! Total bids received: ${newBidCount}.`, 'success');

  const container = document.getElementById('app-content-body');
  if (activePage === 'active' && container) {
    renderBuyerActiveRFQs(container);
  } else if (activePage === 'seller-opportunities' && container) {
    renderSellerOpportunities(container);
  } else if (activePage === 'admin-dashboard' && container) {
    renderAdminDashboard(container);
  }
};

window.viewRFQBidsGlobal = (rfqId) => {
  const allRfqs = getAllSystemRFQs();
  const rfq = allRfqs.find(r => r.id === rfqId) || { id: rfqId, product: 'Procurement Requirement' };

  const bids = SYSTEM_RFQ_BIDS[rfqId] || [];

  const badgeElem = document.getElementById('buyer-bids-count-badge');
  if (badgeElem) {
    badgeElem.textContent = `${bids.length} Bid(s) Submitted`;
    badgeElem.className = bids.length > 0 ? 'badge badge-success' : 'badge badge-warning';
  }

  const titleElem = document.getElementById('buyer-bids-modal-title');
  if (titleElem) {
    titleElem.textContent = `Submitted Bids for ${rfq.id}: ${rfq.product}`;
  }

  const tbody = document.getElementById('buyer-bids-tbody');
  if (tbody) {
    if (bids.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">
            No seller bids submitted yet for this tender. Qualified manufacturers are reviewing specifications.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = bids.map(bid => `
        <tr>
          <td class="table-cell-title">${bid.id}</td>
          <td>
            <strong>${bid.sellerOrg}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${bid.sellerEmail}</div>
          </td>
          <td>
            <span class="badge badge-success btn-sm">${bid.status}</span>
          </td>
          <td style="font-weight:700; color:var(--primary);">${bid.quotePrice}</td>
          <td>${bid.date}</td>
          <td>
            <button class="primary-btn btn-sm" onclick="window.acceptSellerBidGlobal('${rfq.id}', '${bid.id}', '${bid.sellerOrg}')">
              Accept & Award Tender
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  toggleModal('buyer-bids-modal', true);
};

window.acceptSellerBidGlobal = (rfqId, bidId, sellerOrg) => {
  toggleModal('buyer-bids-modal', false);
  addNotification('success', `Tender Awarded: Buyer accepted bid ${bidId} from ${sellerOrg} for RFQ ${rfqId}.`);
  addAuditLog(currentUser.email || 'buyer@aspen.gov', `Accepted winning bid ${bidId} from ${sellerOrg} for RFQ ${rfqId}. Tender contract awarded.`);
  showToast(`Tender ${rfqId} successfully awarded to ${sellerOrg}!`, 'success');

  const container = document.getElementById('app-content-body');
  if (activePage === 'active' && container) {
    renderBuyerActiveRFQs(container);
  }
};

// ==========================================================================
// 10. ADMIN DASHBOARD & VERIFICATIONS
// ==========================================================================

function renderAdminDashboard(container) {
  container.innerHTML = '';

  // Statistics Row
  const statsRow = document.createElement('div');
  statsRow.className = 'stats-row';
  statsRow.innerHTML = `
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">${t('pending_verifications')}</span>
        <span class="stat-value" id="admin-stat-pending">2</span>
        <span class="stat-change up">${t('audits_slated')}</span>
      </div>
      <div class="stat-icon-wrapper">👥</div>
    </div>
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">${t('active_rfqs_label')}</span>
        <span class="stat-value">6</span>
        <span class="stat-change up">${t('bidding_active')}</span>
      </div>
      <div class="stat-icon-wrapper">⚡</div>
    </div>
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">${t('total_bis_codes')}</span>
        <span class="stat-value">${MOCK_BIS_STANDARDS.length}</span>
        <span class="stat-change">${t('active_registry')}</span>
      </div>
      <div class="stat-icon-wrapper">📘</div>
    </div>
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">${t('system_perf')}</span>
        <span class="stat-value">99.8%</span>
        <span class="stat-change up">${t('sla_compliant')}</span>
      </div>
      <div class="stat-icon-wrapper">⚙️</div>
    </div>
  `;
  container.appendChild(statsRow);

  // Split Panel (Analytics + Verification Overview)
  const splitGrid = document.createElement('div');
  splitGrid.className = 'dashboard-split-grid';
  
  // Left: Dynamic Analytics Bar Chart (SVG-based)
  const chartCol = document.createElement('div');
  chartCol.className = 'dashboard-section';
  chartCol.innerHTML = `
    <div class="section-header-row">
      <h3>${t('monthly_audit_chart')}</h3>
      <span class="badge badge-info">${t('year_overview')}</span>
    </div>
    <div class="card analytics-chart-card">
      <div class="chart-canvas-container">
        <div class="chart-bar-col">
          <div class="chart-bar-fill" style="height: 40%;">
            <span class="chart-bar-tooltip">120 audits</span>
          </div>
          <span class="chart-bar-label">Mar</span>
        </div>
        <div class="chart-bar-col">
          <div class="chart-bar-fill" style="height: 65%;">
            <span class="chart-bar-tooltip">198 audits</span>
          </div>
          <span class="chart-bar-label">Apr</span>
        </div>
        <div class="chart-bar-col">
          <div class="chart-bar-fill" style="height: 50%;">
            <span class="chart-bar-tooltip">150 audits</span>
          </div>
          <span class="chart-bar-label">May</span>
        </div>
        <div class="chart-bar-col">
          <div class="chart-bar-fill" style="height: 85%;">
            <span class="chart-bar-tooltip">260 audits</span>
          </div>
          <span class="chart-bar-label">Jun</span>
        </div>
        <div class="chart-bar-col">
          <div class="chart-bar-fill" style="height: 75%;">
            <span class="chart-bar-tooltip">230 audits</span>
          </div>
          <span class="chart-bar-label">Jul</span>
        </div>
        <div class="chart-bar-col">
          <div class="chart-bar-fill" style="height: 95%;">
            <span class="chart-bar-tooltip">310 audits</span>
          </div>
          <span class="chart-bar-label">Aug</span>
        </div>
      </div>
    </div>
  `;
  splitGrid.appendChild(chartCol);

  // Right: Quick audit logs list
  const auditCol = document.createElement('div');
  auditCol.className = 'dashboard-section';
  auditCol.innerHTML = `
    <div class="section-header-row">
      <h3>${t('active_system_logs')}</h3>
      <button class="text-btn" id="admin-view-all-logs">${t('view_logs')}</button>
    </div>
    <div class="card audit-logs-list" style="max-height: 280px; overflow-y:auto;">
      ${systemAuditLogs.slice(0, 4).map(log => `
        <div class="audit-log-row">
          <div class="audit-log-left">
            <span class="audit-log-time">${log.timestamp.split(' ')[1]}</span>
            <span class="audit-log-user">${log.user.split('@')[0]}</span>
          </div>
          <div style="font-size:0.75rem; text-align:right; color:var(--text-secondary);">${log.action}</div>
        </div>
      `).join('')}
    </div>
  `;
  splitGrid.appendChild(auditCol);
  container.appendChild(splitGrid);

  // Set pending count and RFQs count dynamically
  const pendingCount = MOCK_VERIFICATION_LISTS.buyers.filter(b => b.status === 'Pending Review').length +
                       MOCK_VERIFICATION_LISTS.sellers.filter(s => s.status === 'Pending Review').length;
  statsRow.querySelector('#admin-stat-pending').textContent = pendingCount;

  const allRfqs = getAllSystemRFQs();
  const statRfqsElem = statsRow.querySelector('.stat-card:nth-child(2) .stat-value');
  if (statRfqsElem) statRfqsElem.textContent = allRfqs.length;

  auditCol.querySelector('#admin-view-all-logs').addEventListener('click', () => {
    navigateTo('admin-audit');
  });

  // Buyer Drafted Tenders & RFQs Oversight Table
  const rfqsSection = document.createElement('div');
  rfqsSection.className = 'dashboard-section';
  rfqsSection.style.marginTop = '2rem';

  rfqsSection.innerHTML = `
    <div class="section-header-row">
      <h3>${t('buyer_rfq_oversight')}</h3>
      <span class="badge badge-success">${allRfqs.length} ${t('total_rfqs')}</span>
    </div>
    <div class="product-table-wrapper card" style="padding:0; overflow:hidden;">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>${t('rfq_id')}</th>
            <th>Requirement / Product</th>
            <th>Quantity</th>
            <th>BIS Standard</th>
            <th>Buyer / Organization</th>
            <th>Date Published</th>
            <th>Status</th>
            <th>Admin Action</th>
          </tr>
        </thead>
        <tbody id="admin-rfq-tbody">
          ${allRfqs.map(rfq => {
            const score = rfq.bisSuitabilityScore || 85.0;
            const satisfiesBIS = rfq.bisSatisfied !== undefined ? rfq.bisSatisfied : (score >= 80.0);
            const hasAdminOverride = rfq.adminOverride === true;

            return `
            <tr>
              <td class="table-cell-title">${rfq.id}</td>
              <td><strong>${rfq.product}</strong></td>
              <td>${rfq.qty || rfq.quantity || '10,000 units'}</td>
              <td>
                <span class="bis-card-code" style="cursor:pointer;" onclick="window.showBISModalGlobal('${rfq.standard}')">${rfq.standard}</span>
                <div style="margin-top:4px;">
                  ${satisfiesBIS 
                    ? `<span class="badge badge-success btn-sm">✓ Satisfies Standard (${score.toFixed(1)}%)</span>`
                    : hasAdminOverride 
                      ? `<span class="badge badge-success btn-sm">✓ Admin Exemption (${score.toFixed(1)}%)</span>`
                      : `<span class="badge badge-warning btn-sm">⚠️ Below Threshold (${score.toFixed(1)}%)</span>`
                  }
                </div>
              </td>
              <td>
                <div style="font-size:0.85rem; font-weight:600;">${rfq.org || 'Buyer Dept'}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${rfq.buyer || 'buyer@aspen.gov'}</div>
              </td>
              <td>${rfq.date}</td>
              <td>
                <span class="badge ${satisfiesBIS || hasAdminOverride ? 'badge-success' : 'badge-warning'}" id="admin-rfq-status-${rfq.id}">
                  ${rfq.status || (satisfiesBIS ? 'Active' : 'Awaiting Override')}
                </span>
              </td>
              <td style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <button class="secondary-btn btn-sm" onclick="window.showBISSuitabilityReportGlobal('${rfq.id}')">BIS Report</button>
                ${(!satisfiesBIS && !hasAdminOverride)
                  ? `<button class="primary-btn btn-sm" style="background:#f59e0b; border:none; font-weight:700;" onclick="window.adminOverrideBISSatisfactionGlobal('${rfq.id}')">Grant Admin Exemption</button>`
                  : `<button class="primary-btn btn-sm" id="admin-rfq-btn-${rfq.id}" onclick="window.adminAuditRFQGlobal('${rfq.id}')">Audit & Approve</button>`
                }
              </td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.appendChild(rfqsSection);
}

// Expose admin RFQ audit & BIS suitability report global handlers
window.adminAuditRFQGlobal = (rfqId) => {
  const badge = document.getElementById(`admin-rfq-status-${rfqId}`);
  if (badge) {
    badge.className = 'badge badge-success';
    badge.textContent = 'Audited & Approved';
  }
  const btn = document.getElementById(`admin-rfq-btn-${rfqId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Approved';
    btn.className = 'secondary-btn btn-sm';
    btn.style.opacity = '0.6';
  }
  addNotification('success', `Admin Compliance Audit: Tender ${rfqId} has been audited & verified by Administrator.`);
  addAuditLog(currentUser.email || 'admin@aspen.gov', `Administrator audited and approved tender RFQ ${rfqId}.`);
  showToast(`Tender ${rfqId} audited & verified successfully!`, 'success');
};

window.adminOverrideBISSatisfactionGlobal = (rfqId) => {
  SYSTEM_ADMIN_OVERRIDES[rfqId] = true;
  localStorage.setItem('aspen_admin_overrides', JSON.stringify(SYSTEM_ADMIN_OVERRIDES));

  const allRfqs = getAllSystemRFQs();
  const rfq = allRfqs.find(r => r.id === rfqId);
  if (rfq) {
    rfq.adminOverride = true;
    rfq.biddingAllowed = true;
    rfq.status = 'Active (Admin Override Granted)';
  }

  [currentUser, MOCK_USERS.buyer, MOCK_USERS.seller].forEach(u => {
    if (u && u.rfqs) {
      const match = u.rfqs.find(r => r.id === rfqId);
      if (match) {
        match.adminOverride = true;
        match.biddingAllowed = true;
        match.status = 'Active (Admin Override Granted)';
      }
    }
  });

  addNotification('warning', `Admin Exemption: Special access granted for non-standard RFQ ${rfqId} by Administrator.`);
  addAuditLog(currentUser.email || 'admin@aspen.gov.in', `Granted Administrator Special Access Override for RFQ ${rfqId} (below standard BIS threshold). Bidding enabled for sellers.`);
  showToast(`Special Access Exemption Granted for ${rfqId}! Bidding enabled for sellers.`, 'success');

  if (activePage === 'admin-dashboard') {
    const container = document.getElementById('app-content-body');
    if (container) renderAdminDashboard(container);
  }
};

window.showBISSuitabilityReportGlobal = (rfqId) => {
  const modal = document.getElementById('bis-suitability-modal');
  if (!modal) {
    console.error('bis-suitability-modal element missing from DOM!');
    return;
  }

  const allRfqs = getAllSystemRFQs();
  let rfq = allRfqs.find(r => r.id === rfqId);
  if (!rfq && currentUser && currentUser.rfqs) {
    rfq = currentUser.rfqs.find(r => r.id === rfqId);
  }

  // Graceful fallback for any custom or dynamically rendered RFQs
  if (!rfq) {
    rfq = {
      id: rfqId || 'RFQ-2026-001',
      product: 'BIS Certified Product Requirement',
      standard: 'IS 12345',
      qty: '10,000 units',
      bisSuitabilityScore: 85.0,
      bisSatisfied: true,
      bisSuitabilityStatus: 'Fully BIS Compliant',
      bisSuitabilityDetails: 'Product requirement matches Bureau of Indian Standards testing guidelines and technical parameters.',
      bisSpecs: 'Standard dimensions, material tolerances, and laboratory testing parameters verified against active standard registry.'
    };
  }

  const score = rfq.bisSuitabilityScore || 85.0;
  const satisfiesBIS = rfq.bisSatisfied !== false;
  const hasAdminOverride = rfq.adminOverride === true || (SYSTEM_ADMIN_OVERRIDES && SYSTEM_ADMIN_OVERRIDES[rfq.id] === true);

  const badgeElem = document.getElementById('bis-suitability-score-badge');
  if (badgeElem) {
    if (hasAdminOverride) {
      badgeElem.textContent = `${score.toFixed(1)}% BIS Score • Admin Exemption Granted`;
      badgeElem.className = 'badge badge-success';
    } else if (satisfiesBIS) {
      badgeElem.textContent = `${score.toFixed(1)}% BIS Suitability • Fully Compliant`;
      badgeElem.className = 'badge badge-success';
    } else {
      badgeElem.textContent = `${score.toFixed(1)}% BIS Score • Awaiting Admin Exemption`;
      badgeElem.className = 'badge badge-warning';
    }
  }

  const titleElem = document.getElementById('bis-suitability-modal-title');
  if (titleElem) {
    titleElem.textContent = `Bureau of Indian Standards Report: ${rfq.id}`;
  }

  const codeElem = document.getElementById('bis-suitability-code');
  if (codeElem) {
    codeElem.textContent = `${rfq.standard || 'IS 12345'} — ${rfq.bisSuitabilityStatus || (satisfiesBIS ? 'Satisfies BIS Standards' : 'Below BIS Threshold')}`;
  }

  const prodElem = document.getElementById('bis-suitability-product');
  if (prodElem) {
    prodElem.textContent = `Drafted Product: ${rfq.product} (Required Quantity: ${rfq.qty || rfq.quantity || '10,000 units'})`;
  }

  const evalElem = document.getElementById('bis-suitability-eval');
  if (evalElem) {
    evalElem.textContent = rfq.bisSuitabilityDetails || `${score.toFixed(1)}% suitability score calculated by AI NLU parser against active Bureau of Indian Standards testing guidelines for ${rfq.product}.`;
  }

  const specsElem = document.getElementById('bis-suitability-specs');
  if (specsElem) {
    specsElem.textContent = rfq.bisSpecs || 'Technical specs: Standard dimensions, material tolerances, and NABL laboratory testing rules.';
  }

  toggleModal('bis-suitability-modal', true);
};

function renderAdminUsers(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>${t('profile_ver_registry')}</h1>
      <p>${t('profile_ver_sub')}</p>
    </div>
    
    <div class="dashboard-section">
      <div class="section-header-row">
        <h3>${t('buyer_apps_pending')}</h3>
      </div>
      <div class="product-table-wrapper">
        <table class="aspen-table">
          <thead>
            <tr>
              <th>${t('rfq_id')}</th>
              <th>${t('org_name')}</th>
              <th>${t('full_name')}</th>
              <th>${t('email_addr')}</th>
              <th>${t('date_published')}</th>
              <th>${t('compliance_status')}</th>
              <th>${t('action')}</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_VERIFICATION_LISTS.buyers.map(buyer => `
              <tr>
                <td class="table-cell-title">${buyer.id}</td>
                <td>${buyer.org}</td>
                <td>${buyer.officer}</td>
                <td><code>${buyer.email}</code></td>
                <td>${buyer.date}</td>
                <td>
                  <span class="badge ${buyer.status === 'Verified' ? 'badge-success' : 'badge-warning'}" id="status-buyer-${buyer.id}">
                    ${buyer.status}
                  </span>
                </td>
                <td>
                  ${buyer.status === 'Verified' 
                    ? `<button class="secondary-btn btn-sm" disabled style="opacity:0.5; cursor:not-allowed;">${t('approved_btn')}</button>`
                    : `<button class="primary-btn btn-sm" onclick="window.verifyUserGlobal('buyer', '${buyer.id}')">${t('verify_btn')}</button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="dashboard-section" style="margin-top:2rem;">
      <div class="section-header-row">
        <h3>${t('seller_apps_pending')}</h3>
      </div>
      <div class="product-table-wrapper">
        <table class="aspen-table">
          <thead>
            <tr>
              <th>${t('rfq_id')}</th>
              <th>${t('company_name')}</th>
              <th>${t('full_name')}</th>
              <th>${t('email_addr')}</th>
              <th>${t('date_published')}</th>
              <th>${t('compliance_status')}</th>
              <th>${t('action')}</th>
            </tr>
          </thead>
          <tbody>
            ${MOCK_VERIFICATION_LISTS.sellers.map(seller => `
              <tr>
                <td class="table-cell-title">${seller.id}</td>
                <td>${seller.org}</td>
                <td>${seller.rep}</td>
                <td><code>${seller.email}</code></td>
                <td>${seller.date}</td>
                <td>
                  <span class="badge ${seller.status === 'Verified' ? 'badge-success' : 'badge-warning'}" id="status-seller-${seller.id}">
                    ${seller.status}
                  </span>
                </td>
                <td>
                  ${seller.status === 'Verified' 
                    ? `<button class="secondary-btn btn-sm" disabled style="opacity:0.5; cursor:not-allowed;">${t('approved_btn')}</button>`
                    : `<button class="primary-btn btn-sm" onclick="window.verifyUserGlobal('seller', '${seller.id}')">${t('verify_btn')}</button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.verifyUserGlobal = (type, userId) => {
  const targetList = type === 'buyer' ? MOCK_VERIFICATION_LISTS.buyers : MOCK_VERIFICATION_LISTS.sellers;
  const user = targetList.find(u => u.id === userId);
  
  if (user) {
    user.status = 'Verified';
    addAuditLog(currentUser.email, `Verified user profile and authenticated access permissions for ${user.org} (${userId}).`);
    addNotification('success', `Security Clearance: ${user.org} profile verified and enabled.`);
    showToast(`${t('toast_verified')} ${userId}.`, 'success');
    
    // Refresh page to show updated verified state
    navigateTo('admin-users');
  }
};

function renderAdminAnalytics(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>${t('procurement_analytics')}</h1>
      <p>${t('analytics_sub')}</p>
    </div>
    
    <div class="stats-row">
      <div class="card stat-card">
        <div class="stat-left">
          <span class="stat-label">${t('total_vol_searched')}</span>
          <span class="stat-value">14.8M Units</span>
          <span class="stat-change up">↑ 12% Month-on-Month</span>
        </div>
        <div class="stat-icon-wrapper">📈</div>
      </div>
      <div class="card stat-card">
        <div class="stat-left">
          <span class="stat-label">${t('std_match_rate')}</span>
          <span class="stat-value">94.2%</span>
          <span class="stat-change up">↑ High Match Accuracy</span>
        </div>
        <div class="stat-icon-wrapper">✓</div>
      </div>
      <div class="card stat-card">
        <div class="stat-left">
          <span class="stat-label">${t('unique_mfrs')}</span>
          <span class="stat-value">1,402</span>
          <span class="stat-change">Active in Grid</span>
        </div>
        <div class="stat-icon-wrapper">🏭</div>
      </div>
    </div>

    <div class="card" style="padding: 2rem;">
      <h3 style="margin-bottom:1rem;">${t('ai_match_title')}</h3>
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div>
          <div style="display:flex; justify-content:between; font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
            <span>Medical Dressings & Textiles (IS 758)</span>
            <span>98.6% accuracy</span>
          </div>
          <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden;">
            <div style="height:100%; background:var(--accent-color); width:98%;"></div>
          </div>
        </div>
        <div>
          <div style="display:flex; justify-content:between; font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
            <span>Mechanical Pumping Equipment (IS 1520)</span>
            <span>94.1% accuracy</span>
          </div>
          <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden;">
            <div style="height:100%; background:var(--accent-color); width:94%;"></div>
          </div>
        </div>
        <div>
          <div style="display:flex; justify-content:between; font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
            <span>uPVC Potable Water Pipes (IS 4985)</span>
            <span>91.8% accuracy</span>
          </div>
          <div style="height:8px; background:var(--border-color); border-radius:4px; overflow:hidden;">
            <div style="height:100%; background:var(--accent-color); width:91%;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAdminAudit(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>${t('audit_page_title')}</h1>
      <p>${t('audit_page_sub')}</p>
    </div>
    
    <div class="card" style="padding:0;">
      <div style="padding:1rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-info">${systemAuditLogs.length} ${t('registered_events')}</span>
        <button class="secondary-btn btn-sm" id="clear-audit-logs-btn">${t('clear_security_log')}</button>
      </div>
      <div class="audit-logs-list" id="admin-full-audit-logs-container">
        ${systemAuditLogs.map(log => `
          <div class="audit-log-row">
            <div class="audit-log-left">
              <span class="audit-log-time" style="font-size:0.75rem;">[${log.timestamp}]</span>
              <span class="audit-log-user" style="font-size:0.8rem; background:var(--bg-primary); padding:0.2rem 0.5rem; border-radius:4px;">${log.user}</span>
            </div>
            <div style="font-size:0.8rem; font-weight:500; color:var(--text-secondary);">${log.action}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#clear-audit-logs-btn').addEventListener('click', () => {
    systemAuditLogs = [];
    showToast(t('toast_audit_cleared'), 'info');
    renderAdminAudit(container);
  });
}

// ==========================================================================
// 11. CATEGORIES PAGE (PRODUCT CATALOG GRID)
// ==========================================================================

function renderCategoriesPage(container) {
  const filter = activeCategoryFilter || null;
  activeCategoryFilter = null;
  renderCategoriesPageFiltered(filter, container);
}

function renderCategoriesPageFiltered(filterCategory, container) {
  const targetContainer = container || document.getElementById('app-content-body');
  targetContainer.innerHTML = '';

  const activeFilter = filterCategory || 'All';

  const pageHeader = document.createElement('div');
  pageHeader.className = 'page-title-area';
  pageHeader.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
      <button class="app-back-btn" onclick="window.navigateBackGlobal()" style="padding:5px 14px; font-size:0.8rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span>${t('back')}</span>
      </button>
      <h1 style="margin:0;">${t('product_catalog_title')}</h1>
    </div>
    <p>${t('product_catalog_sub')}</p>
  `;
  targetContainer.appendChild(pageHeader);

  // Category + subcategory selectors (populated from live API)
  const filtersBar = document.createElement('div');
  filtersBar.className = 'filters-bar';
  filtersBar.innerHTML = `
    <div class="filter-group">
      <span class="filter-label">${t('segment_filter')}</span>
      <select id="catalog-cat-select" class="filter-select">
        <option value="">Loading categories...</option>
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Sub-Category</span>
      <select id="catalog-subcat-select" class="filter-select">
        <option value="">Select category first</option>
      </select>
    </div>
    <input type="text" id="catalog-search-input" class="filter-search-input" placeholder="${t('search_products_placeholder')}">
  `;
  targetContainer.appendChild(filtersBar);

  const gridContainer = document.createElement('div');
  gridContainer.className = 'products-grid';
  targetContainer.appendChild(gridContainer);

  const catSelect = filtersBar.querySelector('#catalog-cat-select');
  const subCatSelect = filtersBar.querySelector('#catalog-subcat-select');
  const searchInput = filtersBar.querySelector('#catalog-search-input');

  let allCategories = [];

  // Load categories from API
  cachedApiGetCategories().then(cats => {
    allCategories = cats;
    catSelect.innerHTML = `<option value="">${t('all_categories')}</option>`;
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.category;
      opt.textContent = c.category;
      if (c.category === activeFilter) opt.selected = true;
      catSelect.appendChild(opt);
    });

    if (activeFilter && activeFilter !== 'All') {
      catSelect.value = activeFilter;
      populateSubCats(activeFilter);
      loadBrowse(activeFilter, null);
    } else {
      // Load first category by default
      const firstCat = cats[0];
      if (firstCat) {
        catSelect.value = firstCat.category;
        populateSubCats(firstCat.category);
        const firstSub = firstCat.sub_categories[0];
        if (firstSub) loadBrowse(firstCat.category, firstSub);
      }
    }
  }).catch(err => {
    catSelect.innerHTML = `<option>Error loading categories</option>`;
    gridContainer.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--red-text);">Failed to load categories: ${err.message}</div>`;
  });

  function populateSubCats(category) {
    const catData = allCategories.find(c => c.category === category);
    subCatSelect.innerHTML = '';
    if (catData) {
      catData.sub_categories.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subCatSelect.appendChild(opt);
      });
    }
  }

  function loadBrowse(category, subCategory) {
    const sub = subCategory || subCatSelect.value;
    if (!category || !sub) return;
    gridContainer.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">Loading ${category} / ${sub}...</div>`;
    apiBrowseItems(category, sub).then(data => {
      let items = data.items || [];
      const q = searchInput.value.toLowerCase();
      if (q) items = items.filter(item => item.title.toLowerCase().includes(q) || item.is_code.toLowerCase().includes(q));
      renderBrowseItems(items, category);
    }).catch(err => {
      gridContainer.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--red-text);">Browse error: ${err.message}</div>`;
    });
  }

  function renderBrowseItems(items, category) {
    gridContainer.innerHTML = '';
    if (items.length === 0) {
      gridContainer.innerHTML = `<div class="card" style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">${t('no_products')}</div>`;
      return;
    }
    items.forEach(item => {
      const specs = buildSpecsDescription(item.specifications);
      const card = document.createElement('div');
      card.className = 'card product-card';
      card.innerHTML = `
        <div class="product-card-top">
          <div>
            <span class="product-card-category">${category}</span>
            <h3 class="product-card-title">${item.title}</h3>
          </div>
          <span class="bis-card-code" style="cursor:pointer;">${item.is_code}</span>
        </div>
        <div class="product-card-specs">
          <div class="spec-line">
            <span class="spec-label">Specifications</span>
            <span class="spec-val" style="font-size:0.78rem; color:var(--text-sub);">${specs || 'Available on request'}</span>
          </div>
          <div class="spec-line">
            <span class="spec-label">${t('stock_status')}</span>
            <span class="spec-val">
              <span class="badge badge-success btn-sm">${item.status || 'Active'}</span>
            </span>
          </div>
        </div>
        <div class="product-card-footer">
          <button class="primary-btn btn-sm browse-view-btn">${t('audit_compliance_btn')}</button>
        </div>
      `;
      card.querySelector('.browse-view-btn').addEventListener('click', () => showBISModalFromApiResult(item));
      card.querySelector('.bis-card-code').addEventListener('click', () => showBISModalFromApiResult(item));
      gridContainer.appendChild(card);
    });
  }

  catSelect.addEventListener('change', () => {
    const cat = catSelect.value;
    if (cat) {
      populateSubCats(cat);
      const sub = subCatSelect.options[0]?.value;
      if (sub) loadBrowse(cat, sub);
    }
  });
  subCatSelect.addEventListener('change', () => loadBrowse(catSelect.value, subCatSelect.value));
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => loadBrowse(catSelect.value, subCatSelect.value), 400);
  });
}


function renderBISPage(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <button class="app-back-btn" onclick="window.navigateBackGlobal()" style="padding:5px 14px; font-size:0.8rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>${t('back')}</span>
        </button>
        <h1 style="margin:0;">${t('bis_page_title')}</h1>
      </div>
      <p>${t('bis_page_sub')}</p>
    </div>
    <div class="filters-bar">
      <div class="filter-group">
        <span class="filter-label">${t('industrial_domain')}</span>
        <select id="bis-domain-select" class="filter-select">
          <option value="All">${t('all_domains')}</option>
        </select>
      </div>
      <input type="text" id="bis-search-input" class="filter-search-input" placeholder="${t('search_bis_placeholder')}">
    </div>
    <div class="bis-list" id="bis-standards-grid-container">
      <div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">Loading live BIS standards from AI...</div>
    </div>
  `;

  const domainSelect = container.querySelector('#bis-domain-select');
  const searchInput = container.querySelector('#bis-search-input');
  const gridContainer = container.querySelector('#bis-standards-grid-container');

  cachedApiGetCategories().then(cats => {
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.category;
      opt.textContent = c.category;
      domainSelect.appendChild(opt);
    });
  }).catch(() => {});

  function renderApiResults(results) {
    gridContainer.innerHTML = '';
    if (!results || results.length === 0) {
      gridContainer.innerHTML = `<div class="card" style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">${t('no_standards')}</div>`;
      return;
    }
    results.forEach(r => {
      const score = r.match_metadata?.confidence_score || 0;
      const specs = buildSpecsDescription(r.specifications);
      const safeId = (r.is_code || '').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const card = document.createElement('div');
      card.className = 'card bis-full-card';
      card.innerHTML = `
        <div class="bis-full-card-top">
          <span class="bis-card-code">${r.is_code}</span>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <span class="badge badge-success">${t('mandatory_standard')}</span>
            <span class="badge ${score >= 80 ? 'badge-success' : 'badge-info'} btn-sm" style="padding:0.15rem 0.5rem;">${score.toFixed(1)}% AI</span>
          </div>
        </div>
        <div>
          <h3 class="bis-full-card-title">${r.title}</h3>
          <p class="meta-tag" style="margin-top:0.25rem;">${r.category}</p>
        </div>
        <p class="bis-full-card-description">${specs || 'Specifications available on request.'}</p>
        <div class="bis-full-card-meta">
          <span>${t('committee_label')} AI-Matched</span>
          <span>${r.match_metadata?.status || 'Active'}</span>
        </div>
        <button class="secondary-btn btn-sm btn-full bis-api-view-btn">${t('view_protocol_btn')}</button>
      `;
      card.querySelector('.bis-api-view-btn').addEventListener('click', () => showBISModalFromApiResult(r));
      gridContainer.appendChild(card);
    });
  }

  let debounceTimer;
  function loadBISSearch(query) {
    gridContainer.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">Searching AI BIS database for "${query}"...</div>`;
    apiBISSearch(query || 'standard').then(data => {
      let results = data.results || [];
      // Sort by confidence_score descending (highest confidence first)
      results.sort((a, b) => (b.match_metadata?.confidence_score || 0) - (a.match_metadata?.confidence_score || 0));
      const domain = domainSelect.value;
      if (domain && domain !== 'All') results = results.filter(r => r.category === domain);
      renderApiResults(results);
    }).catch(err => {
      gridContainer.innerHTML = `<div class="card" style="text-align:center; padding:2rem; color:var(--red-text);">API Error: ${err.message}</div>`;
    });
  }

  domainSelect.addEventListener('change', () => loadBISSearch(searchInput.value || 'standard'));
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadBISSearch(searchInput.value || 'standard'), 400);
  });

  loadBISSearch('standard');
}


function renderRegisterPage(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <button class="app-back-btn" onclick="window.navigateBackGlobal()" style="padding:5px 14px; font-size:0.8rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>${t('back')}</span>
        </button>
        <h1 style="margin:0;">${t('account_reg_title')}</h1>
      </div>
      <p>${t('account_reg_sub')}</p>
    </div>

    <!-- Registration cards grid -->
    <div class="card" style="max-width:720px; display:flex; flex-direction:column; gap:1.2rem; margin-bottom:1.5rem;">
      <p class="settings-section-title">${t('available_accounts')}</p>

      <div class="settings-reg-grid">
        <!-- Buyer Card -->
        <div class="settings-reg-card" style="--card-accent:#3b82f6; --card-icon-bg:#dbeafe;" id="reg-card-buyer">
          <div class="reg-card-icon">🏢</div>
          <div class="reg-card-title">${t('reg_as_buyer')}</div>
          <div class="reg-card-desc">${t('reg_as_buyer_desc')}</div>
          <button class="reg-card-btn" id="reg-btn-buyer">
            ${t('register_now')}
          </button>
        </div>

        <!-- Seller Card -->
        <div class="settings-reg-card" style="--card-accent:#10b981; --card-icon-bg:#d1fae5;" id="reg-card-seller">
          <div class="reg-card-icon">🏭</div>
          <div class="reg-card-title">${t('reg_as_seller')}</div>
          <div class="reg-card-desc">${t('reg_as_seller_desc')}</div>
          <button class="reg-card-btn" style="color:#10b981;" id="reg-btn-seller">
            ${t('register_now')}
          </button>
        </div>

        <!-- Admin Card -->
        <div class="settings-reg-card" style="--card-accent:#8b5cf6; --card-icon-bg:#ede9fe;" id="reg-card-admin">
          <div class="reg-card-icon">🛡</div>
          <div class="reg-card-title">${t('reg_as_admin')}</div>
          <div class="reg-card-desc">${t('reg_as_admin_desc')}</div>
          <button class="reg-card-btn" style="color:#8b5cf6;" id="reg-btn-admin">
            ${t('register_now')}
          </button>
        </div>
      </div>

      <div style="background:var(--bg-primary); border-radius:var(--radius-sm); padding:12px 16px; margin-top:0.5rem; font-size:0.82rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <span>${t('already_have_account')}</span>
        <button class="secondary-btn" onclick="toggleModal('auth-modal', true)" style="font-size:0.8rem; padding:5px 14px;">${t('sign_in_aspen')}</button>
      </div>
    </div>
  `;

  // Bind registration card buttons
  ['buyer', 'seller', 'admin'].forEach(role => {
    const btn = container.querySelector(`#reg-btn-${role}`);
    const card = container.querySelector(`#reg-card-${role}`);
    if (btn) btn.addEventListener('click', () => openRegisterModal(role));
    if (card) card.addEventListener('click', (e) => {
      if (e.target === card || e.target.className === 'reg-card-icon' || e.target.className === 'reg-card-title' || e.target.className === 'reg-card-desc') {
        openRegisterModal(role);
      }
    });
  });
}

// ==========================================================================
// 13. SETTINGS PAGE
// ==========================================================================

function renderSettingsPage(container) {
  const isLoggedIn = currentUser.role !== 'public';

  container.innerHTML = `
    <div class="page-title-area">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <button class="app-back-btn" onclick="window.navigateBackGlobal()" style="padding:5px 14px; font-size:0.8rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>${t('back')}</span>
        </button>
        <h1 style="margin:0;">${t('settings_title')}</h1>
      </div>
      <p>${t('settings_sub')}</p>
    </div>

    <!-- Account section -->
    <div class="card" style="max-width:660px; display:flex; flex-direction:column; gap:1.4rem; margin-bottom:1.5rem;">
      <div>
        <p class="settings-section-title">${t('current_account')}</p>
        <div style="display:flex; align-items:center; gap:14px; padding:14px; background:var(--bg-primary); border-radius:var(--radius-md);">
          <div style="width:48px; height:48px; border-radius:50%; background:var(--accent-navy); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:800; flex-shrink:0;">
            ${currentUser.initials}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${currentUser.name}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">${currentUser.email} &nbsp;·&nbsp; ${currentUser.org}</div>
          </div>
          <span class="badge ${isLoggedIn ? 'badge-success' : 'badge-neutral'}" style="flex-shrink:0;">
            ${isLoggedIn ? currentUser.role.toUpperCase() : 'Guest'}
          </span>
        </div>
      </div>

      <!-- Profile fields -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group">
          <label>${t('account_name')}</label>
          <input type="text" value="${currentUser.name}" readonly style="background-color:var(--bg-primary);">
        </div>
        <div class="form-group">
          <label>${t('organization')}</label>
          <input type="text" value="${currentUser.org}" readonly style="background-color:var(--bg-primary);">
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label>${t('email_addr')}</label>
          <input type="email" value="${currentUser.email}" readonly style="background-color:var(--bg-primary);">
        </div>
      </div>

      <!-- Notifications toggle -->
      <div>
        <p class="settings-section-title">Dashboard Preferences</p>
        <div class="form-group" style="flex-direction:row; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-primary); border-radius:var(--radius-sm);">
          <div>
            <strong style="font-size:0.88rem; display:block;">Instant Notifications</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);">Receive push updates for verification and RFQ bids.</span>
          </div>
          <input type="checkbox" checked style="width:20px; height:20px; cursor:pointer;">
        </div>
      </div>
    </div>

    <!-- Registration Redirect Banner -->
    <div class="card" style="max-width:660px; display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:1.5rem;">
      <div>
        <strong style="font-size:0.9rem; display:block; margin-bottom:2px;">Need to register a new role account?</strong>
        <span style="font-size:0.78rem; color:var(--text-muted);">Switch to Buyer, Seller, or Administrator profiles via the Register section.</span>
      </div>
      <button class="secondary-btn" onclick="navigateTo('register')" style="white-space:nowrap; font-size:0.82rem;">Go to Register →</button>
    </div>

    <!-- Logout -->
    ${isLoggedIn ? `
    <div class="card" style="max-width:660px; display:flex; flex-direction:column; gap:1rem;">
      <p class="settings-section-title">Session</p>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
        <div>
          <strong style="font-size:0.9rem; display:block; margin-bottom:2px;">Log out of ASPEN</strong>
          <span style="font-size:0.78rem; color:var(--text-muted);">You will be returned to the Public Guest view.</span>
        </div>
        <button class="danger-btn" id="settings-logout-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log Out
        </button>
      </div>
    </div>` : `
    <div class="card" style="max-width:660px; background:var(--bg-primary);">
      <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:0.5rem 0;">
        You are browsing as a <strong>Public Guest</strong>. Login to access your account settings.
      </p>
    </div>`}
  `;

  // Bind logout button
  const logoutBtn = container.querySelector('#settings-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      switchRole('public');
      showToast('You have been logged out successfully.', 'info');
    });
  }
}

// Registration modal helpers
function openRegisterModal(preselectedRole = 'buyer') {
  const roleDescriptions = {
    buyer: 'Access procurement catalog, BIS standards, and submit RFQs.',
    seller: 'List products, manage BIS certifications, and respond to buyer RFQs.',
    admin: 'Manage users, review audits, and oversee platform compliance.'
  };
  const roleLabels = { buyer: 'Buyer', seller: 'Seller', admin: 'Administrator' };

  // Reset form
  const form = document.getElementById('register-form');
  if (form) form.reset();

  // Set active pill
  document.querySelectorAll('#reg-role-pills .reg-modal-role-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.regRole === preselectedRole);
  });

  // Update role description
  document.getElementById('reg-role-display').textContent = roleLabels[preselectedRole];
  document.getElementById('reg-role-desc').textContent = roleDescriptions[preselectedRole];

  toggleModal('register-modal', true);
}

function initRegisterModal() {
  const roleDescriptions = {
    buyer: 'Access procurement catalog, BIS standards, and submit RFQs.',
    seller: 'List products, manage BIS certifications, and respond to buyer RFQs.',
    admin: 'Manage users, review audits, and oversee platform compliance.'
  };
  const roleLabels = { buyer: 'Buyer', seller: 'Seller', admin: 'Administrator' };

  // Close button
  document.getElementById('register-modal-close').addEventListener('click', () => {
    toggleModal('register-modal', false);
  });

  // Role pill switching
  document.querySelectorAll('#reg-role-pills .reg-modal-role-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#reg-role-pills .reg-modal-role-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const role = pill.dataset.regRole;
      document.getElementById('reg-role-display').textContent = roleLabels[role];
      document.getElementById('reg-role-desc').textContent = roleDescriptions[role];
    });
  });

  // Form submit
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pwd = document.getElementById('reg-password').value;
    const confirmPwd = document.getElementById('reg-confirm-password').value;
    const activeRolePill = document.querySelector('#reg-role-pills .reg-modal-role-pill.active');
    const selectedRole = activeRolePill ? activeRolePill.dataset.regRole : 'buyer';

    if (pwd !== confirmPwd) {
      showToast('Passwords do not match. Please try again.', 'error');
      return;
    }
    if (pwd.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (!email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    // Simulate registration — switch to role and log
    toggleModal('register-modal', false);
    addAuditLog(email, `New ${selectedRole} account registration submitted: ${name}.`);
    showToast(`Registration successful! Welcome, ${name.split(' ')[0]}. Switching to ${selectedRole} view.`, 'success');
    setTimeout(() => switchRole(selectedRole), 800);
  });
}

// ==========================================================================
// 14. BIS DETAILS MODAL ENGINE
// ==========================================================================

function showBISModal(standardCode) {
  const std = MOCK_BIS_STANDARDS.find(s => s.code === standardCode);
  if (std) {
    showBISModalFromApiResult({
      is_code: std.code,
      title: std.title,
      category: std.industry,
      description: std.description,
      match_metadata: { confidence_score: 100, status: 'Active' },
      specifications: { relevance: std.relevance, committee: std.committee, published: std.date },
      _manufacturers: std.manufacturers
    });
  } else {
    showBISModalFromApiResult({
      is_code: standardCode,
      title: `Indian Standard Code: ${standardCode}`,
      category: 'BIS Compliance Registry',
      match_metadata: { confidence_score: 90.0, status: 'Active' }
    });
  }
}

function showBISModalFromApiResult(r) {
  if (!r) return;

  const code = r.is_code || r.code || r.standard || 'IS 12345';
  const title = r.title || r.name || 'BIS Standard Product Specification';
  const category = r.category || r.industry || 'General';
  const desc = r.description || buildSpecsDescription(r.specifications) || 'Bureau of Indian Standards compliance guidelines.';
  const score = r.match_metadata?.confidence_score || r.bisSuitabilityScore || 85.0;
  const status = r.match_metadata?.status || r.status || 'Active';

  document.getElementById('bis-modal-code').textContent = code;
  document.getElementById('bis-modal-title').textContent = title;
  document.getElementById('bis-modal-industry').textContent = category;
  document.getElementById('bis-modal-description').textContent = desc;

  const badgeElem = document.getElementById('bis-modal-match-badge');
  if (badgeElem) {
    badgeElem.textContent = `${score.toFixed(1)}% AI Verified Match`;
    badgeElem.className = score >= 80 ? 'badge badge-success' : 'badge badge-info';
  }

  document.getElementById('bis-modal-relevance').textContent = `${score.toFixed(1)}% Suitability`;
  document.getElementById('bis-modal-date').textContent = status;
  document.getElementById('bis-modal-committee').textContent = `AI NLU Match`;

  // Render ordered technical specifications container grid
  const specsGrid = document.getElementById('bis-modal-specs-container');
  if (specsGrid) {
    specsGrid.innerHTML = '';
    const specs = r.specifications || {};
    const entries = Object.entries(specs);
    if (entries.length === 0) {
      specsGrid.innerHTML = `<div style="grid-column:1/-1; color:var(--text-muted); font-size:0.8rem;">Standard dimensions, material tolerances, and safety parameters aligned with IS registry.</div>`;
    } else {
      entries.forEach(([k, v]) => {
        const item = document.createElement('div');
        item.style.cssText = 'background:#fff; border:1px solid var(--border-line); padding:8px 10px; border-radius:4px;';
        item.innerHTML = `
          <strong style="color:var(--text-muted); display:block; font-size:0.7rem; text-transform:uppercase;">${k.replace(/_/g, ' ')}</strong>
          <span style="font-weight:600; color:var(--text-main); font-size:0.82rem;">${Array.isArray(v) ? v.join(', ') : v}</span>
        `;
        specsGrid.appendChild(item);
      });
    }
  }

  // Render certified vendors list inside modal
  const vendorGrid = document.getElementById('bis-modal-manufacturers-list');
  if (vendorGrid) {
    vendorGrid.innerHTML = '';
    const vendors = r._manufacturers || r.manufacturers || [
      { name: 'Supreme Industrial Supplies Ltd.', license: 'CM/L-829183', location: 'Ahmedabad, Gujarat' },
      { name: 'Aegis Tech Materials Corp', license: 'CM/L-736254', location: 'Coimbatore, Tamil Nadu' }
    ];
    vendors.forEach(m => {
      const card = document.createElement('div');
      card.className = 'bis-vendor-card';
      card.innerHTML = `
        <div class="bis-vendor-logo">${m.name.charAt(0)}</div>
        <div class="bis-vendor-info">
          <div class="bis-vendor-name">${m.name}</div>
          <div class="bis-vendor-lic">License No: ${m.license} • ${m.location}</div>
        </div>
        <span class="badge badge-success">✓ Verified Active</span>
      `;
      vendorGrid.appendChild(card);
    });
  }

  // Configure Quantity Selector Block for Role
  const qtyInput = document.getElementById('bis-modal-qty-input');
  const qtyLabel = document.getElementById('bis-modal-qty-label');
  const qtyRoleInd = document.getElementById('bis-modal-qty-role-indicator');
  const draftBtn = document.getElementById('bis-modal-draft-btn');

  if (currentUser.role === 'buyer') {
    if (qtyLabel) qtyLabel.textContent = 'Required Procurement Quantity:';
    if (qtyRoleInd) qtyRoleInd.textContent = 'Buyer Procurement Selection';
    if (qtyInput) qtyInput.value = r.qty || '10,000 units';

    if (draftBtn) {
      draftBtn.style.display = 'inline-block';
      draftBtn.textContent = 'Draft Official RFQ for this Product';
      draftBtn.onclick = () => {
        const selectedQty = qtyInput ? qtyInput.value : '10,000 units';
        draftSpecificRecommendation(r, selectedQty);
        toggleModal('bis-detail-modal', false);
      };
    }
  } else if (currentUser.role === 'seller') {
    if (qtyLabel) qtyLabel.textContent = 'Allowed Supply Capacity (Limit):';
    if (qtyRoleInd) qtyRoleInd.textContent = 'Seller Capacity Control';
    if (qtyInput) qtyInput.value = currentUser.capacity || '25,000 units / month';

    if (draftBtn) {
      draftBtn.style.display = 'inline-block';
      draftBtn.textContent = 'Update Allowed Supply Capacity';
      draftBtn.onclick = () => {
        const newCap = qtyInput ? qtyInput.value : '25,000 units / month';
        currentUser.capacity = newCap;
        showToast(`Allowed supply capacity limit updated to ${newCap}!`, 'success');
        addAuditLog(currentUser.email, `Updated certified supply capacity limit to ${newCap}.`);
        toggleModal('bis-detail-modal', false);
      };
    }
  } else {
    if (qtyLabel) qtyLabel.textContent = 'Standard Quantity Reference:';
    if (qtyRoleInd) qtyRoleInd.textContent = 'Public Access View';
    if (qtyInput) qtyInput.value = '10,000 units';

    if (draftBtn) {
      draftBtn.style.display = 'inline-block';
      draftBtn.textContent = 'Sign In to Draft RFQ';
      draftBtn.onclick = () => {
        toggleModal('bis-detail-modal', false);
        toggleModal('auth-modal', true);
      };
    }
  }

  // Reset to Overview tab
  document.querySelectorAll('.bis-tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'overview') btn.classList.add('active');
    else btn.classList.remove('active');
  });
  document.getElementById('bis-tab-overview').style.display = 'block';
  document.getElementById('bis-tab-compliance').style.display = 'none';
  document.getElementById('bis-tab-manufacturers').style.display = 'none';

  toggleModal('bis-detail-modal', true);
}

function handleSaveStandard() {
  const stdCode = document.getElementById('bis-modal-code').textContent;
  if (!currentUser.savedStandards) currentUser.savedStandards = [];
  
  if (!currentUser.savedStandards.includes(stdCode)) {
    currentUser.savedStandards.push(`Standard Reference: ${stdCode}`);
    addAuditLog(currentUser.email, `Saved standard reference: ${stdCode}.`);
    showToast(`Standard ${stdCode} saved to your profile.`, 'success');
    
    const saveBtn = document.getElementById('bis-modal-save-btn');
    saveBtn.textContent = 'Saved Standard';
    saveBtn.disabled = true;
  }
}

// Expose modal activation globally for inline table events
window.showBISModalGlobal = (standardCode) => {
  showBISModal(standardCode);
};

// ==========================================================================
// 15. NOTIFICATIONS & SYSTEM LOGS UTILITIES
// ==========================================================================

function renderNotifications() {
  const list = document.getElementById('notifications-list');
  const badge = document.getElementById('notification-badge');
  
  list.innerHTML = '';
  
  const unreadCount = notifications.filter(n => n.unread).length;
  if (unreadCount > 0) {
    badge.style.display = 'flex';
    badge.textContent = unreadCount;
  } else {
    badge.style.display = 'none';
  }

  if (notifications.length === 0) {
    list.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">No notifications.</div>`;
    return;
  }

  notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = `notification-item ${n.unread ? 'unread' : ''}`;
    item.innerHTML = `
      <div class="notification-icon-wrapper ${n.type}">
        ${n.type === 'success' ? '✓' : n.type === 'warning' ? '⚠' : 'ℹ'}
      </div>
      <div class="notification-content">
        <p>${n.text}</p>
        <span class="notification-time">${n.time}</span>
      </div>
    `;
    list.appendChild(item);
  });
}

function addNotification(type, text) {
  const newNotif = {
    id: Date.now(),
    type,
    text,
    time: 'Just now',
    unread: true
  };
  notifications.unshift(newNotif);
  renderNotifications();
  showToast(text, type);
}

function markNotificationsRead() {
  notifications.forEach(n => n.unread = false);
  renderNotifications();
}

function addAuditLog(user, action) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  systemAuditLogs.unshift({ timestamp, user, action });
}

// ==========================================================================
// 16. TOASTS & MODAL ANIMATION TRIGGERS
// ==========================================================================

function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}

function showToast(message, type = 'info') {
  // Create or reuse the toast container
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  // Slide out and remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
