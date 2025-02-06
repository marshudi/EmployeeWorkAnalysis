// --------------------------
// Global Configurations
// --------------------------
const HIGHLIGHT_WORDS = {
  'Scrum Master': 'red',
  'Project support': 'blue',
  'Deployment': 'green',
  'Testing': 'orange',
  'Sanity': 'red'
};

const ROLE_MAPPINGS = {
  'proj mgr': 'project manager',
  'project manager': 'project manager',
  'pmo': 'pmo consultant',
  'pm consultant': 'pmo consultant',
  'tech manager': 'technical manager',
  'technical manager': 'technical manager',
  'tech lead': 'technical manager / technical lead',
  'principal sol': 'principal solution architect',
  'principal solution architect': 'principal solution architect',
  'qa lead': 'qa lead',
  'qa engineer': 'senior qa',
  'senior qa': 'senior qa',
  'qa / test': ['qa / test','qa','test'],
  'test': ['qa / test','qa','test'],
  'qa': ['qa / test','qa','test'],
  'sr developer': ['developer / sr developer', 'sr developer', 'developer'],
  'developer': ['developer / sr developer', 'sr developer', 'developer'],
  'developer / sr developer': ['developer / sr developer', 'sr developer', 'developer'],
  'release manager': ['release manager', 'it engineer/ release manager', 'it engineer', 'release mgr'],
  'it engineer': ['release manager', 'it engineer/ release manager', 'it engineer'],
  'business analyst': 'solution architect / business analyst / dev lead / integration lead',
  'solution architect': 'solution architect / business analyst / dev lead / integration lead',
  'dev lead': 'solution architect / business analyst / dev lead / integration lead',
  'integration lead': 'solution architect / business analyst / dev lead / integration lead',
  'solution architect / business analyst / dev lead / integration lead': ['business analyst','solution architect','dev lead','integration lead']
};

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

const PRICE_MAPPING = {};
INVOICE_ITEMS.forEach(item => {
  PRICE_MAPPING[item.normalizedRole] = { offsite: item.offsite, onsite: item.onsite, role: item.role };
});

// Global variables for processed data and file info
let aggregatedData = [];
let roleCounts = {};
let roleLocationCounts = {};
let roleLocationManDays = {};
let chart; // ApexCharts instance
let chartData = { onsite: { roles: [], values: [] }, offsite: { roles: [], values: [] } };

let reportMonth = "";         // to store the month from the "Date" column
let uploadedFileNameBase = "";  // base name of the uploaded file (without extension)

// --------------------------
// DOM Elements
// --------------------------
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const results = document.getElementById('results');
const tbody = document.getElementById('data-table-body');
const downloadBtn = document.getElementById('download-btn');
const invoiceContainer = document.getElementById('invoice-container');
const chartContainer = document.getElementById('chart-container');

// --------------------------
// Helper Functions
// --------------------------
function getMappedRole(roleName) {
  if (!roleName) return '';
  if (ROLE_MAPPINGS[roleName]) return ROLE_MAPPINGS[roleName];
  for (let key in ROLE_MAPPINGS) {
    if (roleName.indexOf(key) !== -1) return ROLE_MAPPINGS[key];
  }
  return roleName;
}

function formatNumber(num) {
  return num % 1 === 0 ? num.toString() : num.toFixed(3);
}

function formatList(itemsSet) {
  return Array.from(itemsSet).join(', ');
}

function getStatus(avgHours) {
  return avgHours > 12 ? 'Critical' : avgHours > 8 ? 'Moderate' : 'Normal';
}

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

// --------------------------
// File Upload Event Listeners
// --------------------------
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
  console.log("File dropped:", file);
  handleFile(file);
});
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  console.log("File selected:", file);
  handleFile(file);
});

