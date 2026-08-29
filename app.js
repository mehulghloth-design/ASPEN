/* ==========================================================================
   ASPEN — MAIN APPLICATION ENGINE & STATE MANAGEMENT
   ========================================================================== */

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

let currentUser = MOCK_USERS.public;
let activePage = 'home';
let notifications = [...MOCK_NOTIFICATIONS];
let systemAuditLogs = [...MOCK_AUDIT_LOGS];
let currentSearchQuery = '';
let parsedSearchResult = null;

// ==========================================================================
// 3. APPLICATION INITIALIZATION & CORE EVENTS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initUIComponents();
  navigateTo('home');
});

function initUIComponents() {
  // Theme Toggle Button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Role Selector Dropdown
  const roleSelect = document.getElementById('role-quick-select');
  roleSelect.value = currentUser.role;
  roleSelect.addEventListener('change', (e) => {
    switchRole(e.target.value);
  });

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

  // Authentication Modal Close
  document.getElementById('auth-modal-close').addEventListener('click', () => {
    toggleModal('auth-modal', false);
  });

  // Authentication Form Submit
  const authForm = document.getElementById('auth-form');
  authForm.addEventListener('submit', handleLoginSubmit);

  // Auth Modal Tab Buttons
  const authTabs = document.querySelectorAll('.auth-tab-btn');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      
      // Update form defaults to match role selection
      const role = tab.dataset.role;
      const emailInput = document.getElementById('auth-email');
      if (role === 'buyer') {
        emailInput.value = 'buyer@aspen.gov';
      } else if (role === 'seller') {
        emailInput.value = 'seller@aspen.gov';
      } else if (role === 'admin') {
        emailInput.value = 'admin@aspen.gov';
      }
    });
  });

  // Profile trigger authentication trigger fallback
  const authActionBtn = document.getElementById('auth-action-btn');
  authActionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUser.role === 'public') {
      toggleModal('auth-modal', true);
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
  document.getElementById('bis-modal-download-btn').addEventListener('click', () => {
    showToast('Mock standard PDF download started.', 'success');
  });

  // Render initial profile state and sidebar links
  updateRoleIdentityUI();
  renderNotifications();
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
  currentUser = MOCK_USERS[role];
  
  // Set dropdown indicator select sync
  document.getElementById('role-quick-select').value = role;
  
  // Clear search results
  parsedSearchResult = null;
  
  updateRoleIdentityUI();
  
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

function handleLoginSubmit(e) {
  e.preventDefault();
  const activeTabBtn = document.querySelector('.auth-role-tabs .auth-tab-btn.active');
  const selectedRole = activeTabBtn.dataset.role;
  
  toggleModal('auth-modal', false);
  switchRole(selectedRole);
}

// ==========================================================================
// 5. ROUTING & RENDER ENGINE
// ==========================================================================

function navigateTo(pageId) {
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
  window.scrollTo(0, 0);
}

const NAV_ICONS = {
  home: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"/><path d="M9 21V12h6v9"/></svg>`,
  categories: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h13a1 1 0 0 1 1 1v3H7z"/><path d="M5 7h15a1 1 0 0 1 1 1v3H5z"/><path d="M3 11h18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/><rect x="9" y="14" width="6" height="3" rx="0.5"/></svg>`,
  bis: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7.5"/><polyline points="8.5 12 11 14.5 15.5 9.5"/><rect x="10.5" y="1" width="3" height="3" rx="0.5"/><circle cx="21" cy="12" r="1.5"/><rect x="10.5" y="20" width="3" height="3" rx="0.5"/><circle cx="3" cy="12" r="1.5"/></svg>`,
  active: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="15" height="18" rx="2"/><line x1="2" y1="6" x2="6" y2="6"/><line x1="2" y1="10" x2="6" y2="10"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="2" y1="18" x2="6" y2="18"/><circle cx="12" cy="9.5" r="2.5"/><path d="M9.2 15c0-1.5 1.2-2.5 2.8-2.5s2.8 1 2.8 2.5"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
  products: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  settings: `<svg class="nav-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

function renderSidebarNav() {
  const navContainer = document.getElementById('sidebar-nav');
  navContainer.innerHTML = '';
  
  let menuItems = [];
  
  if (currentUser.role === 'public') {
    menuItems = [
      { id: 'home', label: 'Home', icon: NAV_ICONS.home },
      { id: 'categories', label: 'Categories', icon: NAV_ICONS.categories },
      { id: 'active', label: 'Active', icon: NAV_ICONS.active },
      { id: 'bis', label: 'BIS', icon: NAV_ICONS.bis },
      { id: 'settings', label: 'Settings', icon: NAV_ICONS.settings }
    ];
  } else if (currentUser.role === 'buyer') {
    menuItems = [
      { id: 'home', label: 'Home', icon: NAV_ICONS.home },
      { id: 'categories', label: 'Categories', icon: NAV_ICONS.categories },
      { id: 'active', label: 'Active', icon: NAV_ICONS.active },
      { id: 'bis', label: 'BIS', icon: NAV_ICONS.bis }
    ];
  } else if (currentUser.role === 'seller') {
    menuItems = [
      { id: 'home', label: 'Home', icon: NAV_ICONS.home },
      { id: 'my-products', label: 'Products', icon: NAV_ICONS.products },
      { id: 'active', label: 'Opportunities', icon: NAV_ICONS.active },
      { id: 'bis', label: 'BIS', icon: NAV_ICONS.bis }
    ];
  } else if (currentUser.role === 'admin') {
    menuItems = [
      { id: 'admin-dashboard', label: 'Dashboard', icon: NAV_ICONS.home },
      { id: 'admin-users', label: 'Users', icon: NAV_ICONS.active },
      { id: 'bis', label: 'BIS', icon: NAV_ICONS.bis },
      { id: 'categories', label: 'Categories', icon: NAV_ICONS.categories },
      { id: 'settings', label: 'Settings', icon: NAV_ICONS.settings }
    ];
  }
  
  menuItems.forEach(item => {
    const navLink = document.createElement('a');
    navLink.className = `nav-item ${activePage === item.id ? 'active' : ''}`;
    navLink.dataset.page = item.id;
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
      <h1 class="home-title">What do you need to procure?</h1>
      
      <div class="pill-search-bar-wrapper">
        <svg class="search-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="main-search-input" class="pill-search-input" placeholder="Describe your requirement in natural language..." value="${currentSearchQuery}">
      </div>
      
      <button id="search-action-btn-trigger" class="navy-analyze-btn">Analyze</button>
      
      <div class="popular-categories-section">
        <h3 class="popular-categories-title">Popular Categories</h3>
        <div class="popular-categories-grid">
          <div class="popular-cat-card" data-cat="Medical">Medical</div>
          <div class="popular-cat-card" data-cat="Electrical">Electrical</div>
          <div class="popular-cat-card" data-cat="Mechanical">Mechanical</div>
          <div class="popular-cat-card" data-cat="Laboratory">Lab</div>
        </div>
      </div>
      
      <div class="ai-tip-banner" id="home-ai-tip-banner" style="cursor:pointer;">
        AI Tip: "We need 5,000 water pumps for municipal use."
      </div>
    `;
  } 
  else if (role === 'buyer') {
    homeWrapper.innerHTML = `
      <h1 class="home-title">Describe what you need</h1>
      
      <div class="pill-search-bar-wrapper">
        <svg class="search-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="main-search-input" class="pill-search-input" placeholder="We need 10,000 industrial water pumps..." value="${currentSearchQuery}">
      </div>
      
      <button id="search-action-btn-trigger" class="navy-analyze-btn">Analyze</button>
      
      <div class="buyer-pill-row">
        <div class="buyer-pill-card standards" id="buyer-standards-widget">Standards</div>
        <div class="buyer-pill-card specification" id="buyer-spec-widget">Specification</div>
        <div class="buyer-pill-card manufacturers" id="buyer-mfrs-widget">Manufacturers</div>
      </div>
    `;
  } 
  else if (role === 'seller') {
    homeWrapper.innerHTML = `
      <div class="seller-opp-section">
        <h2 class="seller-opp-title">New Procurement Opportunities</h2>
        
        <div class="opp-rows-container">
          <div class="opp-row-item" data-query="We need cotton bandage cloth for government hospitals">
            <span class="opp-row-title">Cotton Bandage Cloth</span>
            <span class="opp-row-meta">Match 96% • Government Hospital</span>
          </div>
          <div class="opp-row-item" data-query="Find BIS standards for laboratory glass tubes">
            <span class="opp-row-title">Laboratory Glass Tubes</span>
            <span class="opp-row-meta">Match 91% • Research Institute</span>
          </div>
        </div>
        
        <div class="seller-pill-row">
          <div class="seller-pill-card active-rfqs" id="seller-rfq-widget">Active RFQs</div>
          <div class="seller-pill-card bis-status" id="seller-bis-widget">BIS Status</div>
          <div class="seller-pill-card capacity" id="seller-cap-widget">Capacity</div>
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
      renderCategoriesPageFiltered(card.dataset.cat);
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
    container.querySelector('#buyer-spec-widget').addEventListener('click', () => renderCategoriesPageFiltered('All'));
    container.querySelector('#buyer-mfrs-widget').addEventListener('click', () => renderCategoriesPageFiltered('All'));
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
      <h3>BIS Highlight</h3>
      <button class="text-btn" id="home-view-all-bis">Browse Registry</button>
    </div>
    <div class="bis-highlights-grid" id="home-bis-list">
      <!-- Loaded dynamically below -->
    </div>
  `;

  const bisList = container.querySelector('#home-bis-list');
  MOCK_BIS_STANDARDS.slice(0, 3).forEach(std => {
    const item = document.createElement('div');
    item.className = 'card bis-highlight-card';
    item.innerHTML = `
      <div class="bis-card-code">${std.code}</div>
      <div class="bis-card-center">
        <div class="bis-card-title">${std.title}</div>
        <div class="bis-card-sub">${std.industry} • Published ${std.date}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    item.addEventListener('click', () => showBISModal(std.code));
    bisList.appendChild(item);
  });

  container.querySelector('#home-view-all-bis').addEventListener('click', () => {
    navigateTo('bis');
  });
}

function renderBuyerHomeWidgets(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <h3>My Active Requirements</h3>
      <button class="text-btn" id="home-view-all-rfqs">Track RFQs</button>
    </div>
    <div class="activities-list">
      ${currentUser.rfqs.map(rfq => `
        <div class="card activity-item">
          <div class="activity-left">
            <span class="activity-indicator-dot ${rfq.status === 'Active' ? 'success' : 'warning'}"></span>
            <div class="activity-text-info">
              <span class="activity-title">${rfq.product}</span>
              <span class="activity-sub">${rfq.qty} • Bids Received: ${rfq.bids}</span>
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
      <h3>Certification Status</h3>
      <button class="text-btn" id="home-view-all-products">Products</button>
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

function handleSearch(query) {
  if (!query.trim()) {
    showToast('Please enter a procurement description to analyze.', 'warning');
    return;
  }

  currentSearchQuery = query;
  
  // Set UI state to show search parser working
  const indicator = document.getElementById('search-indicator');
  indicator.style.display = 'flex';
  
  // Simulated NLU delay
  setTimeout(() => {
    indicator.style.display = 'none';
    parsedSearchResult = simulateNLUParser(query);
    showNLUModal();
  }, 600);
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
    
    stdRow.querySelector('#nlu-view-std-btn').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      showBISModal(std.code);
    });
    
    standardsContainer.appendChild(stdRow);
  } else {
    standardsContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No exact matching BIS Standard could be verified automatically for this query.</p>`;
  }

  // Adjust modal actions based on user role
  const actionsContainer = document.getElementById('nlu-actions-container');
  actionsContainer.innerHTML = '';

  if (currentUser.role === 'public') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-close">Close Analysis</button>
      <button class="primary-btn" id="nlu-action-login">Sign In to Procure</button>
    `;
    actionsContainer.querySelector('#nlu-action-close').addEventListener('click', () => toggleModal('nlu-modal', false));
    actionsContainer.querySelector('#nlu-action-login').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      toggleModal('auth-modal', true);
    });
  } 
  else if (currentUser.role === 'buyer') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-save">Save Requirement</button>
      <button class="primary-btn" id="nlu-action-rfq">Draft Official RFQ</button>
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
      <button class="secondary-btn" id="nlu-action-close">Close</button>
      <button class="primary-btn" id="nlu-action-opp">View Active Tenders</button>
    `;
    actionsContainer.querySelector('#nlu-action-close').addEventListener('click', () => toggleModal('nlu-modal', false));
    actionsContainer.querySelector('#nlu-action-opp').addEventListener('click', () => {
      toggleModal('nlu-modal', false);
      navigateTo('active');
    });
  } 
  else if (currentUser.role === 'admin') {
    actionsContainer.innerHTML = `
      <button class="secondary-btn" id="nlu-action-close">Close</button>
      <button class="primary-btn" id="nlu-action-edit-std">Edit Associated Standard</button>
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

