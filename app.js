// Configuration for keyword highlighting
const HIGHLIGHT_WORDS = {
  'Scrum Master': 'red',
  'Project support': 'blue',
  'Deployment': 'green',
  'Testing': 'orange',
  'Sanity': 'red'
};

// Role mappings for normalization with extra variations to capture common misspellings and differences.
const ROLE_MAPPINGS = {
  // Project Manager Variations
  'proj mgr': 'project manager',
  'project manager': 'project manager',

  // PMO Variations
  'pmo': 'pmo consultant',
  'pm consultant': 'pmo consultant',

  // Technical Manager / Lead Variations
  'tech manager': 'technical manager',
  'technical manager': 'technical manager',
  'tech lead': 'technical manager / technical lead',

  // Principal Solution Architect Variations
  'principal sol': 'principal solution architect',
  'principal solution architect': 'principal solution architect',

  // QA Variations
  'qa lead': 'qa lead',
  'qa engineer': 'senior qa',         // Map QA Engineer to QA Lead
  'senior qa': 'senior qa',
  'qa / test': ['qa / test','qa','test'],
  'test': ['qa / test','qa','test'],
  'qa': ['qa / test','qa','test'],

  // Developer Variations
  'sr developer': ['developer / sr developer', 'sr developer', 'developer'],
  'developer': ['developer / sr developer', 'sr developer', 'developer'],
  'developer / sr developer': ['developer / sr developer', 'sr developer', 'developer'],

  // Release Manager / IT Engineer Variations
  'release manager': ['release manager', 'it engineer/ release manager', 'it engineer', 'release mgr'],
  'it engineer': ['release manager', 'it engineer/ release manager', 'it engineer'],

  // Business Analyst Variations
  'business analyst': 'solution architect / business analyst / dev lead / integration lead',
  'solution architect': 'solution architect / business analyst / dev lead / integration lead',
  'dev lead': 'solution architect / business analyst / dev lead / integration lead',
  'integration lead': 'solution architect / business analyst / dev lead / integration lead',
  'solution architect / business analyst / dev lead / integration lead': ['business analyst','solution architect','dev lead','integration lead']
};

// Invoice items array with default prices
const INVOICE_ITEMS = [
  { role: 'Project Manager', normalizedRole: 'project manager', offsite: 941, onsite: 1141 },
  { role: 'PMO Consultant', normalizedRole: 'pmo consultant', offsite: 750, onsite: 950 },
  { role: 'Senior Technical Manager', normalizedRole: 'senior technical manager', offsite: 842, onsite: 1042 },
  { role: 'Principal Solution Architect', normalizedRole: 'principal solution architect', offsite: 750, onsite: 950 },
  { role: 'QA Lead', normalizedRole: 'qa lead', offsite: 600, onsite: 800 },
  { role: 'Senior QA', normalizedRole: 'senior qa', offsite: 495, onsite: 695 },
  { role: 'Technical Manager / Technical Lead', normalizedRole: 'technical manager', offsite: 650, onsite: 850 },
  { role: 'Solution Architect / Business Analyst / Dev Lead / Integration Lead', normalizedRole: 'solution architect / business analyst / dev lead / integration lead', offsite: 700, onsite: 900 },
  { role: 'Developer / Sr. Developer', normalizedRole: 'developer / sr developer', offsite: 495, onsite: 695 },
  { role: 'IT Engineer', normalizedRole: 'it engineer', offsite: 495, onsite: 695 },
  { role: 'Release Manager / QA Analyst', normalizedRole: 'release manager', offsite: 495, onsite: 695 },
  { role: 'QA / Test', normalizedRole: 'qa / test', offsite: 395, onsite: 595 }
];

// Build a PRICE_MAPPING from INVOICE_ITEMS for easy lookup.
const PRICE_MAPPING = {};
INVOICE_ITEMS.forEach(item => {
  PRICE_MAPPING[item.normalizedRole] = { offsite: item.offsite, onsite: item.onsite, role: item.role };
});

