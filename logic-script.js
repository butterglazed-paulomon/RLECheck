/* =========================================
   Appscript on sheets
   edit the logging logic here @tech
   DO NOT REFERENCE HERE
   ========================================= */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsConfig = [
    {
      name: "Students",
      headers: ["Student Number", "Last Name", "First Name", "MI", "Year/Section", "Group Number", "Registration Date"]
    },
    {
      name: "Attendance",
      headers: ["Timestamp", "Student Number", "Type", "Total Score", "Time Logged"]
    },
    {
      name: "Checklist_Data",
      headers: ["Timestamp", "Student Number", "Item Name", "Category", "Status", "Points"]
    }
  ];

  sheetsConfig.forEach(config => {
    let sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }
    if (sheet.getLastRow() === 0) {
      const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
      headerRange.setValues([config.headers]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#d9d9d9");
      sheet.setFrozenRows(1);
    }
  });
}

/* =========================================
   2. HTTP GET (Serves Student List to App)
   ========================================= */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Students");
  const data = sheet.getDataRange().getValues();
  
  // Skip header row (slice(1)) and map to object
  const students = data.slice(1).map(row => ({
    id: row[0].toString(), 
    name: `${row[1]}, ${row[2]}`, // "Last Name, First Name"
    group: row[5]
  }));

  return ContentService.createTextOutput(JSON.stringify(students))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================
   3. HTTP POST (Handles Data Submission)
   ========================================= */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);

    // --- CASE A: REGISTER NEW STUDENT ---
    if (!data.action || data.action === "register") { 
      // Default to register if no action specified (for backward compatibility)
      const sheet = ss.getSheetByName("Students");
      sheet.appendRow([
        data.studentNumber,
        data.lastName,
        data.firstName,
        data.middleInitial,
        data.yearSection,
        data.groupNumber,
        new Date()
      ]);
      return response({"status": "success", "message": "Registered"});
    }

    // --- CASE B: LOG ATTENDANCE & SCORES ---
    else if (data.action === "attendance") {
      const attendSheet = ss.getSheetByName("Attendance");
      const detailSheet = ss.getSheetByName("Checklist_Data");
      const timestamp = new Date();
      
      // 1. Log Main Summary
      attendSheet.appendRow([
        timestamp, 
        data.studentId, 
        "Time-In", 
        data.totalScore,
        timestamp.toLocaleTimeString()
      ]);
      
      // 2. Log Detailed Checklist Items
      if (data.details && data.details.length > 0) {
        const detailRows = data.details.map(item => [
          timestamp,
          data.studentId,
          item.name,
          item.category,
          item.status,
          item.points
        ]);
        // Write all details at once (faster than looping appendRow)
        detailSheet.getRange(detailSheet.getLastRow() + 1, 1, detailRows.length, 6).setValues(detailRows);
      }
      
      return response({"status": "success", "message": "Attendance Logged"});
    }

  } catch (error) {
    return response({"status": "error", "message": error.toString()});
  }
}

// Helper function to format JSON response
function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}