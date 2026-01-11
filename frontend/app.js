// Scout Troop Packing Manager - API Version
const API_BASE_URL = '/api';
const BOX_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'];

// Templates are now stored in the database and loaded dynamically

let boxes = [];
let profiles = [];
let templates = [];
let currentTab = 'dashboard';
let currentEditBoxId = null;
let currentAddItemBoxId = null;
let currentTemplateBoxId = null;
let currentEditTemplateId = null;
let currentEditItemId = null;

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        alert(`Error: ${error.message}`);
        throw error;
    }
}

// Data Loading Functions
async function loadBoxes() {
    boxes = await apiRequest('/boxes');
}

async function loadProfiles() {
    profiles = await apiRequest('/profiles');
}

async function loadTemplates() {
    templates = await apiRequest('/templates');
}

async function loadData() {
    await Promise.all([loadBoxes(), loadProfiles(), loadTemplates()]);
    render();
}

// Theme Management (still uses localStorage for user preference)
const savedTheme = localStorage.getItem('scoutTheme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('scoutTheme', newTheme);
}

// Tab Navigation
function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));

    document.getElementById(tab + '-tab').classList.remove('hidden');
    event.target.classList.add('active');

    render();
}

// Box Management
async function addBox() {
    const input = document.getElementById('new-box-name');
    const name = input.value.trim();
    if (name) {
        await apiRequest('/boxes', {
            method: 'POST',
            body: JSON.stringify({
                name,
                color: BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)],
                weight: 0,
                notes: '',
                lastInspection: new Date().toISOString().split('T')[0],
                inTrailer: false
            })
        });
        input.value = '';
        await loadData();
    }
}

async function deleteBox(id) {
    if (confirm('Delete this box?')) {
        await apiRequest(`/boxes/${id}`, { method: 'DELETE' });
        await loadData();
    }
}

function openEditModal(boxId) {
    currentEditBoxId = boxId;
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    const form = document.getElementById('edit-box-form');
    form.innerHTML = `
        <div class="form-group">
            <label class="form-label">Box Name</label>
            <input type="text" id="edit-box-name" value="${box.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Last Inspection</label>
            <input type="date" id="edit-box-inspection" value="${box.lastInspection || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Box Color</label>
            <div class="color-picker">
                ${BOX_COLORS.map(color => `
                    <div class="color-option ${box.color === color ? 'selected' : ''}"
                         style="background: ${color}"
                         onclick="selectColor('${color}')"></div>
                `).join('')}
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea id="edit-box-notes" rows="3">${box.notes || ''}</textarea>
        </div>
        <button class="btn" onclick="saveBoxEdit()">Save Changes</button>
    `;

    document.getElementById('edit-box-modal').classList.add('active');
}

function selectColor(color) {
    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
}

function closeEditModal() {
    document.getElementById('edit-box-modal').classList.remove('active');
    currentEditBoxId = null;
}

async function saveBoxEdit() {
    const box = boxes.find(b => b.id === currentEditBoxId);
    if (box) {
        const selectedColor = document.querySelector('.color-option.selected');

        await apiRequest(`/boxes/${currentEditBoxId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: document.getElementById('edit-box-name').value,
                weight: box.weight || 0,
                lastInspection: document.getElementById('edit-box-inspection').value,
                notes: document.getElementById('edit-box-notes').value,
                color: selectedColor ? selectedColor.style.background : box.color,
                inTrailer: box.inTrailer
            })
        });

        closeEditModal();
        await loadData();
    }
}

// Item Management
function openAddItemModal(boxId) {
    currentAddItemBoxId = boxId;
    document.getElementById('modal-item-name').value = '';
    document.getElementById('modal-item-quantity').value = 1;
    document.getElementById('modal-item-needs-replacement').checked = false;
    document.getElementById('add-item-modal').classList.add('active');
}

function closeAddItemModal() {
    document.getElementById('add-item-modal').classList.remove('active');
    currentAddItemBoxId = null;
}

async function saveNewItem() {
    const name = document.getElementById('modal-item-name').value.trim();
    const quantity = parseInt(document.getElementById('modal-item-quantity').value) || 1;
    const needsReplacement = document.getElementById('modal-item-needs-replacement').checked;

    if (name) {
        await apiRequest(`/boxes/${currentAddItemBoxId}/items`, {
            method: 'POST',
            body: JSON.stringify({ name, quantity, needsReplacement })
        });
        closeAddItemModal();
        await loadData();
    }
}

function openEditItemModal(itemId) {
    // Find the item across all boxes
    let foundItem = null;
    for (const box of boxes) {
        const item = box.items.find(i => i.id === itemId);
        if (item) {
            foundItem = item;
            break;
        }
    }

    if (!foundItem) return;

    currentEditItemId = itemId;
    document.getElementById('edit-item-name').value = foundItem.name;
    document.getElementById('edit-item-quantity').value = foundItem.quantity;
    document.getElementById('edit-item-needs-replacement').checked = foundItem.needsReplacement;
    document.getElementById('edit-item-modal').classList.add('active');
}

function closeEditItemModal() {
    document.getElementById('edit-item-modal').classList.remove('active');
    currentEditItemId = null;
}

async function saveItemEdit() {
    if (!currentEditItemId) return;

    const name = document.getElementById('edit-item-name').value.trim();
    const quantity = parseInt(document.getElementById('edit-item-quantity').value) || 1;
    const needsReplacement = document.getElementById('edit-item-needs-replacement').checked;

    if (name) {
        await apiRequest(`/items/${currentEditItemId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, quantity, needsReplacement })
        });
        closeEditItemModal();
        await loadData();
    }
}

