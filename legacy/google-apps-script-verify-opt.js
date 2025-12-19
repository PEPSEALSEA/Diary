/****************************************************
 * CONFIGURATION
 ****************************************************/
const SHEET_ID      = '1sXTKSM3jvbj9lz4lNNq_uOazGRQyHhO4IcuQOfZpIeI';
const SHEET_NAME    = 'OTP';
const EMAIL_QUEUE_SHEET = 'EmailQueue'; // New sheet for tracking email deletions
const DELETION_LOG_SHEET = 'EmailDeletionLog'; // New sheet for deletion logs
const EXPIRATION_MIN = 10;
const EMAIL_DELETE_AFTER_HOURS = 1; // Delete emails after 1 hour

// Secret key for salting OTP (store this safely)
const OTP_SECRET = 'k3+Y8xUebmQV08akNsfXxt6l0SA7MaiMrjPuoyozHqo=';

// Timezone handling - use UTC consistently
function getCurrentUTCTime() {
  return new Date();
}

function addMinutesToUTCTime(minutes) {
  var now = getCurrentUTCTime();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

function addHoursToUTCTime(hours) {
  var now = getCurrentUTCTime();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/****************************************************
 * Helper: Generate unique message token for email
 ****************************************************/
function generateMessageToken() {
  return Utilities.getUuid();
}

/****************************************************
 * Helper: Hash OTP using SHA-256 + secret salt
 ****************************************************/
function hashOtp(otp) {
  try {
    // Use a more reliable method to create the hash
    var input = OTP_SECRET + otp;
    var raw = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      input
    );
    
    // Convert to hex string more reliably
    var hexString = '';
    for (var i = 0; i < raw.length; i++) {
      var byte = raw[i];
      if (byte < 0) {
        byte = byte + 256;
      }
      var hex = byte.toString(16);
      if (hex.length === 1) {
        hex = '0' + hex;
      }
      hexString += hex;
    }
    
    Logger.log('Hash input: ' + input + ', output: ' + hexString);
    return hexString;
  } catch (error) {
    Logger.log('Error in hashOtp: ' + error.toString());
    throw error;
  }
}

/****************************************************
 * Log email deletion to sheet
 ****************************************************/
function logEmailDeletion(email, username, sentTime, deletionTime, messageId) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var logSheet = ss.getSheetByName(DELETION_LOG_SHEET);
    
    // Create sheet if it doesn't exist
    if (!logSheet) {
      logSheet = ss.insertSheet(DELETION_LOG_SHEET);
      logSheet.appendRow([
        'Email', 
        'Username', 
        'Sent DateTime', 
        'Deletion DateTime', 
        'Hours Until Deletion',
        'Message ID',
        'Status'
      ]);
    }
    
    // Calculate hours between sent and deletion
    var hoursUntilDeletion = (deletionTime.getTime() - sentTime.getTime()) / (1000 * 60 * 60);
    
    logSheet.appendRow([
      email,
      username,
      sentTime.toISOString(),
      deletionTime.toISOString(),
      hoursUntilDeletion.toFixed(2),
      messageId || 'N/A',
      'Deleted'
    ]);
    
    Logger.log('Email deletion logged for: ' + email + ' at ' + deletionTime.toISOString());
  } catch (error) {
    Logger.log('Error logging email deletion: ' + error.toString());
  }
}

/****************************************************
 * Delete emails older than specified hours
 ****************************************************/
