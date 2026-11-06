/**
 * =========================================================================================
 * GRID CONTROL CENTER - POWER OUTAGE & GRID OPERATION MANAGEMENT SYSTEM
 * Google Apps Script (GAS) Backend REST API
 * =========================================================================================
 * แผ่นงานหลักใน Google Sheets (3 Sheets):
 * 1. "Tasks"       - ตารางเก็บข้อมูลงานปฏิบัติการ (1 แถวต่อ 1 วันปฏิบัติงาน Sub_ID)
 * 2. "VSPP_Master" - ฐานข้อมูลโรงไฟฟ้า VSPP
 * 3. "PEA_Master"  - ฐานข้อมูล กฟฟ. ในสังกัด
 * =========================================================================================
 */

// นิยามชื่อคอลัมน์มาตรฐานของแต่ละชีต
const SHEET_NAMES = {
  TASKS: "Tasks",
  VSPP: "VSPP_Master",
  PEA: "PEA_Master"
};

const TASK_HEADERS = [
  "Sub_ID", "Job_ID", "PEA_Request", "VSPP_ID", "Doc_No", "Doc_Date",
  "Approval_No", "Approval_Date", "Work_Date", "Start_Time", "End_Time",
  "Main_Detail", "Custom_Detail", "Work_Area", "Feeder", "Guest_Feeder",
  "Feeder_Scope", "Creator", "Inspector", "Check_Date", "SLA",
  "Receiver", "Approver_Receiver", "Overall_Status", "Daily_Status", "Note"
];

const VSPP_HEADERS = [
  "VSPP_ID", "VSPP_Name", "Feeder_Source", "Switch_Equipment", "To_Position"
];

const PEA_HEADERS = [
  "PEA_ID", "PEA_Short", "PEA_Full", "Region_Dept", "Executive_Title"
];

/**
 * Handle HTTP GET Requests (Read operations & Ping)
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || "get_all";
    const callback = params.callback; // For JSONP if needed by browser

    let result = { success: true, timestamp: new Date().toISOString() };

    // Initial check or create sheets if missing
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

      case "seed_data":
        seedInitialSampleData();
        result.message = "สร้างข้อมูลตัวอย่างเริ่มต้นเรียบร้อยแล้ว";
        result.tasks = getSheetDataAsObjects(SHEET_NAMES.TASKS);
        result.vspp = getSheetDataAsObjects(SHEET_NAMES.VSPP);
        result.pea = getSheetDataAsObjects(SHEET_NAMES.PEA);
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

/**
 * Handle HTTP POST Requests (Create, Update, Delete operations)
 */
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
      // 1. เพิ่มชุดงานที่มีหลายวัน (สร้างหลายแถว Sub_ID ในคำสั่งเดียว)
      case "save_job_batch":
        result = handleSaveJobBatch(payload.items || [payload.item]);
        break;

      // 2. แก้ไขข้อมูลรายวัน (ระบุเจาะจง Sub_ID)
      case "update_sub_task":
        result = handleUpdateSubTask(payload.sub_id || payload.Sub_ID, payload.data);
        break;

      // 3. ปรับปรุงสถานะภาพรวมของทั้ง Job_ID
      case "update_job_status":
        result = handleUpdateJobStatus(payload.job_id || payload.Job_ID, payload.status);
        break;

      // 4. ลบงานเฉพาะวัน (ลบ Sub_ID)
      case "delete_sub_task":
        result = handleDeleteRowByColumn(SHEET_NAMES.TASKS, "Sub_ID", payload.sub_id || payload.Sub_ID);
        break;

      // 5. ลบงานทั้งชุด (ลบทุกแถวที่ผูกกับ Job_ID)
      case "delete_job":
        result = handleDeleteRowsByColumn(SHEET_NAMES.TASKS, "Job_ID", payload.job_id || payload.Job_ID);
        break;

      // 6. จัดการ Master VSPP (CRUD)
      case "save_vspp":
        result = handleUpsertMaster(SHEET_NAMES.VSPP, VSPP_HEADERS, "VSPP_ID", payload.data);
        break;
      case "delete_vspp":
        result = handleDeleteRowByColumn(SHEET_NAMES.VSPP, "VSPP_ID", payload.vspp_id || payload.VSPP_ID);
        break;

      // 7. จัดการ Master PEA (CRUD)
      case "save_pea":
        result = handleUpsertMaster(SHEET_NAMES.PEA, PEA_HEADERS, "PEA_ID", payload.data);
        break;
      case "delete_pea":
        result = handleDeleteRowByColumn(SHEET_NAMES.PEA, "PEA_ID", payload.pea_id || payload.PEA_ID);
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

