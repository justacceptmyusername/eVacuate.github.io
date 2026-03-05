function getCategory() {
    return document.body.dataset.category || '';
}

function apiUrl(path) {
    if (window.location.protocol === 'file:') {
        return `http://localhost:3000${path}`;
    }
    return path;
}

window.apiUrl = apiUrl;

function setActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    const activeLink = document.querySelector(`.sidebar a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');
}

function formatNow() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `Today is ${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function mountTodayCard() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('todayCard')) return;
    const card = document.createElement('div');
    card.id = 'todayCard';
    card.className = 'today-card';
    card.textContent = formatNow();
    topbar.prepend(card);
    setInterval(() => {
        card.textContent = formatNow();
    }, 1000);
}

async function updateNav() {
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logout');
    if (!loginLink && !logoutLink) return;

    const res = await fetch(apiUrl('/api/auth/me'), { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const isLoggedIn = !!data.loggedIn;

    if (loginLink) loginLink.style.display = isLoggedIn ? 'none' : 'inline';
    if (logoutLink) logoutLink.style.display = isLoggedIn ? 'inline' : 'none';

    document.querySelectorAll('.auth-cta').forEach((el) => {
        el.style.display = isLoggedIn ? 'none' : '';
    });
}

function bindLogout() {
    const logout = document.getElementById('logout');
    if (!logout) return;
    logout.onclick = async (e) => {
        e.preventDefault();
        await fetch(apiUrl('/api/auth/logout'), { method: 'POST' });
        window.location.href = '/login.html';
    };
}

async function loadDocs() {
    const list = document.getElementById('docList');
    const category = getCategory();
    if (!list || !category) return;

    const res = await fetch(apiUrl(`/api/documents?category=${encodeURIComponent(category)}`), { cache: 'no-store' });
    if (!res.ok) return location.href = '/login.html';

    const docs = await res.json();
    list.innerHTML = '';

    docs.forEach(d => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const actionCell = document.createElement('td');
        const downloadLink = document.createElement('a');
        const previewLink = document.createElement('a');
        const deleteButton = document.createElement('button');

        nameCell.textContent = d.original_name;
        downloadLink.href = `/api/documents/${d.id}`;
        downloadLink.textContent = 'Download';
        previewLink.href = `/api/documents/${d.id}/preview`;
        previewLink.textContent = 'Preview';
        previewLink.target = '_blank';
        previewLink.rel = 'noopener';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteDoc(d.id);

        actionCell.appendChild(downloadLink);
        actionCell.appendChild(document.createTextNode(' | '));
        actionCell.appendChild(previewLink);
        actionCell.appendChild(document.createTextNode(' | '));
        actionCell.appendChild(deleteButton);
        row.appendChild(nameCell);
        row.appendChild(actionCell);
        list.appendChild(row);
    });
}

async function deleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    const res = await fetch(apiUrl(`/api/documents/${id}`), { method: 'DELETE' });
    if (!res.ok) return;
    loadDocs();
}

async function upload() {
    const category = getCategory();
    const fileInput = document.getElementById('file');
    if (!fileInput || !category) return;
    const file = fileInput.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    data.append('category', category);

    const res = await fetch(apiUrl('/api/documents/upload'), {
        method: 'POST',
        body: data
    });

    if (!res.ok) return;
    loadDocs();
}

setActiveNav();
mountTodayCard();
bindLogout();
updateNav();
loadDocs();