function deleteOldEmails() {
  try {
    Logger.log('=== Starting Email Deletion Process ===');
    
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(EMAIL_QUEUE_SHEET);
    if (!sheet) {
      Logger.log('EmailQueue sheet not found');
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No EmailQueue data found');
      return;
    }

    var currentTime = getCurrentUTCTime();
    Logger.log('Current time: ' + currentTime.toISOString());

    // We'll search per-record using a unique token embedded in the email body

    var deletionCount = 0;
    var rowsToKeep = [data[0]]; // Keep header

    // Check each row in the EmailQueue sheet (skip header)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var email = row[0];
      var username = row[1];
      var createdAt = new Date(row[2]); // CreatedAt column in EmailQueue
      var messageToken = row[3]; // MessageToken column in EmailQueue
      
      // Calculate hours since creation
      var hoursSinceCreation = (currentTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      // Check if this email is old enough to delete (older than EMAIL_DELETE_AFTER_HOURS)
      if (hoursSinceCreation >= EMAIL_DELETE_AFTER_HOURS) {
        Logger.log('Processing deletion for email sent to: ' + email + ' at ' + createdAt.toISOString() + ' (' + hoursSinceCreation.toFixed(2) + ' hours ago)');
        
        // Prefer deletion by unique token when available; fallback to time-window matching
        var emailDeleted = false;
        var messageId = null;
        
        if (messageToken && typeof messageToken === 'string' && messageToken.length > 0) {
          try {
            var query = 'subject:"OTP สำหรับการสมัครระบบ Diary" ' + '"' + messageToken + '"';
            var tokenThreads = GmailApp.search(query, 0, 50);
            Logger.log('Token search for ' + email + ' found ' + tokenThreads.length + ' threads using query: ' + query);
            for (var tj = 0; tj < tokenThreads.length && !emailDeleted; tj++) {
              var tMessages = tokenThreads[tj].getMessages();
              for (var tk = 0; tk < tMessages.length; tk++) {
                var tMsg = tMessages[tk];
                var toHeader = tMsg.getTo();
                var bodyText = tMsg.getPlainBody();
                if (toHeader && toHeader.indexOf(email) !== -1 && bodyText && bodyText.indexOf(messageToken) !== -1) {
                  messageId = tMsg.getId();
                  tMsg.moveToTrash();
                  emailDeleted = true;
                  deletionCount++;
                  Logger.log('Email deleted by token for: ' + email + ', Message ID: ' + messageId);
                  logEmailDeletion(email, username, createdAt, currentTime, messageId);
                  break;
                }
              }
            }
          } catch (tokenErr) {
            Logger.log('Error deleting by token for ' + email + ': ' + tokenErr.toString());
          }
        }
        
        if (!emailDeleted) {
          // Fallback: search by subject and time proximity
          var fallbackThreads = GmailApp.search('subject:"OTP สำหรับการสมัครระบบ Diary"', 0, 200);
          for (var j = 0; j < fallbackThreads.length && !emailDeleted; j++) {
            var messages = fallbackThreads[j].getMessages();
            for (var k = 0; k < messages.length; k++) {
              var message = messages[k];
              var messageTo = message.getTo();
              var messageDate = message.getDate();
              var timeDiff = Math.abs(messageDate.getTime() - createdAt.getTime());
              if (messageTo.includes(email) && timeDiff <= 5 * 60 * 1000) {
                try {
                  messageId = message.getId();
                  message.moveToTrash();
                  emailDeleted = true;
                  deletionCount++;
                  Logger.log('Email deleted by fallback for: ' + email);
                  logEmailDeletion(email, username, createdAt, currentTime, messageId);
                  break;
                } catch (deleteError) {
                  Logger.log('Error deleting email for ' + email + ': ' + deleteError.toString());
                }
              }
            }
          }
        }
        
        if (!emailDeleted) {
          Logger.log('No matching email found to delete for: ' + email);
          // Still log the attempt
          logEmailDeletion(email, username, createdAt, currentTime, 'Email not found');
        }
        
        // Don't keep this row (similar to cleanupExpiredOtps)
        // Row is deleted from sheet after email is processed
        
      } else {
        // Keep this row if email is not old enough to delete
        rowsToKeep.push(row);
      }
    }
    
    // Update the sheet to remove processed rows (similar to cleanupExpiredOtps)
    if (rowsToKeep.length < data.length) {
      sheet.clear();
      if (rowsToKeep.length > 0) {
        sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
      }
      Logger.log('Cleaned up ' + (data.length - rowsToKeep.length) + ' processed email records from sheet');
    }
    
    Logger.log('Email deletion process completed. Deleted ' + deletionCount + ' emails.');
    
  } catch (error) {
    Logger.log('Error in deleteOldEmails: ' + error.toString());
  }
}

