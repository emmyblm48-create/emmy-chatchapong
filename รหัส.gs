const SS = SpreadsheetApp.getActiveSpreadsheet();

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // ป้องกันข้อมูลชนกัน
    
    if (!e) return jsonResponse({ status: "error", message: "No POST data received" });

    // 🚨 [เพิ่มจุดนี้] แกะข้อมูล JSON Body ที่ส่งมาจากหน้าบ้านมาเก็บไว้ในตัวแปร data
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // เผื่อหน้าบ้านไม่ได้ส่งมาเป็น JSON
      }
    }

    // ✅ ดึงค่ามารอไว้ในตัวแปรตรง ๆ โดยเช็คทั้งจาก parameter และ JSON data เพื่อความปลอดภัยสูงสุด
    const action = e.parameter.action || data.action; 
    const username = (e.parameter.username || data.username || "").toString().trim();
    const collectionId = (e.parameter.collectionId || data.collectionId || "").toString().trim();

    const now = new Date();
    const currentMonthYear = (now.getMonth() + 1) + "/" + now.getFullYear();

    const userSheet = SS.getSheetByName('users');
    const logSheet = SS.getSheetByName('logs');
    const fanLogSheet = SS.getSheetByName('fanLogs');
    const mailboxSheet = SS.getSheetByName('mailbox'); 
    const codeSheet = SS.getSheetByName('codes'); 
    const codeUsageSheet = SS.getSheetByName('codeUsage'); 
    const rankSheet = SS.getSheetByName('ranking');

    if (!userSheet) return jsonResponse({ status: "error", message: "หาชีทชื่อ 'users' ไม่เจอ" });

    const userRows = userSheet.getDataRange().getValues();

   // =========================================================================
    // 🔔 [ตั้งค่า Sheet สำหรับ Notification]
    // =========================================================================
    // กำหนดชื่อให้ตรงกับแท็บใน Google Sheet ของคุณเป๊ะๆ
    const SHEET_NAME = 'BLM48_Notifications'; 
    let notiSheet = SS.getSheetByName(SHEET_NAME);
    
    // ถ้ายังไม่มีชีทนี้ในระบบ ให้สร้างใหม่และใส่หัวตารางอัตโนมัติ
    if (!notiSheet) {
      notiSheet = SS.insertSheet(SHEET_NAME);
      notiSheet.appendRow(["writer", "action", "avatar", "role", "timestamp"]);
    }

    // =========================================================================
    // 🔔 1. ACTION: ดึงข้อมูลการแจ้งเตือนทั้งหมด (Get)
    // =========================================================================
    if (action === 'getNotifications') {
      const rows = notiSheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse([]); // มีแต่หัวตาราง หรือไม่มีข้อมูลเลย

      const notifications = [];
      // วิ่งลูปดึงข้อมูลตั้งแต่แถวที่ 2 เป็นต้นไป (ข้ามหัวตาราง index 0)
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][1]) continue; // ถ้าไม่มีข้อความ (action) ให้ข้ามแถวนี้ไป
        
        notifications.push({
          writer: rows[i][0] ? rows[i][0].toString() : "Admin",
          action: rows[i][1] ? rows[i][1].toString() : "",
          avatar: rows[i][2] ? rows[i][2].toString() : "",
          role: rows[i][3] ? rows[i][3].toString() : "Admin",
          timestamp: rows[i][4] instanceof Date ? rows[i][4].getTime() : (rows[i][4] ? rows[i][4] : Date.now())
        });
      }

      // 🔄 เรียงจากใหม่สุดไปเก่าสุดเสมอ
      return jsonResponse(notifications.reverse());
    }

    // =========================================================================
    // 🔔 2. ระบบเพิ่ม (Add)
    // =========================================================================
    if (data && data.type === "add") {
      if (notiSheet.getLastRow() === 0) {
        notiSheet.appendRow(["writer", "action", "avatar", "role", "timestamp"]);
      }
      notiSheet.appendRow([
        data.writer || "Admin",
        data.action || "",
        data.avatar || "",
        data.role || "Admin",
        data.timestamp || Date.now()
      ]);
      return jsonResponse({ status: "success", message: "Added" });
    }

    // =========================================================================
    // 🔔 3. ระบบลบทีละรายการ (Delete)
    // =========================================================================
    if (data && data.type === "delete") {
      var rows = notiSheet.getDataRange().getValues();
      // ค้นหาแถวที่มี timestamp ตรงกัน (แปลงเป็น String ก่อนเทียบกันเหนียว)
      // ใช้ i > 0 เพื่อไม่ให้มันเผลอไปลบหัวตาราง (แถวแรกสุด)
      for (var i = rows.length - 1; i > 0; i--) {
        if (rows[i][4].toString() === data.timestamp.toString()) { 
          notiSheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "Deleted" });
        }
      }
      return jsonResponse({ status: "error", message: "Not found" });
    }
    
    // =========================================================================
    // 🔔 4. ระบบล้างทั้งหมด (Clear All)
    // =========================================================================
    if (data && data.type === "clear") {
      // เช็คก่อนว่ามีข้อมูลให้ลบไหม ป้องกัน Error (ต้องมีมากกว่า 1 แถวถึงจะลบ)
      if (notiSheet.getLastRow() > 1) {
        notiSheet.getRange(2, 1, notiSheet.getLastRow() - 1, notiSheet.getLastColumn()).clearContent();
      }
      return jsonResponse({ status: "success", message: "Cleared" });
    }
    
    // ✅ ค้นหาแถวผู้ใช้งาน
    const userIndex = userRows.findIndex(row => row[0] && row[0].toString().trim() === username); 
    if (userIndex === -1) return jsonResponse({ status: "error", message: "ไม่พบชื่อผู้ใช้ในระบบ: " + username });

    const userDataRow = userRows[userIndex];
    const userRole = userDataRow[3] ? userDataRow[3].toString() : "user";

    // =========================================================================
    // 👑 [ระบบฟีด โพสต์ คอมเมนต์ และกดใจ - เวอร์ชันอัปเกรดเสียง & วิดีโอ]
    // =========================================================================

    // 1. Action: สร้างโพสต์ใหม่ (เฉพาะ role: member เท่านั้น และรับลิงก์ตรงจาก Supabase)
    if (action === 'createPost') {
      if (userRole !== 'member') {
        return jsonResponse({ status: "error", message: "สิทธิ์ของคุณไม่สามารถสร้างโพสต์ได้ค่ะ (เฉพาะเมมเบอร์เท่านั้น)" });
      }

      const postSheet = SS.getSheetByName('Posts');
      if (!postSheet) return jsonResponse({ status: "error", message: "หาชีทชื่อ 'Posts' ไม่เจอ" });

      // 📝 1. ดึงข้อความ และลิงก์รูปภาพ (เช็กทั้งแบบ JSON และ Parameter)
      const content = data.content || e.parameter.content || "";
      const imageUrl = data.imageUrl || e.parameter.imageUrl || ""; 
      const postId = "POST_" + now.getTime();

      // 👑 2. เปลี่ยนมารับค่าลิงก์ URL ตรงๆ จาก Supabase ที่ส่งมาจากหน้าบ้านเลยงับ (ไม่ต้องอัปโหลดเข้า Drive แล้ว) ✨
      const audioUrl = data.audioURL || e.parameter.audioURL || ""; 
      const videoUrl = data.videoURL || e.parameter.videoURL || "";

      // 💾 3. บันทึกลงตาราง Posts รวดเดียว 9 คอลัมน์ (A ถึง I)
      postSheet.appendRow([
        postId,     // คอลัมน์ A (Index 0) - ID โพสต์
        username,   // คอลัมน์ B (Index 1) - ผู้โพสต์
        content,    // คอลัมน์ C (Index 2) - ข้อความโพสต์
        imageUrl,   // คอลัมน์ D (Index 3) - ลิงก์รูปภาพ
        0,          // คอลัมน์ E (Index 4) - Likes เริ่มต้นที่ 0
        "",         // คอลัมน์ F (Index 5) - LikedBy เริ่มต้นเป็นค่าว่าง
        now,        // คอลัมน์ G (Index 6) - วันเวลาปัจจุบัน
        audioUrl,   // คอลัมน์ H (Index 7) - บันทึกลิงก์เสียง Supabase ลงที่นี่!
        videoUrl    // คอลัมน์ I (Index 8) - บันทึกลิงก์วิดีโอ Supabase ลงที่นี่!
      ]);

      return jsonResponse({ status: "success", message: "บันทึกโพสต์ของเมมเบอร์สำเร็จแล้วงับ! 🌸", postId: postId });
    }

    // 2. Action: กดใจ / ยกเลิกกดใจโพสต์ (Role user ทั่วไปกดได้)
    else if (action === 'likePost') {
      const postSheet = SS.getSheetByName('Posts');
      if (!postSheet) return jsonResponse({ status: "error", message: "หาชีทชื่อ 'Posts' ไม่เจอ" });

      const targetPostId = data.postId || e.parameter.postId;
      if (!targetPostId) return jsonResponse({ status: "error", message: "ไม่พบข้อมูล Post ID" });

      const postRows = postSheet.getDataRange().getValues();
      const postIndex = postRows.findIndex(row => row[0] && row[0].toString() === targetPostId);

      if (postIndex === -1) return jsonResponse({ status: "error", message: "ไม่พบโพสต์นี้ในระบบ" });

      const rowNum = postIndex + 1; // ตำแหน่งแถวจริงใน Sheet
      let currentLikes = parseInt(postRows[postIndex][4]) || 0; // คอลัมน์ E (Likes)
      let likedByStr = postRows[postIndex][5] ? postRows[postIndex][5].toString() : ""; // คอลัมน์ F (LikedBy)
      let likedByArray = likedByStr ? likedByStr.split(",") : [];

      // ตรวจสอบว่า User คนนี้เคยกดใจไปหรือยัง
      const userLikeIndex = likedByArray.indexOf(username);
      let isLiked = false;

      if (userLikeIndex !== -1) {
        // ถ้าเคยกดแล้ว -> กดยกเลิกใจ (Unlike) และลบชื่อออก
        currentLikes = Math.max(0, currentLikes - 1);
        likedByArray.splice(userLikeIndex, 1);
      } else {
        // ถ้ายังไม่เคยกด -> เพิ่มจำนวนใจ และบันทึกชื่อพ่วงท้ายไป
        currentLikes += 1;
        likedByArray.push(username);
        isLiked = true;
      }

      // บันทึกกลับลงเซลล์ใน Google Sheet
      postSheet.getRange(rowNum, 5).setValue(currentLikes); // คอลัมน์ E
      postSheet.getRange(rowNum, 6).setValue(likedByArray.join(",")); // คอลัมน์ F

      return jsonResponse({ 
        status: "success", 
        message: isLiked ? "กดใจให้เมมเบอร์แล้วน้า! 💖" : "ยกเลิกกดใจแล้วงับ",
        likes: currentLikes,
        isLiked: isLiked
      });
    }

    // 3. Action: เพิ่มคอมเมนต์โพสต์ (Role user ทั่วไปคอมเมนต์ได้)
    else if (action === 'addComment') {
      const commentSheet = SS.getSheetByName('Comments');
      if (!commentSheet) return jsonResponse({ status: "error", message: "หาชีทชื่อ 'Comments' ไม่เจอ" });

      const targetPostId = data.postId || e.parameter.postId;
      const commentText = data.text || e.parameter.text || "";

      if (!targetPostId) return jsonResponse({ status: "error", message: "ไม่พบข้อมูล Post ID ที่จะคอมเมนต์" });
      if (!commentText.toString().trim()) return jsonResponse({ status: "error", message: "กรุณากรอกข้อความคอมเมนต์" });

      const commentId = "CMT_" + now.getTime();

      // บันทึกลงตาราง Comments -> A: CommentID, B: PostID, C: Username, D: Text, E: Timestamp
      commentSheet.appendRow([commentId, targetPostId, username, commentText.toString().trim(), now]);

      return jsonResponse({ status: "success", message: "ส่งคอมเมนต์เรียบร้อยแล้วงับ! 💬" });
    }

   // ==========================================
    // 🛒 1. ระบบซื้อคุกกี้ / แลกเปลี่ยน (Exchange Cookies)
    // ==========================================
    if (action === "exchangeCookies") {
      // ⬇️ 🚩 เพิ่มบรรทัดนี้เพื่อดึงค่า username จากหน้าเว็บมาใช้งานใน logSheet ครับ
      const username = e.parameter.username; 
      
      const tokenPrice = Number(e.parameter.tokenPrice) || 0;
      const cookieReward = Number(e.parameter.cookieReward) || 0;
      
      const currentToken = Number(userDataRow[5]) || 0; 
      const currentCookie = Number(userDataRow[6]) || 0; 

      if (currentToken < tokenPrice) {
        return jsonResponse({status: "error", message: "Token ไม่พอสำหรับแลกเปลี่ยน"});
      }

      const newToken = currentToken - tokenPrice;
      const newCookie = currentCookie + cookieReward;

      userSheet.getRange(userIndex + 1, 6, 1, 2).setValues([[newToken, newCookie]]);

      if (logSheet) {
        logSheet.appendRow([now, username, "แลกซื้อคุกกี้", "-" + tokenPrice, "+" + cookieReward]);
      }

      return jsonResponse({status: "success", message: "บันทึกข้อมูลเรียบร้อยแล้วค่ะ", newToken: newToken, newCookie: newCookie});
    }

    // ==========================================
    // 🛒 1.1 ระบบซื้อไอเทม (Buy Item)
    // ==========================================
    if (action === 'buyItem') {
      // ⬇️ 🚩 เพิ่มบรรทัดนี้เผื่อไว้ด้วยเช่นกัน เผื่ออนาคตจะเอา username ไปหยอดลง logSheet ของตู้นี้ครับ
      const username = e.parameter.username; 
      
      const tokenCost = Number(e.parameter.tokenCost) || 0;
      const cookieGain = Number(e.parameter.cookieGain) || 0;
      
      const currentTokens = Number(userDataRow[5]) || 0;
      const currentCookies = Number(userDataRow[6]) || 0;

      if (currentTokens >= tokenCost) {
        const newToken = currentTokens - tokenCost;
        const newCookie = currentCookies + cookieGain;

        userSheet.getRange(userIndex + 1, 6, 1, 2).setValues([[newToken, newCookie]]); 
        
        return jsonResponse({status: "success", message: "ซื้อไอเทมสำเร็จ", newToken: newToken, newCookie: newCookie});
      } else {
        return jsonResponse({status: "error", message: "Token ไม่พอ"});
      }
    }

    // ==========================================
    // 👤 2. อัปเดตรูปโปรไฟล์
    // ==========================================
    if (action === 'updateProfileImage') {
      userSheet.getRange(userIndex + 1, 5).setValue(data.imageUrl); 
      writeLog(data.username, "Update Profile", "SYSTEM", 0);
      return jsonResponse({status: "success", message: "อัปเดตรูปเรียบร้อย!"});
    }

   // ==========================================