// --------------------------
// File Processing Function
// --------------------------
function handleFile(file) {
  if (!file) return;
  
  // Save the uploaded file's base name (without extension)
  uploadedFileNameBase = file.name.replace(/\.[^/.]+$/, "");
  
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4">Processing file, please wait...</td></tr>`;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      // Extract the month from the first data row (assumes header "Date")
      const headers = jsonData[0].map(h =>
        h.toString().toLowerCase().replace(/[/ ]/g, '_').replace(/[^a-z0-9_]/gi, '')
      );
      const dateColIndex = headers.findIndex(h => h === "date");
      if (dateColIndex !== -1 && jsonData.length > 1) {
        let firstDate = jsonData[1][dateColIndex];
        if (firstDate) {
          if (typeof firstDate === "string") {
            // Split using "/" or "-"
            let parts = firstDate.split(/[/\-]/);
            if (parts[0].length === 4) {
              // Format: YYYY-MM-DD
              reportMonth = parts[1];
            } else {
              // Format: MM/DD/YYYY
              reportMonth = parts[0];
            }
          } else if (typeof firstDate === "number") {
            // If the date is a number (Excel serial date), parse it.
            let dateObj = XLSX.SSF.parse_date_code(firstDate);
            if (dateObj) {
              reportMonth = dateObj.m < 10 ? "0" + dateObj.m : dateObj.m.toString();
            } else {
              reportMonth = "unknown";
            }
          } else {
            let dateObj = new Date(firstDate);
            if (!isNaN(dateObj)) {
              reportMonth = (dateObj.getMonth() + 1).toString();
            } else {
              reportMonth = "unknown";
            }
          }
          console.log("Report Month extracted:", reportMonth);
        }
      }
      
      const processed = processData(jsonData);
      aggregatedData = processed.aggregatedData;
      roleCounts = processed.roleCounts;
      roleLocationCounts = processed.roleLocationCounts;
      roleLocationManDays = processed.roleLocationManDays;
      
      createInvoiceTableDynamic(roleLocationCounts, roleLocationManDays);
      renderTable(aggregatedData);
      results.classList.remove('hidden');
      invoiceContainer.classList.remove('hidden');
      
      // Compute aggregated chart data as expenses
      const aggregatedOnsite = {};
      const aggregatedOffsite = {};
      Object.keys(roleLocationManDays).forEach(key => {
        const parts = key.split('|');
        const role = parts[0];
        const location = parts[1];
        if (location === 'onsite') {
          aggregatedOnsite[role] = (aggregatedOnsite[role] || 0) + roleLocationManDays[key];
        } else if (location === 'offsite') {
          aggregatedOffsite[role] = (aggregatedOffsite[role] || 0) + roleLocationManDays[key];
        }
      });
      const aggregatedExpenseOnsite = {};
      Object.keys(aggregatedOnsite).forEach(role => {
        aggregatedExpenseOnsite[role] = PRICE_MAPPING[role] ? aggregatedOnsite[role] * PRICE_MAPPING[role].onsite : aggregatedOnsite[role];
      });
      const aggregatedExpenseOffsite = {};
      Object.keys(aggregatedOffsite).forEach(role => {
        aggregatedExpenseOffsite[role] = PRICE_MAPPING[role] ? aggregatedOffsite[role] * PRICE_MAPPING[role].offsite : aggregatedOffsite[role];
      });
      chartData.onsite.roles = Object.keys(aggregatedExpenseOnsite);
      chartData.onsite.values = chartData.onsite.roles.map(role => aggregatedExpenseOnsite[role]);
      chartData.offsite.roles = Object.keys(aggregatedExpenseOffsite);
      chartData.offsite.values = chartData.offsite.roles.map(role => aggregatedExpenseOffsite[role]);
      
      chartContainer.classList.remove('hidden');
      updateChart();
      
      // Generate the Expense Report Table (Ranking by Role)
      generateExpenseReport();
      
    } catch (error) {
      console.error('Error processing file:', error);
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-red-600">Error processing file: ${error.message}</td></tr>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

// --------------------------
// Data Processing Function
// --------------------------
function processData(jsonData) {
  if (!jsonData || jsonData.length === 0) throw new Error('No data found in the file.');
  const headers = jsonData[0].map(h =>
    h.toString().toLowerCase().replace(/[/ ]/g, '_').replace(/[^a-z0-9_]/gi, '')
  );
  const columnMap = {
    date: headers.find(h => h === "date"),
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
  const roleLocationCounts = {};
  const roleLocationManDays = {};
  
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
        locationTypes: new Set(),
        roles: new Set(),
        originalRoles: new Set(),
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
      let normRole = normalizeRole(role);
      let canonicalRole = getMappedRole(normRole);
      if (Array.isArray(canonicalRole)) canonicalRole = canonicalRole[0];
      group.roles.add(canonicalRole);
    }
    const proj = getValue(columnMap.project);
    if (proj) group.projects.add(proj);
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
    
    group.roles.forEach(role => {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      group.locationTypes.forEach(locType => {
        const key = role + '|' + locType;
        roleLocationCounts[key] = (roleLocationCounts[key] || 0) + 1;
        roleLocationManDays[key] = (roleLocationManDays[key] || 0) + manDays;
      });
    });
  });
  
  output.sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours));
  return {
    aggregatedData: output,
    roleCounts: roleCounts,
    roleLocationCounts: roleLocationCounts,
    roleLocationManDays: roleLocationManDays
  };
}