function createRFQFromParsed() {
  const newRfq = {
    id: `RFQ-2026-00${currentUser.rfqs.length + 5}`,
    product: parsedSearchResult.product,
    qty: parsedSearchResult.quantity === 'Not Specified' ? '10,000 units' : parsedSearchResult.quantity,
    date: new Date().toISOString().split('T')[0],
    status: 'Active',
    bids: 0,
    standard: parsedSearchResult.matchedStandard ? parsedSearchResult.matchedStandard.code : 'IS 758'
  };

  currentUser.rfqs.unshift(newRfq);
  
  // Add notification and audit log
  addNotification('info', `Tender Drafted: RFQ for ${newRfq.product} has been published successfully.`);
  addAuditLog(currentUser.email, `Published official tender RFQ ${newRfq.id} requesting compliance against ${newRfq.standard}.`);

  showToast(`Successfully created ${newRfq.id}!`, 'success');
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
  container.innerHTML = `
    <div class="page-actions-bar">
      <div class="page-title-area">
        <h1>My Procurement RFQs</h1>
        <p>Manage and audit bids received against your active procurement standards.</p>
      </div>
      <button class="primary-btn" id="buyer-new-rfq-btn">Create Requirement</button>
    </div>
    
    <div class="product-table-wrapper">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>RFQ ID</th>
            <th>Requirement Details</th>
            <th>Required Standard</th>
            <th>Quantity Requested</th>
            <th>Date Published</th>
            <th>Bids Received</th>
            <th>Tender Status</th>
          </tr>
        </thead>
        <tbody>
          ${currentUser.rfqs.map(rfq => `
            <tr>
              <td class="table-cell-title">${rfq.id}</td>
              <td>${rfq.product}</td>
              <td><span class="bis-card-code" style="cursor:pointer;" onclick="window.showBISModalGlobal('${rfq.standard}')">${rfq.standard}</span></td>
              <td>${rfq.qty}</td>
              <td>${rfq.date}</td>
              <td><span class="badge badge-info">${rfq.bids} Bids</span></td>
              <td><span class="badge ${rfq.status === 'Active' ? 'badge-success' : 'badge-warning'}">${rfq.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector('#buyer-new-rfq-btn').addEventListener('click', () => {
    navigateTo('home');
    showToast('Use the Central Search bar to formulate compliance targets first.', 'info');
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
        <h1>My Manufacturing Portfolio</h1>
        <p>List and verify your products against national BIS standards to unlock active opportunities.</p>
      </div>
      <button class="primary-btn" id="seller-add-prod-btn">Register New Product</button>
    </div>

    <div class="product-table-wrapper">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>Product Code</th>
            <th>Product Designation</th>
            <th>Category</th>
            <th>Audit Standard</th>
            <th>National Registry Code</th>
            <th>Compliance Status</th>
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
          <label>BIS Standard Target</label>
          <select id="new-prod-std" class="form-group" style="padding: 0.75rem 1rem; border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-secondary);">
            <option value="IS 758">IS 758 (Surgical Dressings Gauze)</option>
            <option value="IS 4381">IS 4381 (Laboratory Borosilicate Glass)</option>
            <option value="IS 1520">IS 1520 (Agricultural Pumps)</option>
            <option value="IS 302">IS 302 (Electrical Appliances)</option>
          </select>
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
  // Sellers view Buyer RFQs and submit bids
  const allBuyerRfqs = [];
  Object.values(MOCK_USERS).forEach(user => {
    if (user.role === 'buyer' && user.rfqs) {
      allBuyerRfqs.push(...user.rfqs);
    }
  });

  container.innerHTML = `
    <div class="page-title-area">
      <h1>Active Bidding Tenders</h1>
      <p>Browse active government requirements matching your certified standard capabilities.</p>
    </div>

    <div class="product-table-wrapper">
      <table class="aspen-table">
        <thead>
          <tr>
            <th>RFQ ID</th>
            <th>Required Product</th>
            <th>Required Standard</th>
            <th>Quantity Slated</th>
            <th>Bidding Close Date</th>
            <th>Your Standard Qualification</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${allBuyerRfqs.map(rfq => {
            const matchesStandard = currentUser.products.some(p => p.standard === rfq.standard && p.status === 'Certified');
            return `
              <tr>
                <td class="table-cell-title">${rfq.id}</td>
                <td>${rfq.product}</td>
                <td><span class="bis-card-code">${rfq.standard}</span></td>
                <td>${rfq.qty}</td>
                <td>${rfq.date}</td>
                <td>
                  ${matchesStandard 
                    ? `<span class="badge badge-success">✓ Qualified Manufacturer</span>` 
                    : `<span class="badge badge-danger">✗ Standard Uncertified</span>`
                  }
                </td>
                <td>
                  <button class="primary-btn btn-sm" ${!matchesStandard ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="window.submitSellerBidGlobal('${rfq.id}')">
                    Submit Compliant Bid
                  </button>
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
  showToast(`Compliant bid submitted successfully against ${rfqId}.`, 'success');
  addAuditLog(currentUser.email, `Submitted certified bid against procurement standard requirements for ${rfqId}.`);
  
  // Update bid count in mock data
  Object.values(MOCK_USERS).forEach(u => {
    if (u.role === 'buyer' && u.rfqs) {
      const targetRfq = u.rfqs.find(r => r.id === rfqId);
      if (targetRfq) {
        targetRfq.bids++;
      }
    }
  });
  
  navigateTo('active');
};

// ==========================================================================
// 10. ADMIN DASHBOARD & VERIFICATIONS
// ==========================================================================

function renderAdminDashboard(container) {
  // Statistics Row
  const statsRow = document.createElement('div');
  statsRow.className = 'stats-row';
  statsRow.innerHTML = `
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">Pending Verifications</span>
        <span class="stat-value" id="admin-stat-pending">2</span>
        <span class="stat-change up">↑ Audits Slated</span>
      </div>
      <div class="stat-icon-wrapper">👥</div>
    </div>
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">Active RFQs</span>
        <span class="stat-value">6</span>
        <span class="stat-change up">↑ Bidding Active</span>
      </div>
      <div class="stat-icon-wrapper">⚡</div>
    </div>
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">Total BIS Codes</span>
        <span class="stat-value">${MOCK_BIS_STANDARDS.length}</span>
        <span class="stat-change">Active Registry</span>
      </div>
      <div class="stat-icon-wrapper">📘</div>
    </div>
    <div class="card stat-card">
      <div class="stat-left">
        <span class="stat-label">System Performance</span>
        <span class="stat-value">99.8%</span>
        <span class="stat-change up">↑ SLA Compliant</span>
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
      <h3>Monthly Verification Bids Audited</h3>
      <span class="badge badge-info">2026 Year Overview</span>
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
      <h3>Active System Logs</h3>
      <button class="text-btn" id="admin-view-all-logs">View Logs</button>
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

  // Set pending count dynamically
  const pendingCount = MOCK_VERIFICATION_LISTS.buyers.filter(b => b.status === 'Pending Review').length +
                       MOCK_VERIFICATION_LISTS.sellers.filter(s => s.status === 'Pending Review').length;
  statsRow.querySelector('#admin-stat-pending').textContent = pendingCount;

  auditCol.querySelector('#admin-view-all-logs').addEventListener('click', () => {
    navigateTo('admin-audit');
  });
}

function renderAdminUsers(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>Profile Verification Registry</h1>
      <p>Review and verify identities for government purchasing officers and supplier organizations.</p>
    </div>
    
    <div class="dashboard-section">
      <div class="section-header-row">
        <h3>Buyer Applications Pending Review</h3>
      </div>
      <div class="product-table-wrapper">
        <table class="aspen-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Organization</th>
              <th>Representative Officer</th>
              <th>Email Address</th>
              <th>Sign-up Date</th>
              <th>Status</th>
              <th>Action</th>
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
                    ? `<button class="secondary-btn btn-sm" disabled style="opacity:0.5; cursor:not-allowed;">Approved</button>`
                    : `<button class="primary-btn btn-sm" onclick="window.verifyUserGlobal('buyer', '${buyer.id}')">Verify</button>`
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
        <h3>Seller Applications Pending Review</h3>
      </div>
      <div class="product-table-wrapper">
        <table class="aspen-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Manufacturing Org</th>
              <th>Representative Contact</th>
              <th>Email Address</th>
              <th>Sign-up Date</th>
              <th>Status</th>
              <th>Action</th>
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
                    ? `<button class="secondary-btn btn-sm" disabled style="opacity:0.5; cursor:not-allowed;">Approved</button>`
                    : `<button class="primary-btn btn-sm" onclick="window.verifyUserGlobal('seller', '${seller.id}')">Verify</button>`
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
    showToast(`Successfully verified profile ${userId}.`, 'success');
    
    // Refresh page to show updated verified state
    navigateTo('admin-users');
  }
};

function renderAdminAnalytics(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>Procurement & Compliance Analytics</h1>
      <p>Performance tracking metrics, standards validation logs, and activity index metrics.</p>
    </div>
    
    <div class="stats-row">
      <div class="card stat-card">
        <div class="stat-left">
          <span class="stat-label">Total Volume Searched</span>
          <span class="stat-value">14.8M Units</span>
          <span class="stat-change up">↑ 12% Month-on-Month</span>
        </div>
        <div class="stat-icon-wrapper">📈</div>
      </div>
      <div class="card stat-card">
        <div class="stat-left">
          <span class="stat-label">Standards Audit Match Rate</span>
          <span class="stat-value">94.2%</span>
          <span class="stat-change up">↑ High Match Accuracy</span>
        </div>
        <div class="stat-icon-wrapper">✓</div>
      </div>
      <div class="card stat-card">
        <div class="stat-left">
          <span class="stat-label">Unique Bidding Manufacturers</span>
          <span class="stat-value">1,402</span>
          <span class="stat-change">Active in Grid</span>
        </div>
        <div class="stat-icon-wrapper">🏭</div>
      </div>
    </div>

    <div class="card" style="padding: 2rem;">
      <h3 style="margin-bottom:1rem;">AI Natural Language Matching Accuracy by Segment</h3>
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
      <h1>System Cryptographic Audit Logs</h1>
      <p>Secure audit trails tracking dashboard transitions, verifications, registry modifications, and security overrides.</p>
    </div>
    
    <div class="card" style="padding:0;">
      <div style="padding:1rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
        <span class="badge badge-info">${systemAuditLogs.length} Registered Events</span>
        <button class="secondary-btn btn-sm" id="clear-audit-logs-btn">Clear Security Log</button>
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
    showToast('Audit log registry cleared.', 'info');
    renderAdminAudit(container);
  });
}

// ==========================================================================
// 11. CATEGORIES PAGE (PRODUCT CATALOG GRID)
// ==========================================================================

function renderCategoriesPage(container) {
  renderCategoriesPageFiltered(null, container);
}

function renderCategoriesPageFiltered(filterCategory, container) {
  const targetContainer = container || document.getElementById('app-content-body');
  targetContainer.innerHTML = '';

  const activeFilter = filterCategory || 'All';

  // Build Filters bar Header
  const pageHeader = document.createElement('div');
  pageHeader.className = 'page-title-area';
  pageHeader.innerHTML = `
    <h1>Product & Component Catalog</h1>
    <p>Browse active procurement inventories mapping directly to validated standard requirements.</p>
  `;
  targetContainer.appendChild(pageHeader);

  // Filters Controls
  const filtersBar = document.createElement('div');
  filtersBar.className = 'filters-bar';
  filtersBar.innerHTML = `
    <div class="filter-group">
      <span class="filter-label">Segment Filter</span>
      <select id="catalog-filter-select" class="filter-select">
        <option value="All" ${activeFilter === 'All' ? 'selected' : ''}>All Categories</option>
        <option value="Medical" ${activeFilter === 'Medical' ? 'selected' : ''}>Medical</option>
        <option value="Electrical" ${activeFilter === 'Electrical' ? 'selected' : ''}>Electrical</option>
        <option value="Construction" ${activeFilter === 'Construction' ? 'selected' : ''}>Construction</option>
        <option value="Laboratory" ${activeFilter === 'Laboratory' ? 'selected' : ''}>Laboratory</option>
        <option value="Mechanical" ${activeFilter === 'Mechanical' ? 'selected' : ''}>Mechanical</option>
      </select>
    </div>

    <div class="filter-group">
      <span class="filter-label">Availability</span>
      <select id="catalog-avail-select" class="filter-select">
        <option value="All">All Stocks</option>
        <option value="In Stock">In Stock Only</option>
      </select>
    </div>
    
    <input type="text" id="catalog-search-input" class="filter-search-input" placeholder="Search standard products...">
  `;
  targetContainer.appendChild(filtersBar);

  // Catalog Grid Container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'products-grid';
  targetContainer.appendChild(gridContainer);

  // Filter and render products
  const applyFilters = () => {
    const selectedCat = filtersBar.querySelector('#catalog-filter-select').value;
    const selectedAvail = filtersBar.querySelector('#catalog-avail-select').value;
    const searchQuery = filtersBar.querySelector('#catalog-search-input').value.toLowerCase();

    gridContainer.innerHTML = '';

    const filtered = MOCK_PRODUCTS.filter(p => {
      const matchCat = selectedCat === 'All' || p.category === selectedCat;
      const matchAvail = selectedAvail === 'All' || p.availability === selectedAvail;
      const matchQuery = p.name.toLowerCase().includes(searchQuery) || p.standard.toLowerCase().includes(searchQuery);
      return matchCat && matchAvail && matchQuery;
    });

    if (filtered.length === 0) {
      gridContainer.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No products match selected audit parameters.</div>`;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card product-card';
      card.innerHTML = `
        <div class="product-card-top">
          <div>
            <span class="product-card-category">${p.category}</span>
            <h3 class="product-card-title">${p.name}</h3>
          </div>
          <span class="bis-card-code" style="cursor:pointer;" onclick="window.showBISModalGlobal('${p.standard}')">${p.standard}</span>
        </div>
        <div class="product-card-specs">
          <div class="spec-line">
            <span class="spec-label">Manufacturer</span>
            <span class="spec-val">${p.manufacturer}</span>
          </div>
          <div class="spec-line">
            <span class="spec-label">Stock Status</span>
            <span class="spec-val">${p.availability}</span>
          </div>
        </div>
        <div class="product-card-footer">
          <button class="primary-btn btn-sm" onclick="window.showProductProcureAlertGlobal('${p.id}')">Audit Compliance</button>
        </div>
      `;
      gridContainer.appendChild(card);
    });
  };

  // Attach filter change listeners
  filtersBar.querySelector('#catalog-filter-select').addEventListener('change', applyFilters);
  filtersBar.querySelector('#catalog-avail-select').addEventListener('change', applyFilters);
  filtersBar.querySelector('#catalog-search-input').addEventListener('input', applyFilters);

  // Run initial render
  applyFilters();
}

window.showProductProcureAlertGlobal = (prodId) => {
  const prod = MOCK_PRODUCTS.find(p => p.id === prodId);
  if (prod) {
    showToast(`Compliance check: ${prod.name} holds active BIS standard license under code ${prod.standard}.`, 'success');
  }
};

// ==========================================================================
// 12. BIS STANDARDS DIRECTORY PAGE
// ==========================================================================

function renderBISPage(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>National Indian Standards Registry (BIS)</h1>
      <p>Search official Bureau of Indian Standards (IS) certifications, directives, and verified manufacturer databases.</p>
    </div>

    <div class="filters-bar">
      <div class="filter-group">
        <span class="filter-label">Industrial Domain</span>
        <select id="bis-domain-select" class="filter-select">
          <option value="All">All Domains</option>
          <option value="Medical">Medical / Healthcare</option>
          <option value="Electrical">Electrical Safety</option>
          <option value="Construction">Infrastructure & Construction</option>
          <option value="Laboratory">Laboratory Standards</option>
          <option value="Mechanical">Mechanical Engineering</option>
        </select>
      </div>
      <input type="text" id="bis-search-input" class="filter-search-input" placeholder="Search by Standard code or title...">
    </div>

    <div class="bis-list" id="bis-standards-grid-container">
      <!-- Loaded dynamically -->
    </div>
  `;

  const domainSelect = container.querySelector('#bis-domain-select');
  const searchInput = container.querySelector('#bis-search-input');
  const gridContainer = container.querySelector('#bis-standards-grid-container');

  const renderList = () => {
    gridContainer.innerHTML = '';
    const selectedDomain = domainSelect.value;
    const searchVal = searchInput.value.toLowerCase();

    const filtered = MOCK_BIS_STANDARDS.filter(s => {
      const matchDomain = selectedDomain === 'All' || s.industry.includes(selectedDomain);
      const matchSearch = s.code.toLowerCase().includes(searchVal) || s.title.toLowerCase().includes(searchVal) || s.description.toLowerCase().includes(searchVal);
      return matchDomain && matchSearch;
    });

    if (filtered.length === 0) {
      gridContainer.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No standards found matching your criteria.</div>`;
      return;
    }

    filtered.forEach(std => {
      const card = document.createElement('div');
      card.className = 'card bis-full-card';
      card.innerHTML = `
        <div class="bis-full-card-top">
          <span class="bis-card-code">${std.code}</span>
          <span class="badge badge-success">Mandatory Standard</span>
        </div>
        <div>
          <h3 class="bis-full-card-title">${std.title}</h3>
          <p class="meta-tag" style="margin-top:0.25rem;">${std.industry}</p>
        </div>
        <p class="bis-full-card-description">${std.description}</p>
        <div class="bis-full-card-meta">
          <span>Committee: ${std.committee.split(' ')[0]}</span>
          <span>Published: ${std.date}</span>
        </div>
        <button class="secondary-btn btn-sm btn-full" onclick="window.showBISModalGlobal('${std.code}')">View Verification Protocol</button>
      `;
      gridContainer.appendChild(card);
    });
  };

  domainSelect.addEventListener('change', renderList);
  searchInput.addEventListener('input', renderList);
  
  renderList();
}

