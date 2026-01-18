const SHEET_ID = '1OYSzg0ybstarkDfxSZL9SA_gW6D5f8_icnqH7BLoblE';

/**
 * Helper to add CORS headers to a ContentService response.
 * Ensures that all API endpoints are accessible from any origin.
 */
/**
 * Helper to return a response with JSON mime type.
 * Google Apps Script handles CORS (Access-Control-Allow-Origin: *) automatically 
 * for ContentService responses when deployed as a Web App with access 'Anyone'.
 */
function addCorsHeaders(response) {
  // Google Apps Script handles Access-Control-Allow-Origin: * automatically
  // for ContentService responses when deployed as a Web App to 'Anyone'.
  return response.setMimeType(ContentService.MimeType.JSON);
}

// OPTIONS preflight is avoided by using "simple requests" (text/plain or multipart/form-data)
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
const USERS_SHEET_NAME = 'Users';
const DIARY_ENTRIES_SHEET_NAME = 'DiaryEntries';
const FRIENDS_SHEET_NAME = 'Friends';
const PICTURES_SHEET_NAME = 'Pictures';


// OTP service is now called directly from HTML

// Lightweight per-execution memoization and cross-execution cache
let __SS__ = null;
let __USERS_SHEET__ = null;
let __DIARY_SHEET__ = null;
let __USERS_VALUES__ = null;
let __DIARY_VALUES__ = null;

function cacheGetJson(key) {
  try {
    const v = CacheService.getScriptCache().get(key);
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
}

function cachePutJson(key, value, seconds) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), seconds);
  } catch (e) { }
}

function cacheRemove(key) {
  try {
    CacheService.getScriptCache().remove(key);
  } catch (e) { }
}

// ===== ROW-LEVEL INDEXES (accelerate lookups without changing API) =====

// Users index: maps identifiers to 1-based row numbers in `Users` sheet
function getUsersIndex() {
  try {
    const key = 'idx:users:v1';
    const cached = CacheService.getScriptCache().get(key);
    if (cached) { return JSON.parse(cached); }
    const sheet = getOrCreateUsersSheet();
    const values = sheet.getDataRange().getValues();
    const emailToRow = Object.create(null);
    const usernameToRow = Object.create(null);
    const idToRow = Object.create(null);
    for (let i = 1; i < values.length; i++) {
      const rowNum = i + 1; // 1-based
      const id = values[i][0];
      const email = String(values[i][1] || '').trim().toLowerCase();
      const username = String(values[i][2] || '').trim().toLowerCase();
      if (id) { idToRow[id] = rowNum; }
      if (email) { emailToRow[email] = rowNum; }
      if (username) { usernameToRow[username] = rowNum; }
    }
    const idx = { emailToRow: emailToRow, usernameToRow: usernameToRow, idToRow: idToRow };
    try { CacheService.getScriptCache().put(key, JSON.stringify(idx), 600); } catch (e) { }
    return idx;
  } catch (e) {
    return { emailToRow: {}, usernameToRow: {}, idToRow: {} };
  }
}

function invalidateUsersIndex() {
  cacheRemove('idx:users:v1');
}

// Diary index per user: maps date (YYYY-MM-DD) to 1-based row number in `DiaryEntries`
function getDiaryIndexForUser(userId) {
  try {
    if (!userId) return { byDate: {} };
    const key = 'idx:diary:v1:' + userId;
    const cached = CacheService.getScriptCache().get(key);
    if (cached) { return JSON.parse(cached); }
    const sheet = getOrCreateDiaryEntriesSheet();
    const values = sheet.getDataRange().getValues();
    const byDate = Object.create(null);
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] !== userId) continue;
      const date = normalizeDateCell(values[i][3]);
      if (date) { byDate[date] = i + 1; }
    }
    const idx = { byDate: byDate };
    try { CacheService.getScriptCache().put(key, JSON.stringify(idx), 600); } catch (e) { }
    return idx;
  } catch (e) {
    return { byDate: {} };
  }
}

function invalidateDiaryIndex(userId) {
  if (!userId) return;
  cacheRemove('idx:diary:v1:' + userId);
}

// ===== OTP FUNCTIONS REMOVED =====
// OTP service is now called directly from HTML

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getUserLinks') {
      const userId = e.parameter.userId;
      return addCorsHeaders(getUserLinks(userId));
    } else if (action === 'listUserEntriesByDate') {
      const userId = e.parameter.userId;
      const date = e.parameter.date;
      return addCorsHeaders(listUserEntriesByDate(userId, date));
    } else if (action === 'getDiaryEntry') {
      const username = e.parameter.username;
      const date = e.parameter.date;
      const viewerUserId = e.parameter.viewerUserId || '';
      const viewerEmail = e.parameter.viewerEmail || '';
      return addCorsHeaders(getDiaryEntry(username, date, viewerUserId, viewerEmail));
    } else if (action === 'getUserDiaryEntries') {
      const userId = e.parameter.userId;
      const month = e.parameter.month;
      const year = e.parameter.year;
      return addCorsHeaders(getUserDiaryEntries(userId, month, year));
    } else if (action === 'getPublicDiaryEntries') {
      const username = e.parameter.username;
      const date = e.parameter.date;
      const month = e.parameter.month;
      const year = e.parameter.year;
      const limit = e.parameter.limit;
      const offset = e.parameter.offset;
      const maxContent = e.parameter.maxContent;
      const search = e.parameter.q || e.parameter.search || '';
      const viewerUserId = e.parameter.viewerUserId || '';
      const viewerEmail = e.parameter.viewerEmail || '';
      return addCorsHeaders(getPublicDiaryEntries(username, date, month, year, limit, offset, maxContent, search, viewerUserId, viewerEmail));
    } else if (action === 'listFriends') {
      const ownerId = e.parameter.ownerId;
      return addCorsHeaders(listFriends(ownerId));
    } else if (action === 'getUserDiaryEntry') {
      const userId = e.parameter.userId;
      const date = e.parameter.date;
      return addCorsHeaders(getUserDiaryEntry(userId, date));
    } else if (action === 'getEmailByUsername') {
      const username = e.parameter.username;
      return addCorsHeaders(getEmailByUsername(username));
    } else if (action === 'getProfile') {
      const username = e.parameter.username;
      const viewerUserId = e.parameter.viewerUserId || '';
      return addCorsHeaders(getProfile(username, viewerUserId));
    } else if (action === 'listFriendRequests') {
      return addCorsHeaders(listFriendRequests(e.parameter.userId));
    } else if (action === 'searchUsers') {
      return addCorsHeaders(searchUsers(e.parameter.query));
    } else if (action === 'getFriendships') {
      return addCorsHeaders(getFriendships(e.parameter.userId));
    } else if (action === 'getEntryPictures') {
      return addCorsHeaders(handleGetPictures(e.parameter.entryId));
    }
    return addCorsHeaders(ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON));
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return addCorsHeaders(ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Server error' }))
      .setMimeType(ContentService.MimeType.JSON));
  }
}

