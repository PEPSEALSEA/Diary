const SHEET_ID = '1OYSzg0ybstarkDfxSZL9SA_gW6D5f8_icnqH7BLoblE';
const USERS_SHEET_NAME = 'Users';
const DIARY_ENTRIES_SHEET_NAME = 'DiaryEntries';
const FRIENDS_SHEET_NAME = 'Friends';

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
      return getUserLinks(userId);
    } else if (action === 'listUserEntriesByDate') {
      const userId = e.parameter.userId;
      const date = e.parameter.date;
      return listUserEntriesByDate(userId, date);
    } else if (action === 'getDiaryEntry') {
      const username = e.parameter.username;
      const date = e.parameter.date;
      const viewerUserId = e.parameter.viewerUserId || '';
      const viewerEmail = e.parameter.viewerEmail || '';
      return getDiaryEntry(username, date, viewerUserId, viewerEmail);
    } else if (action === 'getUserDiaryEntries') {
      const userId = e.parameter.userId;
      const month = e.parameter.month; // Optional: YYYY-MM format
      const year = e.parameter.year;   // Optional: YYYY format
      return getUserDiaryEntries(userId, month, year);
    } else if (action === 'getPublicDiaryEntries') {
      const username = e.parameter.username; // Optional: filter by username
      const date = e.parameter.date;         // Optional: filter by exact date
      const month = e.parameter.month;       // Optional: YYYY-MM
      const year = e.parameter.year;         // Optional: YYYY
      const limit = e.parameter.limit;       // Optional: max items
      const maxContent = e.parameter.maxContent; // Optional: trim content length
      const viewerUserId = e.parameter.viewerUserId || '';
      const viewerEmail = e.parameter.viewerEmail || '';
      return getPublicDiaryEntries(username, date, month, year, limit, maxContent, viewerUserId, viewerEmail);
    } else if (action === 'listFriends') {
      const ownerId = e.parameter.ownerId;
      return listFriends(ownerId);
    } else if (action === 'getUserDiaryEntry') {
      const userId = e.parameter.userId;
      const date = e.parameter.date;
      return getUserDiaryEntry(userId, date);
    } else if (action === 'getEmailByUsername') {
      const username = e.parameter.username;
      return getEmailByUsername(username);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Server error' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const action = e.parameter.action;

    if (action === 'register') {
      return handleRegister(e.parameter);
    } else if (action === 'login') {
      return handleLogin(e.parameter);
    } else if (action === 'googleLogin') {
      return handleGoogleLogin(e.parameter);
    } else if (action === 'saveDiaryEntry') {
      return saveDiaryEntry(e.parameter);
    } else if (action === 'updateDiaryEntry') {
      return updateDiaryEntry(e.parameter);
    } else if (action === 'updateDiaryEntryById') {
      return updateDiaryEntryById(e.parameter);
    } else if (action === 'deleteDiaryEntry') {
      return deleteDiaryEntry(e.parameter);
    } else if (action === 'deleteDiaryEntryById') {
      return deleteDiaryEntryById(e.parameter);
    } else if (action === 'toggleDiaryPrivacy') {
      return toggleDiaryPrivacy(e.parameter);
    } else if (action === 'addFriend') {
      return addFriend(e.parameter);
    } else if (action === 'removeFriend') {
      return removeFriend(e.parameter);
    } else if (action === 'ping') {
      return ping(e.parameter);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid request' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Server error' }))
      .setMimeType(ContentService.MimeType.JSON);
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
        username: username
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
        return createResponse(true, 'Login successful', { user: { id: userId, email: email, username: username } });
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
      return createResponse(false, 'Invalid token audience');
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
      return createResponse(true, 'Login successful', { user: { id: userId, email: email, username: username } });
    } else {
      // Register new user
      const userId = generateUUID();
      // Generate unique username
      let baseName = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
      if (baseName.length < 5) baseName = baseName + 'user';
      if (baseName.length > 20) baseName = baseName.substring(0, 20);

      let username = baseName;
      let counter = 1;
      while (idx.usernameToRow[username.toLowerCase()]) {
        const suffix = String(counter);
        username = baseName.substring(0, 20 - suffix.length) + suffix;
        counter++;
      }

      const passwordHash = 'GOOGLE_OAUTH_USER'; // Sentinel
      const timestamp = new Date();

      usersSheet.appendRow([userId, email, username, 'GOOGLE_OAUTH', passwordHash, timestamp, timestamp]);
      invalidateUsersIndex();

      return createResponse(true, 'User registered via Google', {
        user: {
          id: userId,
          email: email,
          username: username
        }
      });
    }

  } catch (e) {
    Logger.log('Error in handleGoogleLogin: ' + e.toString());
    return createResponse(false, 'Google login failed: ' + e.message);
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
      diarySheet.deleteRow(row);
      try {
        cacheRemove('user:entry:' + userId + ':' + date);
        cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
        cacheRemove('pub:entry:' + String(existing[2] || '').trim().toLowerCase() + ':' + date);
        cacheRemove('pub:list:');
        cacheRemove('pub:list:' + String(existing[2] || '').trim().toLowerCase() + ':');
        invalidateDiaryIndex(userId);
      } catch (e) { }
      return createResponse(true, 'Diary entry deleted successfully');
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
        sheet.deleteRow(i + 1);
        try {
          cacheRemove('user:entry:' + userId + ':' + date);
          cacheRemove('user:entries:' + userId + ':' + date.slice(0, 7) + ':');
          cacheRemove('pub:entry:' + String(username || '').trim().toLowerCase() + ':' + date);
          cacheRemove('pub:list:');
          cacheRemove('pub:list:' + String(username || '').trim().toLowerCase() + ':');
        } catch (e) { }
        return createResponse(true, 'Entry deleted', { entryId: entryId, date: date });
      }
    }
    return createResponse(false, 'Entry not found');
  } catch (e) {
    Logger.log('Error in deleteDiaryEntryById: ' + e.toString());
    return createResponse(false, 'Failed to delete');
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
      return ContentService
        .createTextOutput(JSON.stringify(cached))
        .setMimeType(ContentService.MimeType.JSON);
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
        return ContentService
          .createTextOutput(JSON.stringify(resp))
          .setMimeType(ContentService.MimeType.JSON);
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
      return ContentService
        .createTextOutput(JSON.stringify(cached))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();
    const userEntries = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === userId) {
        const entryDate = normalizeDateCell(data[i][3]);

        // Filter by month/year if provided
        if (month && !entryDate.startsWith(month)) continue;
        if (year && !entryDate.startsWith(year)) continue;

        userEntries.push({
          entryId: data[i][0],
          date: entryDate,
          title: data[i][4],
          content: data[i][5],
          isPrivate: data[i][6],
          created: data[i][7],
          lastModified: data[i][8]
        });
      }
    }

    // Sort by date (newest first)
    userEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    const resp = {
      success: true,
      message: 'Diary entries retrieved successfully',
      entries: userEntries,
      total: userEntries.length
    };
    cachePutJson(cacheKey, resp, 30);
    return ContentService
      .createTextOutput(JSON.stringify(resp))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getUserDiaryEntries: ' + error.toString());
    return createResponse(false, 'Failed to retrieve diary entries');
  }
}