// 🍪 3. ให้คุกกี้ (พร้อมระบบ Token Bonus 100% Precision)
// ==========================================
if (action === "giveCookie") {
  const { memberName, amount } = data;
  
  // 1. สร้างชื่อเดือนอัตโนมัติ (เช่น "MAY2026") เพื่อใช้เช็คโบนัส
  const autoMonthYear = Utilities.formatDate(new Date(), "GMT+7", "MMMMYYYY").toUpperCase();
  
  // ดึงข้อมูลแถวของ User ปัจจุบัน (จาก userDataRow ที่โหลดไว้ตอนเริ่ม doGet/doPost)
  const currentToken = Number(userDataRow[5]) || 0;  // คอลัมน์ F (Index 5)
  const currentCookie = Number(userDataRow[6]) || 0; // คอลัมน์ G (Index 6)
  
  // 2. ดึงค่าจากคอลัมน์ I (Index 8) เพื่อเช็คเดือนล่าสุดที่ได้รับโบนัส
  const lastBonusMonth = String(userDataRow[8] || "").trim().toUpperCase(); 

  if (currentCookie < amount) {
    return jsonResponse({status: "error", message: "คุกกี้ไม่พอสำหรับส่งให้เมมเบอร์ค่ะ"});
  }
  
  let bonusMessage = "";
  let newTokenValue = currentToken;
  let hasReceivedBonus = false;

  // 3. ตรวจสอบเงื่อนไขโบนัส: ต้องเป็น Role user และเดือนที่บันทึกไว้ในคอลัมน์ I ต้องไม่ตรงกับเดือนปัจจุบัน
  if (userRole === "user" && lastBonusMonth !== autoMonthYear) { 
    newTokenValue += 10; 
    hasReceivedBonus = true;
    bonusMessage = " (ยินดีด้วย! คุณได้รับ Bonus ประจำเดือน 10 Token แล้วค่ะ)";
  }

  const newCookieValue = currentCookie - amount;
  
  // 4. บันทึกยอด Token และ Cookie (คอลัมน์ F และ G)
  userSheet.getRange(userIndex + 1, 6, 1, 2).setValues([[newTokenValue, newCookieValue]]); 

  // 5. บันทึกชื่อเดือนที่ได้รับโบนัสลงคอลัมน์ I (คอลัมน์ที่ 9) หากได้รับโบนัสครั้งแรกของเดือน
  if (hasReceivedBonus) {
    userSheet.getRange(userIndex + 1, 9).setValue(autoMonthYear); 
  }
  
  // บันทึก Log กิจกรรม
  if (fanLogSheet) fanLogSheet.appendRow([new Date(), data.username, memberName, amount]);
  writeLog(data.username, "Give Cookie", memberName, amount);
  if (rankSheet) updateRanking(rankSheet, memberName, amount);

  // สั่งบันทึกข้อมูลลง Sheet ทันที
  SpreadsheetApp.flush();

  return jsonResponse({
    status: "success", 
    message: "ส่งคุกกี้เรียบร้อย" + bonusMessage, 
    remainingCookie: newCookieValue, 
    currentToken: newTokenValue
  });
}

    // ==========================================
    // 📝 4. อัปเดตชื่อ
    // ==========================================
    if (action === "updateName") {
      if (userRole.toLowerCase() === "user") {
        userSheet.getRange(userIndex + 1, 3).setValue(data.newName); 
        writeLog(data.username, "Update Name", "SYSTEM", 0);
        return jsonResponse({status: "success", message: "แก้ไขชื่อเรียบร้อยแล้ว"});
      } else {
        return jsonResponse({status: "error", message: "เมมเบอร์ไม่สามารถแก้ไขชื่อได้"});
      }
    }

    // ==========================================
    // 💖 5. ตั้งค่าคามิโอชิ / โอชิ / ลบโอชิ (เวอร์ชันปรับปรุงดัชนีคอลัมน์)
    // ==========================================
    if (action === "setKamioshi" || action === "setOshi") {
      const memberNameParam = data.memberName || e.parameter.memberName;
      if (!memberNameParam) return jsonResponse({status: "error", message: "กรุณาระบุชื่อเมมเบอร์"});
      
      const formattedName = memberNameParam.charAt(0).toUpperCase() + memberNameParam.slice(1).toLowerCase();
      
      if (action === "setKamioshi") {
        userSheet.getRange(userIndex + 1, 10).setValue(formattedName); // คอลัมน์ J
        writeLog(username, "Set Kamioshi", formattedName, 0);
      } else {
        const currentOshis = userDataRow.slice(10).map(name => name ? name.toString().trim().toLowerCase() : "");
        
        if (!currentOshis.includes(formattedName.toLowerCase())) {
          let targetCol = 11; // เริ่มค้นหาที่คอลัมน์ K (คอลัมน์ที่ 11 ใน Sheet)
          
          // ค้นหาช่องแรกที่ว่างในตาราง Google Sheets
          for (let i = 10; i < userDataRow.length; i++) {
            if (!userDataRow[i] || userDataRow[i].toString().trim() === "") {
              targetCol = i + 1; // แปลง Array Index (เริ่มที่ 0) ให้เป็นตำแหน่งคอลัมน์บน Sheet (เริ่มที่ 1)
              break;
            }
            targetCol = i + 2; // เผื่อกรณีวิ่งจนสุดขอบแล้วยังไม่เจอช่องว่าง
          }
          
          userSheet.getRange(userIndex + 1, targetCol).setValue(formattedName);
          writeLog(username, "Add Oshi", formattedName, 0);
        }
      }
      SpreadsheetApp.flush();
      return jsonResponse({status: "success", message: "บันทึกเรียบร้อย!"});
    }
    // ==========================================
    // 💔 5.2 ระบบลบคามิโอชิ / เลิกติดตามโอชิ (removeOshi)
    // ==========================================
    if (action === "removeOshi") {
      // ดึงค่าอย่างปลอดภัย รองรับทั้ง JSON body และ URL parameter
      const type = data.type || e.parameter.type;
      const memberNameParam = data.memberName || e.parameter.memberName;
      
      if (!memberNameParam) return jsonResponse({status: "error", message: "กรุณาระบุชื่อเมมเบอร์ที่ต้องการลบ"});
      const targetMemberName = memberNameParam.toString().trim().toLowerCase();

      if (type === 'kami') {
        // ลบข้อมูลในคอลัมน์ J (คามิโอชิหลัก - คอลัมน์ที่ 10)
        userSheet.getRange(userIndex + 1, 10).clearContent(); 
        writeLog(username, "Remove Kami", memberNameParam, 0);
      } else {
        // 1. หาจำนวนคอลัมน์ทั้งหมดที่มีในชีทปัจจุบัน ป้องกันสูตรลบขอบตารางพัง
        const lastCol = userSheet.getLastColumn();
        const totalOshiCols = lastCol >= 11 ? (lastCol - 11 + 1) : 1; // จำนวนคอลัมน์ตั้งแต่ K เป็นต้นไป
        
        // 2. ดึงข้อมูลรายชื่อโอชิทั้งหมดในแถวของผู้ใช้คนนี้ (เริ่มจากคอลัมน์ K เป็นต้นไป)
        const rowRange = userSheet.getRange(userIndex + 1, 11, 1, totalOshiCols);
        const rowValues = rowRange.getValues()[0];
        
        // 3. กรองรายชื่อเมมเบอร์ เอาทุกคนยกเว้นคนที่เรากดเลิกโอชิ (ทำเป็นพิมพ์เล็กเพื่อเทียบชื่อแม่นๆ)
        const updatedOshis = rowValues
          .map(name => name ? name.toString().trim() : "")
          .filter(name => name !== "" && name.toLowerCase() !== targetMemberName);
        
        // 4. ล้างข้อมูลโอชิเดิมในแถวนั้นทั้งหมดก่อน (ตั้งแต่คอลัมน์ K ไปทางขวา)
        rowRange.clearContent();
        
        // 5. ถ้ายังเหลือโอชิคนอื่นอยู่ ให้เขียนรายชื่อกลับลงไปเรียงจากซ้ายไปขวา (ไม่ให้มีช่องว่างตรงกลาง)
        if (updatedOshis.length > 0) {
          // สร้าง Array 2 มิติเพื่อหยอดค่าวางลงใน Sheet [["Name1", "Name2", ...]]
          userSheet.getRange(userIndex + 1, 11, 1, updatedOshis.length).setValues([updatedOshis]);
        }
        writeLog(username, "Remove Oshi", memberNameParam, 0);
      }
      
      SpreadsheetApp.flush(); // บังคับให้ตารางอัปเดตทันที
      return jsonResponse({status: "success", message: "ลบเรียบร้อยแล้วค่ะ"});
    }

// ==========================================
// 🎁 6. ระบบสุ่มแผ่นรองแก้ว (ดึงฐานข้อมูลรูปภาพ & สุ่มกาชา)
// ==========================================

    if (action === "buyGachaItem") {
      if (!username || !collectionId) return jsonResponse({ status: "fail", message: "ข้อมูลไม่ครบถ้วน" });

      const userSheet = SS.getSheetByName("users");
      const colSheet = SS.getSheetByName("Collections");
      const itemSheet = SS.getSheetByName("Items");
      const invSheet = SS.getSheetByName("Inventory");

      // 1. ตรวจสอบ User & เช็ค Token
      const userRows = userSheet.getDataRange().getValues();
      const userIndex = userRows.findIndex(row => row[0] && row[0].toString().trim() === username);
      if (userIndex === -1) return jsonResponse({ status: "fail", message: "ไม่พบชื่อผู้ใช้" });
      
      let currentTokens = Number(userRows[userIndex][5]) || 0; // คอลัมน์ F (Tokens)

      // 2. เช็คราคาตู้สุ่ม
      const colRows = colSheet.getDataRange().getValues();
      const colData = colRows.find(row => row[0] && row[0].toString().trim() === collectionId);
      if (!colData) return jsonResponse({ status: "fail", message: "ไม่พบตู้สุ่มนี้" });
      
      const collectionName = colData[1];
      const cost = Number(colData[2]) || 0;

      if (currentTokens < cost) return jsonResponse({ status: "fail", message: "แต้ม Token ไม่เพียงพอครับ 🪙" });

      // 3. ดึงกลุ่มไอเทมในตู้มาสุ่ม
      const itemRows = itemSheet.getDataRange().getValues().slice(1);
      const itemPool = itemRows.filter(row => row[1] && row[1].toString().trim() === collectionId);
      if (itemPool.length === 0) return jsonResponse({ status: "fail", message: "ตู้นี้ยังไม่มีไอเทมให้สุ่มครับ" });

      // 🎲 เริ่มการสุ่มแบบ Weighted Random (อิงตามค่า Rate คอลัมน์ E)
      const randomVal = Math.random(); // สุ่มเลข 0.0 - 1.0
      let cumulativeRate = 0;
      let drawnItem = itemPool[0]; // กำหนดค่าเริ่มต้น

      for (let i = 0; i < itemPool.length; i++) {
        // itemPool[i][4] คือคอลัมน์ E (Rate)
        cumulativeRate += Number(itemPool[i][4]); 
        if (randomVal < cumulativeRate) {
          drawnItem = itemPool[i];
          break; 
        }
      }
      
      // กำหนดตัวแปรจากไอเทมที่สุ่มได้
      const itemName = drawnItem[2];  // ชื่อไอเทม (คอลัมน์ C)
      const itemImg = drawnItem[3];   // รูปภาพ (คอลัมน์ D)
      const itemType = "Coaster";     // ประเภทไอเทม

      // 4. หักแต้มและบันทึกข้อมูลลงชีต
      const newToken = currentTokens - cost;
      userSheet.getRange(userIndex + 1, 6).setValue(newToken); // อัปเดตยอด Token
      
      if (invSheet) {
          invSheet.appendRow([
            new Date(),       // A
            username,         // B
            itemType,         // C (คอลัมน์ C คือ ItemType)
            collectionId,     // D (คอลัมน์ D คือ CollectionID)
            itemName,         // E
            itemImg           // F
        ]);
      }
      if (SS.getSheetByName("logs")) SS.getSheetByName("logs").appendRow([new Date(), username, "Gacha", collectionName, cost]);

      // 🎉 ส่งข้อมูลกลับไปให้หน้าเว็บแสดงผล
      return jsonResponse({
        status: "success",
        itemName: itemName,
        itemImg: itemImg,
        itemType: itemType,
        collectionName: collectionName,
        newToken: newToken
      });
    }
    