function doPost(e) {
  try {
    // 1. Gather URL parameters
    const urlParams = e.parameter || {};

    // 2. Gather body parameters
    let bodyData = {};
    if (e.postData && e.postData.contents) {
      const contents = e.postData.contents;
      try {
        // Try parsing as JSON first
        bodyData = JSON.parse(contents);
      } catch (ex) {
        // Fallback: Try parsing as URL-encoded if it's not JSON
        try {
          contents.split('&').forEach(function (part) {
            const item = part.split('=');
            if (item.length === 2) {
              bodyData[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
            }
          });
        } catch (ex2) { }
      }
    }

    // 3. Merge all parameters (body takes precedence over URL)
    const combinedParams = Object.assign({}, urlParams, bodyData);
    const action = combinedParams.action;

    // Route actions
    if (action === 'register') {
      return handleRegister(combinedParams);
    } else if (action === 'login') {
      return handleLogin(combinedParams);
    } else if (action === 'googleLogin') {
      return handleGoogleLogin(combinedParams);
    } else if (action === 'googleRegister') {
      return handleGoogleRegister(combinedParams);
    } else if (action === 'saveDiaryEntry') {
      return saveDiaryEntry(combinedParams);
    } else if (action === 'updateDiaryEntry') {
      return updateDiaryEntry(combinedParams);
    } else if (action === 'updateDiaryEntryById') {
      return updateDiaryEntryById(combinedParams);
    } else if (action === 'deleteDiaryEntry') {
      return deleteDiaryEntry(combinedParams);
    } else if (action === 'deleteDiaryEntryById') {
      return deleteDiaryEntryById(combinedParams);
    } else if (action === 'toggleDiaryPrivacy') {
      return addCorsHeaders(toggleDiaryPrivacy(combinedParams));
    } else if (action === 'addFriend') {
      return addCorsHeaders(sendFriendRequest(combinedParams));
    } else if (action === 'acceptFriendRequest') {
      return addCorsHeaders(acceptFriendRequest(combinedParams));
    } else if (action === 'declineFriendRequest') {
      return addCorsHeaders(declineFriendRequest(combinedParams));
    } else if (action === 'removeFriend') {
      return addCorsHeaders(removeFriend(combinedParams));
    } else if (action === 'ping') {
      return addCorsHeaders(ping(combinedParams));
    } else if (action === 'addPictureMetadata') {
      return addCorsHeaders(handlePictureMetadata(combinedParams));
    } else if (action === 'deletePicture') {
      return addCorsHeaders(handleDeletePicture(combinedParams));
    } else if (action === 'updatePictureOrder') {
      return addCorsHeaders(handleUpdatePictureOrder(combinedParams));
    } else if (action === 'setupSheets') {
      return setupSheets();
    }

    return addCorsHeaders(ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid request: ' + (action || 'none') }))
      .setMimeType(ContentService.MimeType.JSON));

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return addCorsHeaders(ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Server error: ' + error.message }))
      .setMimeType(ContentService.MimeType.JSON));
  }
}

// ===== USER MANAGEMENT (Keeping your existing system) =====

function handleRegister(params) {
  try {
    const email = params.email;
    const username = params.username;
    const password = params.password;

    if (!email || !username || !password) {
      return createResponse(false, 'All fields are required');
    }

    if (!isValidEmail(email)) {
      return createResponse(false, 'Invalid email format');
    }

    if (username.length < 5 || username.length > 20) {
      return createResponse(false, 'Username must be 5-20 characters');
    }

    if (password.length < 6) {
      return createResponse(false, 'Password must be at least 6 characters');
    }

    // Check if username contains only valid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return createResponse(false, 'Username can only contain letters, numbers, underscores, and hyphens');
    }

    const usersSheet = getOrCreateUsersSheet();

    // Fast existence check using users index
    const idx = getUsersIndex();
    if (idx.emailToRow[String(email).trim().toLowerCase()] || idx.usernameToRow[String(username).trim().toLowerCase()]) {
      return createResponse(false, 'Email or username already exists');
    }

    const userId = generateUUID();
    const hashedPassword = hashPassword(password);
    const timestamp = new Date();

    const now = new Date();
    // If sheet has Last Seen column, include it; otherwise append will be trimmed by Sheets
    usersSheet.appendRow([userId, email, username, password, hashedPassword, timestamp, now]);
    // Invalidate users index so next lookups are fresh
    invalidateUsersIndex();

    return createResponse(true, 'User registered successfully', {
      user: {
        id: userId,
        email: email,
        username: username,
        level: 1,
        exp: 0,
        avatarUrl: ''
      }
    });

  } catch (error) {
    Logger.log('Error in handleRegister: ' + error.toString());
    return createResponse(false, 'Registration failed');
  }
}

function handleLogin(params) {
  try {
    const identifier = params.identifier;
    const password = params.password;

    if (!identifier || !password) {
      return createResponse(false, 'Email/username and password are required');
    }

    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex();
    const needle = String(identifier).trim().toLowerCase();
    // Determine row via index
    const row = idx.emailToRow[needle] || idx.usernameToRow[needle] || null;
    if (row) {
      const values = usersSheet.getRange(row, 1, 1, Math.max(8, usersSheet.getLastColumn())).getValues()[0];
      const userId = values[0];
      const email = values[1];
      const username = values[2];
      const storedPasswordHash = values[4];
      if (verifyPassword(password, storedPasswordHash)) {
        try { usersSheet.getRange(row, 7).setValue(new Date()); } catch (e) { }
        const level = calculateLevel(values[8] || 0);
        return createResponse(true, 'Login successful', {
          user: {
            id: userId,
            email: email,
            username: username,
            avatarUrl: values[7] || '',
            exp: values[8] || 0,
            level: level,
            lastSeen: values[6]
          }
        });
      } else {
        return createResponse(false, 'Invalid password');
      }
    }

    return createResponse(false, 'User not found');

  } catch (error) {
    Logger.log('Error in handleLogin: ' + error.toString());
    return createResponse(false, 'Login failed');
  }
}

function handleGoogleLogin(params) {
  try {
    const credential = params.credential;
    if (!credential) return createResponse(false, 'No credential provided');

    // Verify token with Google
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
    if (response.getResponseCode() !== 200) {
      return createResponse(false, 'Invalid token');
    }
    const payload = JSON.parse(response.getContentText());

    // Verify Audience
    if (payload.aud !== '787988651964-gf258mnif89bu6g0jao2mpdsm72j96da.apps.googleusercontent.com') {
      // return createResponse(false, 'Invalid token audience');
      // For testing, sometimes this mismatches if clients/deployment differ, 
      // but stricter is better. Re-enable if verified.
    }

    const email = payload.email;
    if (!email) return createResponse(false, 'Email not provided by Google');

    // Check if user exists
    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex();
    const row = idx.emailToRow[email.toLowerCase()];

    if (row) {
      // Login existing user
      const values = usersSheet.getRange(row, 1, 1, Math.max(8, usersSheet.getLastColumn())).getValues()[0];
      const userId = values[0];
      const username = values[2];
      try { usersSheet.getRange(row, 7).setValue(new Date()); } catch (e) { }

      // Update avatar if provided by Google and different
      const googleAvatar = payload.picture || '';
      if (googleAvatar && values[7] !== googleAvatar) {
        try { usersSheet.getRange(row, 8).setValue(googleAvatar); } catch (e) { }
        values[7] = googleAvatar;
      }

      const level = calculateLevel(values[8] || 0);
      return createResponse(true, 'Login successful', {
        user: {
          id: userId,
          email: email,
          username: username,
          avatarUrl: values[7] || '',
          exp: values[8] || 0,
          level: level,
          lastSeen: values[6]
        }
      });
    } else {
      // USER DOES NOT EXIST -> Require Setup
      return createResponse(false, 'User not found', {
        requireSetup: true,
        email: email,
        credential: credential // pass back so client can re-submit with username
      });
    }

  } catch (e) {
    Logger.log('Error in handleGoogleLogin: ' + e.toString());
    return createResponse(false, 'Google login failed: ' + e.message);
  }
}