/****************************************************
 * Setup automatic email deletion trigger - same as OTP cleanup
 ****************************************************/
function setupEmailDeletionTrigger() {
  try {
    // Delete existing triggers for this function
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'deleteOldEmails') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    
    // Create new trigger to run every hour (same frequency as OTP cleanup)
    ScriptApp.newTrigger('deleteOldEmails')
      .timeBased()
      .everyHours(1)
      .create();
    
    Logger.log('Email deletion trigger setup successfully - will run every hour (same as OTP cleanup)');
  } catch (error) {
    Logger.log('Error setting up email deletion trigger: ' + error.toString());
  }
}

/****************************************************
 * Generate a 6-digit OTP, store hashed, and email it
 ****************************************************/
function sendOtp(email, username) {
  try {
    // Validate input parameters
    if (!email || email === 'undefined' || !username || username === 'undefined') {
      Logger.log('Invalid parameters in sendOtp - email: ' + email + ', username: ' + username);
      throw new Error('Email and username are required');
    }
    
    // 1. Generate random 6-digit OTP
    var otp = ('000000' + Math.floor(Math.random() * 1000000)).slice(-6);
    var hashedOtp = hashOtp(otp);
    var messageToken = generateMessageToken();
    
    Logger.log('Generated OTP for ' + email + ': ' + otp + ' (hashed: ' + hashedOtp + ')');

    // 2. Calculate expiration - use consistent UTC handling
    var now = getCurrentUTCTime();
    var expireAt = addMinutesToUTCTime(EXPIRATION_MIN);
    Logger.log('Current time: ' + now + ' (UTC: ' + now.toISOString() + ')');
    Logger.log('OTP expires at: ' + expireAt + ' (UTC: ' + expireAt.toISOString() + ')');

    // 3. Open sheet and append record
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    var emailQueue = ss.getSheetByName(EMAIL_QUEUE_SHEET);
    if (!emailQueue) emailQueue = ss.insertSheet(EMAIL_QUEUE_SHEET);

    // Ensure OTP header includes MessageToken column (migrate if needed)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Email', 'Username', 'OTP_Hash', 'ExpireAt', 'CreatedAt', 'MessageToken']);
    } else {
      try {
        var headerValues = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (headerValues.length < 6) {
          var newHeader = ['Email', 'Username', 'OTP_Hash', 'ExpireAt', 'CreatedAt', 'MessageToken'];
          sheet.getRange(1, 1, 1, newHeader.length).setValues([newHeader]);
        }
      } catch (headerErr) {
        Logger.log('Header check/update error: ' + headerErr.toString());
      }
    }
    sheet.appendRow([email, username, hashedOtp, expireAt, now, messageToken]);

    // Ensure EmailQueue header and append record (Email, Username, CreatedAt, MessageToken)
    if (emailQueue.getLastRow() === 0) {
      emailQueue.appendRow(['Email', 'Username', 'CreatedAt', 'MessageToken']);
    }
    emailQueue.appendRow([email, username, now, messageToken]);
    Logger.log('OTP record added to sheet for ' + email);

    // 4. Send email with plain OTP
    var subject = "OTP สำหรับการสมัครระบบ Diary";
    var htmlBody =
      'สวัสดีคุณ <b>' + username + '</b><br><br>' +
      'คุณได้สมัครระบบ <b>Diary</b> ของเว็บไซต์ ' +
      '<a href="https://pepsealsea.github.io/Diary/" target="_blank">' +
      'https://pepsealsea.github.io/Diary/</a><br><br>' +
      'นี่คือรหัส <b>OTP</b> ของคุณ:<br>' +
      '<div style="font-size:28px;font-weight:bold;color:#2c3e50;">' + otp + '</div><br>' +
      'รหัสนี้จะหมดอายุภายใน <b>' + EXPIRATION_MIN + ' นาที</b><br><br>' +
      '<small style="color:#7f8c8d;">หมายเหตุ: อีเมลนี้จะถูกลบอัตโนมัติหลังจาก ' + EMAIL_DELETE_AFTER_HOURS + ' ชั่วโมง</small><br>' +
      '<small style="color:#7f8c8d;">Token: ' + messageToken + '</small>';

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    
    Logger.log('OTP email sent to ' + email + ' with deletion notice');
  } catch (error) {
    Logger.log('Error in sendOtp: ' + error.toString());
    throw error;
  }
}

