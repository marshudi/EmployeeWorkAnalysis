import React, { useEffect, useRef, useContext, useState } from "react";
import * as XLSX from "xlsx";
import ApexCharts from "apexcharts";
import { AggregatedDataContext } from "../AggregatedDataContext";

// --------------------------
// Global Variables for File Info and Chart Data
// --------------------------
let reportMonth = "";
let uploadedFileNameBase = "";
let aggregatedData = [];
let roleCounts = {};
let roleLocationCounts = {};
let roleLocationManDays = {};
let maximumHoursData = []; // Stores max hours and occurrence per employee
let chart = null; // ApexCharts instance

const HIGHLIGHT_WORDS = {
  "Scrum Master": "red",
  "Project support": "blue",
  Deployment: "green",
  Testing: "orange",
  Sanity: "red",
};

const ROLE_MAPPINGS = {
  "proj mgr": "project manager",
  "project manager": "project manager",
  pmo: "pmo consultant",
  "pm consultant": "pmo consultant",
  "tech manager": "technical manager",
  "technical manager": "technical manager",
  "tech lead": "technical manager / technical lead",
  "principal sol": "principal solution architect",
  "principal solution architect": "principal solution architect",
  "qa lead": "qa lead",
  "qa engineer": "senior qa",
  "senior qa": "senior qa",
  "qa / test": ["qa / test", "qa", "test"],
  test: ["qa / test", "qa", "test"],
  qa: ["qa / test", "qa", "test"],
  "sr developer": ["developer / sr developer", "sr developer", "developer"],
  developer: ["developer / sr developer", "sr developer", "developer"],
  "developer / sr developer": ["developer / sr developer", "sr developer", "developer"],
  "release manager": [
    "release manager",
    "it engineer/ release manager",
    "it engineer",
    "release mgr",
  ],
  "it engineer": ["release manager", "it engineer/ release manager", "it engineer"],
  "business analyst":
    "solution architect / business analyst / dev lead / integration lead",
  "solution architect":
    "solution architect / business analyst / dev lead / integration lead",
  "dev lead": "solution architect / business analyst / dev lead / integration lead",
  "integration lead": "solution architect / business analyst / dev lead / integration lead",
  "solution architect / business analyst / dev lead / integration lead": [
    "business analyst",
    "solution architect",
    "dev lead",
    "integration lead",
  ],
};

const INVOICE_ITEMS = [
  { role: "Project Manager", normalizedRole: "project manager", offsite: 941, onsite: 1141 },
  { role: "PMO Consultant", normalizedRole: "pmo consultant", offsite: 750, onsite: 950 },
  { role: "Senior Technical Manager", normalizedRole: "senior technical manager", offsite: 842, onsite: 1042 },
  { role: "Principal Solution Architect", normalizedRole: "principal solution architect", offsite: 750, onsite: 950 },
  { role: "QA Lead", normalizedRole: "qa lead", offsite: 600, onsite: 800 },
  { role: "Senior QA", normalizedRole: "senior qa", offsite: 495, onsite: 695 },
  { role: "Technical Manager / Technical Lead", normalizedRole: "technical manager", offsite: 650, onsite: 850 },
  {
    role: "Solution Architect / Business Analyst / Dev Lead / Integration Lead",
    normalizedRole: "solution architect / business analyst / dev lead / integration lead",
    offsite: 700,
    onsite: 900,
  },
  { role: "Developer / Sr. Developer", normalizedRole: "developer / sr developer", offsite: 495, onsite: 695 },
  { role: "IT Engineer", normalizedRole: "it engineer", offsite: 495, onsite: 695 },
  { role: "Release Manager / QA Analyst", normalizedRole: "release manager", offsite: 495, onsite: 695 },
  { role: "QA / Test", normalizedRole: "qa / test", offsite: 395, onsite: 595 },
];

const PRICE_MAPPING = {};
INVOICE_ITEMS.forEach((item) => {
  PRICE_MAPPING[item.normalizedRole] = {
    offsite: item.offsite,
    onsite: item.onsite,
    role: item.role,
  };
});