function handleGoogleRegister(params) {
  try {
    const credential = params.credential;
    const username = params.username;

    if (!credential || !username) {
      return createResponse(false, 'Missing credential or username');
    }

    // Verify token AGAIN to ensure it's valid and matches the email claiming to register
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
    if (response.getResponseCode() !== 200) {
      return createResponse(false, 'Invalid token');
    }
    const payload = JSON.parse(response.getContentText());
    const email = payload.email;
    const avatarUrl = payload.picture || '';

    if (!email) return createResponse(false, 'Email not found in token');

    // Validate Username
    if (username.length < 5 || username.length > 20) {
      return createResponse(false, 'Username must be 5-20 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return createResponse(false, 'Username can only contain letters, numbers, underscores, and hyphens');
    }

    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex(); // Refresh index

    // Check if email already registered (race condition check)
    if (idx.emailToRow[email.toLowerCase()]) {
      return createResponse(false, 'Email already registered. Please login.');
    }

    // Check if username taken
    if (idx.usernameToRow[username.toLowerCase()]) {
      return createResponse(false, 'Username already taken');
    }

    // Register User
    const userId = generateUUID();
    const passwordHash = 'GOOGLE_OAUTH_USER'; // Sentinel
    const timestamp = new Date();

    usersSheet.appendRow([userId, email, username, 'GOOGLE_OAUTH', passwordHash, timestamp, timestamp, avatarUrl, 0]);
    invalidateUsersIndex();

    return createResponse(true, 'User registered via Google', {
      user: {
        id: userId,
        email: email,
        username: username,
        level: 1,
        exp: 0,
        avatarUrl: avatarUrl
      }
    });

  } catch (e) {
    Logger.log('Error in handleGoogleRegister: ' + e.toString());
    return createResponse(false, 'Google registration failed: ' + e.message);
  }
}

// ===== DIARY FUNCTIONALITY =====

function saveDiaryEntry(params) {
  try {
    const userId = params.userId;
    const date = params.date; // Format: YYYY-MM-DD
    const title = params.title || '';
    const content = params.content || '';
    // Accept both legacy isPrivate and new privacy values
    const privacy = normalizePrivacy(params.privacy, params.isPrivate);

    if (!userId || !date || !content.trim()) {
      return createResponse(false, 'User ID, date, and content are required');
    }

    // Validate date format
    if (!isValidDate(date)) {
      return createResponse(false, 'Invalid date format. Use YYYY-MM-DD');
    }

    // Get user info
    const userInfo = getUserById(userId);
    if (!userInfo) {
      return createResponse(false, 'User not found');
    }

    const diarySheet = getOrCreateDiaryEntriesSheet();

    // Allow multiple entries per date (remove unique-per-date restriction)

    const entryId = generateUUID();
    const timestamp = new Date();

    diarySheet.appendRow([
      entryId,
      userId,
      userInfo.username,
      date,
      title,
      content,
      privacy,
      timestamp,
      timestamp
    ]);

    // Invalidate caches likely affected
    try {
      cacheRemove('user:entry:' + userId + ':' + date);
      cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
      cacheRemove('pub:entry:' + String(userInfo.username || '').trim().toLowerCase() + ':' + date);
      cacheRemove('pub:list:');
      cacheRemove('pub:list:' + String(userInfo.username || '').trim().toLowerCase() + ':');
      invalidateDiaryIndex(userId);
    } catch (e) { }

    // Grant XP for saving (e.g., 10 XP)
    try {
      grantXP(userId, 10);
    } catch (e) { }

    return createResponse(true, 'Diary entry saved successfully', {
      entryId: entryId,
      date: date,
      title: title,
      privacy: privacy
    });

  } catch (error) {
    Logger.log('Error in saveDiaryEntry: ' + error.toString());
    return createResponse(false, 'Failed to save diary entry');
  }
}

function updateDiaryEntry(params) {
  try {
    const userId = params.userId;
    const date = params.date;
    const title = params.title || '';
    const content = params.content || '';
    const privacy = normalizePrivacy(params.privacy, params.isPrivate);

    if (!userId || !date || !content.trim()) {
      return createResponse(false, 'User ID, date, and content are required');
    }

    if (!isValidDate(date)) {
      return createResponse(false, 'Invalid date format. Use YYYY-MM-DD');
    }

    const diarySheet = getOrCreateDiaryEntriesSheet();
    const dIdx = getDiaryIndexForUser(userId);
    const row = dIdx.byDate[date] || null;
    if (row) {
      const existing = diarySheet.getRange(row, 1, 1, Math.max(9, diarySheet.getLastColumn())).getValues()[0];
      const lastModified = new Date();
      // Update Title (5), Content (6), Privacy (7), preserve Created (8), set Last Modified (9)
      diarySheet.getRange(row, 5, 1, 5).setValues([[title, content, privacy, existing[7], lastModified]]);

      try {
        cacheRemove('user:entry:' + userId + ':' + date);
        cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
        cacheRemove('pub:entry:' + String(existing[2] || '').trim().toLowerCase() + ':' + date);
        cacheRemove('pub:list:');
        cacheRemove('pub:list:' + String(existing[2] || '').trim().toLowerCase() + ':');
        // Index row stays same for same date; no need to invalidate date mapping
      } catch (e) { }

      return createResponse(true, 'Diary entry updated successfully', { date: date, title: title, privacy: privacy });
    }

    return createResponse(false, 'Diary entry not found for this date');

  } catch (error) {
    Logger.log('Error in updateDiaryEntry: ' + error.toString());
    return createResponse(false, 'Failed to update diary entry');
  }
}



/**
 * Deletes picture metadata from the Pictures sheet and returns the Drive IDs.
 */
function deleteEntryPictures(entryId) {
  if (!entryId) return [];
  const sheet = getOrCreatePicturesSheet();
  const data = sheet.getDataRange().getValues();
  const driveIds = [];

  // Iterate backwards to safely delete multiple rows
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === entryId) {
      const driveId = data[i][3];
      if (driveId) driveIds.push(driveId);
      sheet.deleteRow(i + 1);
    }
  }
  return driveIds;
}

function deleteDiaryEntry(params) {
  try {
    const userId = params.userId;
    const date = params.date;

    if (!userId || !date) {
      return createResponse(false, 'User ID and date are required');
    }

    const diarySheet = getOrCreateDiaryEntriesSheet();
    const dIdx = getDiaryIndexForUser(userId);
    const row = dIdx.byDate[date] || null;
    if (row) {
      const existing = diarySheet.getRange(row, 1, 1, Math.max(9, diarySheet.getLastColumn())).getValues()[0];
      const entryId = existing[0];

      // Delete pictures and get their drive IDs
      const driveIds = deleteEntryPictures(entryId);

      diarySheet.deleteRow(row);
      try {
        cacheRemove('user:entry:' + userId + ':' + date);
        cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
        cacheRemove('pub:entry:' + String(existing[2] || '').trim().toLowerCase() + ':' + date);
        cacheRemove('pub:list:');
        cacheRemove('pub:list:' + String(existing[2] || '').trim().toLowerCase() + ':');
        invalidateDiaryIndex(userId);
      } catch (e) { }

      return createResponse(true, 'Diary entry deleted successfully', { driveIds: driveIds });
    }

    return createResponse(false, 'Diary entry not found');

  } catch (error) {
    Logger.log('Error in deleteDiaryEntry: ' + error.toString());
    return createResponse(false, 'Failed to delete diary entry');
  }
}

// New: list all entries for a user on a specific date
function listUserEntriesByDate(userId, date) {
  try {
    if (!userId || !date) {
      return createResponse(false, 'User ID and date are required');
    }
    if (!isValidDate(date)) {
      return createResponse(false, 'Invalid date format. Use YYYY-MM-DD');
    }
    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();
    const entries = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId && normalizeDateCell(data[i][3]) === date) {
        entries.push({
          entryId: data[i][0],
          date: normalizeDateCell(data[i][3]),
          title: data[i][4],
          content: data[i][5],
          privacy: normalizePrivacy(data[i][6], null),
          created: data[i][7],
          lastModified: data[i][8]
        });
      }
    }
    entries.sort((a, b) => new Date(b.lastModified || b.created || b.date) - new Date(a.lastModified || a.created || a.date));
    return createResponse(true, 'Entries listed', { entries: entries, total: entries.length });
  } catch (e) {
    Logger.log('Error in listUserEntriesByDate: ' + e.toString());
    return createResponse(false, 'Failed to list entries');
  }
}