// ==========================================
// 🎁 7. รับคุกกี้รายเดือน (เวอร์ชัน Auto Month + 100% Precision)
// ==========================================
if (action === "claimMonthlyCookie") {
  if (userRole !== "user") return jsonResponse({status: "error", message: "เฉพาะ Role User เท่านั้นที่รับได้"});

  // 1. สร้างชื่อเดือนอัตโนมัติ (เช่น "MAY2026")
  const autoMonthYear = Utilities.formatDate(new Date(), "GMT+7", "MMMMYYYY").toUpperCase();
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // กันคนกดรัว

    const mailboxData = mailboxSheet.getDataRange().getValues();
    const targetUser = data.username.toString().trim().toLowerCase();

    // 2. เช็คประวัติโดยเทียบจากชื่อเดือนที่สร้างขึ้นมาใหม่
    const alreadyClaimed = mailboxData.some(row => {
      const rowUser = String(row[0] || "").trim().toLowerCase();
      const rowMonth = String(row[1] || "").trim().toUpperCase();
      return rowUser === targetUser && rowMonth === autoMonthYear;
    });

    if (alreadyClaimed) {
      return jsonResponse({status: "error", message: `เดือน ${autoMonthYear} คุณรับไปแล้วค่ะ`});
    }

    // 3. บันทึกข้อมูลและอัปเดตยอดคุกกี้
    const currentCookie = Number(userSheet.getRange(userIndex + 1, 7).getValue()) || 0;
    const newCookieValue = currentCookie + 100;
    
    userSheet.getRange(userIndex + 1, 7).setValue(newCookieValue);
    // บันทึกค่า autoMonthYear ลงไปในคอลัมน์ B เลย
    mailboxSheet.appendRow([data.username, autoMonthYear, new Date()]);
    writeLog(data.username, "Claim Monthly", autoMonthYear, 100);

    SpreadsheetApp.flush(); // บังคับบันทึกทันที
    
    return jsonResponse({status: "success", message: `รับคุกกี้ของเดือน ${autoMonthYear} เรียบร้อย!`, newCookie: newCookieValue});

  } catch (e) {
    return jsonResponse({status: "error", message: "เซิร์ฟเวอร์ไม่ว่าง กรุณาลองใหม่ในอีก 1 นาทีค่ะ"});
  } finally {
    lock.releaseLock();
  }
}

    // ==========================================
    // 🎫 8. Redeem Code (เวอร์ชันอัปเดตตามตาราง image_89d0bc.png)
    // ==========================================
    if (action === "redeemCode") {
      const codeData = codeSheet.getDataRange().getValues();
      const cIdx = codeData.findIndex(row => row[0].toString() === data.code);

      if (cIdx === -1) return jsonResponse({status: "error", message: "โค้ดไม่ถูกต้อง"});
      if (now > new Date(codeData[cIdx][3])) return jsonResponse({status: "error", message: "โค้ดนี้หมดอายุแล้ว"});

      const usageData = codeUsageSheet.getDataRange().getValues();
      if (usageData.some(row => row[0].toString() === data.username && row[1].toString() === data.code)) {
        return jsonResponse({status: "error", message: "คุณเคยใช้โค้ดนี้ไปแล้วค่ะ"});
      }

      const maxLimit = Number(codeData[cIdx][4]) || 999999;
      const totalUsedCount = usageData.filter(row => row[1].toString() === data.code).length;
      if (totalUsedCount >= maxLimit) return jsonResponse({status: "error", message: "โค้ดนี้ถูกใช้งานครบจำนวนแล้ว"});

      const rewardType = codeData[cIdx][1].toString().toLowerCase().trim();
      const rewardAmount = Number(codeData[cIdx][2]);
      
      // 🎯 แมปปิ้งตำแหน่งคอลัมน์ให้ตรงเป๊ะกับตารางในภาพ image_89d0bc.png
      let targetCol;
      let displayType = "";

      if (rewardType === 'token') {
        targetCol = 6;  // ช่อง F (token)
        displayType = "Token";
      } else if (rewardType === 'cookie') {
        targetCol = 7;  // ช่อง G (cookie)
        displayType = "Cookie";
      } else if (rewardType === 'getoken' || rewardType === 'geToken') {
        targetCol = 8;  // ช่อง H (geToken)
        displayType = "GE Token";
      } else {
        return jsonResponse({status: "error", message: "ประเภทรางวัลของโค้ดนี้ไม่ถูกต้องในระบบ (ต้องเป็น token, cookie หรือ getoken)"});
      }
      
      // ดึงค่าเดิม บวกรวมค่าใหม่ และอัปเดตลงชีตผู้ใช้
      const currentVal = Number(userSheet.getRange(userIndex + 1, targetCol).getValue()) || 0;
      const newVal = currentVal + rewardAmount;

      userSheet.getRange(userIndex + 1, targetCol).setValue(newVal);
      codeUsageSheet.appendRow([data.username, data.code, now]);
      writeLog(data.username, "Redeem Code", data.code, rewardAmount);

      return jsonResponse({
        status: "success", 
        message: `ได้รับ ${rewardAmount.toLocaleString()} ${displayType} เรียบร้อย!`, 
        newValue: newVal
      });
    } 

    // ==========================================
    // 💸 9. คืนเงิน Top Fan
    // ==========================================
    if (action === "refundTopFan") {
      const fanLogsData = fanLogSheet.getDataRange().getValues();
      const totalByUsers = {};
      for (let i = 1; i < fanLogsData.length; i++) {
        const u = fanLogsData[i][1];
        const a = Number(fanLogsData[i][3]) || 0;
        if (u) totalByUsers[u] = (totalByUsers[u] || 0) + a;
      }
      let topFan = ""; let max = 0;
      for (const user in totalByUsers) {
        if (totalByUsers[user] > max) { max = totalByUsers[user]; topFan = user; }
      }
      if (topFan && max > 0) {
        const uIdx = userRows.findIndex(row => row[0].toString() === topFan);
        if (uIdx !== -1) {
          const curC = Number(userRows[uIdx][6]) || 0;
          userSheet.getRange(uIdx + 1, 7).setValue(curC + max);
          writeLog(topFan, "Refund Top Fan", "ALL", max);
          return jsonResponse({status: "success", message: "คืนคุกกี้ให้ " + topFan + " แล้ว"});
        }
      }
      return jsonResponse({status: "error", message: "ไม่พบ Top Fan"});
    }

      // ==========================================
      // ☕ ระบบสั่งซื้อสินค้าโดยตรง (BLM48 Cafe & Shop)
      // ==========================================
      if (action === 'buyDirectItem') {
          // 💡 เปลี่ยนมาใช้ชื่อตัวแปรใหม่ (reqนำหน้า) เพื่อป้องกันการตีกับ const เดิมของระบบ
          const reqUsername = e.parameter.username;
          const reqItemId = e.parameter.itemId;
          const reqItemName = e.parameter.itemName;
          const reqItemImg = e.parameter.itemImg;
          const reqPrice = parseInt(e.parameter.price) || 0;
          const reqItemType = e.parameter.itemType || 'Cafe';

          // 🔥 [เพิ่มจุดนี้]: ดึงค่า CollectionID ที่ส่งมาจาก Frontend (ถ้าไม่มีให้ตั้ง Default เป็น 'coll_cafe')
          const reqCollectionId = e.parameter.CollectionID || e.parameter.collectionId || 'coll_cafe';

          if (!reqUsername || !reqItemId) return jsonResponse({ status: "fail", message: "ข้อมูลไม่ครบถ้วนนะคะ" });

          const userSheet = SS.getSheetByName("users");
          const invSheet = SS.getSheetByName("Inventory");

          const userRows = userSheet.getDataRange().getValues();
          const userIndex = userRows.findIndex(row => row[0] && row[0].toString().trim() === reqUsername);
          
          if (userIndex === -1) return jsonResponse({ status: "fail", message: "ไม่พบชื่อผู้ใช้งานนี้ค่ะ" });

          // คอลัมน์ F (Tokens) คือ index 5
          let currentTokens = Number(userRows[userIndex][5]) || 0; 

          // ตรวจสอบว่าเงินพอไหม
          if (currentTokens < reqPrice) {
              return jsonResponse({ status: "fail", message: "แต้ม Token ไม่เพียงพอค่ะ ☕" });
          }

          // หักแต้ม Token และอัปเดตลงชีต users
          const newToken = currentTokens - reqPrice;
          userSheet.getRange(userIndex + 1, 6).setValue(newToken); 

          // บันทึกข้อมูลลงชีต Inventory
          if (invSheet) {
              invSheet.appendRow([
                  new Date(),          
                  reqUsername,            
                  reqItemType,            
                  reqCollectionId,  // 🔥 [แก้ไขจุดนี้]: เปลี่ยนจาก "" เป็น reqCollectionId เพื่อให้นำค่าไปบันทึกลงชีตค่ะ!
                  reqItemName,            
                  reqItemImg              
              ]);
          }

          // บันทึก Log การซื้อ 
          const logSheet = SS.getSheetByName("logs");
          if (logSheet) {
              logSheet.appendRow([new Date(), reqUsername, "Buy Direct", reqItemName, reqPrice]);
          }

          // ตอบกลับเป็น JSON แจ้ง success กลับไปที่หน้าเว็บ
          return jsonResponse({
              status: "success",
              message: "สั่งซื้อ " + reqItemName + " เรียบร้อยแล้วค่ะ",
              newToken: newToken
          });
      }

  } catch (err) {
    return jsonResponse({status: "error", message: "ระบบขัดข้อง: " + err.toString()});
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 📡 ระบบ GET Request (ฉบับอัปเกรดดึงข้อมูลปลอดภัย + กันแครช)
// ==========================================
function doGet(e) {
  // 🌟 1. ประกาศตัวแปร SS ไว้ในฟังก์ชันให้เรียบร้อยเพื่อป้องกันสคริปต์หาไม่เจอครับ
  const SS = SpreadsheetApp.getActiveSpreadsheet(); 

  try {
    if (!e || !e.parameter) return jsonResponse({ success: false, message: "No parameters" });
    
    const action = e.parameter.action;
    const username = e.parameter.username ? e.parameter.username.toString().trim() : "";
    const password = e.parameter.password ? e.parameter.password.toString().trim() : "";
    
    if (action === 'getMajorVoteCollections') {
    return sendJsonResponse(getMajorVoteCollections());
    }
    
    if (action === 'getMajorVoteDetail') {
      const id = e.parameter.id;
      return sendJsonResponse(getMajorVoteDetail(id));
    }

    if (action === "getTickets") {
        return getTicketsData();
      }
      
      // ✨ ปรับปรุงบล็อก buyTicket: ส่งค่าตรงๆ ป้องกันการชนกับตัวแปร const
      if (action === "buyTicket") {
        var ticketId = e.parameter.ticketId;
        var benefitTier = e.parameter.benefitTier;
        return buyTicketProcess(e.parameter.username, ticketId, benefitTier);
      }

      // ✨ ปรับปรุงบล็อก getInventory: ส่งค่าตรงๆ เช่นกัน
      if (action === "getInventory") {
        return getInventoryProcess(e.parameter.username);
      }

 // =========================================================================
    // 🎨 [เวอร์ชันแพ็กเกจคู่] ACTION: ดึงข้อมูลธีมผู้ชนะ และรูป Splash วันเกิด 
    // =========================================================================
    if (action === "getWinnerTheme") {
      const memberSheet = SS.getSheetByName("members");
      if (!memberSheet) return jsonResponse({ success: false, message: "หาชีทชื่อ 'members' ไม่เจอ" });
      const memberRows = memberSheet.getDataRange().getValues();
      
      // 🏆 1. ดึงข้อมูลธีมแชมป์ (เพื่อเอาไอคอนมาใช้เสมอ)
      const champSheet = SS.getSheetByName("champofthemonth");
      const champRows = champSheet ? champSheet.getDataRange().getValues() : [];
      const winnerName = champRows.length > 1 && champRows[champRows.length - 1][1] ? champRows[champRows.length - 1][1].toString().trim() : "";
      
      let champTheme = { name: "", splash: "", homeIcon: "", kamiIcon: "", cartIcon: "", notiIcon: "" };
      if (winnerName) {
        for (let i = 1; i < memberRows.length; i++) {
          const mName = memberRows[i][2] ? memberRows[i][2].toString().trim() : "";
          if (mName.toLowerCase() === winnerName.toLowerCase()) {
            champTheme = {
              name: mName,
              splash: memberRows[i][11] ? memberRows[i][11].toString().trim() : "",
              homeIcon: memberRows[i][12] ? memberRows[i][12].toString().trim() : "",
              kamiIcon: memberRows[i][13] ? memberRows[i][13].toString().trim() : "",
              cartIcon: memberRows[i][14] ? memberRows[i][14].toString().trim() : "",
              notiIcon: memberRows[i][15] ? memberRows[i][15].toString().trim() : ""
            };
            break;
          }
        }
      }

      // 🎂 2. ตรวจสอบวันเกิด (ดึงเฉพาะรูป Splash และ Banner)
      const birthdayColIndex = 17; // คอลัมน์ R (วันเกิด)
      const today = new Date();
      let birthdaySplash = ""; 
      let birthdayBanner = ""; // 📌 เพิ่มตัวแปรสำหรับรับ Banner HBD
      
      for (let i = 1; i < memberRows.length; i++) {
        const bData = memberRows[i][birthdayColIndex];
        if (!bData) continue;
        
        let isBirthday = false;
        if (bData instanceof Date) {
          if (bData.getDate() === today.getDate() && (bData.getMonth() + 1) === (today.getMonth() + 1)) isBirthday = true;
        } else {
          const bStr = bData.toString().trim();
          const currentShortDate1 = today.getDate() + "/" + (today.getMonth() + 1);
          const currentShortDate2 = (today.getDate() < 10 ? "0" + today.getDate() : today.getDate()) + "/" + ((today.getMonth() + 1) < 10 ? "0" + (today.getMonth() + 1) : (today.getMonth() + 1));
          if (bStr.includes(currentShortDate1) || bStr.includes(currentShortDate2)) isBirthday = true;
        }
        
        if (isBirthday) {
          birthdaySplash = memberRows[i][18] ? memberRows[i][18].toString().trim() : ""; // คอลัมน์ S (Splash)
          birthdayBanner = memberRows[i][19] ? memberRows[i][19].toString().trim() : ""; // 📌 คอลัมน์ T (Banner) ดึง Index ที่ 19
          break; 
        }
      }

      // 📦 3. ส่งข้อมูลกลับไปแบบแพ็กเกจคู่ (แชมป์ + วันเกิด)
      return jsonResponse({
        success: true,
        champ: champTheme,
        birthdaySplash: birthdaySplash, // ถ้าไม่มีใครเกิด จะเป็นค่าว่าง ""
        birthdayBanner: birthdayBanner  // 📌 ส่ง Banner กลับไปด้วย
      });
    }


    // =========================================================================
    // 🔔 [แก้ไขชื่อชีตให้ตรงกัน] ACTION: ดึงข้อมูลการแจ้งเตือนทั้งหมด
    // =========================================================================
    if (action === 'getNotifications') {
      // 🚨 เปลี่ยนชื่อชีตตรงนี้ให้เป็น BLM48_Notifications เหมือนใน doPost
      const notificationSheet = SS.getSheetByName('BLM48_Notifications'); 
      
      // ถ้ายังไม่มีชีทนี้ในระบบ ให้ส่งอาเรย์ว่างกลับไปหน้าบ้านก่อน (กันแครช)
      if (!notificationSheet) return jsonResponse([]); 

      const rows = notificationSheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse([]); // มีแต่หัวตาราง หรือไม่มีข้อมูลเลย

      const notifications = [];
      // วิ่งลูปดึงข้อมูลตั้งแต่แถวที่ 2 เป็นต้นไป (ข้ามหัวตาราง)
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][1]) continue; // ถ้าไม่มีข้อความ (action) ให้ข้ามแถวนี้ไป
        
        notifications.push({
          writer: rows[i][0] ? rows[i][0].toString() : "Admin",
          action: rows[i][1] ? rows[i][1].toString() : "",
          avatar: rows[i][2] ? rows[i][2].toString() : "",
          role: rows[i][3] ? rows[i][3].toString() : "Admin",
          timestamp: rows[i][4] instanceof Date ? rows[i][4].getTime() : (rows[i][4] ? rows[i][4] : Date.now())
        });
      }

      // 🔄 เรียงจากใหม่สุดไปเก่าสุดเสมอ (แถวล่าสุดอยู่บนสุด) ตามหลัก UI/UX ของ Notification Center
      return jsonResponse(notifications.reverse());
    }

    // 🌸 1. ACTION: ดึงโพสต์ (เวอร์ชันอัปเกรด ย้ายคอมเมนต์ไป Firebase เรียบร้อย)
    if (action === 'getPosts') {
      const postSheet = SS.getSheetByName('Posts');
      const userSheet = SS.getSheetByName('users'); 
      const likeSheet = SS.getSheetByName('Likes');
      // 💡 เอาดึงข้อมูลคอมเมนต์ออกจากชีตออกไปเลยงับ เพราะเราย้ายบ้านไป Firebase แล้ว!

      // ดึงข้อมูลพื้นฐาน
      const userRows = userSheet ? userSheet.getDataRange().getValues() : [];
      const likeRows = likeSheet ? likeSheet.getDataRange().getValues() : [];
      const postRows = postSheet ? postSheet.getDataRange().getValues() : [];

      // สร้าง Map ข้อมูลผู้ใช้
      const userMap = {};
      for (let j = 1; j < userRows.length; j++) {
        userMap[userRows[j][0]] = { 
          name: userRows[j][2], 
          role: userRows[j][3],        
          profile_img: userRows[j][4] 
        }; 
      }

      const posts = [];
      for (let i = 1; i < postRows.length; i++) {
        const row = postRows[i];
        if (!row[0]) continue;
        const postId = row[0].toString();
        
        posts.push({
          id: postId,
          authorName: userMap[row[1]]?.name || row[1],
          authorUsername: row[1], 
          content: row[2],
          imageURL: row[3],
          profile_img: userMap[row[1]]?.profile_img || 'https://via.placeholder.com/40',
          likes: likeRows.filter(r => r[0] == postId).length,
          isLiked: likeRows.some(r => r[0] == postId && r[1] == e.parameter.username),
          comments: [], // 💡 คืนค่าเป็นอาเรย์ว่างไว้ชั่วคราว เพื่อไม่ให้โครงสร้างหลักเดิมแครช
          timestamp: (function() {
            if (!row[6]) return "เมื่อสักครู่";
            try {
              let dateObj = new Date(row[6]);
              if (!isNaN(dateObj.getTime())) {
                return Utilities.formatDate(dateObj, "GMT+7", "yyyy-MM-dd HH:mm");
              }
              return row[6].toString();
            } catch (err) {
              return "เมื่อสักครู่";
            }
          })(),
          audioURL: row[7] ? row[7].toString() : "", 
          videoURL: row[8] ? row[8].toString() : ""  
        });
      }
      return jsonResponse(posts.reverse());
    }

 // ❤️ 2. ACTION: กดไลก์
   else if (action === 'likePost') {
      const postId = e.parameter.postId;
      const likeSheet = SS.getSheetByName('Likes');
      const postSheet = SS.getSheetByName('Posts');
      const likeData = likeSheet.getDataRange().getValues();
      
      let likedIndex = -1;
      for(let i=1; i<likeData.length; i++) {
        if(likeData[i][0] == postId && likeData[i][1] == username) { likedIndex = i+1; break; }
      }

      let isNowLiked = false;
      if(likedIndex > -1) {
        likeSheet.deleteRow(likedIndex);
        isNowLiked = false;
      } else {
        likeSheet.appendRow([postId, username]);
        isNowLiked = true;
      }

      const totalLikes = likeSheet.getDataRange().getValues().filter(r => r[0] == postId).length;
      
      // 1. อัปเดตเลขในชีต Posts พร้อมดึงค่า Author และ Timestamp ออกมาใช้งาน
      let postRows = postSheet.getDataRange().getValues();
      let authorUsername = "";
      let postTimestampStr = "";
      
      for(let i=1; i<postRows.length; i++){
          if(postRows[i][0] == postId) { 
            postSheet.getRange(i+1, 5).setValue(totalLikes); // คอลัมน์ E (Likes)
            authorUsername = postRows[i][1];  // คอลัมน์ B (Author)
            postTimestampStr = postRows[i][6]; // คอลัมน์ G (Timestamp)
            break; 
          }
      }

      // 🌟 [ส่วนเพิ่มใหม่] ตรวจสอบและบันทึกคะแนนคุกกี้ลงชีต ranking ตามเดือน
      if (authorUsername && postTimestampStr) {
        const userSheet = SS.getSheetByName('users');
        const rankingSheet = SS.getSheetByName('ranking');
        
        // A. ค้นหาชื่อเมมเบอร์จากชีต users (เช็คคอลัมน์ A ตรงกับคอลัมน์ C)
        const userData = userSheet.getDataRange().getValues();
        let memberName = "";
        for (let i = 1; i < userData.length; i++) {
          if (userData[i][0] == authorUsername) { // คอลัมน์ A: username
            memberName = userData[i][2];        // คอลัมน์ C: name (ชื่อเมมเบอร์)
            break;
          }
        }

        // B. ถ้าพบชื่อเมมเบอร์ ให้ดำเนินการเช็คเดือนและอัปเดตชีต ranking
        if (memberName) {
          // ดึงชื่อเดือนภาษาอังกฤษจาก Timestamp ของโพสต์ เพื่อเอาไปหาคอลัมน์ในบรรทัดแรก
          const postDate = new Date(postTimestampStr);
          const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          const targetMonth = months[postDate.getMonth()];

          const rankingData = rankingSheet.getDataRange().getValues();
          const headerRow = rankingData[0]; // แถวแรกของชีต ranking
          
          // ค้นหาตำแหน่งคอลัมน์ของเดือน (รองรับกรณีตัวอักษรพิมพ์เล็ก-ใหญ่ หรือมีเว้นวรรค เช่น "January ")
          let targetColIdx = -1;
          for (let c = 0; c < headerRow.length; c++) {
            if (String(headerRow[c]).toLowerCase().trim() === targetMonth) {
              targetColIdx = c + 1; // แปลงเป็น Base-1 สำหรับ getRange
              break;
            }
          }

          // ค้นหาแถวของเมมเบอร์คนนั้นในคอลัมน์ B (name)
          let targetRowIdx = -1;
          for (let r = 1; r < rankingData.length; r++) {
            if (String(rankingData[r][1]).trim() === String(memberName).trim()) { // คอลัมน์ B: name
              targetRowIdx = r + 1; // แปลงเป็น Base-1 สำหรับ getRange
              break;
            }
          }

          // C. เมื่อเจอตำแหน่งทั้ง แถว และ คอลัมน์ แล้ว ให้คำนวณแต้มคุกกี้
          if (targetRowIdx > -1 && targetColIdx > -1) {
            const cell = rankingSheet.getRange(targetRowIdx, targetColIdx);
            const currentCookies = Number(cell.getValue()) || 0;
            
            // เงื่อนไข: 1 ไลก์ = 9 คุกกี้ (ถ้ากดไลก์บวก 9, ถอนไลก์ลบออก 9)
            const cookieChange = isNowLiked ? 9 : -9;
            
            // ทำการบันทึกค่าใหม่ทับช่องเดิม โดยไม่กระทบกับคะแนนคุกกี้อื่นๆ ในระบบ
            cell.setValue(currentCookies + cookieChange);
          }
        }
      }

      return jsonResponse({ status: "success", likes: totalLikes, isLiked: isNowLiked });
    }

    else if (action === 'editPost') {
        const postId = e.parameter.postId;
        const reqUsername = e.parameter.username;
        const reqUserRole = e.parameter.role; // รับ Role มาด้วย
        const newContent = e.parameter.newContent;
        
        const postSheet = SS.getSheetByName('Posts');
        const postData = postSheet.getDataRange().getValues();
        
        for (let i = 1; i < postData.length; i++) {
          const postAuthor = postData[i][1];
          
          if (postData[i][0] == postId) {
            // เรียกใช้ฟังก์ชันเช็กสิทธิ์
            if (canEditOrDelete({username: reqUsername, role: reqUserRole}, postAuthor)) {
              postSheet.getRange(i + 1, 3).setValue(newContent);
              return jsonResponse({ status: "success", message: "Updated successfully" });
            } else {
              return jsonResponse({ status: "error", message: "Permission denied" });
            }
          }
        }
        return jsonResponse({ status: "error", message: "Post not found" });
      }
    
    else if (action === 'deletePost') {
      const postId = e.parameter.postId;
      const reqUsername = e.parameter.username;
      
      // 🌟 [ปรับใหม่] ไม่ใช้ e.parameter.role จากหน้าบ้าน แต่ไปหา Role จริงในชีต users
      const userSheet = SS.getSheetByName('users');
      const userData = userSheet.getDataRange().getValues();
      let realRole = 'member'; // ตั้งค่าเริ่มต้น
      
      for (let u = 1; u < userData.length; u++) {
        if (userData[u][0] && userData[u][0].toString().trim() === reqUsername.toString().trim()) {
          realRole = userData[u][3]; // คอลัมน์ D (Index 3) คือ Role ตัวจริงในระบบ
          break;
        }
      }
      
      const postSheet = SS.getSheetByName('Posts');
      const postData = postSheet.getDataRange().getValues();
      
      for (let i = 1; i < postData.length; i++) {
        if (postData[i][0] == postId) {
          // ใช้สิทธิ์จริงจากฐานข้อมูลในการตรวจสอบ
          const postAuthor = postData[i][1];
          
          if (canEditOrDelete({ username: reqUsername, role: realRole }, postAuthor)) {
            postSheet.deleteRow(i + 1);
            return jsonResponse({ status: "success", message: "Deleted successfully" });
          } else {
            return jsonResponse({ status: "error", message: "Permission denied" });
          }
        }
      }
      return jsonResponse({ status: "error", message: "Post not found" });
    }


    // --- 🛍️ ดึงข้อมูลตู้คอลเลกชันทั้งหมด ---
    if (action === "getCollections") {
      const colSheet = SS.getSheetByName("Collections");
      if (!colSheet) return jsonResponse({ status: "error", message: "หาชีทชื่อ 'Collections' ไม่เจอ" });
      const rows = colSheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse([]);
      
      const headers = rows[0];
      // หาตำแหน่งคอลัมน์ Status
      const statusIndex = headers.findIndex(h => h.toString().trim() === "Status"); 

      const jsonArray = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        
        // ✨ [เพิ่มจุดนี้] ถ้ามีคอลัมน์ Status และค่าในช่องนั้นคือ "Sold Out" ให้ข้ามไปเลย ไม่ส่งไปโชว์ที่หน้า Shop
        if (statusIndex !== -1 && rows[i][statusIndex].toString().trim() === "Sold Out") {
            continue;
        }

        let obj = {};
        for (let j = 0; j < headers.length; j++) { obj[headers[j]] = rows[i][j]; }
        jsonArray.push(obj);
      }
      return jsonResponse(jsonArray);
    }

    // --- 🎒 ระบบดึงข้อมูลของในกระเป๋าแยกตาม Collections ---