/****************************************************
 * Verify an OTP against stored hashed records
 ****************************************************/
function verifyOtp(email, userInputOtp) {
  try {
    Logger.log('=== Starting OTP Verification ===');
    Logger.log('Email: ' + email + ', Input OTP: ' + userInputOtp);
    
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      Logger.log('OTP sheet not found');
      return false;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('No OTP data found');
      return false;
    }

    var hashedInput = hashOtp(userInputOtp);
    Logger.log('Hashed input OTP: ' + hashedInput);
    Logger.log('Total rows in sheet: ' + data.length);

    // Check all OTPs for this email, starting from most recent
    var currentTime = getCurrentUTCTime();
    Logger.log('Current verification time: ' + currentTime + ' (UTC: ' + currentTime.toISOString() + ')');
    
    for (var i = data.length - 1; i > 0; i--) {
      var row = data[i];
      var rowEmail = row[0];
      var storedHash = row[2];
      var expireTime = new Date(row[3]);
      
      Logger.log('Checking row ' + i + ': email=' + rowEmail + ', storedHash=' + storedHash);
      Logger.log('Stored expire time: ' + expireTime + ' (UTC: ' + expireTime.toISOString() + ')');
      Logger.log('Time difference (ms): ' + (currentTime.getTime() - expireTime.getTime()));
      
      if (rowEmail === email) {
        Logger.log('Found matching email in row ' + i);
        if (currentTime.getTime() > expireTime.getTime()) {
          Logger.log('OTP expired for email: ' + email + ' (current: ' + currentTime.toISOString() + ', expire: ' + expireTime.toISOString() + ')');
          continue; // Check next OTP instead of returning false immediately
        }
        
        Logger.log('Comparing hashes: stored=' + storedHash + ', input=' + hashedInput);
        if (storedHash === hashedInput) {
          Logger.log('OTP verified successfully for email: ' + email);
          return true;
        } else {
          Logger.log('OTP hash mismatch for email: ' + email + ' (stored: ' + storedHash + ', input: ' + hashedInput + ')');
        }
      }
    }
    
    Logger.log('No valid OTP found for email: ' + email);
    return false;
  } catch (error) {
    Logger.log('Error in verifyOtp: ' + error.toString());
    return false;
  }
}

/****************************************************
 * Optional: Cleanup expired OTPs (call via trigger)
 ****************************************************/
function cleanupExpiredOtps() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var now = getCurrentUTCTime();
  var rowsToKeep = [data[0]]; // header

  for (var i = 1; i < data.length; i++) {
    var expireTime = new Date(data[i][3]);
    if (expireTime.getTime() > now.getTime()) rowsToKeep.push(data[i]);
  }

  sheet.clear();
  sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
}

/****************************************************
 * Web Service Handlers
 ****************************************************/