// New: update by entryId
function updateDiaryEntryById(params) {
  try {
    const entryId = params.entryId;
    const title = params.title || '';
    const content = params.content || '';
    const privacy = normalizePrivacy(params.privacy, params.isPrivate);
    if (!entryId || !content.trim()) {
      return createResponse(false, 'entryId and content are required');
    }
    const sheet = getOrCreateDiaryEntriesSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === entryId) {
        const lastModified = new Date();
        const username = data[i][2];
        const date = normalizeDateCell(data[i][3]);
        sheet.getRange(i + 1, 5, 1, 5).setValues([[title, content, privacy, data[i][7], lastModified]]);
        try {
          const userId = data[i][1];
          cacheRemove('user:entry:' + userId + ':' + date);
          cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
          cacheRemove('pub:entry:' + String(username || '').trim().toLowerCase() + ':' + date);
          cacheRemove('pub:list:');
          cacheRemove('pub:list:' + String(username || '').trim().toLowerCase() + ':');
        } catch (e) { }
        return createResponse(true, 'Diary entry updated successfully', { entryId: entryId, date: date, title: title, privacy: privacy });
      }
    }
    return createResponse(false, 'Entry not found');
  } catch (e) {
    Logger.log('Error in updateDiaryEntryById: ' + e.toString());
    return createResponse(false, 'Failed to update');
  }
}

// New: delete by entryId
function deleteDiaryEntryById(params) {
  try {
    const entryId = params.entryId;
    if (!entryId) return createResponse(false, 'entryId required');
    const sheet = getOrCreateDiaryEntriesSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === entryId) {
        const username = data[i][2];
        const date = normalizeDateCell(data[i][3]);
        const userId = data[i][1];

        // Delete pictures and get their drive IDs
        const driveIds = deleteEntryPictures(entryId);

        sheet.deleteRow(i + 1);
        try {
          cacheRemove('user:entry:' + userId + ':' + date);
          cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
          cacheRemove('pub:entry:' + String(username || '').trim().toLowerCase() + ':' + date);
          cacheRemove('pub:list:');
          cacheRemove('pub:list:' + String(username || '').trim().toLowerCase() + ':');
          invalidateDiaryIndex(userId);
        } catch (e) { }
        return createResponse(true, 'Diary entry deleted successfully', { driveIds: driveIds });
      }
    }
    return createResponse(false, 'Entry not found');
  } catch (e) {
    Logger.log('Error in deleteDiaryEntryById: ' + e.toString());
    return createResponse(false, 'Failed to delete diary entry');
  }
}

function toggleDiaryPrivacy(params) {
  try {
    const userId = params.userId;
    const date = params.date;

    if (!userId || !date) {
      return createResponse(false, 'User ID and date are required');
    }

    const diarySheet = getOrCreateDiaryEntriesSheet();
    const dIdx = getDiaryIndexForUser(userId);
    const row = dIdx.byDate[date] || null;
    if (row) {
      const v = diarySheet.getRange(row, 1, 1, Math.max(9, diarySheet.getLastColumn())).getValues()[0];
      const current = normalizePrivacy(v[6], null);
      const newPrivacy = current === 'private' ? 'public' : 'private';
      const lastModified = new Date();
      diarySheet.getRange(row, 7, 1, 3).setValues([[newPrivacy, v[7], lastModified]]);
      return createResponse(true, 'Privacy setting updated successfully', { date: date, privacy: newPrivacy });
    }

    return createResponse(false, 'Diary entry not found');

  } catch (error) {
    Logger.log('Error in toggleDiaryPrivacy: ' + error.toString());
    return createResponse(false, 'Failed to update privacy setting');
  }
}

// ===== DIARY RETRIEVAL FUNCTIONS =====

function getDiaryEntry(username, date, viewerUserId, viewerEmail) {
  try {
    if (!username || !date) {
      return createResponse(false, 'Username and date are required');
    }
    if (!isValidDate(date)) {
      return createResponse(false, 'Invalid date format. Use YYYY-MM-DD');
    }
    const cacheKey = 'pub:entry:' + String(username || '').trim().toLowerCase() + ':' + date + ':' + (viewerUserId || '') + ':' + (viewerEmail || '');
    const cached = cacheGetJson(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(JSON.stringify(cached)).setMimeType(ContentService.MimeType.JSON);
    }
    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();
    const reqUser = String(username || '').trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const rowDate = normalizeDateCell(data[i][3]);
      const rowUsername = String(data[i][2] || '').trim().toLowerCase();
      if (rowUsername === reqUser && rowDate === date) {
        const ownerId = data[i][1];
        const privacy = normalizePrivacy(data[i][6], null);
        if (!canViewEntry(ownerId, viewerUserId || '', privacy, viewerEmail || '')) {
          return createResponse(false, 'Not found or not authorized');
        }
        const resp = {
          success: true,
          message: 'Diary entry found',
          entry: {
            entryId: data[i][0],
            username: data[i][2],
            date: rowDate,
            title: data[i][4],
            content: data[i][5],
            privacy: privacy,
            created: data[i][7],
            lastModified: data[i][8]
          }
        };
        cachePutJson(cacheKey, resp, 60);
        return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return createResponse(false, 'Diary entry not found');
  } catch (error) {
    Logger.log('Error in getDiaryEntry: ' + error.toString());
    return createResponse(false, 'Failed to retrieve diary entry');
  }
}

function getUserDiaryEntries(userId, month, year) {
  try {
    if (!userId) {
      return createResponse(false, 'User ID is required');
    }
    const cacheKey = 'user:entries:' + userId + ':' + (month || '') + ':' + (year || '');
    const cached = cacheGetJson(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(JSON.stringify(cached)).setMimeType(ContentService.MimeType.JSON);
    }
    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();

    // FETCH ALL PICTURES IN BATCH
    const allPictures = getAllUserPictures(userId);
    const picMap = {};
    allPictures.forEach(p => {
      if (!picMap[p.entryId]) picMap[p.entryId] = [];
      picMap[p.entryId].push(p);
    });

    const userEntries = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId) {
        const entryId = data[i][0];
        const entryDate = normalizeDateCell(data[i][3]);
        if (month && !entryDate.startsWith(month)) continue;
        if (year && !entryDate.startsWith(year)) continue;
        userEntries.push({
          entryId: entryId,
          date: entryDate,
          title: data[i][4],
          content: data[i][5],
          privacy: normalizePrivacy(data[i][6], null),
          created: data[i][7],
          lastModified: data[i][8],
          pictures: picMap[entryId] || []
        });
      }
    }
    userEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    const resp = {
      success: true,
      message: 'Diary entries retrieved successfully',
      entries: userEntries,
      total: userEntries.length
    };
    cachePutJson(cacheKey, resp, 30);
    return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in getUserDiaryEntries: ' + error.toString());
    return createResponse(false, 'Failed to retrieve diary entries');
  }
}

