// File upload handling and validation on the client-side

const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const uploadProgress = document.getElementById('upload-progress');
const uploadStatus = document.getElementById('upload-status');

let fileToUpload;
let uploadXhr;

uploadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (fileInput.files.length > 0) {
    fileToUpload = fileInput.files[0];
    uploadFile();
  } else {
    uploadStatus.textContent = 'Please select a file to upload';
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    uploadButton.disabled = false;
  } else {
    uploadButton.disabled = true;
  }
});

function uploadFile() {
  uploadStatus.textContent = '';
  uploadProgress.style.width = '0%';

  const formData = new FormData();
  formData.append('file', fileToUpload);

  uploadXhr = new XMLHttpRequest();
  uploadXhr.open('POST', '/upload', true);
  uploadXhr.onload = () => {
    if (uploadXhr.status === 200) {
      uploadStatus.textContent = 'File uploaded successfully';
      uploadProgress.style.width = '100%';
      setTimeout(() => {
        uploadProgress.style.width = '0%';
      }, 2000);
    } else {
      uploadStatus.textContent = 'Error uploading file';
    }
  };
  uploadXhr.upload.addEventListener('progress', (e) => {
    const percent = (e.loaded / e.total) * 100;
    uploadProgress.style.width = `${percent}%`;
  });
  uploadXhr.send(formData);
}

document.getElementById('cancel-upload').addEventListener('click', () => {
  if (uploadXhr) {
    uploadXhr.abort();
    uploadStatus.textContent = 'Upload cancelled';
    uploadProgress.style.width = '0%';
  }
});


// File validation
function validateFile(file) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  if (!allowedMimeTypes.includes(file.type)) {
    return false;
  }

  if (file.size > maxFileSize) {
    return false;
  }

  return true;
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!validateFile(file)) {
    uploadButton.disabled = true;
    uploadStatus.textContent = 'Invalid file type or size';
  }
});


// Drag and drop file upload
const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('active');
  const file = e.dataTransfer.files[0];
  fileInput.files = [file];
  uploadButton.disabled = false;
});