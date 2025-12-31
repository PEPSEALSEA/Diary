/**
 * Saves an image from a URL directly to your specific Google Drive folder.
 * Folder ID: 1qOsEpoiMWZc-2T7y59a8945LANumqD47
 */

const folderId = "1qOsEpoiMWZc-2T7y59a8945LANumqD47";

function doPost(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    if (action === 'upload') {
      const filename = params.filename || ("Image_" + new Date().getTime());
      const base64Data = e.postData.contents;
      const contentType = params.contentType || "image/jpeg";

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

    return createResponse(false, 'Invalid action');
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
