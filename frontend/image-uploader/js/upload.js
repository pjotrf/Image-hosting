const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = ['.jpg', '.png', '.gif'];

function hasAllowedExtension(fileName) {
    const lower = fileName.toLowerCase();
    return ALLOWED_EXT.some((ext) => lower.endsWith(ext));
}

function setTabActive() {
    const uploadTab = document.getElementById('upload-tab-btn');
    const imagesTab = document.getElementById('images-tab-btn');
    if (uploadTab) uploadTab.classList.add('upload__tab--active');
    if (imagesTab) imagesTab.classList.remove('upload__tab--active');
}

function ensureListContainer(wrapper) {
    let container = wrapper.querySelector('.file-list-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'file-list-container';
        container.innerHTML = `
            <div class="file-list-header">
                <div class="file-col file-col-name">Name</div>
                <div class="file-col file-col-url">Url</div>
            </div>
            <div id="file-list"></div>
        `;
        wrapper.innerHTML = '';
        wrapper.appendChild(container);
    }
    return container.querySelector('#file-list');
}

function addUploadRow(list, item) {
    const row = document.createElement('div');
    row.className = 'file-list-item';
    row.innerHTML = `
        <div class="file-col file-col-name">
            <span class="file-icon"><img src="/static/image-uploader/img/icon/Group.png" alt="file icon"></span>
            <span class="file-name">${item.original_name}</span>
        </div>
        <div class="file-col file-col-url"><a href="${item.fullUrl}" target="_blank">${item.fullUrl}</a></div>
    `;
    list.appendChild(row);
}

async function uploadFile(file) {
    if (!hasAllowedExtension(file.name)) {
        return { success: false, error: `Unsupported format: ${file.name}` };
    }
    if (file.size > MAX_SIZE_BYTES) {
        return { success: false, error: `File too large: ${file.name}` };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    let data = {};
    try {
        data = await response.json();
    } catch (err) {
        return { success: false, error: 'Invalid server response.' };
    }

    if (!response.ok || !data.success) {
        return { success: false, error: data.error || data.message || 'Upload failed.' };
    }

    return {
        success: true,
        url: data.url,
        file_name: data.file_name,
        original_name: file.name
    };
}

function showMessage(wrapper, text) {
    wrapper.innerHTML = `<p class="upload__promt" style="text-align: center; margin-top: 20px;">${text}</p>`;
}

async function handleFiles(files) {
    const wrapper = document.getElementById('file-list-wrapper');
    if (!wrapper) return;

    if (!files || files.length === 0) {
        showMessage(wrapper, 'No files selected.');
        return;
    }

    showMessage(wrapper, 'Uploading...');
    const list = ensureListContainer(wrapper);
    list.innerHTML = '';

    const currentUploadInput = document.querySelector('.upload__input');

    for (const file of files) {
        const result = await uploadFile(file);
        if (!result.success) {
            showMessage(wrapper, result.error);
            continue;
        }

        const fullUrl = `${window.location.origin}${result.url}`;
        if (currentUploadInput) {
            currentUploadInput.value = fullUrl;
        }
        addUploadRow(list, { original_name: result.original_name, fullUrl });
    }
}

function initCopyButton() {
    const copyButton = document.querySelector('.upload__copy');
    const currentUploadInput = document.querySelector('.upload__input');

    if (!copyButton || !currentUploadInput) return;

    copyButton.addEventListener('click', () => {
        const textToCopy = currentUploadInput.value;
        if (!textToCopy || textToCopy === 'https://') return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'COPIED!';
            setTimeout(() => {
                copyButton.textContent = 'COPY';
            }, 2000);
        });
    });
}

function initTabs() {
    const mainTab = document.getElementById('main-tab-btn');
    const uploadTab = document.getElementById('upload-tab-btn');
    const imagesTab = document.getElementById('images-tab-btn');

    if (mainTab) {
        mainTab.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    if (uploadTab) {
        uploadTab.addEventListener('click', () => {
            window.location.href = '/upload';
        });
    }

    if (imagesTab) {
        imagesTab.addEventListener('click', () => {
            window.location.href = '/images/';
        });
    }

    setTabActive();
}

function initDropzone() {
    const dropzone = document.querySelector('.upload__dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    });

    dropzone.addEventListener('drop', (event) => {
        handleFiles(event.dataTransfer.files);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const fileUpload = document.getElementById('file-upload');
    if (fileUpload) {
        fileUpload.addEventListener('change', (event) => {
            handleFiles(event.target.files);
            event.target.value = '';
        });
    }

    initCopyButton();
    initTabs();
    initDropzone();
});