if (action === "getMyInventory") {
    if (!username) return jsonResponse({ status: "fail", message: "กรุณาระบุ username" });

    const invSheet = SS.getSheetByName("Inventory");
    const collectSheet = SS.getSheetByName("Collections");
    
    if (!invSheet || !collectSheet) return jsonResponse({ status: "error", message: "หาชีทไม่เจอ" });

    // 1. สร้าง Map เพื่อดึงชื่อ Collection จาก ID สำหรับแสดงผล/ทำ Sub-filter
    const colRows = collectSheet.getDataRange().getValues().slice(1);
    const colMap = {}; 
    colRows.forEach(row => {
        if(row[0]) colMap[row[0].toString().trim()] = row[1] ? row[1].toString().trim() : ""; 
    });

    // 2. ประมวลผล Inventory
    const invRows = invSheet.getDataRange().getValues().slice(1);
    const userInventoryMap = {};

    invRows.forEach(row => {
        const itemUser = row[1] ? row[1].toString().trim() : "";
        const itemType = row[2] ? row[2].toString().trim() : "";     
        const collectionID = row[3] ? row[3].toString().trim() : ""; 
        const itemName = row[4] ? row[4].toString().trim() : "";    
        const itemImg = row[5] ? row[5].toString().trim() : "";     

        if (itemUser === username && itemName) {
            let colName = colMap[collectionID] || "หมวดหมู่อื่นๆ";
            let parentCategory = "หมวดหมู่อื่นๆ"; // ใช้สำหรับจัดกลุ่มใหญ่

            // 🌸 เช็คว่าเป็นกลุ่ม Thank You Card หรือไม่
            if (itemType === "Thank You Card" || collectionID.toLowerCase().includes("votemajor")) {
                parentCategory = "Thank You Card";
                // ดึงชื่อแคมเปญจริงมาใส่ใน subCollection (เช่น "BLM48 Tanabata 2026")
                colName = colMap[collectionID] || "แคมเปญโหวตพิเศษ"; 
            } 
            // ☕ เช็คว่าเป็นกลุ่ม Cafe
            else if (collectionID === "BLM48_Cafe" || collectionID === "coll_cafe" || colName.toLowerCase().includes("cafe")) {
                parentCategory = "BLM48 Cafe";
                colName = "BLM48 Cafe ☕";
            }
            // 💿 เช็คว่าเป็นกลุ่ม Coaster
            else if (colName.toLowerCase().includes("coaster")) {
                parentCategory = "Coaster";
            }

            const uniqueKey = collectionID + "_" + itemName;

            if (!userInventoryMap[uniqueKey]) {
                userInventoryMap[uniqueKey] = {
                    name: itemName,
                    category: parentCategory, // กลุ่มหลัก (Coaster, Thank You Card, Cafe)
                    subCollection: colName,   // กลุ่มย่อย (BLM48 Tanabata 2026, Coaster "BINGO!")
                    img: itemImg || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300',
                    qty: 0
                };
            }
            userInventoryMap[uniqueKey].qty++;
        }
    });

    return jsonResponse({ status: "success", inventory: Object.values(userInventoryMap) });
}

  // รองรับการดึงค่าผ่าน action = getMemberCount
    if (e.parameter.action === 'getMemberCount') {
      try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users"); 
        var data = sheet.getDataRange().getValues();
        
        var count = 0;
        
        // วิ่งลูปตั้งแต่แถวที่ 2 เป็นต้นไป (ข้ามหัวตารางแถวแรก)
        for (var i = 1; i < data.length; i++) {
          var role = String(data[i][3]).toLowerCase().trim(); // 📊 Column D คือคอลัมน์ role
          
          // 🌸 กรองนับเฉพาะแถวที่เป็น user หรือ member
          if (role === 'user' || role === 'member') {
            count++;
          }
        }
        
        // ✨ เปลี่ยนมาใช้ jsonResponse เพื่อความสอดคล้องและปลอดภัยของระบบ CORS ครับ
        return jsonResponse({ success: true, total: count });
                             
      } catch (error) {
        // ✨ ตรงส่วน Error ก็ใช้ jsonResponse ครอบเช่นกันงับ
        return jsonResponse({ success: false, error: error.toString() });
      }
    }

    // --- 📜 ดึงประวัติส่วนตัว (Logs) แบบครบชุด ---
    if (action === "getMyHistory") {
      if (!username) return jsonResponse({ status: "fail", message: "กรุณาระบุ username" });
      
      const fanLogSheet = SS.getSheetByName('fanLogs'); 
      const logSheet = SS.getSheetByName('logs');
      const majorVoteSheet = SS.getSheetByName("majorVoteLogs"); 
      const voteCollectionSheet = SS.getSheetByName("majorVoteCollections"); // ✨ ดึงชีตแคมเปญ
      
      // 1. ดึงประวัติการปาคุกกี้
      const fanLogsData = fanLogSheet ? fanLogSheet.getDataRange().getValues().slice(1) : [];
      const myGiveLogs = fanLogsData.filter(row => row[1] && row[1].toString().trim() === username)
                                    .map(row => ({ timestamp: row[0], member: row[2], amount: row[3] })).reverse();

      // 2. ดึงประวัติการซื้อของ
      const logsData = logSheet ? logSheet.getDataRange().getValues().slice(1) : [];
      const myPurchaseLogs = logsData.filter(row => row[1] && row[1].toString().trim() === username)
                                        .map(row => ({ timestamp: row[0], action: row[2], target: row[3], amount: row[4] })).reverse();

      // ✨ สร้างกล่องความจำ (Dictionary) สำหรับแคมเปญโหวต เพื่อแปลง ID เป็นชื่อ Title และ TokenType
      let campaignMap = {};
      if (voteCollectionSheet) {
          const campData = voteCollectionSheet.getDataRange().getValues();
          for (let i = 1; i < campData.length; i++) {
              const campId = campData[i][0] ? campData[i][0].toString().trim() : "";
              if (campId) {
                  campaignMap[campId] = {
                      title: campData[i][1] ? campData[i][1].toString().trim() : campId, // คอลัมน์ B (Title)
                      tokenType: campData[i][7] ? campData[i][7].toString().trim() : "Vote" // คอลัมน์ H (TokenType)
                  };
              }
          }
      }

      // 3. ✨ ดึงประวัติการโหวต (Major Vote) และนำไปจับคู่กับชื่อแคมเปญ
      const voteData = majorVoteSheet ? majorVoteSheet.getDataRange().getValues().slice(1) : [];
      const myVoteLogs = voteData.filter(row => row[1] && row[1].toString().trim() === username)
                                 .map(row => {
                                     const colId = row[2] ? row[2].toString().trim() : "";
                                     // ถ้ามีข้อมูลใน Map ให้ดึงมาใช้ ถ้าไม่มีให้ใช้ค่าตั้งต้น
                                     const campInfo = campaignMap[colId] || { title: colId, tokenType: "Vote" };
                                     
                                     return { 
                                         timestamp: row[0], 
                                         campaignTitle: campInfo.title, // ชื่อ Title ของการโหวต
                                         tokenType: campInfo.tokenType, // ประเภท TokenType
                                         member: row[3],
                                         amount: row[4]
                                     };
                                 }).reverse();

      // 📦 ส่งข้อมูลทั้ง 3 ก้อนกลับไปให้หน้าบ้าน
      return jsonResponse({ 
        status: "success", 
        giveLogs: myGiveLogs, 
        purchaseHistory: myPurchaseLogs,
        voteLogs: myVoteLogs 
      });
    }

    // --- 🔑 ระบบ Login / User Info ---
    if (action === "getUserInfo" || action === "login") {
      if (!username) return jsonResponse({ success: false, status: "error", message: "กรุณาระบุ username" });
      
      const userSheet = SS.getSheetByName('users');
      if (!userSheet) return jsonResponse({ success: false, status: "error", message: "หาชีทชื่อ 'users' ไม่เจอ" });
      
      const userRows = userSheet.getDataRange().getValues();
      const cleanUsername = username.toString().trim();
      const userIndex = userRows.findIndex(row => row[0] && row[0].toString().trim() === cleanUsername);

      // เคสที่ 1: เจอยูสเซอร์ในระบบ
      if (userIndex !== -1) {
        const u = userRows[userIndex];
        
        // ตรวจสอบกรณีแอดมินลบแค่ Password ออกจากชีต (เหลือแต่ Username ว่างเปล่า)
        const sheetPassword = u[1] ? u[1].toString().trim() : "";
        if (sheetPassword === "") {
          return jsonResponse({ 
            success: false, 
            status: "error", 
            message: "บัญชีของคุณถูกระงับการใช้งาน\nกรุณาติดต่อ BLM48 Line Official"
          });
        }

        // 💡 ปรับปรุงตรงนี้: แปลงรหัสผ่านที่ส่งมาจากหน้าบ้านอย่างปลอดภัย ป้องกันสคริปต์พัง (Crash)
        const inputPassword = (typeof password !== 'undefined' && password !== null) ? password.toString().trim() : "";

        if (action === "login" && sheetPassword !== inputPassword) {
          return jsonResponse({ success: false, status: "error", message: "รหัสผ่านไม่ถูกต้อง" });
        }
        
        // ดึงรายชื่อโอชิ (Index 10 เป็นต้นไป)
        let oshiList = [];
        for (let col = 10; col < u.length; col++) {
          let oshiName = u[col] ? u[col].toString().trim() : "";
          if (oshiName !== "") oshiList.push(oshiName);
        }
        
        return jsonResponse({
          success: true,
          status: "success",
          data: { 
            username: u[0], 
            name: u[2], 
            role: u[3], 
            profile_img: u[4] || "", 
            token: Number(u[5]) || 0, 
            cookie: Number(u[6]) || 0,
            geToken: Number(u[7]) || 0,
            kamioshi: u[9] ? u[9].toString().trim() : "", 
            oshi: oshiList                
          }
        });
      }
      
      // เคสที่ 2: 🚨 สำคัญที่สุด (แอดมินลบ Username หรือลบทั้งแถวออกไปแล้ว)
      return jsonResponse({ 
        success: false, 
        status: "error", 
        message: "บัญชีของคุณถูกระงับการใช้งาน หรือไม่มีอยู่ในระบบแล้ว" 
      });
    }

    if (action === "getLatestChamp") {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("champofthemonth"); // ใส่ชื่อหน้า Sheet ให้ตรงเป๊ะ
    var rows = sheet.getDataRange().getValues();
    
    // ดึงแถวสุดท้าย (แชมป์คนล่าสุด)
    var lastRowIndex = rows.length - 1;
    var headers = rows[0];
    var lastRowValues = rows[lastRowIndex];
    
    // แปลงข้อมูลเป็น Object เช่น { Name: "เอ็มมี่", message: "" }
    var champData = {};
    for (var i = 0; i < headers.length; i++) {
      champData[headers[i]] = lastRowValues[i];
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: champData
    })).setMimeType(ContentService.MimeType.JSON);
  }

    // ==========================================
    // 🌸 ดึงรายชื่อเมมเบอร์ทั้งหมด (สำหรับหน้าค้นหา)
    // ==========================================
    if (action === "getAllMembers") {
      const memberSheet = SS.getSheetByName("members");
      if (!memberSheet) return jsonResponse({ status: "error", message: "หาชีทชื่อ 'members' ไม่เจอ" });
      
      const rows = memberSheet.getDataRange().getValues();
      const dataRows = rows.slice(1); // ตัดแถวหัวตารางออก
      
      const membersData = dataRows.map(row => {
        return {
          member_id: row[0] ? row[0].toString().trim() : "",
          "Full Name(EN)": row[1] ? row[1].toString().trim() : "", // คอลัมน์ B
          name: row[2] ? row[2].toString().trim() : "",            // คอลัมน์ C
          group_name: row[3] ? row[3].toString().trim() : "",
          generation: row[4] ? row[4].toString().trim() : "",
          team: row[5] ? row[5].toString().trim() : "",
          status: row[6] ? row[6].toString().trim() : "",          // 🌟 ส่งสถานะออกไปด้วย
          profile: row[7] ? row[7].toString().trim() : ""          // คอลัมน์ H
        };
      });
      
      return jsonResponse({ status: "success", data: membersData });
    }

  // ==========================================
  // 🏆 ดึงข้อมูล Champ of the Month (เวอร์ชัน Real-time 100% ไม่อมแคช)
  // ==========================================
  if (action === "getChampOfTheMonth") {
    // ⬇️ ตัดระบบ CacheService ออก แล้วดึงข้อมูลจาก Google Sheets จริงทุกครั้งเพื่อให้หน้าเว็บอัปเดตทันที
    const champSheet = SS.getSheetByName("champofthemonth");
    const memberSheet = SS.getSheetByName("members");
    
    if (!champSheet || !memberSheet) {
      return jsonResponse({ status: "error", message: "หาชีท champofthemonth หรือ members ไม่เจอ" });
    }

    const membersData = memberSheet.getDataRange().getValues();
    const profileMap = {};
    for (let i = 1; i < membersData.length; i++) {
      const mName = membersData[i][2] ? membersData[i][2].toString().trim() : "";
      const mProfile = membersData[i][7] ? membersData[i][7].toString().trim() : "";
      if (mName) profileMap[mName] = mProfile;
    }

    const champData = champSheet.getDataRange().getValues();
    const champList = [];
    
    for (let j = 1; j < champData.length; j++) {
      const name = champData[j][1] ? champData[j][1].toString().trim() : "";
      if (name) {
        champList.push({
          monthYear: champData[j][0] ? champData[j][0].toString().trim() : "",
          name: name,
          totalCookie: champData[j][2] || 0,
          message: champData[j][3] ? champData[j][3].toString().trim() : "",
          postImage: champData[j][4] ? champData[j][4].toString().trim() : (champData[j][5] ? champData[j][5].toString().trim() : ""),
          profileImage: profileMap[name] || "" 
        });
      }
    }
    
    const responseData = { status: "success", data: champList.reverse() };

    // ส่งข้อมูลสดใหม่กลับไปที่หน้าเว็บทันที ไม่ต้องรอเคลียร์แคช 5 นาทีแล้ว!
    return jsonResponse(responseData);
  }

    // =========================================================================
    // 🗳️ ACTION 1: ดึงข้อมูลแคมเปญ Major Vote ทั้งหมด (หน้าแรก)
    // =========================================================================
    if (action === "getMajorVoteCollections") {
      const voteColSheet = SS.getSheetByName("majorVoteCollections");
      if (!voteColSheet) return sendJsonResponse({ status: "error", message: "หาชีท 'majorVoteCollections' ไม่เจอ" }); // 🛠️ แก้จุดนี้
      
      const rows = voteColSheet.getDataRange().getValues();
      if (rows.length <= 1) return sendJsonResponse({ status: "success", data: [] }); // 🛠️ แก้จุดนี้
      
      const headers = rows[0];
      const campaigns = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue; // ถ้าไม่มี ID ข้ามไป
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = rows[i][j];
        }
        campaigns.push(obj);
      }
      
      return sendJsonResponse({ status: "success", data: campaigns }); // 🛠️ แก้จุดนี้
    }

    // =========================================================================
    // 🏆 [NEW ACTION]: ดึงข้อมูลจากชีต champaign (เฉพาะคอลัมน์ที่กำหนด & แถวที่มีข้อมูล)
    // =========================================================================
    if (action === "getCampaignCollections") {
      const champSheet = SS.getSheetByName("campaign");
      if (!champSheet) {
        return sendJsonResponse({ status: "error", message: "หาชีท 'campaign' ไม่เจอ" });
      }
      
      const lastRow = champSheet.getLastRow();
      if (lastRow <= 1) {
        return sendJsonResponse({ status: "success", data: [] });
      }
      
      // ดึงข้อมูลทั้งหมดในชีต champaign
      const rows = champSheet.getDataRange().getValues();
      const headers = rows[0].map(h => h.toString().trim());
      const campaigns = [];
      
      // ค้นหาตำแหน่ง Index ของแต่ละคอลัมน์ตามที่คุณเอ็มมี่กำหนดไว้
      const idxId = headers.indexOf("CampaignID");
      const idxName = headers.indexOf("CampaignName");
      const idxCover = headers.indexOf("CoverImage");
      const idxAmount = headers.indexOf("TotalAmount");
      const idxCurrency = headers.indexOf("CurrencyType");
      
      for (let i = 1; i < rows.length; i++) {
        // 1. ตรวจสอบเงื่อนไข: ดึงเฉพาะ row ที่มีข้อมูล (ถ้าไม่มี CampaignID หรือแถวว่างให้ข้ามทันที)
        const campaignId = idxId !== -1 ? rows[i][idxId] : rows[i][0];
        if (!campaignId || campaignId.toString().trim() === "") {
          continue; 
        }
        
        // 2. จัดโครงสร้าง Object ดึงเฉพาะคอลัมน์ที่คุณเอ็มมี่กำหนด
        let obj = {};
        obj["CampaignID"] = campaignId;
        obj["CampaignName"] = idxName !== -1 ? rows[i][idxName] : "";
        obj["CoverImage"] = idxCover !== -1 ? rows[i][idxCover] : "";
        obj["TotalAmount"] = idxAmount !== -1 ? Number(rows[i][idxAmount]) || 0 : 0;
        obj["CurrencyType"] = idxCurrency !== -1 ? rows[i][idxCurrency] : "";
        
        // 💡 (เผื่อไว้สำหรับหน้าบ้าน HTML เดิม) แมปค่าให้เข้ากับตัวแปรที่หน้าบ้านเคยเรียกใช้
        obj["VoteCollectionID"] = obj["CampaignID"];
        obj["Title"] = obj["CampaignName"];
        obj["totalAmount"] = obj["TotalAmount"];
        
        campaigns.push(obj);
      }
      
      return sendJsonResponse({ status: "success", data: campaigns });
    }

    // =========================================================================
    // 🗳️ ACTION 1: ดึงเฉพาะแคมเปญที่อยู่ในช่วงเวลาจัดกิจกรรม (คอลัมน์ A-H)
    // =========================================================================
    if (action === "getMajorVoteCollections") {
      const voteColSheet = SS.getSheetByName("majorVoteCollections");
      if (!voteColSheet) return sendJsonResponse({ status: "error", message: "หาชีท 'majorVoteCollections' ไม่เจอ" });
      
      // ดึงข้อมูลตั้งแต่คอลัมน์ A ถึง H (8 คอลัมน์)
      const lastRow = voteColSheet.getLastRow();
      if (lastRow <= 1) return sendJsonResponse({ status: "success", data: [] });
      
      const rows = voteColSheet.getRange(1, 1, lastRow, 8).getValues(); 
      const headers = rows[0];
      const campaigns = [];
      const nowTime = new Date().getTime();
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue; 
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = rows[i][j];
        }

        // 🔍 [FIXED INDEX]: ตรวจสอบเงื่อนไขวันเวลาจัดกิจกรรม 
        // อ้างอิงจากหัวตาราง: StartTime (คอลัมน์ E / Index 4), EndTime (คอลัมน์ F / Index 5)
        if (obj.StartTime && obj.EndTime) {
          const startTime = new Date(obj.StartTime).getTime();
          const endTime = new Date(obj.EndTime).getTime();

          if (!isNaN(startTime) && !isNaN(endTime)) {
            if (nowTime < startTime || nowTime > endTime) {
              continue; // ❌ ไม่อยู่ในช่วงเวลา -> ข้ามไปเลย
            }
          }
        }
        
        // 🔍 [FIXED INDEX]: ใช้ค่า Status จากชีตตรงๆ (Status อยู่คอลัมน์ G / Index 6)
        let sheetStatus = obj.Status ? obj.Status.toString().trim().toLowerCase() : "closed";
        obj["CalculatedStatus"] = sheetStatus; 
        
        campaigns.push(obj);
      }
      
      return sendJsonResponse({ status: "success", data: campaigns });
    }

    // =========================================================================
    // 👥 ACTION 2: ดึงข้อมูล Candidates (คอลัมน์ A-G)
    // =========================================================================
    if (action === "getMajorVoteCandidates") {
      const collectionId = e.parameter.collectionId ? e.parameter.collectionId.toString().trim() : "";
      if (!collectionId) return sendJsonResponse({ status: "error", message: "ไม่พบ Collection ID" });

      const candSheet = SS.getSheetByName("majorVoteCandidates");
      if (!candSheet) return sendJsonResponse({ status: "error", message: "หาชีท 'majorVoteCandidates' ไม่เจอ" });

      const voteColSheet = SS.getSheetByName("majorVoteCollections");
      if (!voteColSheet) return sendJsonResponse({ status: "error", message: "หาชีท 'majorVoteCollections' ไม่เจอ" });

      // 1. ตรวจสอบสถานะของแคมเปญจากชีตหลัก majorVoteCollections (A-H)
      const colLastRow = voteColSheet.getLastRow();
      const colRows = voteColSheet.getRange(1, 1, colLastRow, 8).getValues();
      let targetTokenType = "";
      let campaignStatus = "closed"; 

      for (let i = 1; i < colRows.length; i++) {
        if (colRows[i][0] && colRows[i][0].toString().trim() === collectionId) {
          // 🔍 [FIXED INDEX]: TokenType อยู่คอลัมน์ H (Index 7), Status อยู่คอลัมน์ G (Index 6)
          campaignStatus = colRows[i][6] ? colRows[i][6].toString().trim().toLowerCase() : "closed"; 
          targetTokenType = colRows[i][7] ? colRows[i][7].toString().trim() : ""; 
          break;
        }
      }

      // 2. ดึงข้อมูลผู้สมัครจากชีต majorVoteCandidates (A-G)
      const candLastRow = candSheet.getLastRow();
      if (candLastRow <= 1) return sendJsonResponse({ status: "success", campaignTimeStatus: campaignStatus, data: [] });
      
      const rows = candSheet.getRange(1, 1, candLastRow, 7).getValues();
      const headers = rows[0];
      const candidates = [];
      let totalVotesInCampaign = 0; 

      for (let i = 1; i < rows.length; i++) {
        const candCollectionId = rows[i][1] ? rows[i][1].toString().trim() : "";
        // 🔍 [FIXED INDEX]: TokenType ในชีต Candidates อยู่คอลัมน์ E (Index 4)
        const candTokenType = rows[i][4] ? rows[i][4].toString().trim() : ""; 

        if (candCollectionId === collectionId) {
          if (targetTokenType && candTokenType !== targetTokenType) {
            continue;
          }

          let obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = rows[i][j];
          }
          
          // 💡 แมปปิ้งตัวแปรให้ตรงกับหน้าเว็บ HTML ของคุณ
          // MemberName (คอลัมน์ C / Index 2), ProfileMember (คอลัมน์ D / Index 3)
          obj["name"] = obj["MemberName"] || rows[i][2]; 
          obj["profile_img"] = obj["ProfileMember"] || rows[i][3];
          
          // 🔍 [FIXED INDEX]: CurrentVotes อยู่คอลัมน์ F (Index 5)
          let votes = Number(obj.CurrentVotes) || 0;
          totalVotesInCampaign += votes;
          candidates.push(obj);
        }
      }

      // 3. จัดการเรียงลำดับตามสถานะแคมเปญ
      if (campaignStatus === "open") {
        candidates.sort((a, b) => {
          let nameA = String(a.name || "").trim();
          let nameB = String(b.name || "").trim();
          return nameA.localeCompare(nameB, 'th');
        });
      } else {
        candidates.sort((a, b) => (Number(b.CurrentVotes) || 0) - (Number(a.CurrentVotes) || 0));
      }

      // คำนวณเปอร์เซ็นต์คะแนนโหวต (CurrentVotes / คะแนนรวมทั้งหมด)
      candidates.forEach(cand => {
        let votes = Number(cand.CurrentVotes) || 0;
        let percentage = totalVotesInCampaign > 0 ? ((votes / totalVotesInCampaign) * 100).toFixed(2) : "0.00";
        cand["VotePercentage"] = percentage + "%";
      });

      return sendJsonResponse({ 
        status: "success", 
        campaignTimeStatus: campaignStatus, 
        data: candidates 
      });
    }

 // =========================================================================
      // ✍️ ACTION 3: ระบบบันทึกโหวต หักเหรียญ ลงประวัติ และเพิ่มเข้าคลังอัตโนมัติ
      // =========================================================================
      if (action === "submitMajorVote") {
        const lock = LockService.getScriptLock();
        lock.waitLock(10000); 

        try {
          const collectionId = e.parameter.collectionId;
          const candidateName = e.parameter.candidateName; 
          const voteAmount = Number(e.parameter.voteAmount);
          
          if (!username || !collectionId || !candidateName || voteAmount <= 0) {
            return sendJsonResponse({ status: "error", message: "ข้อมูลโหวตไม่ครบถ้วน หรือจำนวนโหวตไม่ถูกต้อง" });
          }

          const userSheet = SS.getSheetByName("users");
          const candSheet = SS.getSheetByName("majorVoteCandidates");
          const logSheet = SS.getSheetByName("majorVoteLogs");
          const voteColSheet = SS.getSheetByName("majorVoteCollections");
          const inventorySheet = SS.getSheetByName("Inventory");

          // 1. ตรวจเช็กสถานะแคมเปญจาก majorVoteCollections
          const colLastRow = voteColSheet.getLastRow();
          const colRows = voteColSheet.getRange(1, 1, colLastRow, 8).getValues();
          let isAvailable = false;
          for(let i = 1; i < colRows.length; i++) {
            if(colRows[i][0] == collectionId && String(colRows[i][6]).toLowerCase() === "open") {
              isAvailable = true;
              break;
            }
          }
          if(!isAvailable) return sendJsonResponse({ status: "error", message: "ขออภัยค่ะ แคมเปญนี้ปิดรับคะแนนโหวตเรียบร้อยแล้ว" });

          // 2. ค้นหาแถวของผู้สมัครในชีต majorVoteCandidates
          const candLastRow = candSheet.getLastRow();
          const candRows = candSheet.getRange(1, 1, candLastRow, candSheet.getLastColumn()).getValues();
          const candHeaders = candRows[0];

          // หา Index คอลัมน์จากชื่อหัวข้อ
          const idxVoteCollectionId = candHeaders.indexOf("VoteCollectionID");
          const idxMemberName = candHeaders.indexOf("MemberName");
          const idxTokenType = candHeaders.indexOf("TokenType");
          const idxCurrentVotes = candHeaders.indexOf("CurrentVotes");
          const idxThankYouCard = candHeaders.indexOf("ThankYouCardURL"); 

          // ป้องกัน Error กรณีหาหัวคอลัมน์ไม่เจอ
          if (idxVoteCollectionId === -1 || idxMemberName === -1 || idxCurrentVotes === -1 || idxThankYouCard === -1) {
            return sendJsonResponse({ status: "error", message: "ระบบขัดข้อง: โครงสร้างตารางไม่ถูกต้อง" });
          }

          let candRowIndex = -1;
          let tokenTypeRequired = "token"; 
          let currentVotes = 0;
          let tyCardUrl = "";

          for (let i = 1; i < candRows.length; i++) {
            if (candRows[i][idxVoteCollectionId] == collectionId && candRows[i][idxMemberName] == candidateName) {
              candRowIndex = i + 1; 
              tokenTypeRequired = candRows[i][idxTokenType] ? candRows[i][idxTokenType].toString().trim() : "token";
              currentVotes = Number(candRows[i][idxCurrentVotes]) || 0;
              tyCardUrl = candRows[i][idxThankYouCard] ? candRows[i][idxThankYouCard].toString().trim() : "";
              break;
            }
          }

          if (candRowIndex === -1) return sendJsonResponse({ status: "error", message: "ไม่พบข้อมูลผู้สมัครรายนี้ในแคมเปญ" });

          // 3. ตรวจเช็กและหักเหรียญผู้ใช้ในชีต users
              const userRows = userSheet.getDataRange().getValues();
              let userRowIndex = -1;
              let currentBalance = 0;
              let balanceColIndex = tokenTypeRequired === "geToken" ? 8 : 6; 

              for (let i = 1; i < userRows.length; i++) {
                if (userRows[i][0] == username) {
                  userRowIndex = i + 1;
                  currentBalance = Number(userRows[i][balanceColIndex - 1]) || 0;
                  break;
                }
              }

              if (userRowIndex === -1) return sendJsonResponse({ status: "error", message: "ไม่พบผู้ใช้งานในระบบ" });
              
              // แจ้งเตือนเวลาเหรียญไม่พอให้ตรงกับชนิด Token
              const displayTokenName = tokenTypeRequired === "geToken" ? "GE Token" : "Token";
              if (currentBalance < voteAmount) return sendJsonResponse({ status: "error", message: `จำนวน ${displayTokenName} ของคุณไม่เพียงพอสำหรับการโหวต` });

          
          // 4. บันทึกหักยอดเงินและเพิ่มคะแนนโหวต
          userSheet.getRange(userRowIndex, balanceColIndex).setValue(currentBalance - voteAmount);
          candSheet.getRange(candRowIndex, idxCurrentVotes + 1).setValue(currentVotes + voteAmount); 
          
          // 5. บันทึกประวัติลงชีต majorVoteLogs 
          logSheet.appendRow([new Date(), username, collectionId, candidateName, voteAmount]);

          // 6. ดึงชื่อแคมเปญโหวต (Title) เพื่อใช้เป็นหมวดหมู่ และบันทึก Thank You Card เข้าคลัง
          let voteCampaignTitle = "Thank You Card"; 
          if (voteColSheet) {
            const colLastRow = voteColSheet.getLastRow();
            const colRows = voteColSheet.getRange(1, 1, colLastRow, 2).getValues(); 
            for (let i = 1; i < colRows.length; i++) {
              if (colRows[i][0] == collectionId) {
                voteCampaignTitle = colRows[i][1] ? colRows[i][1].toString().trim() : voteCampaignTitle;
                break;
              }
            }
          }

          // บันทึกเข้าชีต Inventory อัตโนมัติ
          if (inventorySheet && tyCardUrl !== "" && tyCardUrl !== "-") {
            inventorySheet.appendRow([
              new Date(), 
              username, 
              "Thank You Card", // ItemType
              collectionId,     // CollectionID 
              "Thank You Card - " + candidateName, // ItemName
              tyCardUrl
            ]);
          }

          // บังคับให้ Google Sheet บันทึกข้อมูลทั้งหมดทันทีก่อนคลาย Lock
          SpreadsheetApp.flush();

          // ✨ เพิ่ม tokenType แนบกลับไปให้หน้าบ้านตรงนี้
          return sendJsonResponse({ 
            status: "success", 
            message: "โหวตสำเร็จเรียบร้อยและบันทึกการ์ดขอบคุณเข้าคลังของคุณแล้ว!", 
            thankYouCard: tyCardUrl,
            tokenType: displayTokenName  // ส่งคำว่า "Token" หรือ "GE Token" กลับไปให้ป๊อปอัปแสดงผล
          });
          
        } catch (error) {
           return sendJsonResponse({ status: "error", message: "Error: " + error.message });
        } finally {
           lock.releaseLock();
        }
      }

    // ==========================================
    // 👑 ดึงรายละเอียดสถิติและ Top Fans ของเมมเบอร์รายคน (เวอร์ชันอ่านคุกกี้, Kami, Oshi, Likes โคตรไว!)
    // ==========================================
    if (action === "getMemberDetail") {
      const nameParam = e.parameter.name ? e.parameter.name.toString().trim() : "";
      if (!nameParam) return sendJsonResponse({ status: "fail", message: "กรุณาระบุชื่อเมมเบอร์" }); // 🛠️ แก้จุดนี้

      const memberSheet = SS.getSheetByName("members");
      if (!memberSheet) return sendJsonResponse({ status: "error", message: "หาชีทชื่อ 'members' ไม่เจอ" }); // 🛠️ แก้จุดนี้
      const memberRows = memberSheet.getDataRange().getValues();
      
      // กำหนดตำแหน่ง Index ของคอลัมน์ในชีท members ตรงๆ
      const nameColIndex = 2;   // คอลัมน์ C (Index 2) -> ชื่อเมมเบอร์
      const statusColIndex = 6; // 🌟 คอลัมน์ G (Index 6) -> สถานะเมมเบอร์ (เช่น Graduated)
      const imgColIndex = 7;    // คอลัมน์ H (Index 7) -> รูปโปรไฟล์
      const cookieColIndex = 8; // คอลัมน์ I (Index 8) -> ยอดคุกกี้รวมที่ดึงมาจากชีท ranking 🍪
      const kamiColIndex = 9;   // 🚀 คอลัมน์ J (Index 9) -> ยอดรวม Kami-Oshi 
      const oshiColIndex = 10;  // 🚀 คอลัมน์ K (Index 10) -> ยอดรวม Oshi
      const likesColIndex = 16; // 💖 คอลัมน์ Q (Index 16) -> ยอดรวมไลค์ (จากสูตรที่เราทำไว้)

      let profileImg = "";
      let allTimeTotal = 0;
      let memberStatus = ""; 
      let totalKami = 0; 
      let totalOshi = 0; 
      let totalLikes = 0; // 💖 สร้างตัวแปรมารอรับค่ายอดไลค์

      // ค้นหาแถวของเมมเบอร์ที่ระบุในชีท members (รวมเป็นก้อนเดียว ไม่ซ้ำซ้อน)
      const mIndex = memberRows.findIndex(row => row[nameColIndex] && row[nameColIndex].toString().trim().toLowerCase() === nameParam.toLowerCase());
      
      if (mIndex !== -1) {
        profileImg = memberRows[mIndex][imgColIndex] ? memberRows[mIndex][imgColIndex].toString().trim() : "";
        allTimeTotal = Number(memberRows[mIndex][cookieColIndex]) || 0;
        memberStatus = memberRows[mIndex][statusColIndex] ? memberRows[mIndex][statusColIndex].toString().trim() : ""; 
        
        // 🚀 อ่านค่า Kami และ Oshi ตรงๆ จากชีต members
        totalKami = Number(memberRows[mIndex][kamiColIndex]) || 0;
        totalOshi = Number(memberRows[mIndex][oshiColIndex]) || 0;

        // 💖 อ่านค่ายอดไลค์รวมจากคอลัมน์ Q (Index 16) ตรงๆ เลย
        totalLikes = Number(memberRows[mIndex][likesColIndex]) || 0; 
      }

      // [ส่วนที่ 2: users ดึงมาเพื่อหาชื่อและรูปของ Top Fans เท่านั้น]
      const userSheet = SS.getSheetByName("users");
      const userMap = {}; 
      
      if (userSheet) {
        const userRows = userSheet.getDataRange().getValues().slice(1);
        userRows.forEach(row => {
          const uName = row[0] ? row[0].toString().trim() : "";
          if (uName) {
            userMap[uName] = {
              name: row[2] ? row[2].toString().trim() : uName,
              img: row[4] ? row[4].toString().trim() : ""
            };
          }
        });
      }

      // [ส่วนที่ 3: fanLogs ประมวลผล Top Fans ดึงค่าตามเดิม]
      const fanLogSheet = SS.getSheetByName("fanLogs");
      const fanMap = {}; 
      if (fanLogSheet) {
        const fanLogsData = fanLogSheet.getDataRange().getValues().slice(1);
        fanLogsData.forEach(row => {
          const logUser = row[1] ? row[1].toString().trim() : ""; 
          const logMember = row[2] ? row[2].toString().trim().toLowerCase() : ""; 
          const logAmount = Number(row[3]) || 0; 
          if (logMember === nameParam.toLowerCase()) {
            if (!fanMap[logUser]) {
              const uInfo = userMap[logUser] || { name: logUser, img: "" };
              fanMap[logUser] = { username: logUser, name: uInfo.name, img: uInfo.img, total: 0 };
            }
            fanMap[logUser].total += logAmount;
          }
        });
      }

      const fansArray = Object.values(fanMap).sort((a, b) => b.total - a.total);

      // ส่งกลับข้อมูลใน JSON Response รวมยอดไลค์ไปด้วย
      return sendJsonResponse({ // 🛠️ แก้จุดนี้
        status: "success",
        stats: {
          name: nameParam, 
          status: memberStatus, 
          profile_img: profileImg,
          total_kami: totalKami,  
          total_oshi: totalOshi,  
          total_likes: totalLikes,
          all_time_total: allTimeTotal 
        },
        fans: fansArray
      });
    }

    if (action === "getTopFans") return getTopFansData();
    if (action === "getRanking") return getRankingData(); 
    return getRankingData(); 

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "doGet Crash: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// ⚙️ Helper Functions (ฟังก์ชันตัวช่วย)
// ==========================================

