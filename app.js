// Configuration for keyword highlighting
const HIGHLIGHT_WORDS = {
  'Scrum Master': 'red',
  'Project support': 'blue',
  'Deployment': 'green',
  'Testing': 'orange',
  'Sanity': 'red'
};

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const results = document.getElementById('results');
  const tbody = document.getElementById('data-table-body');
  const downloadBtn = document.getElementById('download-btn');

  // Global variable to store aggregated data for download
  let aggregatedData = [];

  // Trigger file input on drop zone click
  dropZone.addEventListener('click', () => fileInput.click());

  // Drag & drop events for visual feedback
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

  // Process the file upload
  function handleFile(file) {
    if (!file) return;
    tbody.innerHTML = `<tr>
      <td colspan="10" class="text-center py-4">Processing file, please wait...</td>
    </tr>`;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        aggregatedData = processData(jsonData);
        renderTable(aggregatedData);
        results.classList.remove('hidden');
      } catch (error) {
        console.error('Error processing file:', error);
        tbody.innerHTML = `<tr>
          <td colspan="10" class="text-center py-4 text-red-600">Error processing file: ${error.message}</td>
        </tr>`;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // --- Data Processing Functions ---
  function processData(jsonData) {
    if (!jsonData || jsonData.length === 0) {
      throw new Error('No data found in the file.');
    }
    // Normalize headers: lowercase, replace spaces/slashes with underscores, remove non-alphanumeric characters
    const headers = jsonData[0].map((h) =>
      h.toString().toLowerCase().replace(/[/ ]/g, '_').replace(/[^a-z0-9_]/gi, '')
    );
  
    // Map column names with improved employee detection
    const columnMap = {
      date: headers.find((h) => h.includes('date')),
      employee: headers.find(h => h.includes('empl') && h.includes('name')),
      hours: headers.find((h) => h.includes('hours')),
      description: headers.find((h) => h.includes('description')),
      location: headers.find((h) => h.includes('location')) || headers.find((h) => h.includes('site')),
      role: headers.find((h) => h.includes('role')),
      project: headers.find((h) => h.includes('project'))
    };
  
    const rows = jsonData.slice(1);
    const groupMap = new Map();
  
    rows.forEach((row) => {
      const getValue = (colHeader) => {
        if (!colHeader) return '';
        const idx = headers.indexOf(colHeader);
        return idx >= 0 && row[idx] ? row[idx].toString().trim() : '';
      };
  
      const empName = getValue(columnMap.employee);
      if (!empName) return; // Skip rows without an employee name
  
      if (!groupMap.has(empName)) {
        groupMap.set(empName, {
          employeeName: empName,
          totalHours: 0,
          days: new Set(),
          descriptions: new Set(),
          locations: new Set(),
          roles: new Set(),
          projects: new Set()
        });
      }
      const group = groupMap.get(empName);
  
      // Aggregate hours
      const hours = parseFloat(getValue(columnMap.hours)) || 0;
      group.totalHours += hours;
  
      // Aggregate date for counting unique days
      const date = getValue(columnMap.date);
      if (date) group.days.add(date);
  
      // Aggregate description
      const desc = getValue(columnMap.description);
      if (desc) group.descriptions.add(desc);
  
      // Aggregate location, role, project
      const loc = getValue(columnMap.location);
      if (loc) group.locations.add(loc);
      const role = getValue(columnMap.role);
      if (role) group.roles.add(role);
      const proj = getValue(columnMap.project);
      if (proj) group.projects.add(proj);
    });
  
    const output = [];
    groupMap.forEach((group) => {
      const totalDays = group.days.size || 1;
      const avgHours = group.totalHours / totalDays;
      const manDays = group.totalHours / 8;
      const status = getStatus(avgHours);
  
      output.push({
        manDays: formatNumber(manDays),
        employeeName: group.employeeName,
        location: formatList(group.locations),
        role: formatList(group.roles),
        project: formatList(group.projects),
        totalHours: formatNumber(group.totalHours),
        avgHours: formatNumber(avgHours),
        status: status,
        summary: extractSummary(Array.from(group.descriptions).join(' | ')),
        description: status === 'Critical' ? Array.from(group.descriptions).join(' | ') : ''
      });
    });
  
    // Sort descending by totalHours (using numeric value)
    output.sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours));
    return output;
  }
  
  // --- Cleaning Functions ---
  function cleanLocation(location) {
    location = location.replace(/-/g, ' ');
    return location.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  
  function cleanRole(role) {
    let roles = role.split(/[,/]/).map(r => r.trim());
    roles = roles.filter(r => !ROLES_TO_REMOVE.some(rem => rem.toLowerCase() === r.toLowerCase()));
    return Array.from(new Set(roles)).sort().join(', ');
  }
  
  function cleanProject(project) {
    return project.replace(/[^a-zA-Z0-9, ]/g, '').trim();
  }
  
  // --- Summary Extraction ---
  function extractSummary(description) {
    if (!description) return '';
    const cleaned = description.replace(/\b[A-Z]+-\d+\b/g, '').replace(/[^a-zA-Z, ]/g, '');
    const found = new Set();
  
    Object.keys(HIGHLIGHT_WORDS).forEach((phrase) => {
      const regex = new RegExp(`\\b${phrase}\\b`, 'i');
      if (regex.test(description)) {
        found.add(phrase);
      }
    });
  
    cleaned.split(' ')
      .filter((word) => word.length > 4)
      .forEach((word) => {
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
  
  // --- Rendering ---
  function renderTable(data) {
    tbody.innerHTML = '';
    if (data.length === 0) {
      tbody.innerHTML = `<tr>
        <td colspan="10" class="text-center py-4">No records found.</td>
      </tr>`;
      return;
    }
    data.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.manDays}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.employeeName}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.location}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.role}</td>
        <td class="px-6 py-4 text-left whitespace-nowrap">${row.project}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.totalHours}</td>
        <td class="px-6 py-4 text-right whitespace-nowrap">${row.avgHours}</td>
        <td class="px-6 py-4 text-center whitespace-nowrap">
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
  
  // --- Download Excel Function with Auto Spacing & Header/Status Styling ---
  function downloadExcel(data, fileName = "aggregated.xlsx") {
    // Convert JSON data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
  
    // Auto-adjust column widths:
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
  
    // Style header row (assumed to be row 0)
    if (worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = { r: 0, c: c };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true },
            fill: { patternType: "solid", fgColor: { rgb: "D3D3D3" } } // Light gray
          };
        }
      }
    }
  
    // Style status column (assume it's the 8th column, index 7)
    if (worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let r = 1; r <= range.e.r; r++) {
        const cellAddress = { r: r, c: 7 };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = worksheet[cellRef];
        if (cell && cell.v) {
          const statusVal = cell.v.toString().toLowerCase();
          let fillColor = "";
          if (statusVal === "critical") fillColor = "FF0000"; // Red
          else if (statusVal === "moderate") fillColor = "FFA500"; // Orange
          else if (statusVal === "normal") fillColor = "00FF00"; // Green
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
  
    // Create a new workbook, append the worksheet, and write the file
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
  
  // Add event listener to the download button
  downloadBtn.addEventListener("click", () => {
    if (aggregatedData && aggregatedData.length > 0) {
      downloadExcel(aggregatedData);
    } else {
      alert("No data available to download. Please process a file first.");
    }
  });
});