function getPublicDiaryEntries(username, date, month, year, limit, maxContent, viewerUserId, viewerEmail) {
  try {
    const cacheKey = 'pub:list:'
      + (username ? String(username).toLowerCase() : '') + ':'
      + (date || '') + ':'
      + (month || '') + ':'
      + (year || '') + ':'
      + (limit || '') + ':'
      + (maxContent || '') + ':' + (viewerUserId || '') + ':' + (viewerEmail || '');
    const cached = cacheGetJson(cacheKey);
    if (cached) {
      return ContentService
        .createTextOutput(JSON.stringify(cached))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = getOrCreateDiaryEntriesSheet().getDataRange().getValues();
    const publicEntries = [];
    const reqUser = username ? String(username || '').trim().toLowerCase() : '';
    const reqMonth = month || '';
    const reqYear = year || '';
    const maxLen = maxContent ? parseInt(maxContent, 10) : null;
    const maxItems = limit ? parseInt(limit, 10) : null;

    for (let i = 1; i < data.length; i++) {
      const ownerId = data[i][1];
      const privacy = normalizePrivacy(data[i][6], null);

      // Enforce access
      if (!canViewEntry(ownerId, viewerUserId || '', privacy, viewerEmail || '')) continue;

      // Filter by username if provided
      if (reqUser && String(data[i][2] || '').trim().toLowerCase() !== reqUser) continue;

      // Filter by date if provided
      const rowDate = normalizeDateCell(data[i][3]);
      if (date && rowDate !== date) continue;
      // Filter by month/year if provided
      if (reqMonth && !rowDate.startsWith(reqMonth)) continue;
      if (reqYear && !rowDate.startsWith(reqYear)) continue;

      let content = data[i][5];
      if (typeof content === 'string' && maxLen && maxLen > 0 && content.length > maxLen) {
        content = content.slice(0, maxLen) + '…';
      }

      publicEntries.push({
        username: data[i][2],
        date: rowDate,
        title: data[i][4],
        content: content,
        privacy: privacy,
        created: data[i][7],
        lastModified: data[i][8]
      });
    }

    // Sort by date (newest first)
    publicEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    const limited = (maxItems && maxItems > 0) ? publicEntries.slice(0, maxItems) : publicEntries;

    const resp = {
      success: true,
      message: 'Public diary entries retrieved successfully',
      entries: limited,
      total: publicEntries.length
    };
    cachePutJson(cacheKey, resp, 60);
    return ContentService
      .createTextOutput(JSON.stringify(resp))
      .setMimeType(ContentService.MimeType.JSON);

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
      return ContentService
        .createTextOutput(JSON.stringify(cached))
        .setMimeType(ContentService.MimeType.JSON);
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
        return ContentService
          .createTextOutput(JSON.stringify(resp))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return createResponse(false, 'Diary entry not found');
  } catch (error) {
    Logger.log('Error in getUserDiaryEntry: ' + error.toString());
    return createResponse(false, 'Failed to retrieve diary entry');
  }
}

// ===== HELPER FUNCTIONS =====

function getOrCreateUsersSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet;

    try {
      sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    } catch (e) {
      sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['User ID', 'Email', 'Username', 'Real Password', 'Password Hash', 'Created Date', 'Last Seen']);
    } else {
      try {
        const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (header.indexOf('Last Seen') === -1) {
          sheet.insertColumnAfter(6);
          sheet.getRange(1, 7).setValue('Last Seen');
        }
      } catch (e) { }
    }

    return sheet;
  } catch (error) {
    Logger.log('Error accessing users sheet: ' + error.toString());
    throw new Error('Cannot access Google Sheet. Check your SHEET_ID.');
  }
}

function getOrCreateDiaryEntriesSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet;

    try {
      sheet = spreadsheet.getSheetByName(DIARY_ENTRIES_SHEET_NAME);
    } catch (e) {
      sheet = spreadsheet.insertSheet(DIARY_ENTRIES_SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Entry ID', 'User ID', 'Username', 'Date', 'Title', 'Content', 'Privacy', 'Created Date', 'Last Modified']);
    } else {
      // Migrate header/value from legacy 'Is Private' boolean to 'Privacy' string
      try {
        const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (header[6] === 'Is Private') {
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
      } catch (e) { }
    }

    return sheet;
  } catch (error) {
    Logger.log('Error accessing diary entries sheet: ' + error.toString());
    throw new Error('Cannot access Google Sheet. Check your SHEET_ID.');
  }
}

function getUserById(userId) {
  try {
    const usersSheet = getOrCreateUsersSheet();
    const idx = getUsersIndex();
    const row = idx.idToRow[userId];
    if (!row) return null;
    const v = usersSheet.getRange(row, 1, 1, Math.max(6, usersSheet.getLastColumn())).getValues()[0];
    return { id: v[0], email: v[1], username: v[2], created: v[5] };
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
    const v = usersSheet.getRange(row, 1, 1, Math.max(6, usersSheet.getLastColumn())).getValues()[0];
    return { id: v[0], email: v[1], username: v[2], created: v[5] };
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

function createResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    ...data
  };

  if (!success) {
    response.error = message;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
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
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(FRIENDS_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(FRIENDS_SHEET_NAME);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Owner User ID', 'Friend User ID', 'Friend Email', 'Created Date']);
    }
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

function addFriend(params) {
  try {
    const ownerId = params.ownerId;
    const friendIdentifier = params.friendIdentifier; // email | username | userId
    if (!ownerId || !friendIdentifier) {
      return createResponse(false, 'ownerId and friendIdentifier are required');
    }
    const friendUserId = resolveUserIdByIdentifier(friendIdentifier);
    const friendEmail = friendUserId ? '' : String(friendIdentifier).trim();
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === ownerId && (data[i][1] === friendUserId || data[i][2] === friendEmail)) {
        return createResponse(true, 'Friend already added');
      }
    }
    sheet.appendRow([ownerId, friendUserId, friendEmail, new Date()]);
    return createResponse(true, 'Friend added');
  } catch (e) {
    Logger.log('Error in addFriend: ' + e.toString());
    return createResponse(false, 'Failed to add friend');
  }
}