const BSS = () => {
  // --------------------------
  // Context and State
  // --------------------------
  const {
    setAggregatedData,
    setMaximumHoursData,
    setRoleCounts,
    setRoleLocationCounts,
    setRoleLocationManDays,
  } = useContext(AggregatedDataContext);

  // Create a state variable for chartData so that setChartData is defined
  const [chartDataState, setChartData] = useState({
    onsite: { roles: [], values: [] },
    offsite: { roles: [], values: [] },
  });

  // --------------------------
  // Refs for DOM Elements and Chart Instance
  // --------------------------
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);
  const dataTableBodyRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const invoiceContainerRef = useRef(null);
  const chartContainerRef = useRef(null);
  const donutChartRef = useRef(null);
  const onsiteCheckboxRef = useRef(null);
  const offsiteCheckboxRef = useRef(null);
  const expenseReportBodyRef = useRef(null);
  const reportContainerRef = useRef(null);
  const exportReportBtnRef = useRef(null);
  const maxHoursTableRef = useRef(null);
  const maxHoursContainerRef = useRef(null);
  const chartRef = useRef(null);

  // --------------------------
  // Helper Functions
  // --------------------------
  function getMappedRole(roleName) {
    if (!roleName) return "";
    const normalizedRole = normalizeRole(roleName);
    if (ROLE_MAPPINGS[normalizedRole]) return ROLE_MAPPINGS[normalizedRole];
    const keys = Object.keys(ROLE_MAPPINGS).sort((a, b) => b.length - a.length);
    for (let key of keys) {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(normalizedRole)) return ROLE_MAPPINGS[key];
    }
    return normalizedRole;
  }

  function formatNumber(num) {
    return num % 1 === 0 ? num.toString() : num.toFixed(3);
  }

  function formatList(itemsSet) {
    return Array.from(itemsSet).join(", ");
  }

  function getStatus(avgHours) {
    return avgHours > 12 ? "Critical" : avgHours > 8 ? "Moderate" : "Normal";
  }

  function extractSummary(description) {
    if (!description) return "";
    const cleaned = description.replace(/\b[A-Z]+-\d+\b/g, "").replace(/[^a-zA-Z, ]/g, "");
    const found = new Set();
    Object.keys(HIGHLIGHT_WORDS).forEach((phrase) => {
      const regex = new RegExp(`\\b${phrase}\\b`, "i");
      if (regex.test(description)) found.add(phrase);
    });
    cleaned
      .split(" ")
      .filter((word) => word.length > 4)
      .forEach((word) => {
        const lowerWord = word.toLowerCase();
        if (["management", "support", "testing", "deployment", "planning"].includes(lowerWord)) {
          found.add(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        }
      });
    return Array.from(found).sort((a, b) => b.length - a.length).join(", ");
  }

  function normalizeRole(role) {
    if (!role) return "";
    return role
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .replace(/\(.*\)/, "")
      .trim();
  }

  // --------------------------
  // File Processing Functions
  // --------------------------
  function processData(jsonData) {
    if (!jsonData || jsonData.length === 0)
      throw new Error("No data found in the file.");

    // Normalize header names
    const headers = jsonData[0].map((h) =>
      h.toString().toLowerCase().replace(/[/ ]/g, "_").replace(/[^a-z0-9_]/gi, "")
    );

    // Map columns to header keys
    const columnMap = {
      date: headers.find((h) => h === "date"),
      employee: headers.find((h) => h.includes("empl") && h.includes("name")),
      hours: headers.find((h) => h.includes("hours")),
      description: headers.find((h) => h.includes("description")),
      location:
        headers.find((h) => h.includes("location")) ||
        headers.find((h) => h.includes("site")),
      role: headers.find((h) => h.includes("role")),
      project: headers.find((h) => h.includes("project")),
    };

    const rows = jsonData.slice(1);
    const groupMap = new Map();
    const roleCountsLocal = {};
    const roleLocationMap = new Map();

    rows.forEach((row) => {
      const getValue = (colHeader) => {
        if (!colHeader) return "";
        const idx = headers.indexOf(colHeader);
        return idx >= 0 && row[idx] ? row[idx].toString().trim() : "";
      };

      const empName = getValue(columnMap.employee);
      if (!empName) return;

      // --- Invoice details aggregation (independent step) ---
      const roleVal = getValue(columnMap.role);
      const locValue = getValue(columnMap.location);
      const hours = parseFloat(getValue(columnMap.hours)) || 0;
      if (roleVal && locValue) {
        const normRole = normalizeRole(roleVal);
        let canonicalRole = getMappedRole(normRole);
        if (Array.isArray(canonicalRole)) canonicalRole = canonicalRole[0];
        const normalizedLocation = locValue.toLowerCase().includes("on")
          ? "onsite"
          : "offsite";
        const key = `${canonicalRole}|${normalizedLocation}`;
        if (!roleLocationMap.has(key)) {
          roleLocationMap.set(key, { hours: 0, employees: new Set() });
        }
        const entry = roleLocationMap.get(key);
        entry.hours += hours;
        entry.employees.add(empName);
      }

      // --- Aggregated employee-level grouping (for data table) ---
      if (!groupMap.has(empName)) {
        groupMap.set(empName, {
          employeeName: empName,
          totalHours: 0,
          days: new Set(),
          descriptions: new Set(),
          locationTypes: new Set(),
          roles: new Set(),
          originalRoles: new Set(),
          projects: new Set(),
          hoursByDate: {},
        });
      }
      const group = groupMap.get(empName);
      group.totalHours += hours;
      const date = getValue(columnMap.date);
      if (date) {
        group.days.add(date);
        group.hoursByDate[date] = (group.hoursByDate[date] || 0) + hours;
      }
      const desc = getValue(columnMap.description);
      if (desc) group.descriptions.add(desc);

      // Process location types
      if (locValue) {
        if (locValue.includes("/") || locValue.includes("-")) {
          let parts = locValue.split(/[/\-]/);
          parts.forEach((p) => {
            let trimmed = p.trim().toLowerCase();
            if (trimmed.includes("on")) group.locationTypes.add("onsite");
            if (trimmed.includes("off")) group.locationTypes.add("offsite");
          });
        } else {
          let trimmed = locValue.toLowerCase();
          if (trimmed.includes("on")) group.locationTypes.add("onsite");
          else if (trimmed.includes("off")) group.locationTypes.add("offsite");
          else group.locationTypes.add(trimmed);
        }
      }

      // Process role information
      const roleFromRow = getValue(columnMap.role);
      if (roleFromRow) {
        group.originalRoles.add(roleFromRow);
        let normRole = normalizeRole(roleFromRow);
        let canonicalRole = getMappedRole(normRole);
        if (Array.isArray(canonicalRole)) canonicalRole = canonicalRole[0];
        group.roles.add(canonicalRole);
      }
      const proj = getValue(columnMap.project);
      if (proj) group.projects.add(proj);
    });

    const roleLocationCountsLocal = {};
    const roleLocationManDaysLocal = {};
    roleLocationMap.forEach((value, key) => {
      roleLocationCountsLocal[key] = value.employees.size;
      roleLocationManDaysLocal[key] = value.hours / 8;
    });

    const output = [];
    const maxHoursData = [];
    groupMap.forEach((group) => {
      const totalDays = group.days.size || 1;
      const avgHours = group.totalHours / totalDays;
      const manDays = group.totalHours / 8;
      const status = getStatus(avgHours);

      let maxHoursNum = 0;
      let maxCount = 0;
      if (Object.keys(group.hoursByDate).length > 0) {
        maxHoursNum = Math.max(...Object.values(group.hoursByDate));
        maxCount = Object.values(group.hoursByDate).filter((val) => val === maxHoursNum).length;
      }
      maxHoursData.push({
        employeeName: group.employeeName,
        maxHours: maxHoursNum,
        maxHoursFormatted: formatNumber(maxHoursNum),
        maxCount: maxCount,
        totalWorkingDays: group.days.size,
      });

      output.push({
        manDays: formatNumber(manDays),
        employeeName: group.employeeName,
        daysWorked: group.days.size,
        location: formatList(group.locationTypes),
        role: formatList(group.originalRoles),
        project: formatList(group.projects),
        totalHours: formatNumber(group.totalHours),
        avgHours: formatNumber(avgHours),
        status: status,
        summary: extractSummary(Array.from(group.descriptions).join(" | ")),
        description: status === "Critical" ? Array.from(group.descriptions).join(" | ") : "",
      });
    });

    maxHoursData.sort((a, b) => b.maxHours - a.maxHours);
    output.sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours));

    return {
      aggregatedData: output,
      roleCounts: roleCountsLocal,
      roleLocationCounts: roleLocationCountsLocal,
      roleLocationManDays: roleLocationManDaysLocal,
      maximumHoursData: maxHoursData,
    };
  }

  // --------------------------
  // generateExpenseReport Function
  // --------------------------
  function generateExpenseReport() {
    if (!roleLocationManDays || Object.keys(roleLocationManDays).length === 0) {
      console.warn("No roleLocationManDays data available for expense report.");
      return [];
    }
    const aggregatedOnsite = {};
    const aggregatedOffsite = {};
    Object.keys(roleLocationManDays).forEach((key) => {
      const [role, location] = key.split("|");
      if (location === "onsite") {
        aggregatedOnsite[role] = (aggregatedOnsite[role] || 0) + roleLocationManDays[key];
      } else if (location === "offsite") {
        aggregatedOffsite[role] = (aggregatedOffsite[role] || 0) + roleLocationManDays[key];
      }
    });
    const aggregatedExpenseOnsite = {};
    Object.keys(aggregatedOnsite).forEach((role) => {
      aggregatedExpenseOnsite[role] = PRICE_MAPPING[role]
        ? aggregatedOnsite[role] * PRICE_MAPPING[role].onsite
        : aggregatedOnsite[role];
    });
    const aggregatedExpenseOffsite = {};
    Object.keys(aggregatedOffsite).forEach((role) => {
      aggregatedExpenseOffsite[role] = PRICE_MAPPING[role]
        ? aggregatedOffsite[role] * PRICE_MAPPING[role].offsite
        : aggregatedOffsite[role];
    });
    const combinedExpense = {};
    Object.keys(aggregatedExpenseOnsite).forEach((role) => {
      combinedExpense[role] = { onsite: aggregatedExpenseOnsite[role] || 0, offsite: 0, total: 0 };
    });
    Object.keys(aggregatedExpenseOffsite).forEach((role) => {
      combinedExpense[role] = combinedExpense[role] || { onsite: 0, offsite: 0, total: 0 };
      combinedExpense[role].offsite = aggregatedExpenseOffsite[role] || 0;
    });
    for (let role in combinedExpense) {
      combinedExpense[role].total = combinedExpense[role].onsite + combinedExpense[role].offsite;
    }
    let reportData = Object.keys(combinedExpense).map((role) => ({
      role,
      onsite: combinedExpense[role].onsite,
      offsite: combinedExpense[role].offsite,
      total: combinedExpense[role].total,
    }));
    reportData.sort((a, b) => b.total - a.total);
    reportData.forEach((item, index) => {
      item.rank = index + 1;
    });
    const tbodyReport = expenseReportBodyRef.current;
    if (tbodyReport) {
      tbodyReport.innerHTML = "";
      reportData.forEach((item) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer";
        tr.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap">${item.rank}</td>
          <td class="px-6 py-4 whitespace-nowrap">${item.role}</td>
          <td class="px-6 py-4 whitespace-nowrap text-right">$${item.onsite.toFixed(2)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-right">$${item.offsite.toFixed(2)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-right">$${item.total.toFixed(2)}</td>`;
        tbodyReport.appendChild(tr);
      });
      reportContainerRef.current.classList.remove("hidden");
    }
    return reportData;
  }

  // --------------------------
  // File Handling Function
  // --------------------------
  function handleFile(file) {
    if (!file) return;
    uploadedFileNameBase = file.name.replace(/\.[^/.]+$/, "");
    dataTableBodyRef.current.innerHTML =
      `<tr><td colspan="11" class="text-center py-4">Processing file, please wait...</td></tr>`;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const headers = jsonData[0].map((h) =>
          h.toString().toLowerCase().replace(/[/ ]/g, "_").replace(/[^a-z0-9_]/gi, "")
        );
        const dateColIndex = headers.findIndex((h) => h === "date");
        if (dateColIndex !== -1 && jsonData.length > 1) {
          let firstDate = jsonData[1][dateColIndex];
          if (firstDate) {
            if (typeof firstDate === "string") {
              let parts = firstDate.split(/[/\-]/);
              reportMonth = parts[0].length === 4 ? parts[1] : parts[0];
            } else if (typeof firstDate === "number") {
              let dateObj = XLSX.SSF.parse_date_code(firstDate);
              reportMonth = dateObj ? (dateObj.m < 10 ? "0" + dateObj.m : dateObj.m.toString()) : "unknown";
            } else {
              let dateObj = new Date(firstDate);
              reportMonth = !isNaN(dateObj) ? (dateObj.getMonth() + 1).toString() : "unknown";
            }
            console.log("Report Month extracted:", reportMonth);
          }
        }
        const processed = processData(jsonData);
        aggregatedData = processed.aggregatedData;
        roleCounts = processed.roleCounts;
        roleLocationCounts = processed.roleLocationCounts;
        roleLocationManDays = processed.roleLocationManDays;
        maximumHoursData = processed.maximumHoursData;

        setAggregatedData(aggregatedData);
        setMaximumHoursData(maximumHoursData);
        setRoleCounts(roleCounts);
        setRoleLocationCounts(roleLocationCounts);
        setRoleLocationManDays(roleLocationManDays);

        createInvoiceTableDynamic(roleLocationCounts, roleLocationManDays);
        renderTable(aggregatedData);
        resultsRef.current.classList.remove("hidden");
        invoiceContainerRef.current.classList.remove("hidden");

        const aggregatedOnsite = {};
        const aggregatedOffsite = {};
        Object.keys(roleLocationManDays).forEach((key) => {
          const parts = key.split("|");
          const role = parts[0];
          const location = parts[1];
          if (location === "onsite") {
            aggregatedOnsite[role] = (aggregatedOnsite[role] || 0) + roleLocationManDays[key];
          } else if (location === "offsite") {
            aggregatedOffsite[role] = (aggregatedOffsite[role] || 0) + roleLocationManDays[key];
          }
        });
        const aggregatedExpenseOnsite = {};
        Object.keys(aggregatedOnsite).forEach((role) => {
          aggregatedExpenseOnsite[role] = PRICE_MAPPING[role]
            ? aggregatedOnsite[role] * PRICE_MAPPING[role].onsite
            : aggregatedOnsite[role];
        });
        const aggregatedExpenseOffsite = {};
        Object.keys(aggregatedOffsite).forEach((role) => {
          aggregatedExpenseOffsite[role] = PRICE_MAPPING[role]
            ? aggregatedOffsite[role] * PRICE_MAPPING[role].offsite
            : aggregatedOffsite[role];
        });
        setChartData({
          onsite: {
            roles: Object.keys(aggregatedExpenseOnsite),
            values: Object.values(aggregatedExpenseOnsite),
          },
          offsite: {
            roles: Object.keys(aggregatedExpenseOffsite),
            values: Object.values(aggregatedExpenseOffsite),
          },
        });

        chartContainerRef.current.classList.remove("hidden");
        updateChart();
        generateExpenseReport();
        renderMaxHoursTable(maximumHoursData);
      } catch (error) {
        console.error("Error processing file:", error);
        dataTableBodyRef.current.innerHTML =
          `<tr><td colspan="11" class="text-center py-4 text-red-600">Error processing file: ${error.message}</td></tr>`;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // --------------------------
  // Create Invoice Table Dynamically (Role‑based reprocessing)
  // --------------------------
  function createInvoiceTableDynamic(roleLocationCounts, roleLocationManDays) {
    invoiceContainerRef.current.innerHTML = "";
    // Insert Invoice Item Details title
    const headerEl = document.createElement("h2");
    headerEl.className = "text-2xl font-bold mb-6";
    headerEl.innerText = "Invoice Item Details";
    invoiceContainerRef.current.appendChild(headerEl);

    // Insert Default Unit Price Section below the title and above the table
    const defaultUnitPriceDiv = document.createElement("div");
    defaultUnitPriceDiv.className = "mt-4 flex items-center";
    // Use an inline SVG for the question mark icon
    defaultUnitPriceDiv.innerHTML = `
      <label for="default-unit-price" class="mr-2 font-medium text-gray-700">
        Default Unit Price 
        <span title="Once you edit and apply the default unit price, it will reflect to all unit prices in the table. Press 'Original Price' to return to original pricing." class="ml-1 cursor-help">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500 inline-block" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-9-3a1 1 0 112 0 1 1 0 01-2 0zm1 8a1 1 0 01-.993-.883L9 14V9a1 1 0 01.883-.993L10 8h.01a1 1 0 01.993.883L11 9v5a1 1 0 01-.883.993L10 15z" clip-rule="evenodd"/>
          </svg>
        </span>
        :
      </label>
      <input type="number" id="default-unit-price" class="w-32 px-3 py-2 border rounded-md" placeholder="Default Unit Price" disabled>
      <button id="edit-default-price" class="ml-2 px-3 py-1 bg-red-500 text-white rounded">Edit</button>
      <button id="reset-default-price" class="ml-2 px-3 py-1 bg-blue-500 text-white rounded">Original Price</button>
    `;
    invoiceContainerRef.current.appendChild(defaultUnitPriceDiv);

    // Create invoice table
    const table = document.createElement("table");
    table.className = "w-full table-auto border-collapse mt-4";
    const thead = document.createElement("thead");
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
    const tbodyInv = document.createElement("tbody");

    Object.keys(roleLocationCounts).forEach((key) => {
      const qty = roleLocationCounts[key];
      if (qty > 0) {
        const parts = key.split("|");
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
        const unitPrice = priceData ? (locType === "onsite" ? priceData.onsite : priceData.offsite) : 0;
        const displayRole = priceData ? priceData.role : canonicalRole;
        const manDays = roleLocationManDays[key] || 0;
        const totalPrice = unitPrice * manDays;

        const tr = document.createElement("tr");
        tr.className = "border-b";
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
          <td class="px-4 py-2 total-price-cell text-right font-medium">${totalPrice.toFixed(2)}</td>`;
        tbodyInv.appendChild(tr);
      }
    });

    table.appendChild(thead);
    table.appendChild(tbodyInv);
    invoiceContainerRef.current.appendChild(table);

    const expensesDiv = document.createElement("div");
    expensesDiv.id = "total-expenses";
    expensesDiv.className = "mt-4 text-right font-bold";
    invoiceContainerRef.current.appendChild(expensesDiv);

    // NEW HELPER FUNCTION: Update the Expense Report Table dynamically based on invoice table data.
    function updateExpenseReportUI(aggregatedExpenseOnsite, aggregatedExpenseOffsite) {
      const combinedExpense = {};
      Object.keys(aggregatedExpenseOnsite).forEach((role) => {
        combinedExpense[role] = { onsite: aggregatedExpenseOnsite[role] || 0, offsite: 0, total: 0 };
      });
      Object.keys(aggregatedExpenseOffsite).forEach((role) => {
        combinedExpense[role] = combinedExpense[role] || { onsite: 0, offsite: 0, total: 0 };
        combinedExpense[role].offsite = aggregatedExpenseOffsite[role] || 0;
      });
      for (let role in combinedExpense) {
        combinedExpense[role].total = combinedExpense[role].onsite + combinedExpense[role].offsite;
      }
      let reportData = Object.keys(combinedExpense).map((role) => ({
        role,
        onsite: combinedExpense[role].onsite,
        offsite: combinedExpense[role].offsite,
        total: combinedExpense[role].total,
      }));
      reportData.sort((a, b) => b.total - a.total);
      reportData.forEach((item, index) => {
        item.rank = index + 1;
      });
      const tbodyReport = expenseReportBodyRef.current;
      if (tbodyReport) {
        tbodyReport.innerHTML = "";
        reportData.forEach((item) => {
          const tr = document.createElement("tr");
          tr.className = "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer";
          tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${item.rank}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.role}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">$${item.onsite.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">$${item.offsite.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">$${item.total.toFixed(2)}</td>`;
          tbodyReport.appendChild(tr);
        });
        reportContainerRef.current.classList.remove("hidden");
      }
    }

    // Modified recalcInvoiceTotals: Using effective price so that changes in unit price and discount update the chart and expense report dynamically.
    function recalcInvoiceTotals() {
      let totalExpenses = 0;
      let totalManDays = 0;
      const newAggregatedOnsiteEffective = {};
      const newAggregatedOffsiteEffective = {};

      tbodyInv.querySelectorAll("tr").forEach((row) => {
        const manDaysInput = row.querySelector(".man-days-input");
        const unitPriceInput = row.querySelector(".unit-price-input");
        const discountInput = row.querySelector(".discount-input");
        const totalPriceCell = row.querySelector(".total-price-cell");
        const manDaysVal = parseFloat(manDaysInput.value) || 0;
        const unitPriceVal = parseFloat(unitPriceInput.value) || 0;
        const discountVal = parseFloat(discountInput.value) || 0;
        const effectivePrice = unitPriceVal * (discountVal > 0 ? (1 - discountVal / 100) : 1);
        let totalPrice = effectivePrice * manDaysVal;
        totalPriceCell.textContent = totalPrice.toFixed(2);
        totalExpenses += totalPrice;
        totalManDays += manDaysVal;

        const roleCell = row.children[0];
        const locCell = row.children[1];
        if (roleCell && locCell) {
          const roleName = roleCell.textContent.trim();
          const locationText = locCell.textContent.trim().toLowerCase();
          if (locationText.includes("on")) {
            newAggregatedOnsiteEffective[roleName] = (newAggregatedOnsiteEffective[roleName] || 0) + totalPrice;
          } else {
            newAggregatedOffsiteEffective[roleName] = (newAggregatedOffsiteEffective[roleName] || 0) + totalPrice;
          }
        }
      });

      const totalHours = totalManDays * 8;
      expensesDiv.textContent = `Total Man-Days: ${totalManDays.toFixed(3)} | Total Hours: ${totalHours.toFixed(2)} | Total Expenses: $${totalExpenses.toFixed(2)}`;

      const newChartData = {
        onsite: {
          roles: Object.keys(newAggregatedOnsiteEffective),
          values: Object.values(newAggregatedOnsiteEffective),
        },
        offsite: {
          roles: Object.keys(newAggregatedOffsiteEffective),
          values: Object.values(newAggregatedOffsiteEffective),
        },
      };
      setChartData(newChartData);
      updateChart(newChartData);
      updateExpenseReportUI(newAggregatedOnsiteEffective, newAggregatedOffsiteEffective);
    }

    tbodyInv.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        recalcInvoiceTotals();
      });
    });
    
    recalcInvoiceTotals();

    // --------------------------
    // NEW: Default Unit Price Input Section with Two Buttons (Edit and Original Price)
    // (Note: This section is already inserted above the table)
    // --------------------------
    const defaultPriceInput = document.getElementById("default-unit-price");
    const editDefaultPriceBtn = document.getElementById("edit-default-price");
    const resetDefaultPriceBtn = document.getElementById("reset-default-price");

    editDefaultPriceBtn.addEventListener("click", () => {
      if (defaultPriceInput.disabled) {
        defaultPriceInput.disabled = false;
        defaultPriceInput.focus();
        editDefaultPriceBtn.textContent = "Apply";
      } else {
        const newDefaultPrice = parseFloat(defaultPriceInput.value);
        if (!isNaN(newDefaultPrice)) {
          const unitPriceInputs = invoiceContainerRef.current.querySelectorAll(".unit-price-input");
          unitPriceInputs.forEach((input) => {
            input.value = newDefaultPrice.toFixed(2);
          });
          recalcInvoiceTotals();
        }
        defaultPriceInput.disabled = true;
        editDefaultPriceBtn.textContent = "Edit";
      }
    });

    resetDefaultPriceBtn.addEventListener("click", () => {
      // Loop over each row and reset the unit price based on the original PRICE_MAPPING values.
      const rows = invoiceContainerRef.current.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const roleCell = row.children[0];
        const unitPriceInput = row.querySelector(".unit-price-input");
        if (roleCell && unitPriceInput) {
          const roleName = roleCell.textContent.trim();
          let originalPrice = null;
          for (let key in PRICE_MAPPING) {
            if (PRICE_MAPPING[key].role === roleName) {
              const locCell = row.children[1];
              if (locCell) {
                const locText = locCell.textContent.trim().toLowerCase();
                originalPrice = locText.includes("on") ? PRICE_MAPPING[key].onsite : PRICE_MAPPING[key].offsite;
              }
              break;
            }
          }
          if (originalPrice !== null) {
            unitPriceInput.value = originalPrice.toFixed(2);
          }
        }
      });
      // Also clear the Default Unit Price input field
      defaultPriceInput.value = "";
      recalcInvoiceTotals();
    });
  }

  // --------------------------
  // Render Aggregated Data Table
  // --------------------------
  function renderTable(data) {
    dataTableBodyRef.current.innerHTML = "";
    if (data.length === 0) {
      dataTableBodyRef.current.innerHTML = `<tr><td colspan="11" class="text-center py-4">No records found.</td></tr>`;
      return;
    }
    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
         <td class="px-6 py-4 text-right whitespace-nowrap">${row.manDays}</td>
         <td class="px-6 py-4 text-left whitespace-nowrap">${row.employeeName}</td>
         <td class="px-6 py-4 text-right whitespace-nowrap">${row.daysWorked}</td>
         <td class="px-6 py-4 text-left whitespace-nowrap">${row.location}</td>
         <td class="px-6 py-4 text-left whitespace-nowrap">${row.role}</td>
         <td class="px-6 py-4 text-left whitespace-nowrap">${row.project}</td>
         <td class="px-6 py-4 text-right whitespace-nowrap">${row.totalHours}</td>
         <td class="px-6 py-4 text-right whitespace-nowrap">${row.avgHours}</td>
         <td class="px-6 py-4 text-center whitespace-nowrap">
           <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
             row.status.toLowerCase() === "critical"
               ? "bg-red-100 text-red-800"
               : row.status.toLowerCase() === "moderate"
               ? "bg-yellow-100 text-yellow-800"
               : "bg-green-100 text-green-800"
           }">
             ${row.status}
           </span>
         </td>
         <td class="px-6 py-4 text-left whitespace-nowrap">${row.summary}</td>
         <td class="px-6 py-4 text-left whitespace-nowrap">${row.description}</td>`;
      dataTableBodyRef.current.appendChild(tr);
    });
  }

  // --------------------------
  // Render Maximum Hours Table
  // --------------------------
  function renderMaxHoursTable(data) {
    if (!maxHoursTableRef.current) return;
    maxHoursTableRef.current.innerHTML = "";
    if (data.length === 0) {
      maxHoursTableRef.current.innerHTML = `<tr><td colspan="4" class="text-center py-4">No records found.</td></tr>`;
      return;
    }
    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.employeeName}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.maxHoursFormatted}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.maxCount}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.totalWorkingDays}</td>`;
      maxHoursTableRef.current.appendChild(tr);
    });
    maxHoursContainerRef.current.classList.remove("hidden");
  }

  // --------------------------
  // Excel Export Function for Aggregated Data and Invoice Details
  // --------------------------
  function downloadExcel(data, fileName = "aggregated.xlsx") {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = [];
    const headers = Object.keys(data[0]);
    headers.forEach((header) => {
      let maxLen = header.length;
      data.forEach((row) => {
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
            fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } },
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

  // --------------------------
  // Donut Chart Setup with Animation and Refined Style
  // --------------------------
  const initChart = (labels, series) => {
    const options = {
      series: series,
      colors: [
        "#1C64F2",
        "#16BDCA",
        "#FDBA8C",
        "#E74694",
        "#a0aec0",
        "#f56565",
        "#68d391",
        "#ecc94b",
        "#6a0dad",
        "#ff4500",
        "#00ced1",
        "#ff1493",
        "#ff6347",
        "#20b2aa",
        "#ff8c00",
        "#9370db",
        "#8b0000",
        "#48d1cc",
        "#ff00ff",
        "#ffd700",
        "#008080",
        "#dc143c",
        "#7b68ee",
        "#008000",
        "#ff69b4",
        "#4b0082",
        "#4682b4",
        "#ffb6c1",
        "#556b2f",
        "#2e8b57",
      ],
      chart: {
        height: 500,
        width: "100%",
        type: "donut",
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 1500,
          animateGradually: { enabled: true, delay: 250 },
          dynamicAnimation: { enabled: true, speed: 1000 },
        },
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
                fontSize: "18px",
                offsetY: 20,
              },
              total: {
                showAlways: true,
                show: true,
                label: "Total Expenses",
                fontFamily: "Inter, sans-serif",
                fontSize: "20px",
                formatter: function (w) {
                  const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                  return "$" + sum.toFixed(2);
                },
              },
              value: {
                show: true,
                fontFamily: "Inter, sans-serif",
                fontSize: "16px",
                offsetY: -20,
                formatter: function (value) {
                  return "$" + value.toFixed(2);
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
          options: { chart: { height: 400 } },
        },
      ],
    };

    if (chart) {
      chart.updateOptions({ labels: labels, series: series }, true, true);
    } else {
      chart = new ApexCharts(donutChartRef.current, options);
      chart.render();
    }
  };

  const combineChartData = (onsiteData, offsiteData) => {
    const combinedMap = {};
    onsiteData.roles.forEach((role, i) => {
      combinedMap[role] = (combinedMap[role] || 0) + onsiteData.values[i];
    });
    offsiteData.roles.forEach((role, i) => {
      combinedMap[role] = (combinedMap[role] || 0) + offsiteData.values[i];
    });
    const roles = Object.keys(combinedMap);
    const values = roles.map((role) => combinedMap[role]);
    return { roles, values };
  };

  // Modified updateChart function to safely check the chart data before using it.
  const updateChart = (newData) => {
    const data = newData && newData.onsite && newData.offsite ? newData : chartDataState;
    const safeData = {
      onsite: data.onsite || { roles: [], values: [] },
      offsite: data.offsite || { roles: [], values: [] },
    };
    const onsiteChecked = onsiteCheckboxRef.current?.checked;
    const offsiteChecked = offsiteCheckboxRef.current?.checked;
    let labels, series;
    if (onsiteChecked && !offsiteChecked) {
      labels = safeData.onsite.roles;
      series = safeData.onsite.values;
    } else if (!onsiteChecked && offsiteChecked) {
      labels = safeData.offsite.roles;
      series = safeData.offsite.values;
    } else {
      const combined = combineChartData(safeData.onsite, safeData.offsite);
      labels = combined.roles;
      series = combined.values;
    }
    if (!labels || !series || !labels.length || !series.length) {
      console.warn("No valid chart data available.");
      return;
    }
    if (chart) {
      chart.updateOptions(
        {
          labels: labels,
          series: series,
          chart: {
            animations: {
              enabled: true,
              easing: "easeinout",
              speed: 1500,
              animateGradually: { enabled: true, delay: 250 },
              dynamicAnimation: { enabled: true, speed: 1000 },
            },
          },
        },
        true,
        true
      );
    } else {
      initChart(labels, series);
    }
  };

  // --------------------------
  // Expense Report Generation and Full Report Export
  // --------------------------
  function exportFullReport() {
    // Recalculate the dynamic Expense Report based on current invoice table values.
    const invoiceTable = invoiceContainerRef.current.querySelector("table");
    const newAggregatedOnsite = {};
    const newAggregatedOffsite = {};
    if (invoiceTable) {
      const rows = invoiceTable.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const manDaysInput = row.querySelector(".man-days-input");
        const unitPriceInput = row.querySelector(".unit-price-input");
        const discountInput = row.querySelector(".discount-input");
        const manDaysVal = parseFloat(manDaysInput.value) || 0;
        const unitPriceVal = parseFloat(unitPriceInput.value) || 0;
        const discountVal = parseFloat(discountInput.value) || 0;
        let effectivePrice = unitPriceVal * (discountVal > 0 ? (1 - discountVal / 100) : 1);
        if (isNaN(effectivePrice)) effectivePrice = 0;
        if (isNaN(manDaysVal)) manDaysVal = 0;
        const rowExpense = effectivePrice * manDaysVal;
        const roleCell = row.children[0];
        const locCell = row.children[1];
        if (roleCell && locCell) {
          const roleName = roleCell.textContent.trim();
          const locationText = locCell.textContent.trim().toLowerCase();
          if (locationText.includes("on")) {
            newAggregatedOnsite[roleName] = (newAggregatedOnsite[roleName] || 0) + rowExpense;
          } else {
            newAggregatedOffsite[roleName] = (newAggregatedOffsite[roleName] || 0) + rowExpense;
          }
        }
      });
    }
    const combinedExpense = {};
    Object.keys(newAggregatedOnsite).forEach((role) => {
      combinedExpense[role] = { onsite: newAggregatedOnsite[role] || 0, offsite: 0, total: 0 };
    });
    Object.keys(newAggregatedOffsite).forEach((role) => {
      combinedExpense[role] = combinedExpense[role] || { onsite: 0, offsite: 0, total: 0 };
      combinedExpense[role].offsite = newAggregatedOffsite[role] || 0;
    });
    for (let role in combinedExpense) {
      combinedExpense[role].total = combinedExpense[role].onsite + combinedExpense[role].offsite;
    }
    let reportDataDynamic = Object.keys(combinedExpense).map((role) => ({
      role,
      onsite: combinedExpense[role].onsite,
      offsite: combinedExpense[role].offsite,
      total: combinedExpense[role].total,
    }));
    reportDataDynamic.sort((a, b) => b.total - a.total);
    reportDataDynamic.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Extract Invoice Details from the invoice table dynamically
    const invoiceDataArray = [];
    if (invoiceTable) {
      const rows = invoiceTable.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        const rowData = {
          Position: cells[0].textContent.trim(),
          Location: cells[1].textContent.trim(),
          Quantity: cells[2].querySelector("input").value,
          ManDays: cells[3].querySelector("input").value,
          Unit: cells[4].querySelector("select").value,
          "Unit Price": cells[5].querySelector("input").value,
          "Discount %": cells[6].querySelector("input").value,
          "Total Price": cells[7].textContent.trim(),
        };
        invoiceDataArray.push(rowData);
      });
    }

    // Invoice Summary recalculation.
    let totalManDays = 0;
    let totalExpenses = 0;
    if (invoiceTable) {
      const rows = invoiceTable.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const manDaysVal = parseFloat(row.querySelector(".man-days-input").value) || 0;
        const unitPriceVal = parseFloat(row.querySelector(".unit-price-input").value) || 0;
        const discountVal = parseFloat(row.querySelector(".discount-input").value) || 0;
        const effectivePrice = unitPriceVal * (discountVal > 0 ? (1 - discountVal / 100) : 1);
        let price = effectivePrice * manDaysVal;
        totalManDays += manDaysVal;
        totalExpenses += price;
      });
    }
    const totalHours = totalManDays * 8;
    const invoiceSummaryData = [{
      "Total Man-Days": totalManDays.toFixed(3),
      "Total Hours": totalHours.toFixed(2),
      "Total Expenses": totalExpenses.toFixed(2)
    }];

    const wb = XLSX.utils.book_new();
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
            fill: { patternType: "solid", fgColor: { rgb: "FFD700" } },
          };
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, infoSheet, "Report Info");

    const aggSheet = XLSX.utils.json_to_sheet(aggregatedData, {
      header: Object.keys(aggregatedData[0]),
    });
    if (aggSheet["!ref"]) {
      const range = XLSX.utils.decode_range(aggSheet["!ref"]);
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = { r: 0, c: c };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (aggSheet[cellRef]) {
          aggSheet[cellRef].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } },
          };
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, aggSheet, "Aggregated Data");

    const expSheet = XLSX.utils.json_to_sheet(reportDataDynamic, {
      header: ["rank", "role", "onsite", "offsite", "total"],
    });
    if (expSheet["!ref"]) {
      const range = XLSX.utils.decode_range(expSheet["!ref"]);
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = { r: 0, c: c };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (expSheet[cellRef]) {
          expSheet[cellRef].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { patternType: "solid", fgColor: { rgb: "B0E0E6" } },
          };
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, expSheet, "Expense Report");

    const invoiceDetailsSheet = XLSX.utils.json_to_sheet(invoiceDataArray);
    XLSX.utils.book_append_sheet(wb, invoiceDetailsSheet, "Invoice Details");

    const invoiceSummarySheet = XLSX.utils.json_to_sheet(invoiceSummaryData);
    XLSX.utils.book_append_sheet(wb, invoiceSummarySheet, "Invoice Summary");

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

  // --------------------------
  // Attach Event Listeners on Mount
  // --------------------------
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    const fileInput = fileInputRef.current;
    const downloadBtn = downloadBtnRef.current;
    const exportReportBtn = exportReportBtnRef.current;

    const handleDropZoneClick = () => {
      if (fileInput) fileInput.click();
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (dropZone) dropZone.classList.add("bg-blue-50", "border-blue-400");
    };

    const handleDragLeave = () => {
      if (dropZone) dropZone.classList.remove("bg-blue-50", "border-blue-400");
    };

    const handleDrop = (e) => {
      e.preventDefault();
      if (dropZone) dropZone.classList.remove("bg-blue-50", "border-blue-400");
      const file = e.dataTransfer.files[0];
      console.log("File dropped:", file);
      handleFile(file);
    };

    const handleFileInputChange = (e) => {
      const file = e.target.files[0];
      console.log("File selected:", file);
      handleFile(file);
    };

    dropZone.addEventListener("click", handleDropZoneClick);
    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);
    fileInput.addEventListener("change", handleFileInputChange);

    const handleDownloadClick = () => {
      if (aggregatedData && aggregatedData.length > 0) {
        const fileName = `${uploadedFileNameBase}_analyzed_${reportMonth}.xlsx`;
        downloadExcel(aggregatedData, fileName);
      } else {
        alert("No data available to download. Please process a file first.");
      }
    };
    downloadBtn.addEventListener("click", handleDownloadClick);
    exportReportBtn.addEventListener("click", exportFullReport);

    return () => {
      dropZone.removeEventListener("click", handleDropZoneClick);
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
      fileInput.removeEventListener("change", handleFileInputChange);
      downloadBtn.removeEventListener("click", handleDownloadClick);
      exportReportBtn.removeEventListener("click", exportFullReport);
    };
  }, []);

  // --------------------------
  // Update Chart on Data Change
  // --------------------------
  useEffect(() => {
    if (aggregatedData.length > 0) {
      renderTable(aggregatedData);
      createInvoiceTableDynamic(roleLocationCounts, roleLocationManDays);
      generateExpenseReport();
      renderMaxHoursTable(maximumHoursData);
      updateChart();
    }
  }, [aggregatedData, roleLocationCounts, roleLocationManDays, maximumHoursData]);

  useEffect(() => {
    if (!roleLocationManDays || Object.keys(roleLocationManDays).length === 0) {
      console.warn("No roleLocationManDays data available. Skipping chart update.");
      return;
    }
    const aggregatedOnsite = {};
    const aggregatedOffsite = {};
    Object.keys(roleLocationManDays).forEach((key) => {
      const [role, location] = key.split("|");
      if (location === "onsite") {
        aggregatedOnsite[role] = (aggregatedOnsite[role] || 0) + roleLocationManDays[key];
      } else if (location === "offsite") {
        aggregatedOffsite[role] = (aggregatedOffsite[role] || 0) + roleLocationManDays[key];
      }
    });
    const aggregatedExpenseOnsite = {};
    Object.keys(aggregatedOnsite).forEach((role) => {
      aggregatedExpenseOnsite[role] = PRICE_MAPPING[role]
        ? aggregatedOnsite[role] * PRICE_MAPPING[role].onsite
        : aggregatedOnsite[role];
    });
    const aggregatedExpenseOffsite = {};
    Object.keys(aggregatedOffsite).forEach((role) => {
      aggregatedExpenseOffsite[role] = PRICE_MAPPING[role]
        ? aggregatedOffsite[role] * PRICE_MAPPING[role].offsite
        : aggregatedOffsite[role];
    });
    console.log("Computed Aggregated Expenses:", {
      aggregatedExpenseOnsite,
      aggregatedExpenseOffsite,
    });
    setChartData({
      onsite: {
        roles: Object.keys(aggregatedExpenseOnsite),
        values: Object.values(aggregatedExpenseOnsite),
      },
      offsite: {
        roles: Object.keys(aggregatedExpenseOffsite),
        values: Object.values(aggregatedExpenseOffsite),
      },
    });
  }, [roleLocationManDays]);

  // --------------------------
  // Render JSX
  // --------------------------
  return (
    <div className="bg-gray-100">
      <div className="container mx-auto px-4 lg:px-10 py-6 bg-white shadow-lg rounded-lg mt-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          BSS Employee Work Analysis
        </h1>

        {/* File Upload Section */}
        <div
          id="drop-zone"
          ref={dropZoneRef}
          className="border-2 border-dashed border-gray-400 p-10 rounded-lg text-center cursor-pointer hover:border-gray-600 transition-colors"
        >
          <span className="text-gray-600">
            Drag &amp; Drop Excel/CSV File Here or Click to Upload
          </span>
          <input
            type="file"
            id="file-input"
            ref={fileInputRef}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
        </div>

        {/* Data Table Section */}
        <div id="results" ref={resultsRef} className="hidden mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Man Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Hours/Day
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody
                id="data-table-body"
                ref={dataTableBodyRef}
                className="bg-white divide-y divide-gray-200"
              ></tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <button
              id="download-btn"
              ref={downloadBtnRef}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Download Excel
            </button>
          </div>
        </div>

        {/* Invoice Container */}
        <div id="invoice-container" ref={invoiceContainerRef} className="mt-10"></div>

        {/* Dashboard Card (Donut Chart & Location Toggle) */}
        <div
          id="chart-container"
          ref={chartContainerRef}
          className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6 mt-10 hidden"
        >
          {/* Chart Title and Additional Info: Title aligned left with question mark icon for tooltip */}
          <div className="text-left mb-4 flex items-center">
            <h5 className="text-xl font-bold text-gray-900 dark:text-white">Employee Work Analysis</h5>
            <span title="This chart represents the distribution of man-days expense by role based on location. Adjust the invoice details to see dynamic changes." className="ml-2 cursor-help">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-9-3a1 1 0 112 0 1 1 0 01-2 0zm1 8a1 1 0 01-.993-.883L10 15V9a1 1 0 01.883-.993L11 8h.01a1 1 0 01.993.883L12 9v6a1 1 0 01-.883.993L11 16z" clip-rule="evenodd" />
              </svg>
            </span>
          </div>

          {/* Location Toggle */}
          <div className="mb-4">
            <div className="flex" id="location-toggle">
              <div className="flex items-center me-4">
                <input
                  id="onsite"
                  ref={onsiteCheckboxRef}
                  type="checkbox"
                  name="location"
                  value="onsite"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500"
                  onChange={updateChart}
                />
                <label
                  htmlFor="onsite"
                  className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                >
                  On‑Site
                </label>
              </div>
              <div className="flex items-center me-4">
                <input
                  id="offsite"
                  ref={offsiteCheckboxRef}
                  type="checkbox"
                  name="location"
                  value="offsite"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500"
                  onChange={updateChart}
                />
                <label
                  htmlFor="offsite"
                  className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                >
                  Off‑Site
                </label>
              </div>
            </div>
          </div>

          {/* Donut Chart Container */}
          <div className="py-6" id="donut-chart" ref={donutChartRef}></div>

          {/* Optional Time-Range Dropdown */}
          <div className="grid grid-cols-1 items-center border-gray-200 border-t dark:border-gray-700 justify-between">
            <div className="flex justify-between items-center pt-5">
              <div
                id="lastDaysdropdown"
                className="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700"
              >
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                  <li>
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                      Yesterday
                    </a>
                  </li>
                  <li>
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                      Today
                    </a>
                  </li>
                  <li>
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                      Last 7 days
                    </a>
                  </li>
                  <li>
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                      Last 30 days
                    </a>
                  </li>
                  <li>
                    <a href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                      Last 90 days
                    </a>
                  </li>
                </ul>
              </div>
              <a
                href="#"
                className="uppercase text-sm font-semibold inline-flex items-center rounded-lg text-blue-600 hover:text-blue-700 dark:hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2"
              >
                Employee Work Analysis
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1 text-blue-500 cursor-help"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  title="This chart represents the distribution of man-days expense by role based on location. Adjust the invoice details to see updates."
                >
                  <path fill-rule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-9-3a1 1 0 112 0 1 1 0 01-2 0zm1 8a1 1 0 01-.993-.883L10 15V9a1 1 0 01.883-.993L11 8h.01a1 1 0 01.993.883L12 9v6a1 1 0 01-.883.993L11 16z" clip-rule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Expense Report Table */}
        <div id="report-container" ref={reportContainerRef} className="mt-10 hidden">
          <h2 className="text-2xl font-bold mb-6">Expense Report by Role</h2>
          <div className="overflow-x-auto">
            <table id="expense-report-table" className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    On‑Site Expense
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Off‑Site Expense
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Expense
                  </th>
                </tr>
              </thead>
              <tbody
                id="expense-report-body"
                ref={expenseReportBodyRef}
                className="bg-white divide-y divide-gray-200"
              ></tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <button
              id="export-report-btn"
              ref={exportReportBtnRef}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export Full Report as XLSX
            </button>
          </div>
        </div>

        {/* Maximum Hours Table */}
        <div id="max-hours-container" ref={maxHoursContainerRef} className="mt-10 hidden">
          <h2 className="text-2xl font-bold mb-6">Maximum Hours Per Day by Employee</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Hours in a Day
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Hours Occurred
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Working Days
                  </th>
                </tr>
              </thead>
              <tbody
                id="max-hours-table-body"
                ref={maxHoursTableRef}
                className="bg-white divide-y divide-gray-200"
              ></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BSS;