// ==========================================================================
// 13. SETTINGS PAGE
// ==========================================================================

function renderSettingsPage(container) {
  container.innerHTML = `
    <div class="page-title-area">
      <h1>Platform Settings</h1>
      <p>Configure user preferences, notification rules, and role settings.</p>
    </div>
    
    <div class="card" style="max-width: 600px; display:flex; flex-direction:column; gap:1.5rem;">
      <h3>User Profile Parameters</h3>
      <div class="form-group">
        <label>Account Name</label>
        <input type="text" value="${currentUser.name}" readonly style="background-color:var(--bg-primary);">
      </div>
      <div class="form-group">
        <label>Organization Domain</label>
        <input type="text" value="${currentUser.org}" readonly style="background-color:var(--bg-primary);">
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" value="${currentUser.email}" readonly style="background-color:var(--bg-primary);">
      </div>

      <h3 style="margin-top:1rem; border-top:1px solid var(--border-color); padding-top:1.5rem;">Dashboard Configurations</h3>
      <div class="form-group" style="flex-direction:row; justify-content:space-between; align-items:center;">
        <div>
          <strong style="font-size:0.9rem; display:block;">Instant Notifications</strong>
          <span style="font-size:0.75rem; color:var(--text-muted);">Receive push updates for verification updates and RFQ bids.</span>
        </div>
        <input type="checkbox" checked style="width:20px; height:20px; cursor:pointer;">
      </div>
    </div>
  `;
}