function normalizeRole(role) {
  if (!role) return '';
  return role
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/\(.*\)/, '')
    .trim();
}

// --------------------------
// Create Invoice Table Dynamically
// --------------------------
function createInvoiceTableDynamic(roleLocationCounts, roleLocationManDays) {
  invoiceContainer.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'w-full table-auto border-collapse';
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="border-b">
      <th class="px-4 py-2 text-left font-medium text-gray-700">Position</th>
      <th class="px-4 py-2 text-left font-medium text-gray-700">Location</th>
      <th class="px-4 py-2 text-left font-medium text-gray-700">Quantity</th>
      <th class="px-4 py-2 text-left font-medium text-gray-700">ManDays</th>
      <th class="px-4 py-2 text-left font-medium text-gray-700">Unit</th>
      <th class="px-4 py-2 text-left font-medium text-gray-700">Unit Price</th>
      <th class="px-4 py-2 text-left font-medium text-gray-700">Discount %</th>
      <th class="px-4 py-2 text-right font-medium text-gray-700">Total Price</th>
    </tr>`;
  const tbodyInv = document.createElement('tbody');
  
  Object.keys(roleLocationCounts).forEach(key => {
    const qty = roleLocationCounts[key];
    if (qty > 0) {
      const parts = key.split('|');
      const canonicalRole = parts[0];
      const locType = parts[1];
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
      const displayRole = priceData ? priceData.role : canonicalRole;
      const manDays = roleLocationManDays[key] || 0;
      const totalPrice = unitPrice * manDays;
      
      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-4 py-2 font-medium">${displayRole}</td>
        <td class="px-4 py-2">${locType.charAt(0).toUpperCase() + locType.slice(1)}</td>
        <td class="px-4 py-2">
          <input type="number" class="quantity-input w-full px-3 py-2 border rounded-md" readonly value="${qty}">
        </td>
        <td class="px-4 py-2">
          <input type="number" class="man-days-input w-full px-3 py-2 border rounded-md" required placeholder="ManDays" min="0" step="0.01" value="${manDays.toFixed(3)}">
        </td>
        <td class="px-4 py-2">
          <select class="unit-select w-full px-3 py-2 border rounded-md" required>
            <option>MD</option>
          </select>
        </td>
        <td class="px-4 py-2">
          <input type="number" class="unit-price-input w-full px-3 py-2 border rounded-md" required placeholder="Unit Price" min="0" step="0.01" value="${unitPrice.toFixed(2)}">
        </td>
        <td class="px-4 py-2">
          <input type="number" class="discount-input w-full px-3 py-2 border rounded-md" placeholder="Discount %" min="0" max="100" step="0.01" value="0">
        </td>
        <td class="px-4 py-2 total-price-cell text-right font-medium">${totalPrice.toFixed(2)}</td>
      `;
      tbodyInv.appendChild(tr);
    }
  });
  
  table.appendChild(thead);
  table.appendChild(tbodyInv);
  invoiceContainer.innerHTML = `<h2 class="text-2xl font-bold mb-6">Invoice Item Details</h2>`;
  invoiceContainer.appendChild(table);

  const expensesDiv = document.createElement('div');
  expensesDiv.id = 'total-expenses';
  expensesDiv.className = 'mt-4 text-right font-bold';
  invoiceContainer.appendChild(expensesDiv);

  function recalcInvoiceTotals() {
    let totalExpenses = 0;
    tbodyInv.querySelectorAll('tr').forEach(row => {
      const manDaysInput = row.querySelector('.man-days-input');
      const unitPriceInput = row.querySelector('.unit-price-input');
      const discountInput = row.querySelector('.discount-input');
      const totalPriceCell = row.querySelector('.total-price-cell');
      const manDaysVal = parseFloat(manDaysInput.value) || 0;
      const unitPriceVal = parseFloat(unitPriceInput.value) || 0;
      const discountVal = parseFloat(discountInput.value) || 0;
      let totalPrice = unitPriceVal * manDaysVal;
      if (discountVal > 0) {
        totalPrice = totalPrice * (1 - discountVal / 100);
      }
      totalPriceCell.textContent = totalPrice.toFixed(2);
      totalExpenses += totalPrice;
    });
    expensesDiv.textContent = 'Total Expenses: $' + totalExpenses.toFixed(2);
  }
  
  tbodyInv.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', recalcInvoiceTotals);
  });
  
  recalcInvoiceTotals();
}