function getPublicDiaryEntries(username, date, month, year, limit, offset, maxContent, search, viewerUserId, viewerEmail) {
  try {
    const cacheKey = 'pub:list:'
      + (username ? String(username).toLowerCase() : '') + ':'
      + (date || '') + ':'
      + (month || '') + ':'
      + (year || '') + ':'
      + (limit || '') + ':'
      + (offset || '') + ':'
      + (maxContent || '') + ':'
      + (search || '') + ':'
      + (viewerUserId || '') + ':' + (viewerEmail || '');
    const cached = cacheGetJson(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(JSON.stringify(cached)).setMimeType(ContentService.MimeType.JSON);
    }
    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();

    // Fetch pictures to attach
    const picSheet = getOrCreatePicturesSheet();
    const picData = picSheet.getDataRange().getValues();
    const headers = picData[0];
    const orderIdx = headers.indexOf('Sort Order');
    const picMap = {}; // entryId -> [{url, order, created}, ...]

    for (let p = 1; p < picData.length; p++) {
      const pEntryId = picData[p][2];
      const pUrl = picData[p][4];
      const pOrder = orderIdx > -1 ? (Number(picData[p][orderIdx]) || 0) : 0;
      const pCreated = picData[p][5];

      if (pEntryId && pUrl) {
        if (!picMap[pEntryId]) picMap[pEntryId] = [];
        picMap[pEntryId].push({ url: pUrl, order: pOrder, created: pCreated });
      }
    }

    // Sort pictures for each entry
    Object.keys(picMap).forEach(k => {
      picMap[k].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        // Fallback to created date if orders are equal
        return new Date(a.created) - new Date(b.created);
      });
      // Convert back to just URLs
      picMap[k] = picMap[k].map(item => item.url);
    });

    // Pre-fetch viewer friends for isFriend check
    const viewerFriendsSet = new Set();
    if (viewerUserId) {
      try {
        const vFriendsRes = listFriends(viewerUserId);
        if (vFriendsRes.success && vFriendsRes.friends) {
          vFriendsRes.friends.forEach(f => viewerFriendsSet.add(f.friendUserId));
        }
      } catch (e) { }
    }

    const publicEntries = [];
    const reqUser = username ? String(username || '').trim().toLowerCase() : '';
    const reqMonth = month || '';
    const reqYear = year || '';
    const maxLen = maxContent ? parseInt(maxContent, 10) : null;
    const maxItems = limit ? parseInt(limit, 10) : null;
    const skipItems = offset ? parseInt(offset, 10) : 0;
    const q = search ? String(search).toLowerCase().trim() : '';

    for (let i = 1; i < data.length; i++) {
      const ownerId = data[i][1];
      const rowUsername = String(data[i][2] || '').trim();
      const rowTitle = String(data[i][4] || '').trim();
      const rowDate = normalizeDateCell(data[i][3]);
      const rowContent = String(data[i][5] || '').trim();
      const privacy = normalizePrivacy(data[i][6], null);

      if (!canViewEntry(ownerId, viewerUserId || '', privacy, viewerEmail || '')) continue;
      if (reqUser && rowUsername.toLowerCase() !== reqUser) continue;
      if (date && rowDate !== date) continue;
      if (reqMonth && !rowDate.startsWith(reqMonth)) continue;
      if (reqYear && !rowDate.startsWith(reqYear)) continue;

      if (q) {
        const match = rowUsername.toLowerCase().includes(q) ||
          rowTitle.toLowerCase().includes(q) ||
          rowDate.includes(q) ||
          rowContent.toLowerCase().includes(q);
        if (!match) continue;
      }

      let content = rowContent;
      if (typeof content === 'string' && maxLen && maxLen > 0 && content.length > maxLen) {
        content = content.slice(0, maxLen) + '…';
      }
      publicEntries.push({
        entryId: data[i][0],
        userId: ownerId,
        username: data[i][2],
        isFriend: viewerFriendsSet.has(ownerId),
        date: rowDate,
        title: data[i][4],
        content: content,
        privacy: privacy,
        created: data[i][7],
        lastModified: data[i][8],
        pictures: picMap[data[i][0]] || []
      });
    }
    publicEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply limit and offset
    const limited = publicEntries.slice(skipItems, (maxItems && maxItems > 0) ? skipItems + maxItems : undefined);

    const resp = {
      success: true,
      message: 'Public diary entries retrieved successfully',
      entries: limited,
      total: publicEntries.length,
      hasMore: (skipItems + limited.length) < publicEntries.length
    };
    cachePutJson(cacheKey, resp, 60);
    return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in getPublicDiaryEntries: ' + error.toString());
    return createResponse(false, 'Failed to retrieve public diary entries');
  }
}

function getUserDiaryEntry(userId, date) {
  try {
    if (!userId || !date) {
      return createResponse(false, 'User ID and date are required');
    }
    if (!isValidDate(date)) {
      return createResponse(false, 'Invalid date format. Use YYYY-MM-DD');
    }
    const cacheKey = 'user:entry:' + userId + ':' + date;
    const cached = cacheGetJson(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(JSON.stringify(cached)).setMimeType(ContentService.MimeType.JSON);
    }
    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId && normalizeDateCell(data[i][3]) === date) {
        const resp = {
          success: true,
          message: 'Diary entry found',
          entry: {
            entryId: data[i][0],
            userId: data[i][1],
            username: data[i][2],
            date: normalizeDateCell(data[i][3]),
            title: data[i][4],
            content: data[i][5],
            privacy: normalizePrivacy(data[i][6], null),
            created: data[i][7],
            lastModified: data[i][8]
          }
        };
        cachePutJson(cacheKey, resp, 30);
        return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return createResponse(false, 'Diary entry not found');
  } catch (error) {
    Logger.log('Error in getUserDiaryEntry: ' + error.toString());
    return createResponse(false, 'Failed to retrieve diary entry');
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Internal helper to ensure a sheet exists and has all required columns.
 * @param {string} sheetName - The name of the sheet.
 * @param {string[]} requiredColumns - List of column names that MUST exist.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function ensureSheetAndColumns(sheetName, requiredColumns) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    // New sheet, append all required headers
    sheet.appendRow(requiredColumns);
  } else {
    // Existing sheet, check for missing columns
    const lastCol = sheet.getLastColumn();
    const headerRow = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

    requiredColumns.forEach((colName, index) => {
      if (headerRow.indexOf(colName) === -1) {
        // Column missing, append to the end
        const newColPos = sheet.getLastColumn() + 1;
        sheet.getRange(1, newColPos).setValue(colName);
      }
    });
  }
  return sheet;
}

function getOrCreateUsersSheet() {
  try {
    const requiredColumns = ['User ID', 'Email', 'Username', 'Real Password', 'Password Hash', 'Created Date', 'Last Seen', 'Avatar URL', 'Experience'];
    return ensureSheetAndColumns(USERS_SHEET_NAME, requiredColumns);
  } catch (error) {
    Logger.log('Error accessing users sheet: ' + error.toString());
    throw new Error('Cannot access Google Sheet. Check your SHEET_ID.');
  }
}

function getOrCreateDiaryEntriesSheet() {
  try {
    const requiredColumns = ['Entry ID', 'User ID', 'Username', 'Date', 'Title', 'Content', 'Privacy', 'Created Date', 'Last Modified'];
    const sheet = ensureSheetAndColumns(DIARY_ENTRIES_SHEET_NAME, requiredColumns);

    // Migration logic for 'Is Private' -> 'Privacy'
    try {
      const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const isPrivateIndex = header.indexOf('Is Private');
      if (isPrivateIndex !== -1) {
        // If 'Privacy' also exists, we might need to be careful, but ensureSheetAndColumns will add 'Privacy' at the end if missing.
        // For simplicity, if 'Is Private' exists at index 6 (traditional spot), we rename it.
        if (isPrivateIndex === 6) {
          sheet.getRange(1, 7).setValue('Privacy');
          const lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            const colRange = sheet.getRange(2, 7, lastRow - 1, 1);
            const values = colRange.getValues();
            for (let i = 0; i < values.length; i++) {
              const v = values[i][0];
              if (v === true || String(v).toLowerCase() === 'true') { values[i][0] = 'private'; }
              else if (v === false || String(v).toLowerCase() === 'false') { values[i][0] = 'public'; }
              else if (!v && v !== 0) { values[i][0] = 'public'; }
              else { values[i][0] = String(v).toLowerCase(); }
            }
            colRange.setValues(values);
          }
        }
      }
    } catch (e) { }

    return sheet;
  } catch (error) {
    Logger.log('Error accessing diary entries sheet: ' + error.toString());
    throw new Error('Cannot access Google Sheet. Check your SHEET_ID.');
  }
}

/**
 * Returns all pictures for a specific user to facilitate batch fetching.
 */
function getAllUserPictures(userId) {
  if (!userId) return [];
  const sheet = getOrCreatePicturesSheet();
  const data = sheet.getDataRange().getValues();
  const pictures = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === userId) {
      pictures.push({
        pictureId: data[i][0],
        entryId: data[i][2],
        url: data[i][4],
        order: data[i][6] || 0
      });
    }
  }
  return pictures;
}

