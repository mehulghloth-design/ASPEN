/* ==========================================================================
   ASPEN — FastAPI Client Module
   All calls to the FastAPI backend (ngrok) are centralised here.
   Change FASTAPI_BASE if the ngrok URL changes.
   ========================================================================== */

const FASTAPI_BASE = 'https://silo-travel-habitant.ngrok-free.dev';

// Common headers (ngrok requires this to skip the browser-warning page)
const FASTAPI_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
};

// ---------------------------------------------------------------------------
// POST /api/search — AI BIS standard search
// Returns: { search_query, results: [{ is_code, title, category,
//             match_metadata: { confidence_score, status }, specifications }] }
// ---------------------------------------------------------------------------
export async function searchBIS(query) {
  const res = await fetch(`${FASTAPI_BASE}/api/search`, {
    method: 'POST',
    headers: FASTAPI_HEADERS,
    body: JSON.stringify({ text: query }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// GET /api/categories — Category tree
// Returns: [{ category, sub_categories: [...] }]
// ---------------------------------------------------------------------------
export async function getCategories() {
  const res = await fetch(`${FASTAPI_BASE}/api/categories`, {
    headers: FASTAPI_HEADERS,
  });
  if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// GET /api/browse/{category}/{sub_category} — Browse BIS items
// Returns: { total, items: [{ id, is_code, title, status, specifications }] }
// ---------------------------------------------------------------------------
export async function browseItems(category, subCategory) {
  const cat = encodeURIComponent(category);
  const sub = encodeURIComponent(subCategory);
  const res = await fetch(`${FASTAPI_BASE}/api/browse/${cat}/${sub}`, {
    headers: FASTAPI_HEADERS,
  });
  if (!res.ok) throw new Error(`Browse failed: ${res.status}`);
  return res.json();
}
