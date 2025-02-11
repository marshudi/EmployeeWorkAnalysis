import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for routing

const GuideBSS = () => {
  return (
    <>
      <div className="container mx-auto px-4 lg:px-10 py-6 bg-white shadow-lg rounded-lg mt-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Report Upload Guidelines</h1>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700">1. Required File Format</h2>
          <p className="mt-2 text-gray-600">The uploaded file should be in one of the following formats:</p>
          <ul className="list-disc pl-6 text-gray-700 mt-2">
            <li><strong>.xlsx</strong> (Excel Workbook)</li>
            <li><strong>.xls</strong> (Legacy Excel Workbook)</li>
            <li><strong>.csv</strong> (Comma-Separated Values)</li>
          </ul>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700">2. Required Columns & Naming</h2>
          <p className="mt-2 text-gray-600">Ensure the file contains the following columns with exact naming:</p>
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-4 py-2">Column Name</th>
                <th className="border px-4 py-2">Expected Data Type</th>
                <th className="border px-4 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2">Date</td>
                <td className="border px-4 py-2">MM/DD/YYYY or YYYY-MM-DD</td>
                <td className="border px-4 py-2">The date of the work entry</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Employee Name</td>
                <td className="border px-4 py-2">Text</td>
                <td className="border px-4 py-2">Full name of the employee</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Onsite/Offsite</td>
                <td className="border px-4 py-2">Text ("On-site" or "Off-site")</td>
                <td className="border px-4 py-2">Indicates work location</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Employee Role</td>
                <td className="border px-4 py-2">Text</td>
                <td className="border px-4 py-2">Job title/role of the employee</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Project Name</td>
                <td className="border px-4 py-2">Text</td>
                <td className="border px-4 py-2">The project the employee worked on</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Hours</td>
                <td className="border px-4 py-2">Decimal</td>
                <td className="border px-4 py-2">Total hours worked (e.g., 8.00)</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Description of Activity</td>
                <td className="border px-4 py-2">Text</td>
                <td className="border px-4 py-2">A brief summary of the work done</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700">3. Date Format & Consistency</h2>
          <p className="mt-2 text-gray-600">Ensure that dates are formatted consistently. The supported formats are:</p>
          <ul className="list-disc pl-6 text-gray-700 mt-2">
            <li>MM/DD/YYYY (e.g., 12/30/2024)</li>
            <li>YYYY-MM-DD (e.g., 2024-12-30)</li>
          </ul>
          <p className="mt-2 text-red-600 font-semibold">⚠ Incorrect date formats may cause errors in calculations.</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700">4. Common Errors to Avoid</h2>
          <ul className="list-disc pl-6 text-gray-700 mt-2">
            <li>Missing required columns.</li>
            <li>Incorrect date formats (e.g., "30-12-2024" is NOT valid).</li>
            <li>Special characters in column names.</li>
            <li>Empty or duplicate rows.</li>
            <li>Using different formats in the same column (e.g., text and numbers mixed in "Hours").</li>
          </ul>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700">5. Naming Convention for Processed Files</h2>
          <p className="mt-2 text-gray-600">Once processed, the report will be saved with a dynamic filename:</p>
          <div className="bg-gray-200 p-4 rounded text-gray-800">
            <strong>OriginalFileName_analyzed_[MM].xlsx</strong>
          </div>
          <p className="mt-2 text-gray-600">Example: <strong>"BSS_BAU_Report_analyzed_12.xlsx"</strong> for December.</p>
        </div>

        <div className="text-center mt-6">
          <Link to="/bss" className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Back to Upload Page
          </Link>
        </div>
      </div>
    </>
  );
};

export default GuideBSS;
