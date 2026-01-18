const LIMIT = 10;
let offset = 0;
let total = null;

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
                <div class="file-col file-col-name">Name</div>
                <div class="file-col file-col-url">Url</div>
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
            <span class="file-name">${item.original_name}</span>
        </div>
        <div class="file-col file-col-url"><a href="${item.fullUrl}" target="_blank">${item.fullUrl}</a></div>
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
    const response = await fetch(`/api/images?limit=${LIMIT}&offset=${offset}`);
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

async function loadMore(wrapper) {
    const result = await fetchImages();
    if (!result.success) {
        showMessage(wrapper, result.message);
        return;
    }

    const list = ensureListContainer(wrapper);
    result.items.forEach((item) => {
        const fullUrl = `${window.location.origin}${item.url}`;
        addRow(list, { ...item, fullUrl });
    });

    offset += result.items.length;
    total = result.total;

    const remaining = total - offset;
    updateLoadMore(wrapper, remaining);

    document.querySelectorAll('.delete-btn').forEach((button) => {
        button.onclick = () => {
            const id = button.dataset.id;
            const row = button.closest('.file-list-item');
            handleDelete(id, row);
        };
    });
}

function initTabs() {
    const uploadTab = document.getElementById('upload-tab-btn');
    const imagesTab = document.getElementById('images-tab-btn');

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
