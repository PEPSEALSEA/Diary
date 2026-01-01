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
    if (e.parameters && e.parameters.myFile && e.parameters.myFile.length > 0) {
      const fileBlob = e.parameters.myFile[0];
      const filename = params.filename || fileBlob.getName() || ("Image_" + new Date().getTime());

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