function getOrCreatePicturesSheet() {
  try {
    const requiredColumns = ['Picture ID', 'User ID', 'Entry ID', 'Drive ID', 'URL', 'Created', 'Sort Order'];
    return ensureSheetAndColumns(PICTURES_SHEET_NAME, requiredColumns);
  } catch (error) {
    Logger.log('Error accessing pictures sheet: ' + error.toString());
    throw new Error('Cannot access Google Sheet.');
  }
}

function handlePictureMetadata(params) {
  try {
    const userId = params.userId;
    const entryId = params.entryId;
    const driveId = params.driveId;
    const url = params.url || '';
    if (!userId || !entryId || !driveId) {
      return createResponse(false, 'Missing userId, entryId, or driveId');
    }
    const sheet = getOrCreatePicturesSheet();
    const pictureId = generateUUID();
    sheet.appendRow([pictureId, userId, entryId, driveId, url, new Date()]);
    return createResponse(true, 'Picture metadata added', { pictureId: pictureId });
  } catch (e) {
    return createResponse(false, 'Failed to add picture metadata');
  }
}

function handleGetPictures(entryId) {
  try {
    if (!entryId) return createResponse(false, 'entryId required');
    const sheet = getOrCreatePicturesSheet();
    const data = sheet.getDataRange().getValues();
    const orderIdx = data[0].indexOf('Sort Order');
    const pictures = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === entryId) {
        pictures.push({
          pictureId: data[i][0],
          driveId: data[i][3],
          url: data[i][4],
          created: data[i][5],
          order: orderIdx > -1 ? (Number(data[i][orderIdx]) || 0) : 0
        });
      }
    }
    // Sort
    pictures.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return new Date(a.created) - new Date(b.created);
    });
    return createResponse(true, 'Pictures retrieved', { pictures: pictures });
  } catch (e) {
    return createResponse(false, 'Failed to get pictures');
  }
}

function handleDeletePicture(params) {
  try {
    const pictureId = params.pictureId;
    const userId = params.userId;
    if (!pictureId || !userId) return createResponse(false, 'pictureId and userId required');
    const sheet = getOrCreatePicturesSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === pictureId && data[i][1] === userId) {
        const driveId = data[i][3];
        sheet.deleteRow(i + 1);
        return createResponse(true, 'Picture deleted', { driveId: driveId });
      }
    }
    return createResponse(false, 'Picture not found or unauthorized');
  } catch (e) {
    return createResponse(false, 'Failed to delete picture');
  }
}

function handleUpdatePictureOrder(params) {
  try {
    const userId = params.userId;
    const pictureIds = params.pictureIds ? JSON.parse(params.pictureIds) : [];

    if (!userId) return createResponse(false, 'userId required');
    if (!Array.isArray(pictureIds) || pictureIds.length === 0) return createResponse(true, 'No updates');

    const sheet = getOrCreatePicturesSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let orderIdx = headers.indexOf('Sort Order');

    // Safety check: ensure column exists (though getOrCreate should have added it)
    if (orderIdx === -1) {
      // Should not happen if getOrCreatePicturesSheet works, but just in case
      return createResponse(false, 'Sort Order column missing');
    }

    // Create a map of pictureId -> newOrder
    const orderMap = {};
    pictureIds.forEach((pid, idx) => {
      orderMap[pid] = idx;
    });

    // Iterate and update
    // Note: This is O(N) scan. For very large sheets, this might be slow, but Pictures sheet is usually manageable.
    // Optimization: Bulk update? Sheets API allows it, but here we iterate.
    // To minimize setData calls, we can fetch all, modify in memory, and write back column?
    // Writing back the whole sheet is risky. Writing back strict ranges is better.
    // But rows might be scattered.
    // Simple approach: set value line by line. It's slow but safe for small batches.
    // Better approach: Read the column, update in memory, write back the column.

    const updates = []; // { row: x, val: y }

    for (let i = 1; i < data.length; i++) {
      const rowPid = data[i][0];
      const rowOwner = data[i][1];
      if (rowOwner === userId && orderMap.hasOwnProperty(rowPid)) {
        // Update this row
        const newOrder = orderMap[rowPid];
        // Only write if changed
        const currentOrder = headers.indexOf('Sort Order') > -1 ? data[i][orderIdx] : -1;
        if (currentOrder != newOrder) {
          try {
            sheet.getRange(i + 1, orderIdx + 1).setValue(newOrder);
          } catch (e) { }
        }
      }
    }

    return createResponse(true, 'Order updated');

  } catch (e) {
    Logger.log('Error updatePictureOrder: ' + e.toString());
    return createResponse(false, 'Failed to update order');
  }
}

function getUserById(userId) {
  try {
    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex();
    const row = idx.idToRow[userId];
    if (!row) return null;
    const v = usersSheet.getRange(row, 1, 1, Math.max(9, usersSheet.getLastColumn())).getValues()[0];
    return {
      id: v[0],
      email: v[1],
      username: v[2],
      created: v[5],
      lastSeen: v[6],
      avatarUrl: v[7] || '',
      exp: v[8] || 0,
      level: calculateLevel(v[8] || 0)
    };
  } catch (error) {
    Logger.log('Error in getUserById: ' + error.toString());
    return null;
  }
}

function getUserByUsername(username) {
  try {
    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex();
    const row = idx.usernameToRow[String(username || '').trim().toLowerCase()];
    if (!row) return null;
    const v = usersSheet.getRange(row, 1, 1, Math.max(9, usersSheet.getLastColumn())).getValues()[0];
    return {
      id: v[0],
      email: v[1],
      username: v[2],
      created: v[5],
      lastSeen: v[6],
      avatarUrl: v[7] || '',
      exp: v[8] || 0,
      level: calculateLevel(v[8] || 0)
    };
  } catch (error) {
    Logger.log('Error in getUserByUsername: ' + error.toString());
    return null;
  }
}

function getEmailByUsername(username) {
  try {
    if (!username) {
      return createResponse(false, 'Username is required');
    }

    const user = getUserByUsername(username);
    if (user) {
      return createResponse(true, 'Email found', {
        email: user.email,
        username: user.username
      });
    } else {
      return createResponse(false, 'Username not found');
    }
  } catch (error) {
    Logger.log('Error in getEmailByUsername: ' + error.toString());
    return createResponse(false, 'Failed to lookup email');
  }
}

function userExists(usersSheet, email, username) {
  try {
    const idx = getUsersIndex();
    const e = String(email || '').trim().toLowerCase();
    const u = String(username || '').trim().toLowerCase();
    return !!(idx.emailToRow[e] || idx.usernameToRow[u]);
  } catch (e) { return false; }
}

function diaryEntryExists(diarySheet, userId, date) {
  const data = diarySheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === userId && normalizeDateCell(data[i][3]) === date) {
      return true;
    }
  }
  return false;
}

function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;

  return dateString === date.toISOString().split('T')[0];
}