function doGet(e) {
  try {
    var action = e.parameter.action;
    
    Logger.log('doGet called with parameters: ' + JSON.stringify(e.parameter));
    
    if (action === 'sendOtp') {
      var email = e.parameter.email;
      var username = e.parameter.username;
      Logger.log('sendOtp request - email: ' + email + ', username: ' + username);
      return sendOtpResponse(email, username);
    } else if (action === 'verifyOtp') {
      var email = e.parameter.email;
      var otp = e.parameter.otp;
      Logger.log('verifyOtp request - email: ' + email + ', otp: ' + otp);
      return verifyOtpResponse(email, otp);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Invalid request'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Server error'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var action = e.parameter.action;
    
    Logger.log('doPost called with parameters: ' + JSON.stringify(e.parameter));
    
    if (action === 'sendOtp') {
      var email = e.parameter.email;
      var username = e.parameter.username;
      Logger.log('sendOtp request - email: ' + email + ', username: ' + username);
      return sendOtpResponse(email, username);
    } else if (action === 'verifyOtp') {
      var email = e.parameter.email;
      var otp = e.parameter.otp;
      Logger.log('verifyOtp request - email: ' + email + ', otp: ' + otp);
      return verifyOtpResponse(email, otp);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Invalid request'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Server error'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/****************************************************
 * Response handlers for web service
 ****************************************************/
function sendOtpResponse(email, username) {
  try {
    Logger.log('sendOtpResponse called with email: ' + email + ', username: ' + username);
    
    if (!email || email === 'undefined' || !username || username === 'undefined') {
      Logger.log('Missing or invalid email/username in sendOtpResponse - email: ' + email + ', username: ' + username);
      return createOtpResponse(false, 'Email and username are required');
    }
    
    sendOtp(email, username);
    Logger.log('OTP sent successfully to ' + email);
    return createOtpResponse(true, 'OTP sent successfully');
    
  } catch (error) {
    Logger.log('Error in sendOtpResponse: ' + error.toString());
    return createOtpResponse(false, 'Failed to send OTP: ' + error.toString());
  }
}

function verifyOtpResponse(email, userInputOtp) {
  try {
    Logger.log('verifyOtpResponse called with email: ' + email + ', otp: ' + userInputOtp);
    
    if (!email || email === 'undefined' || !userInputOtp || userInputOtp === 'undefined') {
      Logger.log('Missing or invalid email/OTP in verifyOtpResponse - email: ' + email + ', otp: ' + userInputOtp);
      return createOtpResponse(false, 'Email and OTP are required');
    }
    
    var isValid = verifyOtp(email, userInputOtp);
    
    if (isValid) {
      Logger.log('OTP verification successful for email: ' + email);
      return createOtpResponse(true, 'OTP verified successfully');
    } else {
      Logger.log('OTP verification failed for email: ' + email);
      return createOtpResponse(false, 'Invalid or expired OTP');
    }
    
  } catch (error) {
    Logger.log('Error in verifyOtpResponse: ' + error.toString());
    return createOtpResponse(false, 'Failed to verify OTP');
  }
}

function createOtpResponse(success, message) {
  var response = {
    success: success,
    message: message
  };
  
  if (!success) {
    response.error = message;
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/****************************************************
 * Test function to debug OTP service
 ****************************************************/
function testOtpService() {
  try {
    Logger.log('=== Testing OTP Service ===');
    
    // Test data
    var testEmail = 'test@example.com';
    var testUsername = 'testuser';
    var testOtp = '123456';
    
    Logger.log('1. Testing hashOtp function...');
    var hash1 = hashOtp('123456');
    var hash2 = hashOtp('123456');
    Logger.log('Hash of 123456 (first): ' + hash1);
    Logger.log('Hash of 123456 (second): ' + hash2);
    Logger.log('Hashes match: ' + (hash1 === hash2));
    
    Logger.log('2. Testing sendOtp...');
    sendOtp(testEmail, testUsername);
    Logger.log('Send OTP completed');
    
    Logger.log('3. Testing verifyOtp with correct OTP...');
    var result1 = verifyOtp(testEmail, testOtp);
    Logger.log('Verify correct OTP result: ' + result1);
    
    Logger.log('4. Testing verifyOtp with wrong OTP...');
    var result2 = verifyOtp(testEmail, '999999');
    Logger.log('Verify wrong OTP result: ' + result2);
    
    Logger.log('5. Testing verifyOtpResponse...');
    var response = verifyOtpResponse(testEmail, testOtp);
    Logger.log('verifyOtpResponse result: ' + response.getContentText());
    
    Logger.log('=== OTP Service Test Complete ===');
    return true;
  } catch (error) {
    Logger.log('Error in testOtpService: ' + error.toString());
    return false;
  }
}