// --------------------------
// Render Aggregated Data Table
// --------------------------
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

// --------------------------
// Excel Export Function for Aggregated Data (Dynamic File Name)
// --------------------------
function downloadExcel(data, fileName = "aggregated.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const colWidths = [];
  const headers = Object.keys(data[0]);
  headers.forEach(header => {
    let maxLen = header.length;
    data.forEach(row => {
      const val = row[header] ? row[header].toString() : "";
      if (val.length > maxLen) maxLen = val.length;
    });
    colWidths.push({ wch: maxLen + 2 });
  });
  worksheet["!cols"] = colWidths;
  if (worksheet["!ref"]) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = { r: 0, c: c };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          font: { bold: true },
          fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } }
        };
      }
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Aggregated Data");
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

downloadBtn.addEventListener("click", () => {
  if (aggregatedData && aggregatedData.length > 0) {
    const fileName = `${uploadedFileNameBase}_analyzed_${reportMonth}.xlsx`;
    downloadExcel(aggregatedData, fileName);
  } else {
    alert("No data available to download. Please process a file first.");
  }
});

// --------------------------
// Donut Chart (Dashboard Card) Setup
// --------------------------
function initChart(labels, series) {
  const options = {
    series: series,
    colors: ["#1C64F2", "#16BDCA", "#FDBA8C", "#E74694", "#a0aec0", "#f56565", "#68d391", "#ecc94b"],
    chart: {
      height: 500,
      width: "100%",
      type: "donut",
    },
    stroke: { colors: ["transparent"] },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: {
              show: true,
              fontFamily: "Inter, sans-serif",
              offsetY: 20,
            },
            total: {
              showAlways: true,
              show: true,
              label: "Total Expenses",
              fontFamily: "Inter, sans-serif",
              formatter: function (w) {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return '$' + sum.toFixed(2);
              },
            },
            value: {
              show: true,
              fontFamily: "Inter, sans-serif",
              offsetY: -20,
              formatter: function (value) {
                return '$' + value.toFixed(2);
              },
            },
          },
          size: "80%",
        },
      },
    },
    grid: { padding: { top: -2 } },
    labels: labels,
    dataLabels: { enabled: false },
    legend: { position: "bottom", fontFamily: "Inter, sans-serif" },
    responsive: [
      {
        breakpoint: 768,
        options: { chart: { height: 400 } }
      }
    ]
  };
  
  if (chart) {
    chart.updateOptions({ labels: labels, series: series }, true, true);
  } else {
    chart = new ApexCharts(document.getElementById("donut-chart"), options);
    chart.render();
  }
}

function combineChartData(onsiteData, offsiteData) {
  const combinedMap = {};
  onsiteData.roles.forEach((role, i) => {
    combinedMap[role] = (combinedMap[role] || 0) + onsiteData.values[i];
  });
  offsiteData.roles.forEach((role, i) => {
    combinedMap[role] = (combinedMap[role] || 0) + offsiteData.values[i];
  });
  const roles = Object.keys(combinedMap);
  const values = roles.map(role => combinedMap[role]);
  return { roles, values };
}