/**
 * บันทึกรายการงานหลายวัน (Batch Insert/Update Sub_IDs)
 */
function handleSaveJobBatch(items) {
  if (!items || !items.length) {
    return { success: false, error: "No items provided in batch" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const subIdIndex = headers.indexOf("Sub_ID");

  const existingMap = new Map();
  for (let r = 1; r < data.length; r++) {
    const subIdVal = String(data[r][subIdIndex]).trim();
    if (subIdVal) {
      existingMap.set(subIdVal, r + 1); // 1-indexed row in sheet
    }
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const subId = String(item.Sub_ID || "").trim();
    if (!subId) continue;

    const rowData = headers.map(header => {
      const val = item[header];
      return val !== undefined && val !== null ? val : "";
    });

    if (existingMap.has(subId)) {
      // อัปเดตแถวเดิม
      const rowNum = existingMap.get(subId);
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowData]);
      updatedCount++;
    } else {
      // เพิ่มแถวใหม่
      sheet.appendRow(rowData);
      insertedCount++;
    }
  }

  return {
    success: true,
    message: `บันทึกเรียบร้อย: เพิ่มใหม่ ${insertedCount} รายการ, แก้ไข ${updatedCount} รายการ`,
    insertedCount: insertedCount,
    updatedCount: updatedCount
  };
}

/**
 * แก้ไขงานเฉพาะวันตาม Sub_ID
 */
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
        const headerName = headers[c];
        if (updateData[headerName] !== undefined) {
          sheet.getRange(r + 1, c + 1).setValue(updateData[headerName]);
        }
      }
      return { success: true, message: `อัปเดตงาน Sub_ID: ${subId} เรียบร้อยแล้ว` };
    }
  }

  return { success: false, error: `ไม่พบ Sub_ID: ${subId}` };
}

/**
 * อัปเดตสถานะภาพรวมของงานทุกวันภายใต้ Job_ID เดียวกัน
 */
function handleUpdateJobStatus(jobId, newStatus) {
  if (!jobId || !newStatus) return { success: false, error: "Job_ID and status are required" };

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

  return { success: true, message: `อัปเดตสถานะ Job_ID: ${jobId} เป็น "${newStatus}" จำนวน ${modified} วัน` };
}

/**
 * Upsert ข้อมูล Master (VSPP_Master หรือ PEA_Master)
 */
function handleUpsertMaster(sheetName, expectedHeaders, keyColumnName, record) {
  if (!record || !record[keyColumnName]) {
    return { success: false, error: `Key ${keyColumnName} is missing in master record` };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf(keyColumnName);

  const rowValues = headers.map(h => {
    const val = record[h];
    return val !== undefined && val !== null ? val : "";
  });

  const keyValue = String(record[keyColumnName]).trim();

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][keyIndex]).trim() === keyValue) {
      sheet.getRange(r + 1, 1, 1, headers.length).setValues([rowValues]);
      return { success: true, message: `อัปเดตข้อมูล ${sheetName} รหัส ${keyValue} เรียบร้อย` };
    }
  }

  sheet.appendRow(rowValues);
  return { success: true, message: `เพิ่มข้อมูล ${sheetName} รหัส ${keyValue} เรียบร้อย` };
}

