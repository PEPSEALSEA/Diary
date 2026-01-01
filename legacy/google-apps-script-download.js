/**
 * Saves an image from a URL directly to your specific Google Drive folder.
 * Folder ID: 1qOsEpoiMWZc-2T7y59a8945LANumqD47
 */

const folderId = "1qOsEpoiMWZc-2T7y59a8945LANumqD47";

function doGet(e) {
  return createResponse(true, 'Upload service is online');
}

function doOptions(e) {
  return createResponse(true, 'CORS Preflight Success');
}

function doPost(e) {
  try {
    var params = e.parameter || {};
    var postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (ex) { }
    }

    var action = params.action || postData.action;

    // Handle FormData upload (multipart/form-data)
    // Google Apps Script automatically parses multipart/form-data into e.parameters
    // Check e.parameters.myFile FIRST as it's the most reliable way
    if (e.parameters && e.parameters.myFile && e.parameters.myFile.length > 0) {
      const fileBlob = e.parameters.myFile[0];
      const filename = params.filename || fileBlob.getName() || ("Image_" + new Date().getTime());
      const contentType = params.contentType || fileBlob.getContentType() || "image/jpeg";

      const folder = DriveApp.getFolderById(folderId);
      const file = folder.createFile(fileBlob);
      if (filename) file.setName(filename);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return createResponse(true, 'Upload successful', {
        driveId: file.getId(),
        url: 'https://lh3.googleusercontent.com/u/0/d/' + file.getId(),
        downloadUrl: file.getDownloadUrl(),
        viewUrl: file.getUrl()
      });
    }

    // Fallback: Handle multipart/form-data manually if e.parameters didn't work
    if (e.postData && e.postData.type && e.postData.type.indexOf('multipart') !== -1) {
      var fileBlob = null;
      var filename = params.filename || ("Image_" + new Date().getTime() + ".jpg");
      var contentType = params.contentType || "image/jpeg";

      // Try to get blob from postData.contents
      if (e.postData.contents) {
        // If it's already a blob, use it directly
        if (typeof e.postData.contents.getBlob === 'function' || e.postData.contents.getBytes) {
          fileBlob = e.postData.contents;
        } else if (typeof e.postData.contents === 'string') {
          // Try to extract file from multipart
          fileBlob = parseMultipartFormData(e.postData.contents, e.postData.type);
        } else {
          // Assume it's a blob
          fileBlob = e.postData.contents;
        }
      }

      if (fileBlob) {
        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(fileBlob);
        if (filename) file.setName(filename);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        return createResponse(true, 'Upload successful', {
          driveId: file.getId(),
          url: 'https://lh3.googleusercontent.com/u/0/d/' + file.getId(),
          downloadUrl: file.getDownloadUrl(),
          viewUrl: file.getUrl()
        });
      }
    }

    // Handle Base64 upload (JSON)
    if (action === 'upload') {
      var filename = params.filename || postData.filename || ("Image_" + new Date().getTime());
      var base64Data = params.content || postData.content;
      var contentType = params.contentType || postData.contentType || "image/jpeg";

      if (!base64Data) {
        return createResponse(false, 'Missing content data');
      }

      const decodedData = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(decodedData, contentType, filename);

      const folder = DriveApp.getFolderById(folderId);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return createResponse(true, 'Upload successful', {
        driveId: file.getId(),
        url: 'https://lh3.googleusercontent.com/u/0/d/' + file.getId(),
        downloadUrl: file.getDownloadUrl(),
        viewUrl: file.getUrl()
      });
    }

    return createResponse(false, 'Invalid action or missing file: ' + (action || 'none'));
  } catch (error) {
    return createResponse(false, 'Upload failed: ' + error.toString());
  }
}

function parseMultipartFormData(body, contentType) {
  try {
    // Extract boundary from Content-Type header
    var boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) return null;

    var boundary = '--' + boundaryMatch[1].trim();
    var parts = body.split(boundary);

    // Find the part with the file (contains Content-Disposition: form-data; name="myFile")
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part.indexOf('name="myFile"') !== -1 || part.indexOf("name='myFile'") !== -1) {
        // Extract the file content (after the headers and blank line)
        var headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) headerEnd = part.indexOf('\n\n');
        if (headerEnd === -1) continue;

        var fileContent = part.substring(headerEnd).replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');

        // Extract content type if available
        var contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
        var fileContentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'image/jpeg';

        // Try to convert to blob - file content might be binary or base64
        try {
          // First try as base64 (if it's encoded)
          var bytes = Utilities.base64Decode(fileContent);
          return Utilities.newBlob(bytes, fileContentType);
        } catch (e) {
          // If base64 decode fails, try as raw binary string
          try {
            var bytes = [];
            for (var j = 0; j < fileContent.length; j++) {
              bytes.push(fileContent.charCodeAt(j) & 0xFF);
            }
            return Utilities.newBlob(bytes, fileContentType);
          } catch (e2) {
            Logger.log('Error creating blob from multipart: ' + e2.toString());
          }
        }
      }
    }
  } catch (e) {
    Logger.log('Error parsing multipart: ' + e.toString());
  }
  return null;
}

function createResponse(success, message, data) {
  var dataObj = data || {};
  var result = {
    success: success,
    message: message
  };
  for (var key in dataObj) {
    if (dataObj.hasOwnProperty(key)) {
      result[key] = dataObj[key];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


function downloadImageToDrive() {
  const imageUrl = "https://picsum.photos/800/600";
  try {
    const response = UrlFetchApp.fetch(imageUrl);
    const blob = response.getBlob();
    const folder = DriveApp.getFolderById(folderId);
    const fileName = "Image_" + new Date().toISOString() + ".jpg";
    const file = folder.createFile(blob).setName(fileName);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.log("Error: " + e.toString());
  }
}

function batchDownloadFromList(urlArray) {
  const folder = DriveApp.getFolderById(folderId);
  urlArray.forEach((url, index) => {
    const blob = UrlFetchApp.fetch(url).getBlob();
    folder.createFile(blob).setName("Batch_Image_" + index);
  });
}