function updateChart() {
  const onsiteChecked = document.getElementById("onsite").checked;
  const offsiteChecked = document.getElementById("offsite").checked;
  let labels, series;
  if (onsiteChecked && !offsiteChecked) {
    labels = chartData.onsite.roles;
    series = chartData.onsite.values;
  } else if (!onsiteChecked && offsiteChecked) {
    labels = chartData.offsite.roles;
    series = chartData.offsite.values;
  } else {
    const combined = combineChartData(chartData.onsite, chartData.offsite);
    labels = combined.roles;
    series = combined.values;
  }
  if (chart) {
    chart.updateOptions({ labels: labels, series: series }, true, true);
  } else {
    initChart(labels, series);
  }
}

const onsiteCheckbox = document.getElementById("onsite");
const offsiteCheckbox = document.getElementById("offsite");
onsiteCheckbox.addEventListener("change", updateChart);
offsiteCheckbox.addEventListener("change", updateChart);

// --------------------------
// Expense Report Table Generation and Full Report Export
// --------------------------
function generateExpenseReport() {
  const combinedExpense = {};
  // Sum expenses from onsite data
  chartData.onsite.roles.forEach((role, i) => {
    combinedExpense[role] = combinedExpense[role] || { onsite: 0, offsite: 0, total: 0 };
    combinedExpense[role].onsite += chartData.onsite.values[i];
  });
  // Sum expenses from offsite data
  chartData.offsite.roles.forEach((role, i) => {
    combinedExpense[role] = combinedExpense[role] || { onsite: 0, offsite: 0, total: 0 };
    combinedExpense[role].offsite += chartData.offsite.values[i];
  });
  // Calculate total for each role
  for (let role in combinedExpense) {
    combinedExpense[role].total = combinedExpense[role].onsite + combinedExpense[role].offsite;
  }
  let reportData = Object.keys(combinedExpense).map(role => ({
    role: role,
    onsite: combinedExpense[role].onsite,
    offsite: combinedExpense[role].offsite,
    total: combinedExpense[role].total
  }));
  // Sort descending by total expense
  reportData.sort((a, b) => b.total - a.total);
  reportData.forEach((item, index) => {
    item.rank = index + 1;
  });
  const tbodyReport = document.getElementById("expense-report-body");
  if (tbodyReport) {
    tbodyReport.innerHTML = '';
    reportData.forEach(item => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer";
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${item.rank}</td>
        <td class="px-6 py-4 whitespace-nowrap">${item.role}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right">$${item.onsite.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right">$${item.offsite.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right">$${item.total.toFixed(2)}</td>
      `;
      tbodyReport.appendChild(tr);
    });
    document.getElementById("report-container").classList.remove("hidden");
  }
  return reportData;
}

function exportFullReport() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Report Info (with dynamic file info)
  const infoData = [
    { "File Name": uploadedFileNameBase, "Report Month": reportMonth, "Exported On": new Date().toLocaleString() }
  ];
  const infoSheet = XLSX.utils.json_to_sheet(infoData);
  if (infoSheet["!ref"]) {
    const range = XLSX.utils.decode_range(infoSheet["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = { r: 0, c: c };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (infoSheet[cellRef]) {
        infoSheet[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { patternType: "solid", fgColor: { rgb: "FFD700" } }
        };
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, infoSheet, "Report Info");

  // Sheet 2: Aggregated Data
  const aggSheet = XLSX.utils.json_to_sheet(aggregatedData, { header: Object.keys(aggregatedData[0]) });
  if (aggSheet["!ref"]) {
    const range = XLSX.utils.decode_range(aggSheet["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = { r: 0, c: c };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (aggSheet[cellRef]) {
        aggSheet[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } }
        };
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, aggSheet, "Aggregated Data");

  // Sheet 3: Expense Report (Ranking by Role)
  const reportData = generateExpenseReport();
  const expSheet = XLSX.utils.json_to_sheet(reportData, { header: ["rank", "role", "onsite", "offsite", "total"] });
  if (expSheet["!ref"]) {
    const range = XLSX.utils.decode_range(expSheet["!ref"]);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = { r: 0, c: c };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (expSheet[cellRef]) {
        expSheet[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { patternType: "solid", fgColor: { rgb: "B0E0E6" } }
        };
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, expSheet, "Expense Report");

  // Dynamic file name: [uploadedFileNameBase]_analyzed_[reportMonth].xlsx
  const fileName = `${uploadedFileNameBase}_analyzed_${reportMonth}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById("export-report-btn").addEventListener("click", exportFullReport);