async function deleteItem(boxId, itemIndex) {
    const box = boxes.find(b => b.id === boxId);
    if (box && confirm('Delete this item?')) {
        const item = box.items[itemIndex];
        if (item.id) {
            await apiRequest(`/items/${item.id}`, { method: 'DELETE' });
            await loadData();
        }
    }
}

async function toggleItemReplacement(boxId, itemIndex) {
    const box = boxes.find(b => b.id === boxId);
    if (box && box.items[itemIndex]) {
        const item = box.items[itemIndex];
        if (item.id) {
            await apiRequest(`/items/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: item.name,
                    quantity: item.quantity,
                    needsReplacement: !item.needsReplacement
                })
            });
            await loadData();
        }
    }
}

// Trailer Management
async function toggleBoxInTrailer(boxId) {
    try {
        const box = boxes.find(b => b.id === boxId);
        if (!box) {
            console.error('Box not found:', boxId);
            return;
        }

        // Format lastInspection to just the date part (YYYY-MM-DD)
        let inspectionDate = box.lastInspection;
        if (inspectionDate && inspectionDate.includes('T')) {
            inspectionDate = inspectionDate.split('T')[0];
        }

        console.log('Toggling box', boxId, 'from', box.inTrailer, 'to', !box.inTrailer);

        await apiRequest(`/boxes/${boxId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: box.name,
                color: box.color,
                weight: box.weight || 0,
                notes: box.notes || '',
                lastInspection: inspectionDate,
                inTrailer: !box.inTrailer
            })
        });
        await loadData();
    } catch (error) {
        console.error('Error toggling box in trailer:', error);
        alert('Failed to update trailer status. Please try again.');
    }
}

