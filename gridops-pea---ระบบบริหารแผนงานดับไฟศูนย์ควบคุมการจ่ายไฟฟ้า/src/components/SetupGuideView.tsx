import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  Copy,
  ExternalLink,
  Github,
  Table,
  FileCode,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface SetupGuideViewProps {
  gasUrl: string;
  onSaveGasUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string }>;
  onSync: () => Promise<void>;
  onResetDemo: () => void;
}

export const SetupGuideView: React.FC<SetupGuideViewProps> = ({
  gasUrl,
  onSaveGasUrl,
  onTestConnection,
  onSync,
  onResetDemo,
}) => {
  const [inputUrl, setInputUrl] = useState(gasUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Full GAS Code string for 1-click copying
  const gasCodeSnippet = `/**
 * =========================================================================================
 * GRID CONTROL CENTER - POWER OUTAGE & GRID OPERATION MANAGEMENT SYSTEM
 * Google Apps Script (GAS) Backend REST API
 * =========================================================================================
 * แผ่นงานหลักใน Google Sheets (6 Sheets):
 * 1. "Tasks"             - ตารางเก็บข้อมูลงานปฏิบัติการ (1 แถวต่อ 1 วันปฏิบัติงาน Sub_ID)
 * 2. "VSPP_Master"       - ฐานข้อมูลโรงไฟฟ้า VSPP
 * 3. "PEA_Master"        - ฐานข้อมูล กฟฟ. ในสังกัด
 * 4. "Personnel_Master"  - ฐานข้อมูลเจ้าหน้าที่และผู้ลงนาม
 * 5. "Substation_Master" - ฐานข้อมูลสถานีไฟฟ้า (substation)
 * 6. "Feeder_Master"     - ฐานข้อมูลเลขสายป้อน/ฟีดเดอร์ (feeder.no)
 * =========================================================================================
 */

const SHEET_NAMES = {
  TASKS: "Tasks",
  VSPP: "VSPP_Master",
  PEA: "PEA_Master",
  PERSONNEL: "Personnel_Master",
  SUBSTATION: "Substation_Master",
  FEEDER_NO: "Feeder_Master"
};

const TASK_HEADERS = [
  "Sub_ID", "Job_ID", "PEA_Request", "Send_To", "VSPP_ID", "Doc_No", "Doc_Date",
  "Approval_No", "Approval_Date", "Work_Date", "Start_Time", "End_Time",
  "Main_Detail", "Custom_Detail", "Work_Area", "Feeder",
  "Feeder_Scope", "Creator", "Inspector", "Check_Date", "SLA",
  "Receiver", "Approver_Receiver", "Overall_Status", "Daily_Status", "Note"
];

const VSPP_HEADERS = [
  "VSPP_ID", "VSPP_Name", "Feeder_Source", "Switch_Equipment", "To_Position"
];

const PEA_HEADERS = [
  "PEA_ID", "PEA_Short", "PEA_Full", "Region_Dept", "Executive_Title"
];

const PERSONNEL_HEADERS = [
  "id", "name", "role", "position"
];

const SUBSTATION_HEADERS = [
  "Substation_Code", "Substation_Name"
];

const FEEDER_NO_HEADERS = [
  "Feeder_No"
];

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || "get_all";
    const callback = params.callback;

    let result = { success: true, timestamp: new Date().toISOString() };
    ensureDatabaseStructure();

    switch (action) {
      case "ping":
      case "check_connection":
        result.message = "Google Apps Script GridOps API is Online!";
        result.sheets = Object.keys(SHEET_NAMES).map(k => SHEET_NAMES[k]);
        break;

      case "get_all":
        result.tasks = getSheetDataAsObjects(SHEET_NAMES.TASKS);
        result.vspp = getSheetDataAsObjects(SHEET_NAMES.VSPP);
        result.pea = getSheetDataAsObjects(SHEET_NAMES.PEA);
        result.personnel = getSheetDataAsObjects(SHEET_NAMES.PERSONNEL);
        result.substation = getSheetDataAsObjects(SHEET_NAMES.SUBSTATION).length > 0
          ? getSheetDataAsObjects(SHEET_NAMES.SUBSTATION)
          : getSheetDataAsObjects("substation");
        result.feeder_no = getSheetDataAsObjects(SHEET_NAMES.FEEDER_NO).length > 0
          ? getSheetDataAsObjects(SHEET_NAMES.FEEDER_NO)
          : getSheetDataAsObjects("feeder.no");
        break;

      case "get_tasks":
        result.data = getSheetDataAsObjects(SHEET_NAMES.TASKS);
        break;

      case "get_vspp":
        result.data = getSheetDataAsObjects(SHEET_NAMES.VSPP);
        break;

      case "get_pea":
        result.data = getSheetDataAsObjects(SHEET_NAMES.PEA);
        break;

      case "get_personnel":
        result.data = getSheetDataAsObjects(SHEET_NAMES.PERSONNEL);
        break;

      case "get_substation":
        result.data = getSheetDataAsObjects(SHEET_NAMES.SUBSTATION);
        break;

      case "get_feeder_no":
        result.data = getSheetDataAsObjects(SHEET_NAMES.FEEDER_NO);
        break;

      default:
        result.success = false;
        result.error = "Unknown GET action: " + action;
    }

    return createJsonResponse(result, callback);
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString(),
      stack: err.stack
    }, e && e.parameter ? e.parameter.callback : null);
  }
}

function doPost(e) {
  try {
    ensureDatabaseStructure();
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;
    let result = { success: true, action: action, timestamp: new Date().toISOString() };

    switch (action) {
      case "save_job_batch":
        result = handleSaveJobBatch(payload.items || [payload.item]);
        break;
      case "update_sub_task":
        result = handleUpdateSubTask(payload.sub_id || payload.Sub_ID, payload.data);
        break;
      case "update_job_status":
        result = handleUpdateJobStatus(payload.job_id || payload.Job_ID, payload.status);
        break;
      case "delete_sub_task":
        result = handleDeleteRowByColumn(SHEET_NAMES.TASKS, "Sub_ID", payload.sub_id || payload.Sub_ID);
        break;
      case "delete_job":
        result = handleDeleteRowsByColumn(SHEET_NAMES.TASKS, "Job_ID", payload.job_id || payload.Job_ID);
        break;
      case "save_vspp":
        result = handleUpsertMaster(SHEET_NAMES.VSPP, VSPP_HEADERS, "VSPP_ID", payload.data);
        break;
      case "delete_vspp":
        result = handleDeleteRowByColumn(SHEET_NAMES.VSPP, "VSPP_ID", payload.vspp_id || payload.VSPP_ID);
        break;
      case "save_pea":
        result = handleUpsertMaster(SHEET_NAMES.PEA, PEA_HEADERS, "PEA_ID", payload.data);
        break;
      case "delete_pea":
        result = handleDeleteRowByColumn(SHEET_NAMES.PEA, "PEA_ID", payload.pea_id || payload.PEA_ID);
        break;
      case "save_personnel":
        result = handleUpsertMaster(SHEET_NAMES.PERSONNEL, PERSONNEL_HEADERS, "id", payload.data);
        break;
      case "delete_personnel":
        result = handleDeleteRowByColumn(SHEET_NAMES.PERSONNEL, "id", payload.id || payload.Personnel_ID);
        break;
      case "save_substation":
        result = handleUpsertMaster(SHEET_NAMES.SUBSTATION, SUBSTATION_HEADERS, "Substation_Code", payload.data);
        break;
      case "delete_substation":
        result = handleDeleteRowByColumn(SHEET_NAMES.SUBSTATION, "Substation_Code", payload.Substation_Code || payload.code);
        break;
      case "save_feeder_no":
        result = handleUpsertMaster(SHEET_NAMES.FEEDER_NO, FEEDER_NO_HEADERS, "Feeder_No", payload.data);
        break;
      case "delete_feeder_no":
        result = handleDeleteRowByColumn(SHEET_NAMES.FEEDER_NO, "Feeder_No", payload.Feeder_No || payload.feeder_no);
        break;
      default:
        result.success = false;
        result.error = "Unknown POST action: " + action;
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString(),
      stack: err.stack
    });
  }
}

function handleSaveJobBatch(items) {
  if (!items || !items.length) return { success: false, error: "No items provided" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const subIdIndex = headers.indexOf("Sub_ID");

  const existingMap = new Map();
  for (let r = 1; r < data.length; r++) {
    const subIdVal = String(data[r][subIdIndex]).trim();
    if (subIdVal) existingMap.set(subIdVal, r + 1);
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const subId = String(item.Sub_ID || "").trim();
    if (!subId) continue;

    const rowData = headers.map(header => {
      const val = item[header] !== undefined && item[header] !== null ? item[header] : "";
      if ((header === "Start_Time" || header === "End_Time") && val !== "" && !String(val).startsWith("'")) {
        return "'" + String(val);
      }
      return val;
    });

    if (existingMap.has(subId)) {
      const rowNum = existingMap.get(subId);
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
      updatedCount++;
    } else {
      sheet.appendRow(rowData);
      insertedCount++;
    }
  }

  return { success: true, message: \`บันทึกสำเร็จ: เพิ่ม \${insertedCount}, อัปเดต \${updatedCount}\` };
}

function handleUpdateSubTask(subId, updateData) {
  if (!subId) return { success: false, error: "Sub_ID is required" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const subIdIndex = headers.indexOf("Sub_ID");

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][subIdIndex]).trim() === String(subId).trim()) {
      for (let c = 0; c < headers.length; c++) {
        if (updateData[headers[c]] !== undefined) {
          sheet.getRange(r + 1, c + 1).setValue(updateData[headers[c]]);
        }
      }
      return { success: true, message: "อัปเดตงาน Sub_ID: " + subId + " สำเร็จ" };
    }
  }
  return { success: false, error: "ไม่พบ Sub_ID: " + subId };
}

function handleUpdateJobStatus(jobId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const jobIdIndex = headers.indexOf("Job_ID");
  const overallStatusIndex = headers.indexOf("Overall_Status");

  let modified = 0;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][jobIdIndex]).trim() === String(jobId).trim()) {
      sheet.getRange(r + 1, overallStatusIndex + 1).setValue(newStatus);
      modified++;
    }
  }
  return { success: true, message: \`อัปเดตสถานะ \${jobId} สำเร็จ \${modified} วัน\` };
}

function handleUpsertMaster(sheetName, expectedHeaders, keyColumnName, record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf(keyColumnName);
  const rowValues = headers.map(h => record[h] !== undefined && record[h] !== null ? record[h] : "");
  const keyValue = String(record[keyColumnName]).trim();

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][keyIndex]).trim() === keyValue) {
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([rowValues]);
      return { success: true, message: "อัปเดตสำเร็จ" };
    }
  }
  sheet.appendRow(rowValues);
  return { success: true, message: "เพิ่มข้อมูลสำเร็จ" };
}

function handleDeleteRowByColumn(sheetName, keyColName, keyValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf(keyColName);

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][colIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(r + 1);
      return { success: true, message: "ลบข้อมูลสำเร็จ" };
    }
  }
  return { success: false, error: "ไม่พบข้อมูล" };
}

function handleDeleteRowsByColumn(sheetName, keyColName, keyValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf(keyColName);

  let deleted = 0;
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][colIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(r + 1);
      deleted++;
    }
  }
  return { success: true, message: \`ลบข้อมูลสำเร็จ \${deleted} รายการ\` };
}

function getSheetDataAsObjects(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const list = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (row.every(cell => cell === "" || cell === null)) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const val = row[c];
      if (val instanceof Date) {
        if (headers[c] === "Start_Time" || headers[c] === "End_Time" || val.getFullYear() === 1899) {
          obj[headers[c]] = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "HH:mm");
        } else {
          obj[headers[c]] = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
        }
      } else {
        obj[headers[c]] = val !== null && val !== undefined ? String(val) : "";
      }
    }
    list.push(obj);
  }
  return list;
}

function ensureDatabaseStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configs = [
    { name: SHEET_NAMES.TASKS, headers: TASK_HEADERS },
    { name: SHEET_NAMES.VSPP, headers: VSPP_HEADERS },
    { name: SHEET_NAMES.PEA, headers: PEA_HEADERS },
    { name: SHEET_NAMES.PERSONNEL, headers: PERSONNEL_HEADERS },
    { name: SHEET_NAMES.SUBSTATION, headers: SUBSTATION_HEADERS },
    { name: SHEET_NAMES.FEEDER_NO, headers: FEEDER_NO_HEADERS }
  ];

  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
      sheet.setFrozenRows(1);
    }
  });
}

function createJsonResponse(data, callback) {
  const jsonString = JSON.stringify(data);
  let output;
  if (callback) {
    output = ContentService.createTextOutput(callback + "(" + jsonString + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    output = ContentService.createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  }
  return output;
}`;

  const githubActionsYaml = `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build static site
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(githubActionsYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2500);
  };

  const handleSaveAndTest = async () => {
    onSaveGasUrl(inputUrl);
    setIsTesting(true);
    setTestResult(null);

    const res = await onTestConnection(inputUrl);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Cloud className="w-4 h-4" />
          </div>
          <span>การเชื่อมต่อ Google Sheets API & วิธี Deploy ขึ้น GitHub Pages</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ศูนย์ควบคุมการจ่ายไฟฟ้า — คำแนะนำการติดตั้งระบบฐานข้อมูล Google Sheets ผ่าน Google Apps Script และการโฮสต์เว็บแอปพลิเคชัน
        </p>
      </div>

      {/* Box 1: Live Connection Setup */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Cloud className="w-4 h-4 text-blue-600" />
            <span>1. ตั้งค่าและทดสอบการเชื่อมต่อ Google Apps Script Web App URL</span>
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {gasUrl ? 'สถานะ: ตั้งค่า URL แล้ว' : 'สถานะ: บันทึกในเครื่อง'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          นำ Web App URL ที่ได้จากการ Deploy Google Apps Script มาวางในช่องด้านล่างเพื่อเชื่อมต่อกับฐานข้อมูล Google Sheets ของท่าน:
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />

          <button
            onClick={handleSaveAndTest}
            disabled={isTesting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'กำลังทดสอบ...' : 'บันทึก & ทดสอบเชื่อมต่อ'}</span>
          </button>

          {gasUrl && (
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูลทันที'}</span>
            </button>
          )}

          <button
            onClick={onResetDemo}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors shrink-0"
          >
            โหลดข้อมูลตัวอย่างใหม่
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Box 2: Complete Google Apps Script Setup Tutorial */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileCode className="w-4 h-4 text-blue-600" />
            <span>2. โค้ด Google Apps Script & ขั้นตอนการสร้าง Google Sheets</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
          >
            {copiedCode ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>คัดลอกโค้ดแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ด Google Apps Script</span>
              </>
            )}
          </button>
        </div>

        {/* 5-Step Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center text-[11px]">
              1
            </span>
            <div className="font-semibold text-slate-900 pt-1">สร้าง Google Sheet</div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              เปิด Google Sheets ตั้งชื่อไฟล์ และสร้าง 6 แท็บชีต: <strong className="text-slate-900">Tasks</strong>, <strong className="text-slate-900">VSPP_Master</strong>, <strong className="text-slate-900">PEA_Master</strong>, <strong className="text-slate-900">Personnel_Master</strong>, <strong className="text-slate-900">Substation_Master</strong>, <strong className="text-slate-900">Feeder_Master</strong>
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center text-[11px]">
              2
            </span>
            <div className="font-semibold text-slate-900 pt-1">เปิด Apps Script</div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              ไปที่แถบเมนูด้านบน เลือก <strong className="text-slate-900">ส่วนขยาย</strong> &gt; <strong className="text-slate-900">Apps Script</strong>
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center text-[11px]">
              3
            </span>
            <div className="font-semibold text-slate-900 pt-1">วางโค้ด Code.gs</div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              ลบโค้ดเดิมในไฟล์ <code className="text-blue-700 font-semibold">Code.gs</code> ออกทั้งหมด แล้วกดปุ่ม <strong className="text-slate-900">คัดลอกโค้ด</strong> ด้านบนมาวาง แล้วกดบันทึก
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold flex items-center justify-center text-[11px]">
              4
            </span>
            <div className="font-semibold text-slate-900 pt-1">Deploy เป็น Web App</div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              คลิก <strong className="text-slate-900">ทำให้ใช้งานได้</strong> &gt; <strong className="text-slate-900">การทำให้ใช้งานได้ใหม่</strong> &gt; เลือกประเภท <strong className="text-slate-900">เว็บแอปพลิเคชัน</strong>
            </p>
          </div>

          <div className="p-3.5 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-[11px]">
              5
            </span>
            <div className="font-semibold text-blue-800 pt-1">ตั้งค่าสิทธิ์ทุกคน *</div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              สำคัญที่สุด: ช่อง <strong className="text-slate-900">ผู้ที่มีสิทธิ์เข้าถึง</strong> ต้องเลือกเป็น <strong className="text-slate-900">ทุกคน</strong> แล้วคัดลอก Web App URL มาใส่ในขั้นตอนที่ 1
            </p>
          </div>
        </div>

        {/* Code Preview Container */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ตัวอย่างโค้ดสคริปต์ Google Apps Script:</span>
            <button
              onClick={handleCopyCode}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              คัดลอกโค้ดทั้งหมด
            </button>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 max-h-64 overflow-y-auto font-mono text-[11px] text-slate-200 leading-relaxed scrollbar-thin">
            <pre>{gasCodeSnippet}</pre>
          </div>
        </div>
      </div>

      {/* Box 3: GitHub Pages Deployment Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Github className="w-4 h-4 text-blue-600" />
            <span>3. ขั้นตอนการนำเว็บแอปพลิเคชันขึ้นโฮสต์บน GitHub Pages</span>
          </div>
          <button
            onClick={handleCopyYaml}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            {copiedYaml ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>คัดลอก YAML แล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>คัดลอก GitHub Actions Workflow</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            เนื่องจากสถาปัตยกรรมของแอปพลิเคชันนี้ถูกออกแบบเป็น Single Page Application บน HTML5 / Tailwind CSS และเชื่อมต่อ Google Sheets API จึงสามารถโฮสต์ผ่าน <strong className="text-slate-900">GitHub Pages</strong> ได้ฟรี 100% โดยไม่มีค่าใช้จ่ายเซิร์ฟเวอร์
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <strong className="text-slate-900 block font-sans">วิธีที่ 1: Build เป็น Static Files</strong>
              <p className="text-slate-600 text-[11px]">
                รันคำสั่งคอมไพล์โค้ดในเครื่อง:
              </p>
              <div className="bg-slate-900 p-2 rounded font-mono text-[11px] text-blue-300 border border-slate-800">
                npm run build
              </div>
              <p className="text-slate-600 text-[11px]">
                จะได้โฟลเดอร์ <code className="text-blue-700 font-semibold">dist/</code> ซึ่งมีไฟล์ HTML, JS, CSS สมบูรณ์ นำไป Push ขึ้น branch <code className="text-blue-700 font-semibold">gh-pages</code>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <strong className="text-slate-900 block font-sans">วิธีที่ 2: ใช้ GitHub Actions อัตโนมัติ</strong>
              <p className="text-slate-600 text-[11px]">
                สร้างไฟล์ <code className="text-blue-700 font-semibold">.github/workflows/deploy.yml</code> ในคลังโค้ด GitHub ของท่าน แล้ววางโค้ด YAML
              </p>
              <p className="text-slate-600 text-[11px]">
                ทุกครั้งที่มีการ <code className="text-blue-700 font-semibold">git push origin main</code> ระบบจะ Build และ Deploy ขึ้น GitHub Pages ให้ทันที
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <strong className="text-slate-900 block font-sans">วิธีที่ 3: เปิดใช้งาน Pages ใน Settings</strong>
              <p className="text-slate-600 text-[11px]">
                ไปที่หน้า Repository บน GitHub &gt; <strong className="text-slate-900">Settings</strong> &gt; <strong className="text-slate-900">Pages</strong>
              </p>
              <p className="text-slate-600 text-[11px]">
                ในส่วน <strong className="text-slate-900">Build and deployment &gt; Source</strong>: เลือกเป็น <strong className="text-slate-900">GitHub Actions</strong>
              </p>
              <p className="text-emerald-700 font-medium text-[11px]">
                URL ของเว็บแอปพลิเคชันจะพร้อมใช้งานที่: https://&lt;username&gt;.github.io/&lt;repo-name&gt;/
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