// ==========================================================================
// 14. BIS DETAILS MODAL ENGINE
// ==========================================================================

function showBISModal(standardCode) {
  const std = MOCK_BIS_STANDARDS.find(s => s.code === standardCode);
  if (!std) return;

  document.getElementById('bis-modal-code').textContent = std.code;
  document.getElementById('bis-modal-title').textContent = std.title;
  document.getElementById('bis-modal-industry').textContent = std.industry;
  document.getElementById('bis-modal-description').textContent = std.description;
  document.getElementById('bis-modal-relevance').textContent = std.relevance;
  document.getElementById('bis-modal-date').textContent = std.date;
  document.getElementById('bis-modal-committee').textContent = std.committee;

  // Render certified vendors list inside modal
  const vendorGrid = document.getElementById('bis-modal-manufacturers-list');
  vendorGrid.innerHTML = '';

  std.manufacturers.forEach(m => {
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

  // Default to overview tab
  document.querySelectorAll('.bis-tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'overview') btn.classList.add('active');
    else btn.classList.remove('active');
  });
  document.getElementById('bis-tab-overview').style.display = 'block';
  document.getElementById('bis-tab-compliance').style.display = 'none';
  document.getElementById('bis-tab-manufacturers').style.display = 'none';

  // Toggle Save button text based on whether it is already saved
  const saveBtn = document.getElementById('bis-modal-save-btn');
  if (currentUser.role === 'buyer') {
    const isSaved = currentUser.savedStandards && currentUser.savedStandards.some(s => s.includes(std.code));
    saveBtn.style.display = 'block';
    saveBtn.textContent = isSaved ? 'Saved Standard' : 'Save Standard';
    saveBtn.disabled = isSaved;
  } else {
    saveBtn.style.display = 'none';
  }

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