function updateRanking(sheet, memberName, amount) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // แถวหัวตาราง (มีชื่อเดือน)
  const rowIndex = data.findIndex(row => row[1] && row[1].toString().trim().toLowerCase() === memberName.trim().toLowerCase());
  
  if (rowIndex !== -1) {
    // หาเดือนปัจจุบันเป็นภาษาอังกฤษ
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // 🇹🇭 ปรับจุดที่ 1: บังคับให้หาเดือนปัจจุบันอิงตามไทม์โซนประเทศไทย (Asia/Bangkok)
    const nowInTH = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentMonth = monthNames[nowInTH.getMonth()];
    
    // ค้นหาว่าเดือนปัจจุบันอยู่คอลัมน์ไหน
    const monthColIndex = headers.indexOf(currentMonth);
    
    if (monthColIndex !== -1) {
      // ดึงค่ายอดเดิมของเดือนปัจจุบัน
      const currentMonthlyVal = Number(data[rowIndex][monthColIndex]) || 0;
      
      // บันทึกเฉพาะในคอลัมน์ของเดือนนั้น ๆ (จะไม่ไปยุ่งกับคอลัมน์ R ที่เป็นสูตร SUM)
      sheet.getRange(rowIndex + 1, monthColIndex + 1).setValue(currentMonthlyVal + amount);
    }
  }
}

