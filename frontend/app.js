const api = {
  upload: '/api/upload',
  images: '/api/images'
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleUpload(event) {
  event.preventDefault();
  const input = document.querySelector('#file-input');
  const result = document.querySelector('#upload-result');

  if (!input.files.length) {
    result.textContent = 'Выберите файл.';
    return;
  }

  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    result.textContent = 'Файл превышает 5 МБ.';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  result.textContent = 'Загрузка...';
  try {
    const response = await fetch(api.upload, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      result.textContent = data.error || data.message || 'Ошибка загрузки.';
      return;
    }
    result.innerHTML = `Готово! Ссылка: <a href="${data.url}">${data.url}</a>`;
  } catch (err) {
    result.textContent = 'Ошибка сети.';
  }
}

async function loadImages() {
  const gallery = document.querySelector('#gallery');
  const info = document.querySelector('#gallery-info');
  const button = document.querySelector('#load-more');
  if (!gallery) return;

  let offset = 0;
  const limit = 12;

  async function fetchBatch() {
    const response = await fetch(`${api.images}?limit=${limit}&offset=${offset}`);
    const data = await response.json();

    if (!data.success) {
      info.textContent = data.message || 'База данных недоступна.';
      button.style.display = 'none';
      return;
    }

    if (offset === 0) {
      info.textContent = `Всего изображений: ${data.total}`;
    }

    data.items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${item.url}" alt="${item.original_name}">
        <div class="badge">${item.file_type.toUpperCase()} · ${formatSize(item.size)}</div>
        <div>${item.original_name}</div>
      `;
      gallery.appendChild(card);
    });

    offset += data.items.length;
    if (offset >= data.total) {
      button.style.display = 'none';
    }
  }

  button.addEventListener('click', fetchBatch);
  fetchBatch();
}

window.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#upload-form');
  if (form) {
    form.addEventListener('submit', handleUpload);
  }
  loadImages();
});