function removeFriend(params) {
  try {
    const ownerId = params.ownerId;
    const friendIdentifier = params.friendIdentifier; // email | username | userId
    if (!ownerId || !friendIdentifier) {
      return createResponse(false, 'ownerId and friendIdentifier are required');
    }
    const friendUserId = resolveUserIdByIdentifier(friendIdentifier);
    const friendEmail = friendUserId ? '' : String(friendIdentifier).trim();
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === ownerId && (data[i][1] === friendUserId || data[i][2] === friendEmail)) {
        sheet.deleteRow(i + 1);
        return createResponse(true, 'Friend removed');
      }
    }
    return createResponse(true, 'No matching friend');
  } catch (e) {
    Logger.log('Error in removeFriend: ' + e.toString());
    return createResponse(false, 'Failed to remove friend');
  }
}

function listFriends(ownerId) {
  try {
    if (!ownerId) return createResponse(false, 'ownerId required');
    const sheet = getOrCreateFriendsSheet();
    const data = sheet.getDataRange().getValues();
    const usersSheet = getOrCreateUsersSheet();
    const users = usersSheet.getDataRange().getValues();
    const userIndex = new Map();
    for (let i = 1; i < users.length; i++) { userIndex.set(users[i][0], { username: users[i][2], email: users[i][1], lastSeen: users[i][6] }); }
    const friends = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === ownerId) {
        const fuid = data[i][1];
        const info = fuid ? (userIndex.get(fuid) || {}) : {};
        friends.push({ friendUserId: fuid, friendEmail: data[i][2], friendUsername: info.username || '', lastSeen: info.lastSeen || '', created: data[i][3] });
      }
    }
    return createResponse(true, 'Friends listed', { friends: friends });
  } catch (e) {
    Logger.log('Error in listFriends: ' + e.toString());
    return createResponse(false, 'Failed to list friends');
  }
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

function isFriend(ownerId, viewerUserId) {
  if (!ownerId || !viewerUserId) return false;
  if (ownerId === viewerUserId) return true;
  const sheet = getOrCreateFriendsSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === ownerId && data[i][1] === viewerUserId) return true;
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