function getRankingData() {
  const rankSheet = SS.getSheetByName("ranking");
  if (!rankSheet) return jsonResponse([]);
  
  // 🌟 1. ดึงข้อมูลจากชีท members มาเก็บให้ครบ (สถานะ, คุกกี้, คามิ, โอชิ)
  const memberSheet = SS.getSheetByName("members");
  const memberMap = {};
  if (memberSheet) {
    const memberData = memberSheet.getDataRange().getValues().slice(1); // ข้ามหัวตาราง
    memberData.forEach(row => {
      const mName = row[2] ? row[2].toString().trim().toLowerCase() : ""; // คอลัมน์ C (Index 2)
      if (mName) {
        // เก็บเป็น Object ไว้เลย จะได้ดึงไปใช้ง่ายๆ
        memberMap[mName] = {
          status: row[6] ? row[6].toString().trim() : "Active", // คอลัมน์ G (Index 6)
          profile_img: row[7] ? row[7].toString().trim() : "",  // คอลัมน์ H (Index 7)
          total_cookies: Number(row[8]) || 0,                    // คอลัมน์ I (Index 8) - Total Cookie
          total_kami: Number(row[9]) || 0,                      // คอลัมน์ J (Index 9) - Total Kami
          total_oshi: Number(row[10]) || 0,                      // คอลัมน์ K (Index 10) - Total Oshi
          totalLikes: Number(row[16]) || 0
        };
      }
    });
  }
  
  const data = rankSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1); 
  
  // หาเดือนปัจจุบัน
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // 🇹🇭 ปรับจุดที่ 2: บังคับให้ดึงเดือนปัจจุบันสำหรับจัดอันดับอิงตามไทม์โซนประเทศไทยเช่นกัน
  const nowInTH = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const currentMonth = monthNames[nowInTH.getMonth()];
  const monthColIndex = headers.indexOf(currentMonth);
  
  const results = rows.map(row => {
    // ดึงยอดเดือนปัจจุบันแบบไดนามิกจากชีท ranking
    let currentMonthVal = 0;
    if (monthColIndex !== -1) {
       currentMonthVal = Number(row[monthColIndex]) || 0;
    }

    const memberName = row[1] ? row[1].toString().trim() : "";
    const mKey = memberName.toLowerCase();
    
    // 🌟 2. ดึงแพ็กเกจข้อมูลที่เตรียมไว้จากชีท members มาใช้
    const mData = memberMap[mKey] || {}; 

    return {
      name: memberName,                
      monthly_cookies: currentMonthVal,             // ยอดรายเดือน (อิงตามเดือนปัจจุบันอัตโนมัติจาก ranking)
      
      // 👇 ดึงข้อมูลที่เหลือจากชีท members โดยตรง (ถ้าไม่มีให้ใช้ 0)
      total_kami: mData.total_kami || 0,            
      total_oshi: mData.total_oshi || 0,            
      all_time_total: mData.total_cookies || (Number(row[17]) || 0), // ใช้คุกกี้จาก members ก่อน ถ้าไม่มีค่อยไปเอาจาก R ใน ranking
      profile_img: mData.profile_img || row[18],    
      status: mData.status || "Active",             
      totalLikes: mData.totalLikes || 0              
    };
  });
  
  return jsonResponse(results.sort((a, b) => b.monthly_cookies - a.monthly_cookies));
}

