# Employee Work Analysis - Python Script

## Overview
This Python script served as the **foundation** for the **Employee Work Analysis Website**. Initially developed as a standalone data processing tool, it automated the analysis of employee work records from CSV and Excel files. The insights and automation from this script laid the groundwork for the more advanced web-based solution.

## Purpose
The script was designed to:
- Aggregate employee work hours and activity descriptions.
- Identify key work categories based on specific keywords.
- Filter out irrelevant roles and standardize job roles.
- Generate **summary insights** based on work descriptions.
- Assign **status levels** (Critical, Moderate, Normal) based on work intensity.
- Format and export results into an Excel file with highlighted key data.

## Features
### 1️⃣ **Data Processing & Cleaning**
- Reads CSV and Excel files, standardizing column names.
- Cleans and structures employee role data.
- Removes unnecessary job roles to focus on relevant data.

### 2️⃣ **Workload Analysis**
- Aggregates **total work hours, locations, projects, and activities** per employee.
- Calculates **Man Days** (Total Hours / 8) and **Avg Hours per Day**.
- Assigns a **Status** based on workload intensity:
  - 🔴 **Critical** (Avg Hours > 12)
  - 🟠 **Moderate** (Avg Hours > 8)
  - 🟢 **Normal** (Avg Hours ≤ 8)

### 3️⃣ **AI-Powered Summary Extraction**
- Identifies **key phrases** from activity descriptions.
- Extracts **Scrum Master, Deployment, Testing, Support, and Planning** work categories.

### 4️⃣ **Excel Report Generation**
- Generates an Excel file with:
  - **Aggregated Employee Data**
  - **Color-coded Status Indicators**
  - **Auto-adjusted column formatting** for readability

## How This Evolved into a Website 🌐
- The insights generated from this script inspired the development of an interactive web platform.
- The web version **automates** file uploads, processing, and real-time analytics.
- **Database integration** was added to store and track work records.
- **AI features** were expanded to dynamically generate **smart ticketing, reporting, and dashboards**.

## Running the Script 🖥️
### **Installation**
Ensure Python and the required dependencies are installed:
```sh
pip install pandas openpyxl argparse
```

### **Usage**
Run the script with:
```sh
python employee_analysis.py input_file.csv
```
Replace `input_file.csv` with the path to your CSV or Excel file.

## Future Enhancements 🚀
- Expand AI-based **ticket summarization & classification**.
- Direct integration with the website for **real-time processing**.
- API support for **dynamic work data ingestion**.

---
This script was the **foundation of a larger vision**: transforming static work analysis into an **interactive, automated web platform**.