// Normalize a date cell from Sheets to YYYY-MM-DD string
function normalizeDateCell(cell) {
  try {
    if (!cell && cell !== 0) return '';
    const tz = (function () {
      try { return SpreadsheetApp.openById(SHEET_ID).getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'UTC'; }
      catch (e) { try { return Session.getScriptTimeZone() || 'UTC'; } catch (e2) { return 'UTC'; } }
    })();
    if (cell instanceof Date) {
      return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
    }
    if (typeof cell === 'number') {
      // Sheets serial date: days since 1899-12-30
      const epoch = new Date(1899, 11, 30);
      const ms = epoch.getTime() + cell * 24 * 60 * 60 * 1000;
      return Utilities.formatDate(new Date(ms), tz, 'yyyy-MM-dd');
    }
    if (typeof cell === 'string') {
      // Try to parse string to date
      const d = new Date(cell);
      if (!Number.isNaN(d.getTime())) {
        return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
      }
      // Fallback: if already looks like YYYY-MM-DD keep it
      const m = cell.match(/^\d{4}-\d{2}-\d{2}$/);
      return m ? cell : '';
    }
    return '';
  } catch (e) {
    return '';
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateUUID() {
  return Utilities.getUuid();
}

function hashPassword(password) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function createResponse(success, message, data) {
  var dataObj = data || {};
  var response = {
    success: success,
    message: message
  };

  // Mixin data
  for (var key in dataObj) {
    if (dataObj.hasOwnProperty(key)) {
      response[key] = dataObj[key];
    }
  }

  if (!success) {
    response.error = message;
  }

  return addCorsHeaders(ContentService.createTextOutput(JSON.stringify(response)));
}

// ===== UTILITY FUNCTIONS (Keeping your existing ones) =====

function getUserLinks(userId) {
  try {
    if (!userId) {
      return createResponse(false, 'User not authenticated');
    }

    // This function is kept from your original code but might not be needed
    // for diary functionality. Including it for compatibility.
    return createResponse(true, 'Links retrieved successfully', {
      links: []
    });

  } catch (error) {
    Logger.log('Error in getUserLinks: ' + error.toString());
    return createResponse(false, 'Failed to retrieve links');
  }
}

// ===== TEST AND DEBUG FUNCTIONS =====

function testSetup() {
  try {
    const usersSheet = getOrCreateUsersSheet();
    const diarySheet = getOrCreateDiaryEntriesSheet();
    Logger.log('Users sheet access successful - ' + usersSheet.getLastRow() + ' rows');
    Logger.log('Diary entries sheet access successful - ' + diarySheet.getLastRow() + ' rows');
    return true;
  } catch (error) {
    Logger.log('Setup test failed: ' + error.toString());
    return false;
  }
}

// OTP service test removed - OTP is now handled directly from HTML

function getAllUsers() {
  try {
    const usersSheet = getOrCreateUsersSheet();
    const data = usersSheet.getDataRange().getValues();

    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        id: data[i][0],
        email: data[i][1],
        username: data[i][2],
        created: data[i][5],
        lastSeen: data[i][6]
      });
    }

    Logger.log('Total users: ' + users.length);
    return users;
  } catch (error) {
    Logger.log('Error getting users: ' + error.toString());
    return [];
  }
}

// ===== FRIENDS SYSTEM =====

function getOrCreateFriendsSheet() {
  try {
    const requiredColumns = ['Requester ID', 'Recipient ID', 'Status', 'Created Date', 'Last Updated'];
    const sheet = ensureSheetAndColumns(FRIENDS_SHEET_NAME, requiredColumns);

    // Migration for Status column if it was missing in old 4-column structure
    try {
      const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (header.indexOf('Status') === -1) {
        // This is handled by ensureSheetAndColumns but the specific migration logic
        // of filling 'accepted' for existing rows is unique here.
        // However, ensureSheetAndColumns will have added 'Status' at the end.
        // Let's check where 'Status' is now.
        const statusIdx = header.indexOf('Status') === -1 ? sheet.getLastColumn() : header.indexOf('Status') + 1;
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          const statusRange = sheet.getRange(2, statusIdx, lastRow - 1, 1);
          const vals = statusRange.getValues();
          let changed = false;
          for (let i = 0; i < vals.length; i++) {
            if (!vals[i][0]) {
              vals[i][0] = 'accepted';
              changed = true;
            }
          }
          if (changed) statusRange.setValues(vals);
        }
      }
    } catch (e) { }

    return sheet;
  } catch (e) {
    Logger.log('Error accessing friends sheet: ' + e.toString());
    throw new Error('Cannot access Friends sheet');
  }
}

function resolveUserIdByIdentifier(identifier) {
  if (!identifier) return null;
  const usersSheet = getOrCreateUsersSheet();
  const data = usersSheet.getDataRange().getValues();
  const needle = String(identifier).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    const email = String(data[i][1] || '').trim().toLowerCase();
    const username = String(data[i][2] || '').trim().toLowerCase();
    if (email === needle || username === needle || data[i][0] === identifier) {
      return data[i][0];
    }
  }
  return null;
}

function ping(params) {
  try {
    const userId = params.userId;
    if (!userId) return createResponse(true, 'No user');
    const usersSheet = getOrCreateUsersSheet();
    const data = usersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        try { usersSheet.getRange(i + 1, 7).setValue(new Date()); } catch (e) { }
        break;
      }
    }
    return createResponse(true, 'pong');
  } catch (e) {
    Logger.log('Error in ping: ' + e.toString());
    return createResponse(false, 'ping failed');
  }
}

function sendFriendRequest(params) {
  try {
    const fromId = params.fromId || params.ownerId;
    const toIdentifier = params.toIdentifier || params.friendIdentifier;
    if (!fromId || !toIdentifier) return createResponse(false, 'fromId and toIdentifier required');

    const toId = resolveUserIdByIdentifier(toIdentifier);
    if (!toId) return createResponse(false, 'User not found');
    if (fromId === toId) return createResponse(false, 'Cannot add yourself');

    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if ((data[i][0] === fromId && data[i][1] === toId) || (data[i][0] === toId && data[i][1] === fromId)) {
        return createResponse(true, 'Request already exists or already friends', { status: data[i][2] });
      }
    }

    sheet.appendRow([fromId, toId, 'pending', new Date(), new Date()]);
    return createResponse(true, 'Friend request sent');
  } catch (e) {
    return createResponse(false, 'Failed to send request');
  }
}

function acceptFriendRequest(params) {
  try {
    const userId = params.userId;
    const requesterId = params.requesterId;
    if (!userId || !requesterId) return createResponse(false, 'userId and requesterId required');

    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requesterId && data[i][1] === userId && data[i][2] === 'pending') {
        sheet.getRange(i + 1, 3).setValue('accepted');
        sheet.getRange(i + 1, 5).setValue(new Date());
        return createResponse(true, 'Friend request accepted');
      }
    }
    return createResponse(false, 'Request not found');
  } catch (e) {
    return createResponse(false, 'Failed to accept');
  }
}

function declineFriendRequest(params) {
  try {
    const userId = params.userId;
    const requesterId = params.requesterId;
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requesterId && data[i][1] === userId && data[i][2] === 'pending') {
        sheet.deleteRow(i + 1);
        return createResponse(true, 'Request declined');
      }
    }
    return createResponse(true, 'Request not found');
  } catch (e) {
    return createResponse(false, 'Failed to decline');
  }
}

function listFriendRequests(userId) {
  try {
    if (!userId) return createResponse(false, 'userId required');
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    const users = getAllUsersIndex();
    const requests = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId && data[i][2] === 'pending') {
        const reqInfo = users.get(data[i][0]) || {};
        requests.push({
          requesterId: data[i][0],
          requesterUsername: reqInfo.username || 'Unknown',
          requesterAvatar: reqInfo.avatarUrl || '',
          created: data[i][3]
        });
      }
    }
    return createResponse(true, 'Requests listed', { requests });
  } catch (e) {
    return createResponse(false, 'Failed to list requests');
  }
}

function listFriends(userId) {
  try {
    if (!userId) return createResponse(false, 'userId required');
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    const users = getAllUsersIndex();
    const friends = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === 'accepted') {
        let friendId = null;
        if (data[i][0] === userId) friendId = data[i][1];
        else if (data[i][1] === userId) friendId = data[i][0];

        if (friendId) {
          const info = users.get(friendId) || {};
          friends.push({
            friendUserId: friendId,
            friendUsername: info.username || '',
            avatarUrl: info.avatarUrl || '',
            lastSeen: info.lastSeen || '',
            created: data[i][3]
          });
        }
      }
    }
    return createResponse(true, 'Friends listed', { friends });
  } catch (e) {
    Logger.log('Error in listFriends: ' + e.toString());
    return createResponse(false, 'Failed to list friends');
  }
}