// Helper: Given a normalized role, return its mapping.
function getMappedRole(roleName) {
  if (!roleName) return '';
  if (ROLE_MAPPINGS[roleName]) return ROLE_MAPPINGS[roleName];
  for (let key in ROLE_MAPPINGS) {
    if (roleName.indexOf(key) !== -1) return ROLE_MAPPINGS[key];
  }
  return roleName;
}

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const results = document.getElementById('results');
  const tbody = document.getElementById('data-table-body');
  const downloadBtn = document.getElementById('download-btn');
  const invoiceContainer = document.getElementById('invoice-container');

  let aggregatedData = [];
  let roleCounts = {};
  let roleLocationCounts = {}; // Format: "canonicalRole|locationType" => count

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-blue-50', 'border-blue-400');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('bg-blue-50', 'border-blue-400');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-blue-50', 'border-blue-400');
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFile(file);
  });

  function handleFile(file) {
    if (!file) return;
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4">Processing file, please wait...</td></tr>`;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const processed = processData(jsonData);
        aggregatedData = processed.aggregatedData;
        roleCounts = processed.roleCounts;
        roleLocationCounts = processed.roleLocationCounts;
        createInvoiceTableDynamic(roleLocationCounts);
        renderTable(aggregatedData);
        results.classList.remove('hidden');
      } catch (error) {
        console.error('Error processing file:', error);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-red-600">Error processing file: ${error.message}</td></tr>`;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // --- Data Processing Functions ---
  function processData(jsonData) {
    if (!jsonData || jsonData.length === 0) throw new Error('No data found in the file.');
    const headers = jsonData[0].map(h =>
      h.toString().toLowerCase().replace(/[/ ]/g, '_').replace(/[^a-z0-9_]/gi, '')
    );
    const columnMap = {
      date: headers.find(h => h.includes('date')),
      employee: headers.find(h => h.includes('empl') && h.includes('name')),
      hours: headers.find(h => h.includes('hours')),
      description: headers.find(h => h.includes('description')),
      location: headers.find(h => h.includes('location')) || headers.find(h => h.includes('site')),
      role: headers.find(h => h.includes('role')),
      project: headers.find(h => h.includes('project'))
    };
    const rows = jsonData.slice(1);
    const groupMap = new Map();
    const roleCounts = {};
    const roleLocationCounts = {}; // Format: "canonicalRole|locationType"

    rows.forEach(row => {
      const getValue = (colHeader) => {
        if (!colHeader) return '';
        const idx = headers.indexOf(colHeader);
        return idx >= 0 && row[idx] ? row[idx].toString().trim() : '';
      };
      const empName = getValue(columnMap.employee);
      if (!empName) return;
      if (!groupMap.has(empName)) {
        groupMap.set(empName, {
          employeeName: empName,
          totalHours: 0,
          days: new Set(),
          descriptions: new Set(),
          locationTypes: new Set(), // Will store "onsite" and/or "offsite"
          roles: new Set(),         // Canonical roles (using mapping)
          originalRoles: new Set(), // Original role text for display
          projects: new Set()
        });
      }
      const group = groupMap.get(empName);
      const hours = parseFloat(getValue(columnMap.hours)) || 0;
      group.totalHours += hours;
      const date = getValue(columnMap.date);
      if (date) group.days.add(date);
      const desc = getValue(columnMap.description);
      if (desc) group.descriptions.add(desc);
      
      // Process location. If value contains "/" or "-", split it.
      const locValue = getValue(columnMap.location);
      if (locValue) {
        if (locValue.includes('/') || locValue.includes('-')) {
          let parts = locValue.split(/[/\-]/);
          parts.forEach(p => {
            let trimmed = p.trim().toLowerCase();
            if (trimmed.includes('on')) group.locationTypes.add('onsite');
            if (trimmed.includes('off')) group.locationTypes.add('offsite');
          });
        } else {
          let trimmed = locValue.toLowerCase();
          if (trimmed.includes('on')) group.locationTypes.add('onsite');
          else if (trimmed.includes('off')) group.locationTypes.add('offsite');
          else group.locationTypes.add(trimmed);
        }
      }
      
      const role = getValue(columnMap.role);
      if (role) {
        group.originalRoles.add(role);
        // Normalize the role and then map it to a canonical value.
        let normRole = normalizeRole(role);
        let canonicalRole = getMappedRole(normRole);
        if (Array.isArray(canonicalRole)) {
          canonicalRole = canonicalRole[0]; // Take the first candidate if array.
        }
        group.roles.add(canonicalRole);
      }
      const proj = getValue(columnMap.project);
      if (proj) group.projects.add(proj);
    });
    
    // Build roleCounts and roleLocationCounts.
    groupMap.forEach(group => {
      group.roles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        group.locationTypes.forEach(locType => {
          const key = role + '|' + locType;
          roleLocationCounts[key] = (roleLocationCounts[key] || 0) + 1;
        });
      });
    });
    
    const output = [];
    groupMap.forEach(group => {
      const totalDays = group.days.size || 1;
      const avgHours = group.totalHours / totalDays;
      const manDays = group.totalHours / 8;
      const status = getStatus(avgHours);
      output.push({
        manDays: formatNumber(manDays),
        employeeName: group.employeeName,
        location: formatList(group.locationTypes),
        role: formatList(group.originalRoles),
        project: formatList(group.projects),
        totalHours: formatNumber(group.totalHours),
        avgHours: formatNumber(avgHours),
        status: status,
        summary: extractSummary(Array.from(group.descriptions).join(' | ')),
        description: status === 'Critical' ? Array.from(group.descriptions).join(' | ') : ''
      });
    });
    
    output.sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours));
    return {
      aggregatedData: output,
      roleCounts: roleCounts,
      roleLocationCounts: roleLocationCounts
    };
  }

  // --- Role Normalization ---
  function normalizeRole(role) {
    if (!role) return '';
    return role
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .replace(/\(.*\)/, '')
      .trim();
  }

  // --- Create Invoice Table Dynamically ---
  // For each key in roleLocationCounts with quantity > 0, we create a row.
  function createInvoiceTableDynamic(roleLocationCounts) {
    invoiceContainer.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'w-full table-auto border-collapse';
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr class="border-b">
        <th class="px-4 py-2 text-left font-medium text-gray-700">Position</th>
        <th class="px-4 py-2 text-left font-medium text-gray-700">Location</th>
        <th class="px-4 py-2 text-left font-medium text-gray-700">Quantity</th>
        <th class="px-4 py-2 text-left font-medium text-gray-700">Unit</th>
        <th class="px-4 py-2 text-left font-medium text-gray-700">Unit Price</th>
        <th class="px-4 py-2 text-left font-medium text-gray-700">Discount %</th>
      </tr>`;
    const tbodyInv = document.createElement('tbody');
    
    // Iterate over keys in roleLocationCounts.
    Object.keys(roleLocationCounts).forEach(key => {
      const qty = roleLocationCounts[key];
      if (qty > 0) {
        const parts = key.split('|');
        const canonicalRole = parts[0];
        const locType = parts[1];
        // Use PRICE_MAPPING to get the default price.
        let priceData = PRICE_MAPPING[canonicalRole];
        if (!priceData) {
          for (let k in PRICE_MAPPING) {
            if (canonicalRole.indexOf(k) !== -1) {
              priceData = PRICE_MAPPING[k];
              break;
            }
          }
        }
        const unitPrice = priceData ? (locType === 'onsite' ? priceData.onsite : priceData.offsite) : 0;
        // For display, we can show the role from the PRICE_MAPPING's role field if available.
        let displayRole = priceData ? priceData.role : canonicalRole;
        const tr = document.createElement('tr');
        tr.className = 'border-b';
        tr.innerHTML = `
          <td class="px-4 py-2 font-medium">${displayRole}</td>
          <td class="px-4 py-2">${locType.charAt(0).toUpperCase() + locType.slice(1)}</td>
          <td class="px-4 py-2">
            <input type="number" required class="w-full px-3 py-2 border rounded-md" placeholder="Quantity" min="0" step="1" value="${qty}">
          </td>
          <td class="px-4 py-2">
            <select class="w-full px-3 py-2 border rounded-md" required>
              <option>MD</option>
            </select>
          </td>
          <td class="px-4 py-2">
            <input type="number" required class="w-full px-3 py-2 border rounded-md" placeholder="Unit Price" min="0" step="0.01" value="${unitPrice.toFixed(2)}">
          </td>
          <td class="px-4 py-2">
            <input type="number" class="w-full px-3 py-2 border rounded-md" placeholder="Discount %" min="0" max="100" step="0.01">
          </td>
        `;
        tbodyInv.appendChild(tr);
      }
    });
    
    table.appendChild(thead);
    table.appendChild(tbodyInv);
    invoiceContainer.innerHTML = `<h2 class="text-2xl font-bold mb-6">Invoice Item Details</h2>`;
    invoiceContainer.appendChild(table);
  }

  // --- Summary Extraction ---
  function extractSummary(description) {
    if (!description) return '';
    const cleaned = description.replace(/\b[A-Z]+-\d+\b/g, '').replace(/[^a-zA-Z, ]/g, '');
    const found = new Set();
    Object.keys(HIGHLIGHT_WORDS).forEach(phrase => {
      const regex = new RegExp(`\\b${phrase}\\b`, 'i');
      if (regex.test(description)) found.add(phrase);
    });
    cleaned.split(' ')
      .filter(word => word.length > 4)
      .forEach(word => {
        const lowerWord = word.toLowerCase();
        if (['management', 'support', 'testing', 'deployment', 'planning'].includes(lowerWord)) {
          found.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        }
      });
    return Array.from(found).sort((a, b) => b.length - a.length).join(', ');
  }

  // --- Utility Functions ---
  function formatNumber(num) {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  }
  function formatList(itemsSet) {
    return Array.from(itemsSet).join(', ');
  }
  function getStatus(avgHours) {
    return avgHours > 12 ? 'Critical' : avgHours > 8 ? 'Moderate' : 'Normal';
  }

  // --- Render Aggregated Data Table ---
  function renderTable(data) {
    tbody.innerHTML = '';
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4">No records found.</td></tr>`;
      return;
    }
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.manDays}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.employeeName}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.location}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.role}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.project}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.totalHours}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.avgHours}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            row.status.toLowerCase() === 'critical'
              ? 'bg-red-100 text-red-800'
              : row.status.toLowerCase() === 'moderate'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }">
            ${row.status}
          </span>
        </td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.summary}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.description}</td>
      `;
      tbody.appendChild(tr);
    });
  }
// --- Excel Download Function ---
function downloadExcel(data, fileName = "aggregated.xlsx") {
  // Convert JSON data to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  const colWidths = [];
  const headers = Object.keys(data[0]);
  headers.forEach((header, i) => {
      let maxLen = header.length;
      data.forEach(row => {
          const val = row[header] ? row[header].toString() : "";
          if (val.length > maxLen) {
              maxLen = val.length;
          }
      });
      colWidths.push({ wch: maxLen + 2 });
  });
  worksheet["!cols"] = colWidths;

  // Apply header styles
  if (worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = { r: 0, c: c }; // Header row
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          if (worksheet[cellRef]) {
              worksheet[cellRef].s = {
                  font: { bold: true },
                  fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } }
              };
          }
      }
  }

  // Apply status styles (assuming status is in the 8th column, index 7)
  if (worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let r = 1; r <= range.e.r; r++) { // Start from row 1 to skip header
          const cellAddress = { r: r, c: 7 }; // 0-based index for status column
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          const cell = worksheet[cellRef];
          // Ensure the cell exists and has a value
          if (cell && cell.v) {
              const statusVal = cell.v.toString().toLowerCase(); // Get status value in lowercase
              let fillColor = "";
              if (statusVal === "critical") fillColor = "FF0000"; // Red
              else if (statusVal === "moderate") fillColor = "FFA500"; // Orange
              else if (statusVal === "normal") fillColor = "00FF00"; // Green

              // Apply the fill color if provided
              if (fillColor) {
                  cell.s = {
                      fill: {
                          patternType: "solid",
                          fgColor: { rgb: fillColor }
                      }
                  };
              }
          }
      }
  }

  // Create a new workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  // Add event listener to download button
  downloadBtn.addEventListener("click", () => {
    if (aggregatedData && aggregatedData.length > 0) {
      downloadExcel(aggregatedData);
    } else {
      alert("No data available to download. Please process a file first.");
    }
  });
});