/**
 * ลบแถวเดี่ยวตามคอลัมน์คีย์
 */
function handleDeleteRowByColumn(sheetName, keyColName, keyValue) {
  if (!keyValue) return { success: false, error: "Key value is required for deletion" };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf(keyColName);

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][colIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(r + 1);
      return { success: true, message: `ลบข้อมูลรหัส ${keyValue} จาก ${sheetName} สำเร็จ` };
    }
  }

  return { success: false, error: `ไม่พบข้อมูล ${keyValue} ใน ${sheetName}` };
}

/**
 * ลบทุกแถวที่ตรงกับค่าในคอลัมน์ (เช่น ลบทุก Sub_ID ใน Job_ID)
 */
function handleDeleteRowsByColumn(sheetName, keyColName, keyValue) {
  if (!keyValue) return { success: false, error: "Key value is required for batch deletion" };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIndex = headers.indexOf(keyColName);

  let deleted = 0;
  // ลบจากล่างขึ้นบนเพื่อป้องกันดัชนีเลื่อน
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][colIndex]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(r + 1);
      deleted++;
    }
  }

  return { success: true, message: `ลบรายการทั้งหมด ${deleted} วันของ ${keyValue} สำเร็จ` };
}

/**
 * อ่านข้อมูลจากชีตแปลงเป็น Object Array
 */
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
    // ข้ามแถวว่าง
    if (row.every(cell => cell === "" || cell === null)) continue;

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const val = row[c];
      // แปลง Date เป็น YYYY-MM-DD
      if (val instanceof Date) {
        obj[headers[c]] = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
      } else {
        obj[headers[c]] = val !== null && val !== undefined ? String(val) : "";
      }
    }
    list.push(obj);
  }

  return list;
}

/**
 * ตรวจสอบและสร้างโครงสร้าง 3 ชีตพร้อม Header หากยังไม่มี
 */
function ensureDatabaseStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const configs = [
    { name: SHEET_NAMES.TASKS, headers: TASK_HEADERS },
    { name: SHEET_NAMES.VSPP, headers: VSPP_HEADERS },
    { name: SHEET_NAMES.PEA, headers: PEA_HEADERS }
  ];

  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      sheet.getRange(1, 1, 1, cfg.headers.length)
        .setFontWeight("bold")
        .setBackground("#1e293b")
        .setFontColor("#f8fafc");
      sheet.setFrozenRows(1);
    } else {
      // ตรวจสอบว่ามีแถว Header หรือยัง
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
        sheet.getRange(1, 1, 1, cfg.headers.length)
          .setFontWeight("bold")
          .setBackground("#1e293b")
          .setFontColor("#f8fafc");
        sheet.setFrozenRows(1);
      }
    }
  });
}

/**
 * สร้างข้อมูลตัวอย่างเริ่มต้น (Seed Initial Data)
 */
function seedInitialSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. PEA Master
  const peaSheet = ss.getSheetByName(SHEET_NAMES.PEA);
  if (peaSheet.getLastRow() <= 1) {
    const samplePEA = [
      ["PEA-UBN-01", "กฟฟ.อ.เมืองอุบลราชธานี", "การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี", "กฟฉ.2", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี"],
      ["PEA-WRN-01", "กฟฟ.อ.วารินชำราบ", "การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ", "กฟฉ.2", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ"],
      ["PEA-DET-01", "กฟฟ.อ.เดชอุดม", "การไฟฟ้าส่วนภูมิภาคอำเภอเดชอุดม", "กฟฉ.2", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเดชอุดม"],
      ["PEA-KMR-01", "กฟฟ.อ.เขมราฐ", "การไฟฟ้าส่วนภูมิภาคอำเภอเขมราฐ", "กฟฉ.2", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเขมราฐ"],
      ["PEA-TRA-01", "กฟฟ.อ.ตระการพืชผล", "การไฟฟ้าส่วนภูมิภาคอำเภอตระการพืชผล", "กฟฉ.2", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอตระการพืชผล"]
    ];
    peaSheet.getRange(2, 1, samplePEA.length, PEA_HEADERS.length).setValues(samplePEA);
  }

  // 2. VSPP Master
  const vsppSheet = ss.getSheetByName(SHEET_NAMES.VSPP);
  if (vsppSheet.getLastRow() <= 1) {
    const sampleVSPP = [
      ["VSPP-UB01", "บริษัท อุบล โซลาร์ เพาเวอร์ จำกัด", "UBN01", "REC-01", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเมืองอุบลราชธานี"],
      ["VSPP-UB02", "บริษัท วาริน ไบโอแมส จำกัด", "WRN04", "ABS-04", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอวารินชำราบ"],
      ["VSPP-UB03", "บริษัท เดชอุดม กรีนเพาเวอร์ จำกัด", "DET02", "REC-03", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเดชอุดม"],
      ["VSPP-UB04", "บริษัท บัวงาม พลังงานสะอาด จำกัด", "DET06", "ABS-02", "ผู้จัดการ การไฟฟ้าส่วนภูมิภาคอำเภอเดชอุดม"]
    ];
    vsppSheet.getRange(2, 1, sampleVSPP.length, VSPP_HEADERS.length).setValues(sampleVSPP);
  }

  // 3. Tasks Sample
  const taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  if (taskSheet.getLastRow() <= 1) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
    const sampleTasks = [
      [
        "JOB-2026-001-01", "JOB-2026-001", "กฟฟ.อ.เมืองอุบลราชธานี", "VSPP-UB01", "มท 5304.12/1042",
        "2026-11-01", "อน. 2569/084", "2026-11-02", today, "09:00", "12:00",
        "งานปรับปรุงระบบจำหน่าย 22 kV และเปลี่ยนเสาไฟชำรุด", "ตัดแยกระบบ 22 kV หน้าสถานีไฟฟ้าอุบล 1 เพื่อพาดสายเคเบิลอากาศ",
        "ถ.ชยางกูร กม.4-6", "UBN01", "UBN03", "ตั้งแต่ สวิตช์ ABS-01 ถึง ABS-03",
        "นายสมชาย มั่นคง", "นายวิศวกร ชำนาญงาน", "2026-11-02", "ตามเกณฑ์ (ล่วงหน้า 3 วัน)",
        "นายสมศักดิ์ รับเรื่อง", "นายวีระ ผู้อนุมัติ", "อนุมัติ", "ปกติ", "ประสานงาน รฟ. VSPP ปลดขนานเรียบร้อย"
      ],
      [
        "JOB-2026-001-02", "JOB-2026-001", "กฟฟ.อ.เมืองอุบลราชธานี", "VSPP-UB01", "มท 5304.12/1042",
        "2026-11-01", "อน. 2569/084", "2026-11-02", today, "13:00", "16:30",
        "งานปรับปรุงระบบจำหน่าย 22 kV และเปลี่ยนเสาไฟชำรุด", "ติดตั้งหม้อแปลงจำหน่ายลูกใหม่และเชื่อมต่อสายดรอปเอาท์",
        "ถ.ชยางกูร ซอยสุขา 3", "UBN01", "", "ตั้งแต่ จุดแยกหน้าวัด ถึง ปลายสาย",
        "นายสมชาย มั่นคง", "นายวิศวกร ชำนาญงาน", "2026-11-02", "ตามเกณฑ์ (ล่วงหน้า 3 วัน)",
        "นายสมศักดิ์ รับเรื่อง", "นายวีระ ผู้อนุมัติ", "อนุมัติ", "ปกติ", "-"
      ]
    ];
    taskSheet.getRange(2, 1, sampleTasks.length, TASK_HEADERS.length).setValues(sampleTasks);
  }
}

/**
 * Format JSON Response with CORS Headers
 */
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
}