async function clearTrailer() {
    if (confirm('Remove all boxes from trailer?')) {
        await Promise.all(
            boxes.filter(b => b.inTrailer).map(box => {
                // Format lastInspection to just the date part (YYYY-MM-DD)
                let inspectionDate = box.lastInspection;
                if (inspectionDate && inspectionDate.includes('T')) {
                    inspectionDate = inspectionDate.split('T')[0];
                }

                return apiRequest(`/boxes/${box.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: box.name,
                        color: box.color,
                        weight: box.weight || 0,
                        notes: box.notes || '',
                        lastInspection: inspectionDate,
                        inTrailer: false
                    })
                });
            })
        );
        await loadData();
    }
}

// Profile Management
async function addProfile() {
    const input = document.getElementById('new-profile-name');
    const name = input.value.trim();
    if (name) {
        await apiRequest('/profiles', {
            method: 'POST',
            body: JSON.stringify({
                name,
                requiredBoxes: []
            })
        });
        input.value = '';
        await loadData();
    }
}

async function deleteProfile(id) {
    if (confirm('Delete this profile?')) {
        await apiRequest(`/profiles/${id}`, { method: 'DELETE' });
        await loadData();
    }
}

async function toggleBoxInProfile(profileId, boxId) {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
        const index = profile.requiredBoxes.indexOf(boxId);
        const newRequiredBoxes = [...profile.requiredBoxes];

        if (index > -1) {
            newRequiredBoxes.splice(index, 1);
        } else {
            newRequiredBoxes.push(boxId);
        }

        await apiRequest(`/profiles/${profileId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: profile.name,
                requiredBoxes: newRequiredBoxes
            })
        });
        await loadData();
    }
}

// Search and Filter
function filterBoxes() {
    const search = document.getElementById('search-boxes').value.toLowerCase();
    const filtered = boxes.filter(box => {
        const nameMatch = box.name.toLowerCase().includes(search);
        const itemMatch = box.items.some(item => item.name.toLowerCase().includes(search));
        return nameMatch || itemMatch;
    });

    if (search) {
        renderBoxesFiltered(filtered);
    } else {
        renderBoxes();
    }
}

// Import/Export Functions
async function exportData() {
    const data = {
        boxes,
        profiles,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scout-packing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('This will replace all current data. Continue?')) {
                // Delete existing data
                await Promise.all(boxes.map(box => apiRequest(`/boxes/${box.id}`, { method: 'DELETE' })));
                await Promise.all(profiles.map(profile => apiRequest(`/profiles/${profile.id}`, { method: 'DELETE' })));

                // Import new data
                for (const box of data.boxes) {
                    const newBox = await apiRequest('/boxes', {
                        method: 'POST',
                        body: JSON.stringify({
                            name: box.name,
                            color: box.color,
                            weight: box.weight,
                            notes: box.notes,
                            lastInspection: box.lastInspection,
                            inTrailer: box.inTrailer
                        })
                    });

                    for (const item of box.items) {
                        await apiRequest(`/boxes/${newBox.id}/items`, {
                            method: 'POST',
                            body: JSON.stringify(item)
                        });
                    }
                }

                for (const profile of data.profiles) {
                    await apiRequest('/profiles', {
                        method: 'POST',
                        body: JSON.stringify(profile)
                    });
                }

                await loadData();
                alert('Data imported successfully!');
            }
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

async function resetData() {
    if (confirm('This will delete ALL data. Are you sure?')) {
        if (confirm('Really delete everything? This cannot be undone!')) {
            await Promise.all(boxes.map(box => apiRequest(`/boxes/${box.id}`, { method: 'DELETE' })));
            await Promise.all(profiles.map(profile => apiRequest(`/profiles/${profile.id}`, { method: 'DELETE' })));
            await loadData();
        }
    }
}

// Print Functions
function printBox(box) {
    const trailerStatus = box.inTrailer ? '✓ Currently in Trailer' : '✗ Not in Trailer';
    const content = `
        <h1>Box Inventory: ${box.name}</h1>
        <p><strong>Status:</strong> ${trailerStatus}</p>
        <p><strong>Last Inspection:</strong> ${box.lastInspection || 'Not recorded'}</p>
        <p><strong>Total Items:</strong> ${box.items.length}</p>
        ${box.notes ? `<p><strong>Notes:</strong> ${box.notes}</p>` : ''}
        <h2>Items</h2>
        <ul>
            ${box.items.map(item => `<li>☐ ${item.name} (Qty: ${item.quantity})${item.needsReplacement ? ' <strong>[NEEDS REPLACEMENT]</strong>' : ''}</li>`).join('')}
        </ul>
        <p style="margin-top: 30px;"><em>Printed: ${new Date().toLocaleDateString()}</em></p>
    `;
    printContent(content, box.name);
}

function printBoxById(boxId) {
    const box = boxes.find(b => b.id === boxId);
    if (box) printBox(box);
}

function printAllBoxes() {
    const content = `
        <h1>Complete Box Inventory</h1>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Boxes:</strong> ${boxes.length}</p>
        ${boxes.map(box => `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h2>${box.name} ${box.inTrailer ? '✓ In Trailer' : ''}</h2>
                <p><strong>Last Inspection:</strong> ${box.lastInspection || 'N/A'}</p>
                ${box.notes ? `<p style="font-style: italic;">${box.notes}</p>` : ''}
                <ul>
                    ${box.items.map(item => `<li>☐ ${item.name} (${item.quantity})${item.needsReplacement ? ' [REPLACE]' : ''}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
    `;
    printContent(content, 'All Box Inventories');
}

function printTrailerManifest() {
    const loadedBoxes = boxes.filter(b => b.inTrailer);
    const totalItems = loadedBoxes.reduce((sum, box) => sum + box.items.reduce((s, i) => s + i.quantity, 0), 0);

    const content = `
        <h1>Trailer Load Manifest</h1>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Boxes Loaded:</strong> ${loadedBoxes.length}</p>
        <p><strong>Total Items:</strong> ${totalItems}</p>
        <h2>Currently Loaded Boxes</h2>
        ${loadedBoxes.length > 0 ? `
            <ul>
                ${loadedBoxes.map(box => `
                    <li>
                        ☐ ${box.name} (${box.items.length} items)
                        <ul style="margin-left: 20px;">
                            ${box.items.map(item => `<li>• ${item.name} (${item.quantity})</li>`).join('')}
                        </ul>
                    </li>
                `).join('')}
            </ul>
        ` : '<p>No boxes currently loaded in trailer.</p>'}
    `;
    printContent(content, 'Trailer Manifest');
}

function printCampoutChecklistById(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
        const requiredBoxes = boxes.filter(b => profile.requiredBoxes.includes(b.id));
        const availableBoxes = requiredBoxes.filter(b => b.inTrailer);
        const missingBoxes = requiredBoxes.filter(b => !b.inTrailer);

        const content = `
            <h1>Campout Checklist: ${profile.name}</h1>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Required Boxes:</strong> ${requiredBoxes.length}</p>
            <p><strong>Available in Trailer:</strong> ${availableBoxes.length}</p>
            ${missingBoxes.length > 0 ? `<p><strong>Need to Load:</strong> ${missingBoxes.length}</p>` : ''}

            ${availableBoxes.length > 0 ? `
                <h2>✓ Available Boxes</h2>
                <ul>
                    ${availableBoxes.map(box => `
                        <li>
                            ☑ ${box.name}
                            <ul style="margin-left: 20px;">
                                ${box.items.map(item => `<li>• ${item.name} (${item.quantity})</li>`).join('')}
                            </ul>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}

            ${missingBoxes.length > 0 ? `
                <h2>✗ Need to Load</h2>
                <ul>
                    ${missingBoxes.map(box => `
                        <li>
                            ☐ ${box.name}
                            <ul style="margin-left: 20px;">
                                ${box.items.map(item => `<li>• ${item.name} (${item.quantity})</li>`).join('')}
                            </ul>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
        `;
        printContent(content, profile.name);
    }
}

function printShoppingList() {
    const needsReplacement = [];
    boxes.forEach(box => {
        box.items.forEach(item => {
            if (item.needsReplacement) {
                needsReplacement.push({ item: item.name, box: box.name, quantity: item.quantity });
            }
        });
    });

    const content = `
        <h1>Shopping List</h1>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Items to Replace:</strong> ${needsReplacement.length}</p>
        <h2>Items Needed</h2>
        ${needsReplacement.length > 0 ? `
            <ul>
                ${needsReplacement.map(item => `
                    <li>☐ ${item.item} (Qty: ${item.quantity}) - from ${item.box}</li>
                `).join('')}
            </ul>
        ` : '<p>No items need replacement!</p>'}
    `;
    printContent(content, 'Shopping List');
}

function printContent(content, title) {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                    h2 { color: #3b82f6; margin-top: 20px; }
                    ul { list-style-type: none; padding-left: 0; }
                    li { padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
                </style>
            </head>
            <body>${content}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Rendering Functions
function render() {
    if (currentTab === 'dashboard') {
        renderDashboard();
    } else if (currentTab === 'boxes') {
        renderBoxes();
    } else if (currentTab === 'profiles') {
        renderProfiles();
    } else if (currentTab === 'templates') {
        renderTemplates();
    } else if (currentTab === 'trailer') {
        renderTrailer();
    } else if (currentTab === 'shopping') {
        renderShopping();
    }
}

function renderDashboard() {
    // Calculate stats
    const totalBoxes = boxes.length;
    const totalItems = boxes.reduce((sum, box) => sum + box.items.reduce((s, item) => s + item.quantity, 0), 0);
    const trailerBoxes = boxes.filter(b => b.inTrailer).length;

    const needsReplacement = [];
    boxes.forEach(box => {
        box.items.forEach(item => {
            if (item.needsReplacement) {
                needsReplacement.push({ item: item.name, box: box.name, quantity: item.quantity });
            }
        });
    });

    // Update stat cards
    document.getElementById('dash-total-boxes').textContent = totalBoxes;
    document.getElementById('dash-total-items').textContent = totalItems;
    document.getElementById('dash-trailer-boxes').textContent = trailerBoxes;
    document.getElementById('dash-needs-replacement').textContent = needsReplacement.length;

    // Render campout profiles
    const profilesList = document.getElementById('dash-profiles-list');
    if (profiles.length === 0) {
        profilesList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No campout profiles yet. Create one in the Campout Profiles tab!</p>';
    } else {
        profilesList.innerHTML = profiles.map(profile => {
            const requiredBoxes = boxes.filter(b => profile.requiredBoxes.includes(b.id));
            const availableBoxes = requiredBoxes.filter(b => b.inTrailer);
            const percentage = requiredBoxes.length > 0 ? Math.round((availableBoxes.length / requiredBoxes.length) * 100) : 0;
            const status = percentage === 100 ? '✓ Ready' : `${availableBoxes.length}/${requiredBoxes.length}`;
            const progressClass = percentage === 100 ? '' : percentage >= 50 ? 'medium' : 'low';

            return `
                <div class="dashboard-item">
                    <div>
                        <strong>${profile.name}</strong>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">${status}</div>
                    </div>
                    <button class="btn btn-small" onclick="showTab('profiles')"  style="padding: 5px 10px;">View</button>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${progressClass}" style="width: ${percentage}%">${percentage}%</div>
                </div>
            `;
        }).join('');
    }

    // Render items needing replacement
    const replacementItems = document.getElementById('dash-replacement-items');
    if (needsReplacement.length === 0) {
        replacementItems.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">🎉 All items are in good condition!</p>';
    } else {
        replacementItems.innerHTML = needsReplacement.slice(0, 5).map(item => `
            <div class="dashboard-item">
                <div>
                    <strong>${item.item}</strong>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">from ${item.box} (Qty: ${item.quantity})</div>
                </div>
                <span class="badge badge-warning">REPLACE</span>
            </div>
        `).join('') +
        (needsReplacement.length > 5 ? `<p style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);">+ ${needsReplacement.length - 5} more items</p>` : '');
    }

    // Render trailer load status
    const trailerLoad = document.getElementById('dash-trailer-load');
    const loadedBoxes = boxes.filter(b => b.inTrailer);

    if (loadedBoxes.length === 0) {
        trailerLoad.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No boxes currently loaded in trailer.</p>';
    } else {
        const trailerItems = loadedBoxes.reduce((sum, box) => sum + box.items.reduce((s, i) => s + i.quantity, 0), 0);

        trailerLoad.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: var(--bg-card-secondary); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-primary);">${loadedBoxes.length}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Boxes Loaded</div>
                </div>
                <div style="background: var(--bg-card-secondary); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--text-primary);">${trailerItems}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Total Items</div>
                </div>
            </div>
            <div style="display: grid; gap: 10px;">
                ${loadedBoxes.map(box => `
                    <div class="dashboard-item" style="border-left: 3px solid ${box.color}">
                        <div>
                            <strong>${box.name}</strong>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">
                                ${box.items.length} items
                            </div>
                        </div>
                        <span style="color: #16a34a;">✓</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function renderBoxes() {
    const container = document.getElementById('boxes-container');
    container.innerHTML = boxes.map(box => {
        const totalItems = box.items.reduce((sum, item) => sum + item.quantity, 0);
        return `
        <div class="box-card ${box.inTrailer ? 'in-trailer' : ''}" style="border-left: 4px solid ${box.color}" data-box-id="${box.id}">
            <div class="box-header">
                <div>
                    <h3>${box.name}</h3>
                    <div class="box-meta">
                        Last Inspection: ${box.lastInspection || 'N/A'}
                    </div>
                </div>
                <div class="box-actions">
                    <button class="icon-btn" onclick="showQRCode(${box.id})" title="Show QR Code" style="font-size: 18px;">📱</button>
                    <button class="icon-btn green" onclick="printBoxById(${box.id})" title="Print">🖨️</button>
                    <button class="icon-btn blue" onclick="openEditModal(${box.id})" title="Edit">✏️</button>
                    <button class="icon-btn red" onclick="deleteBox(${box.id})" title="Delete">🗑️</button>
                </div>
            </div>
            <ul class="item-list">
                ${box.items.map((item, idx) => `
                    <li>
                        <span>
                            ${item.name}
                            ${item.quantity > 1 ? `<span class="item-quantity">×${item.quantity}</span>` : ''}
                            ${item.needsReplacement ? ' <span class="badge badge-warning">REPLACE</span>' : ''}
                        </span>
                        <div>
                            <button class="icon-btn" onclick="toggleItemReplacement(${box.id}, ${idx})" title="Toggle replacement">
                                ${item.needsReplacement ? '✓' : '🛒'}
                            </button>
                            <button class="icon-btn blue" onclick="openEditItemModal(${item.id})" title="Edit">✏️</button>
                            <button class="icon-btn red" onclick="deleteItem(${box.id}, ${idx})" title="Delete">🗑️</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <button class="btn btn-small" onclick="openAddItemModal(${box.id})">➕ Add Item</button>
                <button class="btn btn-small" onclick="openTemplatesModal(${box.id})" style="background: #16a34a;">📝 Quick Add</button>
            </div>
            ${box.notes ? `
                <div class="notes-section">
                    <div class="notes-label">Notes:</div>
                    <div class="notes-text">${box.notes}</div>
                </div>
            ` : ''}
            <div class="item-count">${totalItems} items total ${box.inTrailer ? '• In Trailer ✓' : '• Not in Trailer'}</div>
        </div>
    `}).join('');
}

function renderBoxesFiltered(filtered) {
    const container = document.getElementById('boxes-container');
    container.innerHTML = filtered.map(box => {
        const totalItems = box.items.reduce((sum, item) => sum + item.quantity, 0);
        return `
        <div class="box-card ${box.inTrailer ? 'in-trailer' : ''}" style="border-left: 4px solid ${box.color}" data-box-id="${box.id}">
            <div class="box-header">
                <div>
                    <h3>${box.name}</h3>
                    <div class="box-meta">
                        Last Inspection: ${box.lastInspection || 'N/A'}
                    </div>
                </div>
                <div class="box-actions">
                    <button class="icon-btn" onclick="showQRCode(${box.id})" title="Show QR Code" style="font-size: 18px;">📱</button>
                    <button class="icon-btn green" onclick="printBoxById(${box.id})" title="Print">🖨️</button>
                    <button class="icon-btn blue" onclick="openEditModal(${box.id})" title="Edit">✏️</button>
                    <button class="icon-btn red" onclick="deleteBox(${box.id})" title="Delete">🗑️</button>
                </div>
            </div>
            <ul class="item-list">
                ${box.items.map((item, idx) => `
                    <li>
                        <span>
                            ${item.name}
                            ${item.quantity > 1 ? `<span class="item-quantity">×${item.quantity}</span>` : ''}
                            ${item.needsReplacement ? ' <span class="badge badge-warning">REPLACE</span>' : ''}
                        </span>
                        <div>
                            <button class="icon-btn" onclick="toggleItemReplacement(${box.id}, ${idx})" title="Toggle replacement">
                                ${item.needsReplacement ? '✓' : '🛒'}
                            </button>
                            <button class="icon-btn blue" onclick="openEditItemModal(${item.id})" title="Edit">✏️</button>
                            <button class="icon-btn red" onclick="deleteItem(${box.id}, ${idx})" title="Delete">🗑️</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <button class="btn btn-small" onclick="openAddItemModal(${box.id})">➕ Add Item</button>
                <button class="btn btn-small" onclick="openTemplatesModal(${box.id})" style="background: #16a34a;">📝 Quick Add</button>
            </div>
            ${box.notes ? `
                <div class="notes-section">
                    <div class="notes-label">Notes:</div>
                    <div class="notes-text">${box.notes}</div>
                </div>
            ` : ''}
            <div class="item-count">${totalItems} items total ${box.inTrailer ? '• In Trailer ✓' : '• Not in Trailer'}</div>
        </div>
    `}).join('');
}

function renderTrailer() {
    const loadedBoxes = boxes.filter(b => b.inTrailer);
    const totalItems = loadedBoxes.reduce((sum, box) => sum + box.items.reduce((s, i) => s + i.quantity, 0), 0);

    document.getElementById('loaded-count').textContent = loadedBoxes.length;
    document.getElementById('total-count').textContent = boxes.length;
    document.getElementById('items-count').textContent = totalItems;

    const container = document.getElementById('trailer-boxes-container');
    container.innerHTML = boxes.map(box => {
        const totalItems = box.items.reduce((sum, item) => sum + item.quantity, 0);
        return `
        <label class="checkbox-label ${box.inTrailer ? 'in-trailer' : ''}" style="border-left: 3px solid ${box.color}">
            <input type="checkbox" ${box.inTrailer ? 'checked' : ''} onchange="toggleBoxInTrailer(${box.id})">
            <span><strong>${box.name}</strong> (${totalItems} items)</span>
        </label>
    `}).join('');
}

function renderProfiles() {
    const container = document.getElementById('profiles-container');
    container.innerHTML = profiles.map(profile => {
        const requiredBoxes = boxes.filter(b => profile.requiredBoxes.includes(b.id));
        const availableBoxes = requiredBoxes.filter(b => b.inTrailer);

        return `
            <div class="profile-card">
                <div class="box-header">
                    <div>
                        <h3>${profile.name}</h3>
                        ${requiredBoxes.length > 0 ? `
                            <p style="color: var(--text-secondary); font-size: 14px; margin-top: 5px;">
                                ${availableBoxes.length}/${requiredBoxes.length} boxes in trailer
                                ${availableBoxes.length === requiredBoxes.length ? ' <span style="color: #16a34a;">✓ Ready</span>' : ''}
                            </p>
                        ` : ''}
                    </div>
                    <div class="box-actions">
                        <button class="icon-btn green" onclick="printCampoutChecklistById(${profile.id})" title="Print checklist">🖨️</button>
                        <button class="icon-btn red" onclick="deleteProfile(${profile.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 14px;">Select boxes needed for this campout:</p>
                <div class="checkbox-grid">
                    ${boxes.map(box => `
                        <label class="checkbox-label ${box.inTrailer ? 'in-trailer' : ''}" style="border-left: 3px solid ${box.color}">
                            <input type="checkbox" ${profile.requiredBoxes.includes(box.id) ? 'checked' : ''} onchange="toggleBoxInProfile(${profile.id}, ${box.id})">
                            <span>${box.name} ${box.inTrailer ? '✓' : ''}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="item-count">${profile.requiredBoxes.length} box(es) selected</div>
            </div>
        `;
    }).join('');
}

function renderShopping() {
    const needsReplacement = [];
    boxes.forEach(box => {
        box.items.forEach(item => {
            if (item.needsReplacement) {
                needsReplacement.push({ item: item.name, box: box.name, quantity: item.quantity });
            }
        });
    });

    const container = document.getElementById('shopping-container');

    if (needsReplacement.length === 0) {
        container.innerHTML = '<div class="info-box"><p>🎉 No items need replacement! Everything is in good condition.</p></div>';
    } else {
        container.innerHTML = `
            <div class="shopping-list">
                <h3>🛒 Items to Purchase (${needsReplacement.length})</h3>
                ${needsReplacement.map(item => `
                    <div class="shopping-item">
                        <span><strong>${item.item}</strong> (Qty: ${item.quantity}) - from ${item.box}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// QR Code Functions
let currentQRCode = null;
let currentQRBoxId = null;

function showQRCode(boxId) {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    currentQRBoxId = boxId;
    document.getElementById('qr-box-name').textContent = box.name;

    // Clear previous QR code
    const container = document.getElementById('qr-code-container');
    container.innerHTML = '';

    // Generate QR code with URL to the box
    const boxURL = `${window.location.origin}${window.location.pathname}?box=${boxId}`;

    currentQRCode = new QRCode(container, {
        text: boxURL,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    document.getElementById('qr-modal').classList.add('active');
}

function closeQRModal() {
    document.getElementById('qr-modal').classList.remove('active');
    currentQRCode = null;
    currentQRBoxId = null;
}

function downloadQRCode() {
    const canvas = document.querySelector('#qr-code-container canvas');
    if (!canvas) return;

    const box = boxes.find(b => b.id === currentQRBoxId);
    const fileName = box ? `${box.name.replace(/[^a-z0-9]/gi, '_')}_QR.png` : 'box_qr.png';

    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Check if URL has box parameter (from QR code scan)
function checkBoxParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const boxId = urlParams.get('box');

    if (boxId) {
        // Find and show the box
        const box = boxes.find(b => b.id === parseInt(boxId));
        if (box) {
            // Switch to boxes tab and highlight the box
            currentTab = 'boxes';
            showTab('boxes');

            // Scroll to the box (after a short delay for rendering)
            setTimeout(() => {
                const boxElement = document.querySelector(`[data-box-id="${boxId}"]`);
                if (boxElement) {
                    boxElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    boxElement.style.animation = 'highlight 2s';
                }
            }, 300);
        }
    }
}

// Global Search Function
function globalSearch() {
    const searchTerm = document.getElementById('global-search').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('global-search-results');

    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
    }

    const results = [];

    // Search boxes
    boxes.forEach(box => {
        if (box.name.toLowerCase().includes(searchTerm)) {
            results.push({
                type: 'Box',
                title: box.name,
                details: `${box.items.length} items`,
                action: () => {
                    currentTab = 'boxes';
                    document.getElementById('global-search').value = '';
                    globalSearch();
                    showTab('boxes');
                    setTimeout(() => {
                        const boxElement = document.querySelector(`[data-box-id="${box.id}"]`);
                        if (boxElement) {
                            boxElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            boxElement.style.animation = 'highlight 2s';
                        }
                    }, 300);
                }
            });
        }

        // Search items within boxes
        box.items.forEach(item => {
            if (item.name.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: 'Item',
                    title: item.name,
                    details: `In ${box.name} • Qty: ${item.quantity}`,
                    action: () => {
                        currentTab = 'boxes';
                        document.getElementById('global-search').value = '';
                        globalSearch();
                        showTab('boxes');
                        setTimeout(() => {
                            const boxElement = document.querySelector(`[data-box-id="${box.id}"]`);
                            if (boxElement) {
                                boxElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                boxElement.style.animation = 'highlight 2s';
                            }
                        }, 300);
                    }
                });
            }
        });
    });

    // Search profiles
    profiles.forEach(profile => {
        if (profile.name.toLowerCase().includes(searchTerm)) {
            const requiredBoxes = boxes.filter(b => profile.requiredBoxes.includes(b.id));
            results.push({
                type: 'Profile',
                title: profile.name,
                details: `${requiredBoxes.length} boxes required`,
                action: () => {
                    currentTab = 'profiles';
                    document.getElementById('global-search').value = '';
                    globalSearch();
                    showTab('profiles');
                }
            });
        }
    });

    // Display results
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result"><p style="color: var(--text-secondary); text-align: center;">No results found</p></div>';
        resultsContainer.classList.remove('hidden');
    } else {
        resultsContainer.innerHTML = results.slice(0, 10).map(result => `
            <div class="search-result" onclick="searchResultClick(${results.indexOf(result)})">
                <div class="search-result-header">
                    <div class="search-result-title">${highlightText(result.title, searchTerm)}</div>
                    <div class="search-result-type">${result.type}</div>
                </div>
                <div class="search-result-details">${result.details}</div>
            </div>
        `).join('') + (results.length > 10 ? `<p style="text-align: center; color: var(--text-secondary); font-size: 13px;">+ ${results.length - 10} more results</p>` : '');
        resultsContainer.classList.remove('hidden');
    }

    // Store results for click handlers
    window.searchResults = results;
}

function highlightText(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function searchResultClick(index) {
    if (window.searchResults && window.searchResults[index]) {
        window.searchResults[index].action();
    }
}

// Item Templates Functions
function openTemplatesModal(boxId) {
    currentTemplateBoxId = boxId;

    const templatesList = document.getElementById('templates-list');

    if (templates.length === 0) {
        templatesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No templates available. Create some in the Templates tab!</p>';
    } else {
        templatesList.innerHTML = templates.map(template => {
            const items = template.items;
            return `
                <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; margin-bottom: 15px; background: var(--bg-card-secondary);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="color: var(--text-primary); margin: 0;">${template.name}</h4>
                        <button class="btn btn-small btn-green" onclick="applyTemplate(${template.id})">+ Add All (${items.length})</button>
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${items.slice(0, 3).map(item => item.name).join(', ')}${items.length > 3 ? ', ...' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('templates-modal').classList.add('active');
}

function closeTemplatesModal() {
    document.getElementById('templates-modal').classList.remove('active');
    currentTemplateBoxId = null;
}

async function applyTemplate(templateId) {
    if (!currentTemplateBoxId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const items = template.items;
    const box = boxes.find(b => b.id === currentTemplateBoxId);

    if (!box) return;

    try {
        // Add all items from template
        for (const item of items) {
            await apiRequest(`/boxes/${currentTemplateBoxId}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    name: item.name,
                    quantity: item.quantity,
                    needsReplacement: false
                })
            });
        }

        await loadBoxes();
        render();
        closeTemplatesModal();
        alert(`Added ${items.length} items from ${template.name} template!`);
    } catch (error) {
        console.error('Error applying template:', error);
    }
}

// Template Management Functions
function renderTemplates() {
    const container = document.getElementById('templates-container');

    if (templates.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No custom templates yet. Click "Create Template" to get started!</p>';
        return;
    }

    container.innerHTML = templates.map(template => `
        <div class="box-card" style="border-left: 4px solid #8b5cf6">
            <div class="box-header">
                <div>
                    <h3>${template.name}</h3>
                    <div class="box-meta">
                        ${template.items.length} items
                    </div>
                </div>
                <div class="box-actions">
                    <button class="icon-btn blue" onclick="openEditTemplateModal(${template.id})" title="Edit">✏️</button>
                    <button class="icon-btn red" onclick="deleteTemplate(${template.id})" title="Delete">🗑️</button>
                </div>
            </div>
            <ul class="item-list">
                ${template.items.map(item => `
                    <li>
                        <span>
                            ${item.name}
                            ${item.quantity > 1 ? `<span class="item-quantity">×${item.quantity}</span>` : ''}
                        </span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

function openCreateTemplateModal() {
    currentEditTemplateId = null;
    document.getElementById('manage-template-title').textContent = 'Create Template';
    document.getElementById('template-name').value = '';
    document.getElementById('template-items-list').innerHTML = '';
    addTemplateItem(); // Add one empty item by default
    document.getElementById('manage-template-modal').classList.add('active');
}

function openEditTemplateModal(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    currentEditTemplateId = templateId;
    document.getElementById('manage-template-title').textContent = 'Edit Template';
    document.getElementById('template-name').value = template.name;

    const itemsList = document.getElementById('template-items-list');
    itemsList.innerHTML = '';

    template.items.forEach(item => {
        addTemplateItem(item.name, item.quantity);
    });

    document.getElementById('manage-template-modal').classList.add('active');
}

function closeManageTemplateModal() {
    document.getElementById('manage-template-modal').classList.remove('active');
    currentEditTemplateId = null;
}

let templateItemCounter = 0;

function addTemplateItem(name = '', quantity = 1) {
    const itemsList = document.getElementById('template-items-list');
    const itemId = `template-item-${templateItemCounter++}`;

    const itemDiv = document.createElement('div');
    itemDiv.id = itemId;
    itemDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    itemDiv.innerHTML = `
        <input type="text" placeholder="Item name" value="${name}" style="flex: 1;" class="template-item-name">
        <input type="number" placeholder="Qty" value="${quantity}" min="1" style="width: 80px;" class="template-item-qty">
        <button class="icon-btn red" onclick="removeTemplateItem('${itemId}')" title="Remove">🗑️</button>
    `;

    itemsList.appendChild(itemDiv);
}

function removeTemplateItem(itemId) {
    const item = document.getElementById(itemId);
    if (item) {
        item.remove();
    }
}

async function saveTemplate() {
    const name = document.getElementById('template-name').value.trim();
    if (!name) {
        alert('Please enter a template name');
        return;
    }

    const itemElements = document.querySelectorAll('#template-items-list > div');
    const items = [];

    itemElements.forEach(el => {
        const itemName = el.querySelector('.template-item-name').value.trim();
        const quantity = parseInt(el.querySelector('.template-item-qty').value) || 1;

        if (itemName) {
            items.push({ name: itemName, quantity });
        }
    });

    if (items.length === 0) {
        alert('Please add at least one item');
        return;
    }

    try {
        if (currentEditTemplateId) {
            // Update existing template
            await apiRequest(`/templates/${currentEditTemplateId}`, {
                method: 'PUT',
                body: JSON.stringify({ name, items })
            });
        } else {
            // Create new template
            await apiRequest('/templates', {
                method: 'POST',
                body: JSON.stringify({ name, items })
            });
        }

        await loadTemplates();
        render();
        closeManageTemplateModal();
    } catch (error) {
        console.error('Error saving template:', error);
    }
}

async function deleteTemplate(id) {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    try {
        await apiRequest(`/templates/${id}`, {
            method: 'DELETE'
        });

        await loadTemplates();
        render();
    } catch (error) {
        console.error('Error deleting template:', error);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    checkBoxParameter();
});