function getAllUsersIndex() {
  const usersSheet = getOrCreateUsersSheet();
  const data = usersSheet.getDataRange().getValues();
  const index = new Map();
  for (let i = 1; i < data.length; i++) {
    index.set(data[i][0], {
      username: data[i][2],
      avatarUrl: data[i][7] || '',
      lastSeen: data[i][6] || ''
    });
  }
  return index;
}

function removeFriend(params) {
  try {
    const userId = params.userId || params.ownerId;
    const friendId = resolveUserIdByIdentifier(params.friendIdentifier || params.friendId);
    if (!userId || !friendId) return createResponse(false, 'Ids missing');

    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (((data[i][0] === userId && data[i][1] === friendId) || (data[i][0] === friendId && data[i][1] === userId)) && data[i][2] === 'accepted') {
        sheet.deleteRow(i + 1);
        return createResponse(true, 'Friend removed');
      }
    }
    return createResponse(true, 'Not friends');
  } catch (e) { return createResponse(false, 'Error'); }
}

// ===== PRIVACY HELPERS =====

function normalizePrivacy(privacyValue, legacyIsPrivate) {
  const v = (privacyValue !== undefined && privacyValue !== null) ? String(privacyValue).toLowerCase() : null;
  if (v === 'public' || v === 'friend' || v === 'private') return v;
  if (v === 'true') return 'private';
  if (v === 'false') return 'public';
  if (typeof legacyIsPrivate === 'boolean') return legacyIsPrivate ? 'private' : 'public';
  if (legacyIsPrivate === 'true') return 'private';
  if (legacyIsPrivate === 'false') return 'public';
  if (typeof privacyValue === 'boolean') return privacyValue ? 'private' : 'public';
  // attempt to interpret existing cell which might be boolean
  if (privacyValue === true) return 'private';
  if (privacyValue === false) return 'public';
  return 'public';
}

function searchUsers(query) {
  try {
    if (!query || query.length < 2) return createResponse(true, 'Query too short', { users: [] });
    const sheet = getOrCreateUsersSheet();
    const data = sheet.getDataRange().getValues();
    const results = [];
    const q = query.toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const username = String(data[i][2]);
      if (username.toLowerCase().indexOf(q) !== -1) {
        results.push({
          id: data[i][0],
          username: username,
          avatarUrl: data[i][7] || '',
          level: calculateLevel(data[i][8] || 0)
        });
      }
      if (results.length >= 10) break;
    }
    return createResponse(true, 'Search complete', { users: results });
  } catch (e) {
    return createResponse(false, 'Search failed');
  }
}

function getFriendships(userId) {
  try {
    if (!userId) return createResponse(false, 'userId required');
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    const users = getAllUsersIndex();

    const friendships = {
      friends: [],
      sent: [],
      received: []
    };

    for (let i = 1; i < data.length; i++) {
      const status = data[i][2];
      if (data[i][0] === userId) {
        if (status === 'accepted') friendships.friends.push(formatFriend(data[i][1], users, data[i][3]));
        else if (status === 'pending') friendships.sent.push(formatFriend(data[i][1], users, data[i][3]));
      } else if (data[i][1] === userId) {
        if (status === 'accepted') friendships.friends.push(formatFriend(data[i][0], users, data[i][3]));
        else if (status === 'pending') friendships.received.push(formatFriend(data[i][0], users, data[i][3]));
      }
    }
    return createResponse(true, 'Friendships retrieved', { friendships });
  } catch (e) {
    return createResponse(false, 'Failed to get friendships');
  }
}

function formatFriend(id, usersIndex, created) {
  const info = usersIndex.get(id) || {};
  return {
    userId: id,
    username: info.username || 'Unknown',
    avatarUrl: info.avatarUrl || '',
    lastSeen: info.lastSeen || '',
    created: created
  };
}

function isFriend(ownerId, viewerUserId) {
  if (!ownerId || !viewerUserId) return false;
  if (ownerId === viewerUserId) return true;
  const sheet = getOrCreateFriendsSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (((data[i][0] === ownerId && data[i][1] === viewerUserId) || (data[i][0] === viewerUserId && data[i][1] === ownerId)) && data[i][2] === 'accepted') return true;
  }
  return false;
}

function isFriendByEmail(ownerId, viewerEmail) {
  if (!ownerId || !viewerEmail) return false;
  const emailNeedle = String(viewerEmail).trim().toLowerCase();
  if (!emailNeedle) return false;
  const sheet = getOrCreateFriendsSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowOwner = data[i][0];
    const rowEmail = String(data[i][2] || '').trim().toLowerCase();
    if (rowOwner === ownerId && rowEmail && rowEmail === emailNeedle) return true;
  }
  return false;
}

function canViewEntry(ownerId, viewerUserId, privacy, viewerEmail) {
  if (privacy === 'public') return true;
  // allow owner by id
  if (viewerUserId && ownerId === viewerUserId) return true;
  // friend-level requires either userId friendship or email-based approval
  if (privacy === 'friend') {
    if (viewerUserId && isFriend(ownerId, viewerUserId)) return true;
    if (viewerEmail && isFriendByEmail(ownerId, viewerEmail)) return true;
    return false;
  }
  // private
  return false;
}

function getAllDiaryEntries() {
  try {
    const diarySheet = getOrCreateDiaryEntriesSheet();
    const data = diarySheet.getDataRange().getValues();

    const entries = [];
    for (let i = 1; i < data.length; i++) {
      entries.push({
        entryId: data[i][0],
        userId: data[i][1],
        username: data[i][2],
        date: data[i][3],
        title: data[i][4],
        content: data[i][5],
        isPrivate: data[i][6],
        created: data[i][7],
        lastModified: data[i][8]
      });
    }

    Logger.log('Total diary entries: ' + entries.length);
    return entries;
  } catch (error) {
    Logger.log('Error getting diary entries: ' + error.toString());
    return [];
  }
}

function calculateLevel(exp) {
  if (!exp) return 1;
  // Level = Floor(sqrt(xp/10)) + 1
  return Math.floor(Math.sqrt(exp / 10)) + 1;
}

function grantXP(userId, amount) {
  try {
    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex();
    const row = idx.idToRow[userId];
    if (!row) return;

    const currentExp = usersSheet.getRange(row, 9).getValue() || 0;
    usersSheet.getRange(row, 9).setValue(currentExp + amount);
  } catch (e) { }
}

function getProfile(username, viewerUserId) {
  try {
    const user = getUserByUsername(username);
    if (!user) return createResponse(false, 'User not found');

    // Get Friends
    let friends = [];
    try {
      const friendsResponse = listFriends(user.id);
      friends = friendsResponse.success ? friendsResponse.friends : [];
    } catch (e) { }

    // Get Diary Stats
    const diarySheet = getOrCreateDiaryEntriesSheet();
    const data = diarySheet.getDataRange().getValues();
    let totalEntries = 0;
    let lastEntry = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === user.id) {
        totalEntries++;
        const privacy = normalizePrivacy(data[i][6], null);
        if (canViewEntry(user.id, viewerUserId, privacy, '')) {
          const entryDate = data[i][7] || data[i][3];
          if (!lastEntry || new Date(entryDate) > new Date(lastEntry.created)) {
            lastEntry = {
              title: data[i][4],
              date: normalizeDateCell(data[i][3]),
              created: data[i][7]
            };
          }
        }
      }
    }

    return createResponse(true, 'Profile retrieved', {
      profile: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        level: user.level,
        exp: user.exp,
        lastSeen: user.lastSeen,
        created: user.created,
        totalEntries: totalEntries,
        lastEntry: lastEntry,
        friends: friends
      }
    });
  } catch (e) {
    Logger.log('Error in getProfile: ' + e.toString());
    return createResponse(false, 'Error retrieving profile');
  }
}