function canEditOrDelete(currentUser, postAuthor) {
  // แปลงค่าให้ปลอดภัย ป้องกันช่องว่างและเรื่องตัวพิมพ์เล็ก-ใหญ่ (Case-sensitive)
  const role = currentUser.role ? currentUser.role.toString().trim().toUpperCase() : "";
  const currentUsername = currentUser.username ? currentUser.username.toString().trim().toLowerCase() : "";
  const author = postAuthor ? postAuthor.toString().trim().toLowerCase() : "";

  // สิทธิ์สูงสุดสำหรับ CEO และ Admin
  if (role === 'CEO' || role === 'ADMIN') {
    return true; 
  }
  
  // สมาชิกทั่วไปเช็กแค่ว่าเป็นเจ้าของโพสต์หรือไม่
  return currentUsername === author;
}
function getTopFansData() {
  const logSheet = SS.getSheetByName('fanLogs');
  const userSheet = SS.getSheetByName('users');
  if (!logSheet || !userSheet) return jsonResponse({});

  const logs = logSheet.getDataRange().getValues().slice(1); 
  const users = userSheet.getDataRange().getValues().slice(1);
  
  const userMap = {};
  users.forEach(u => { userMap[u[0]] = { name: u[2], img: u[4] }; });

  const memberTopFans = {}; 
  logs.forEach(log => {
    const username = log[1];
    const memberName = log[2];
    const amount = Number(log[3]) || 0;

    if (!memberTopFans[memberName]) memberTopFans[memberName] = [];
    
    let fan = memberTopFans[memberName].find(f => f.username === username);
    if (!fan) {
      fan = { 
        username: username, total: 0, 
        name: userMap[username] ? userMap[username].name : username,
        img: userMap[username] ? userMap[username].img : ""
      };
      memberTopFans[memberName].push(fan);
    }
    fan.total += amount;
  });

  for (let member in memberTopFans) {
    memberTopFans[member].sort((a, b) => b.total - a.total);
  }

  return jsonResponse(memberTopFans);
}

