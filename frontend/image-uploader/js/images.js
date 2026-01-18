const LIMIT = 10;
let offset = 0;
let total = null;
let sortBy = 'date';
let sortDir = 'desc';

function setTabActive() {
    const uploadTab = document.getElementById('upload-tab-btn');
    const imagesTab = document.getElementById('images-tab-btn');
    if (uploadTab) uploadTab.classList.remove('upload__tab--active');
    if (imagesTab) imagesTab.classList.add('upload__tab--active');
}

function ensureListContainer(wrapper) {
    let container = wrapper.querySelector('.file-list-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'file-list-container';
        container.innerHTML = `
            <div class="file-list-header">
                <button class="file-col file-col-name sort-btn" data-sort="name">Name</button>
                <div class="file-col file-col-url">Url</div>
                <button class="file-col file-col-meta sort-btn" data-sort="size">Size</button>
                <button class="file-col file-col-meta sort-btn" data-sort="date">Uploaded</button>
                <div class="file-col file-col-delete">Delete</div>
            </div>
            <div id="file-list"></div>
        `;
        wrapper.innerHTML = '';
        wrapper.appendChild(container);
    }
    return container.querySelector('#file-list');
}

function addRow(list, item) {
    const row = document.createElement('div');
    row.className = 'file-list-item';
    row.dataset.id = item.id;
    row.innerHTML = `
        <div class="file-col file-col-name">
            <span class="file-icon"><img src="/static/image-uploader/img/icon/Group.png" alt="file icon"></span>
            <a class="file-name" href="${item.fullUrl}" target="_blank" rel="noopener">${item.original_name}</a>
            <span class="preview-card">
                <img src="${item.fullUrl}" alt="${item.original_name}">
            </span>
        </div>
        <div class="file-col file-col-url">
            <button class="copy-btn" data-link="${item.fullUrl}">Copy link</button>
        </div>
        <div class="file-col file-col-meta">${item.size_human}</div>
        <div class="file-col file-col-meta">${item.uploaded_at}</div>
        <div class="file-col file-col-delete">
            <button class="delete-btn" data-id="${item.id}"><img class="delete-img" src="/static/image-uploader/img/icon/delete.png" alt="delete icon"></button>
        </div>
    `;
    list.appendChild(row);
}

function showMessage(wrapper, text) {
    wrapper.innerHTML = `<p class="upload__promt" style="text-align: center; margin-top: 50px;">${text}</p>`;
}

async function fetchImages() {
    const response = await fetch(`/api/images?limit=${LIMIT}&offset=${offset}&sort_by=${sortBy}&sort_dir=${sortDir}`);
    const data = await response.json();
    if (!data.success) {
        return { success: false, message: data.message || 'Database unavailable.' };
    }
    return data;
}

async function handleDelete(id, row) {
    const response = await fetch(`/api/images/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok || !data.success) {
        alert(data.message || 'Delete failed.');
        return;
    }
    row.remove();
}

function updateLoadMore(wrapper, remaining) {
    let button = wrapper.querySelector('#load-more-btn');
    if (remaining <= 0) {
        if (button) button.remove();
        return;
    }

    if (!button) {
        button = document.createElement('button');
        button.id = 'load-more-btn';
        button.className = 'load-more-btn';
        button.textContent = 'Load more';
        wrapper.appendChild(button);
    }

    button.onclick = () => loadMore(wrapper);
}

function updateSortButtons(container) {
    container.querySelectorAll('.sort-btn').forEach((btn) => {
        btn.classList.remove('sort-btn--active');
        btn.dataset.dir = '';
        if (btn.dataset.sort === sortBy) {
            btn.classList.add('sort-btn--active');
            btn.dataset.dir = sortDir;
        }
    });
}

function bindCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach((button) => {
        button.onclick = async () => {
            const link = button.dataset.link || '';
            if (!link) return;
            try {
                await navigator.clipboard.writeText(link);
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy link';
                }, 1500);
            } catch (err) {
                button.textContent = 'Copy failed';
                setTimeout(() => {
                    button.textContent = 'Copy link';
                }, 1500);
            }
        };
    });
}

function initSorting(wrapper) {
    if (wrapper.dataset.sortBound === '1') return;
    const buttons = wrapper.querySelectorAll('.sort-btn');
    if (!buttons.length) return;
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const nextSort = btn.dataset.sort;
            if (sortBy === nextSort) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = nextSort;
                sortDir = 'asc';
            }
            offset = 0;
            total = null;
            const list = wrapper.querySelector('#file-list');
            if (list) list.innerHTML = '';
            loadMore(wrapper);
        });
    });
    wrapper.dataset.sortBound = '1';
    updateSortButtons(wrapper);
}

async function loadMore(wrapper) {
    const result = await fetchImages();
    if (!result.success) {
        showMessage(wrapper, result.message);
        return;
    }

    const list = ensureListContainer(wrapper);
    initSorting(wrapper);
    result.items.forEach((item) => {
        const fullUrl = `${window.location.origin}${item.url}`;
        const sizeHuman = formatSize(item.size);
        const uploadedAt = formatDate(item.upload_time);
        addRow(list, { ...item, fullUrl, size_human: sizeHuman, uploaded_at: uploadedAt });
    });

    offset += result.items.length;
    total = result.total;

    const remaining = total - offset;
    updateLoadMore(wrapper, remaining);

    updateSortButtons(wrapper);

    document.querySelectorAll('.delete-btn').forEach((button) => {
        button.onclick = () => {
            const id = button.dataset.id;
            const row = button.closest('.file-list-item');
            handleDelete(id, row);
        };
    });

    bindCopyButtons();
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
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

window.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('file-list-wrapper');
    if (!wrapper) return;
    initTabs();
    loadMore(wrapper);
});
