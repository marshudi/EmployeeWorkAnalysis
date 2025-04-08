# Employee Work Analysis

A React application that reads Excel/CSV files, aggregates and analyzes employee work hours, calculates man-days, and generates dynamic expense and invoice details. It uses [XLSX](https://www.npmjs.com/package/xlsx) for file parsing, [ApexCharts](https://apexcharts.com/) for data visualization, and [Tailwind CSS](https://tailwindcss.com/) for styling.

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Available Scripts](#available-scripts)
5. [Usage](#usage)
6. [Data Processing Flow](#data-processing-flow)
7. [Customization](#customization)
8. [Deployment](#deployment)
9. [Additional Resources](#additional-resources)

---

## Overview

This application allows users to:
- **Drag & Drop** or **Upload** an Excel/CSV timesheet file.  
- Automatically parse and aggregate employee data:
  - Total hours worked, days worked, average hours/day.
  - Roles and locations (onsite/offsite).
  - Automatic man-day calculations based on hours worked (8 hours = 1 man-day).
- Dynamically generate:
  - **Invoice Details** with editable quantities, man-days, unit prices, and discounts.
  - **Expense Report** showing onsite/offsite costs and total costs per role.
  - **Maximum Hours Table** listing the peak daily hours recorded by each employee.
  - **Donut Chart** (via ApexCharts) showing real-time distribution of expenses by role.
- Easily **download** both aggregated data and a **full expense report** in Excel format.

---

## Features

- **File Parsing:** Uses the [xlsx](https://www.npmjs.com/package/xlsx) library to read Excel/CSV files in the browser.
- **Data Aggregation & Analysis:**
  - Calculates total hours, average hours/day, and man-days for each employee.
  - Identifies roles and whether they were onsite or offsite.
  - Highlights employees with “Critical” or “Moderate” statuses based on average daily hours.
  - Records maximum daily hours per employee, plus how often that peak occurred.
- **Invoice & Expense Management:**
  - Auto-populates invoice items (roles, location, quantity, man-days, etc.).
  - Allows manual edits to unit price and discounts in real time.
  - Recalculates total expense on the fly (using discount and updated unit prices).
- **Charts & Reports:**
  - Donut chart for expense distribution by role.
  - Invoice table with dynamic recalculations.
  - Exportable aggregated and summarized data as Excel files.
- **Responsive UI:** Built with Tailwind CSS classes for styling and responsiveness.

---

## Getting Started

1. **Clone the repository** (or download the ZIP).

2. **Navigate into the project directory**:
   ```bash
   cd your-project-directory
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```
   This installs React, Tailwind CSS, XLSX, ApexCharts, and any other required packages.

4. **Start the development server**:
   ```bash
   npm start
   ```
   By default, your application will be running at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

In the project directory, you can run:

### `npm start`
Runs the app in development mode.  
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.  
The page will reload when you make changes, and you may also see lint errors in the console.

### `npm test`
Launches the test runner in the interactive watch mode.  
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) in the Create React App documentation.

### `npm run build`
Builds the app for production to the `build` folder.  
It bundles React in production mode and optimizes the build for best performance.  
The final bundle is minified and includes hashed filenames.

### `npm run eject`
**Note:** This is a one-way operation. Once you `eject`, you can’t go back!  
It copies all configurations and dependencies into your project, giving you full control, but you lose the benefit of automatic updates.

For more information, check the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

---

## Usage

1. **Uploading/Dragging a File**  
   - Click in the highlighted drop zone or drag a `.xlsx`, `.xls`, or `.csv` file there.  
   - The file will be parsed automatically upon drop or selection.

2. **View Aggregated Results**  
   - After upload, the **Aggregated Data** table appears, listing each employee’s totals, roles, and average hours/day.
   - You can download an Excel file of this raw aggregated data.

3. **Invoice/Expense Management**  
   - An **Invoice** section auto-populates with role, location, quantity, and man-days.
   - **Edit** the unit price or discount percentage to see real-time updates to total expenses.
   - **Default Unit Price**: You can set a global price to override all existing values or revert to original prices.

4. **Chart & Expense Report**  
   - Check the **On‑Site** or **Off‑Site** toggles to filter data in the donut chart.
   - An **Expense Report by Role** table shows onsite/offsite totals.  
   - A **Maximum Hours** table displays each employee’s highest recorded daily hours.

5. **Export Full Report**  
   - Click **Export Full Report as XLSX** to download a consolidated file containing:
     - Project info
     - Aggregated Data
     - Expense Report
     - Invoice Details
     - Invoice Summary (total man-days, total hours, total expenses)

---

## Data Processing Flow

1. **File Read**: XLSX reads the file as an ArrayBuffer via `FileReader`.
2. **JSON Conversion**: The sheet is converted to an array of rows (`jsonData`) with headers in row 0.
3. **Normalization**: Headers are normalized (lowercased, underscores, etc.) to map columns like Date, Employee Name, Hours, Role, etc.
4. **Aggregation**:
   - **Group by Employee** and sum total hours, track days worked, roles, projects, etc.
   - Calculate man-days (`hours / 8`), average daily hours, and status (Normal, Moderate, or Critical).
5. **Invoice Calculation**:
   - Summarize man-days by role/location (onsite/offsite).
   - Multiply by pre-set or user-edited unit prices, minus optional discounts.
6. **Charts & Reporting**:
   - ApexCharts donut chart is updated based on your invoice row edits.
   - Final aggregated data and invoice summary are available for export.

---

## Customization

- **Unit Prices & Roles**:  
  You can modify the `INVOICE_ITEMS` and `PRICE_MAPPING` arrays in the code to update the default roles and pricing logic.
  
- **Styling**:  
  The app uses [Tailwind CSS](https://tailwindcss.com/) utility classes. You can further customize classes in the component or use a Tailwind configuration file.

- **Critical vs. Moderate Threshold**:  
  Currently, it’s set to:
  - **Critical** if `avgHours > 12`
  - **Moderate** if `avgHours > 8`
  - Otherwise, **Normal**  
  Change this logic in the `getStatus(avgHours)` function as needed.

- **Maximum Hours Tracking**:  
  The app logs each employee’s highest single-day hours and how many times they reached that peak. Adjust or remove this feature if unnecessary.

---

## Deployment

After you have run `npm run build`, you can deploy the output in the `build` folder to any static hosting provider (Netlify, Vercel, AWS S3, etc.). Refer to the [deployment section of Create React App](https://facebook.github.io/create-react-app/docs/deployment) for more details.

---

## Additional Resources

- [React Documentation](https://react.dev/)
- [Create React App Docs](https://facebook.github.io/create-react-app/docs/getting-started)
- [Tailwind CSS](https://tailwindcss.com/docs/installation)
- [ApexCharts.js](https://apexcharts.com/docs/react-charts/)
- [SheetJS (xlsx) Docs](https://docs.sheetjs.com/)

---

**Happy Analyzing!** If you run into any issues or have questions, feel free to open an issue or reach out to the project maintainers.