// [ฟังก์ชันดึงรายชื่อแคมเปญ]
function getMajorVoteCollections() {
  const sheet = SS.getSheetByName('majorVoteCollections');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let collections = [];
  
  for(let i=1; i<data.length; i++) {
    let obj = {};
    for(let j=0; j<headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    collections.push(obj);
  }
  return { status: "success", data: collections };
}

// [ฟังก์ชันดึงรายละเอียด + เมมเบอร์ในแคมเปญ]
function getMajorVoteDetail(collectionId) {
  const collSheet = SS.getSheetByName('majorVoteCollections');
  const candSheet = SS.getSheetByName('majorVoteCandidates');
  
  // หาแคมเปญ
  const collData = collSheet.getDataRange().getValues();
  const collHeaders = collData[0];
  let collection = null;
  for(let i=1; i<collData.length; i++) {
    if(collData[i][collHeaders.indexOf('VoteCollectionID')] == collectionId) {
      collection = {};
      for(let j=0; j<collHeaders.length; j++) collection[collHeaders[j]] = collData[i][j];
      break;
    }
  }

  // หาเมมเบอร์
  const candData = candSheet.getDataRange().getValues();
  const candHeaders = candData[0];
  let candidates = [];
  for(let i=1; i<candData.length; i++) {
    if(candData[i][candHeaders.indexOf('VoteCollectionID')] == collectionId) {
      let obj = {};
      for(let j=0; j<candHeaders.length; j++) obj[candHeaders[j]] = candData[i][j];
      candidates.push(obj);
    }
  }

  return { status: "success", data: { collection: collection, candidates: candidates } };
}

// 1. ฟังก์ชันดึงข้อมูลคอนเสิร์ตและ Benefit ทั้งหมดส่งไปหน้าบ้าน
function getTicketsData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Tickets");
  if (!sheet) return sendJsonResponse({status: "error", message: "ไม่พบแผ่นงาน Tickets ในระบบ"});
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var tickets = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    
    // Mapping เพิ่มเติมเพื่อรองรับตัวแปรฝั่ง Frontend ที่เอ็มมี่เขียนไว้ก่อนหน้า
    if (obj.EventName && !obj.ConcertName) obj.ConcertName = obj.EventName;
    if (obj.Description && !obj.BenefitDetails) obj.BenefitDetails = obj.Description;
    
    tickets.push(obj);
  }
  return sendJsonResponse({status: "success", data: tickets});
}

// 2. ฟังก์ชันระบบซื้อบัตรคอนเสิร์ต หัก Token และเพิ่มเข้าคลัง Inventory + แจก Benefit แบบอัตโนมัติ
function buyTicketProcess(username, ticketId, benefitTier) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ticketSheet = ss.getSheetByName("Tickets");
  var userSheet = ss.getSheetByName("users");
  var invSheet = ss.getSheetByName("Inventory");
  var benefitSheet = ss.getSheetByName("TicketBenefits"); // เปิดดึงข้อมูลแผ่นงาน Benefit เพิ่มเติม
  
  if (!ticketSheet || !userSheet || !invSheet) {
    return sendJsonResponse({status: "error", message: "โครงสร้างแผ่นงานระบบฐานข้อมูลไม่ครบถ้วน"});
  }
  
  // ดึงข้อมูลและตรวจสอบตำแหน่งคอลัมน์ของแผ่นงาน Tickets
  var ticketData = ticketSheet.getDataRange().getValues();
  var ticketHeaders = ticketData[0];
  
  var tIdIdx = ticketHeaders.indexOf("TicketID");
  var tTierIdx = ticketHeaders.indexOf("TierName");
  var tStockIdx = ticketHeaders.indexOf("Stock");
  var tCostIdx = ticketHeaders.indexOf("CostTokens");
  
  if (tIdIdx === -1 || tTierIdx === -1 || tStockIdx === -1 || tCostIdx === -1) {
    return sendJsonResponse({status: "error", message: "โครงสร้างหัวตารางแผ่นงาน Tickets ไม่ถูกต้องตามระบบ"});
  }
  
  var ticketRowIndex = -1;
  var ticketObj = {};
  
  for (var i = 1; i < ticketData.length; i++) {
    if (ticketData[i][tIdIdx] == ticketId && ticketData[i][tTierIdx] == benefitTier) {
      ticketRowIndex = i + 1;
      for (var j = 0; j < ticketHeaders.length; j++) {
        ticketObj[ticketHeaders[j]] = ticketData[i][j];
      }
      break;
    }
  }
  
  if (ticketRowIndex == -1) return sendJsonResponse({status: "error", message: "ไม่พบข้อมูลระดับ Benefit ที่ท่านเลือก"});
  if (Number(ticketObj.Stock) <= 0) return sendJsonResponse({status: "error", message: "ขออภัยค่ะ บัตรในระดับสิทธิ์นี้ถูกจองเต็มหมดแล้ว"});
  
  // ดึงข้อมูลและตรวจสอบตำแหน่งคอลัมน์ของแผ่นงาน users
  var userData = userSheet.getDataRange().getValues();
  var userHeaders = userData[0];
  
  var uUserIdx = userHeaders.indexOf("username");
  var uTokenIdx = userHeaders.indexOf("token");
  
  if (uUserIdx === -1 || uTokenIdx === -1) {
    return sendJsonResponse({status: "error", message: "โครงสร้างหัวตารางแผ่นงาน users ไม่ถูกต้องตามระบบ"});
  }
  
  var userRowIndex = -1;
  var currentTokens = 0;
  
  for (var k = 1; k < userData.length; k++) {
    if (userData[k][uUserIdx] == username) {
      userRowIndex = k + 1;
      currentTokens = Number(userData[k][uTokenIdx]);
      break;
    }
  }
  
  if (userRowIndex == -1) return sendJsonResponse({status: "error", message: "ไม่พบชื่อผู้ใช้งานนี้ในระบบสมาชิก"});
  
  var cost = Number(ticketObj.CostTokens);
  if (currentTokens < cost) return sendJsonResponse({status: "error", message: "ยอดคงเหลือจำนวน Token ของคุณไม่เพียงพอสำหรับทำรายการนี้ค่ะ"});
  
  // เริ่มกระบวนการอัปเดตข้อมูลลงฐานข้อมูล Google Sheets
  userSheet.getRange(userRowIndex, uTokenIdx + 1).setValue(currentTokens - cost); // หัก Token
  ticketSheet.getRange(ticketRowIndex, tStockIdx + 1).setValue(Number(ticketObj.Stock) - 1); // ลดจำนวนคงคลังสต็อกบัตรลง 1
  
  // 1️⃣ [นำออกเรียบร้อย] ไม่บันทึกตั๋วหลัก/โปสเตอร์คอนเสิร์ตอัตโนมัติ เพื่อให้เอ็มมี่ไปกำหนดเองในแผ่นงาน TicketBenefits
  
  // 2️⃣ ✨ ระบบค้นหาและเพิ่ม Benefit ชิ้นอื่นๆ เข้า Inventory อัตโนมัติ (อิงตามข้อมูลหลังบ้าน) ✨
  if (benefitSheet) {
    var benefitData = benefitSheet.getDataRange().getValues();
    var bHeaders = benefitData[0];
    
    var bTicketIdIdx = bHeaders.indexOf("TicketID");
    var bNameIdx = bHeaders.indexOf("BenefitName");
    var bTypeIdx = bHeaders.indexOf("ItemType");
    var bImgIdx = bHeaders.indexOf("BenefitImageURL");
    
    // ตรวจสอบความถูกต้องของหัวตารางชีต TicketBenefits
    if (bTicketIdIdx !== -1 && bNameIdx !== -1 && bTypeIdx !== -1 && bImgIdx !== -1) {
      for (var m = 1; m < benefitData.length; m++) {
        // กรองเอาเฉพาะ Benefit ชิ้นที่ตรงกับ TicketID ของบัตรที่ซื้อ 
        if (benefitData[m][bTicketIdIdx] == ticketId) {
          var bName = benefitData[m][bNameIdx];
          var bType = benefitData[m][bTypeIdx];
          var bImg = benefitData[m][bImgIdx];
          
          // 💡 ถ้ารูป Benefit ว่าง ให้ดึงรูปปกคอนเสิร์ต (PosterURL) มาใช้แทนสำรอง
          if (!bImg || bImg.toString().trim() === "") {
            bImg = ticketObj.PosterURL;
          }
          
          // บันทึก Benefit แต่ละชิ้นแยกเพิ่มลงคลังทันทีตามที่เอ็มมี่ตั้งค่าไว้ในชีต
          invSheet.appendRow([
            new Date(),
            username,
            bType,                                    // คอลัมน์ C: ItemType (เช่น Poster, PhotoCard, Signature)
            ticketId,                                 // คอลัมน์ D: CollectionID / TicketID
            bName + " (" + ticketObj.EventName + ")", // คอลัมน์ E: ชื่อของแถมคู่กับชื่อคอนเสิร์ต 
            bImg                                      // คอลัมน์ F: รูปของแถม หรือรูปปกคอนเสิร์ตสำรอง 
          ]);
        }
      }
    }
  }
  
  return sendJsonResponse({
    status: "success", 
    message: "ซื้อบัตรคอนเสิร์ตเสร็จสิ้น! ระบบนำส่งเอกสารสิทธิ์และของแถม (Benefits) เข้าสู่ Inventory เรียบร้อยแล้วค่ะ"
  });
}

// ฟังก์ชันแปลงข้อมูลผลลัพธ์เป็น JSON สำหรับตอบกลับหน้าเว็บ
function sendJsonResponse(res) {
  return ContentService.createTextOutput(JSON.stringify(res))
                       .setMimeType(ContentService.MimeType.JSON);
}

function updateLikeToCookieRanking(postId, isLikedAction) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var postsSheet = ss.getSheetByName("Posts");
  var usersSheet = ss.getSheetByName("users");
  var rankingSheet = ss.getSheetByName("ranking");
  
  // 1. ค้นหาข้อมูลโพสต์ (เพื่อหาคนโพสต์ และ เดือนที่โพสต์)
  var postsData = postsSheet.getDataRange().getValues();
  var authorUsername = "";
  var postTimestamp = null;
  
  for (var i = 1; i < postsData.length; i++) {
    if (postsData[i][0] == postId) { // คอลัมน์ A: PostID
      authorUsername = postsData[i][1]; // คอลัมน์ B: Author (username)
      postTimestamp = new Date(postsData[i][6]); // คอลัมน์ G: Timestamp
      break;
    }
  }
  
  if (!authorUsername) return; // ไม่พบข้อมูลโพสต์
  
  // หาชื่อเดือนจาก Timestamp ของโพสต์ (แปลงเป็นข้อความภาษาอังกฤษตัวเล็กเพื่อเอาไปเทียบหัวตาราง)
  var months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  var targetMonth = months[postTimestamp.getMonth()]; 
  
  // 2. ค้นหาชื่อเมมเบอร์จากชีต users โดยใช้ Username
  var usersData = usersSheet.getDataRange().getValues();
  var memberName = "";
  for (var j = 1; j < usersData.length; j++) {
    if (usersData[j][0] == authorUsername) { // คอลัมน์ A: username
      memberName = usersData[j][2]; // คอลัมน์ C: name (ชื่อเมมเบอร์)
      break;
    }
  }
  
  if (!memberName) return; // ไม่พบชื่อเมมเบอร์ในระบบผู้ใช้งาน
  
  // 3. ค้นหาตำแหน่ง แถว และ คอลัมน์ ในชีต ranking
  var rankingData = rankingSheet.getDataRange().getValues();
  var headerRow = rankingData[0];
  
  // 3.1 ค้นหาคอลัมน์ของเดือนนั้นๆ (ตัดช่องว่างออกด้วย .trim())
  var targetColIdx = -1;
  for (var c = 0; c < headerRow.length; c++) {
    var headerVal = String(headerRow[c]).toLowerCase().trim();
    if (headerVal === targetMonth) {
      targetColIdx = c;
      break;
    }
  }
  
  // 3.2 ค้นหาแถวของเมมเบอร์คนนั้น
  var targetRowIdx = -1;
  for (var r = 1; r < rankingData.length; r++) {
    if (String(rankingData[r][1]).trim() === String(memberName).trim()) { // คอลัมน์ B: name
      targetRowIdx = r;
      break;
    }
  }
  
  // 4. ทำการบวกคุกกี้เพิ่มเข้าคอลัมน์เดือน (1 ไลก์ = 9 คุกกี้)
  if (targetRowIdx !== -1 && targetColIdx !== -1) {
    // บวก 1 (แถวเริ่มต้นลำดับที่ 1) และ บวก 1 (คอลัมน์เริ่มต้นลำดับที่ 1) เพื่อใช้กับ getRange
    var cell = rankingSheet.getRange(targetRowIdx + 1, targetColIdx + 1);
    var currentCookies = Number(cell.getValue()) || 0;
    
    // เงื่อนไข: ถ้าเป็นการกดไลก์บวก 9 คุกกี้, ถ้าเป็นการถอนไลก์ (Unlike) ให้ลบออก 9 คุกกี้
    var cookieChange = isLikedAction ? 9 : -9;
    
    // บันทึกค่าใหม่ลงช่องเดิมโดยไม่เปิดสูตรทับคะแนนอื่น
    cell.setValue(currentCookies + cookieChange);
  }
}

// 3. ฟังก์ชันดึงข้อมูลคลังตั๋ว (Inventory) เฉพาะของยูสเซอร์คนนั้น ๆ
function getInventoryProcess(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var invSheet = ss.getSheetByName("Inventory");
  if (!invSheet) return sendJsonResponse({status: "error", message: "ไม่พบแผ่นงาน Inventory ในระบบ"});
  
  var data = invSheet.getDataRange().getValues();
  if (data.length <= 1) return sendJsonResponse({status: "success", data: []}); // คลังว่างเปล่า
  
  var headers = data[0];
  var uIdx = headers.indexOf("Username"); // อิงตามหัวข้อตารางที่ระบบบันทึกไว้ใน buyTicketProcess
  if (uIdx === -1) uIdx = 1; // Fallback ไปคอลัมน์ที่ 2 ถ้าหาหัวตารางไม่เจอ
  
  var userInventory = [];
  
  // วนลูปอ่านข้อมูลข้ามแถวหัวตาราง (แถวที่ 0)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // กรองเอาเฉพาะข้อมูลตั๋วที่เป็นของ Username ที่เรียกเข้ามา
    if (row[uIdx] == username) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      userInventory.push(obj);
    }
  }
  
  // เรียงลำดับจากตั๋วที่ได้ล่าสุดขึ้นก่อน (Timestamp ใหม่สุด)
  userInventory.reverse();
  
  return sendJsonResponse({status: "success", data: userInventory});
}

function writeLog(u, action, target, amount) {
  try {
    let s = SS.getSheetByName("logs") || SS.insertSheet("logs");
    s.appendRow([new Date(), u, action, target, amount]);
  } catch (e) {
    Logger.log("ไม่สามารถบันทึก Log ได้: " + e.message);
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
