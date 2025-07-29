document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    if (currentPage === '/' || currentPage.endsWith('index.html')) {
        initContactForm();
    } else if (currentPage === '/admin' || currentPage.endsWith('admin.html')) {
        initAdminPage();
    }
});

function initContactForm() {
    const form = document.getElementById('contactForm');
    const messageDiv = document.getElementById('message');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            name: formData.get('name').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim()
        };
        
        if (!data.name || !data.phone || !data.email) {
            showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage(result.message, 'success');
                form.reset();
            } else {
                showMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
        }
    });
}

function initAdminPage() {
    loadContacts();
    
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', loadContacts);
    
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', handleLogout);
    
    const editForm = document.getElementById('editForm');
    editForm.addEventListener('submit', handleEditSubmit);
    
    const modal = document.getElementById('editModal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', closeEditModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeEditModal();
        }
    });
}

async function handleLogout() {
    if (confirm('คุณแน่ใจหรือไม่ที่ต้องการออกจากระบบ?')) {
        try {
            const response = await fetch('/api/admin/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                window.location.href = '/login';
            } else {
                showMessage('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
        }
    }
}

async function loadContacts() {
    try {
        const response = await fetch('/api/contacts');
        
        if (response.status === 401 || response.redirected) {
            window.location.href = '/login';
            return;
        }
        
        const contacts = await response.json();
        
        if (response.ok) {
            displayContacts(contacts);
            updateStats(contacts);
        } else {
            showMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
}

function displayContacts(contacts) {
    const tbody = document.getElementById('contactsBody');
    tbody.innerHTML = '';
    
    if (contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #a0aec0;">ยังไม่มีข้อมูลติดต่อ</td></tr>';
        return;
    }
    
    contacts.forEach(contact => {
        const row = document.createElement('tr');
        const createdDate = new Date(contact.created_at).toLocaleString('th-TH');
        
        row.innerHTML = `
            <td>${contact.id}</td>
            <td>${escapeHtml(contact.name)}</td>
            <td>${escapeHtml(contact.phone)}</td>
            <td>${escapeHtml(contact.email)}</td>
            <td>${createdDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="editContact(${contact.id}, '${escapeHtml(contact.name)}', '${escapeHtml(contact.phone)}', '${escapeHtml(contact.email)}')">แก้ไข</button>
                    <button class="btn btn-danger" onclick="deleteContact(${contact.id})">ลบ</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateStats(contacts) {
    document.getElementById('totalContacts').textContent = contacts.length;
}

function editContact(id, name, phone, email) {
    document.getElementById('editId').value = id;
    document.getElementById('editName').value = name;
    document.getElementById('editPhone').value = phone;
    document.getElementById('editEmail').value = email;
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    
    if (!name || !phone || !email) {
        showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/contacts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, phone, email })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
            closeEditModal();
            loadContacts();
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
}

async function deleteContact(id) {
    if (!confirm('คุณแน่ใจหรือไม่ที่ต้องการลบข้อมูลนี้?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/contacts/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
            loadContacts();
        } else {
            showMessage(result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}