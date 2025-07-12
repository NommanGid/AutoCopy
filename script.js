let extractedText = '';
let selectedFields = new Set();

// Initialize drag and drop functionality
const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const loadingOverlay = document.getElementById('loading');
const notificationContainer = document.getElementById('notificationContainer') || (() => {
    const div = document.createElement('div');
    div.id = 'notificationContainer';
    document.body.appendChild(div);
    return div;
})();

if (!dropZone || !imageInput || !loadingOverlay) {
    alert('Critical elements missing from the page. Please reload.');
    throw new Error('Critical elements missing');
}

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4834d4';
    dropZone.style.backgroundColor = '#f8f9fe';
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#6c5ce7';
    dropZone.style.backgroundColor = 'white';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#6c5ce7';
    dropZone.style.backgroundColor = 'white';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        displayImage(file);
        processImage(file);
    } else {
        showNotification('Please drop a valid image file.', 'error');
    }
});

async function processImage(file) {
    showLoading();
    
    try {
        const result = await Tesseract.recognize(file, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    document.querySelector('.loading-spinner').textContent = 
                        `Processing: ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        
        extractedText = result.data.text;
        displayCheckboxes(extractedText);
    } catch (error) {
        console.error('Error processing image:', error);
        showNotification('Error processing image. Please try again.', 'error');
    }
    
    hideLoading();
}

function displayCheckboxes(text) {
    const lines = text.split('\n')
        .filter(line => line.trim())
        .map(line => line.trim());

    const container = document.getElementById('checkboxContainer');
    container.innerHTML = '';

    const uniqueLines = [...new Set(lines)]; // Remove duplicates

    uniqueLines.forEach((line, index) => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="field${index}" value="${line}">
            <label for="field${index}">${line}</label>
        `;
        container.appendChild(checkboxItem);
    });
}

function createTable() {
    const checkboxes = document.querySelectorAll('#checkboxContainer input[type="checkbox"]:checked');
    const selectedValues = Array.from(checkboxes).map(cb => cb.value);

    if (selectedValues.length === 0) {
        showNotification('Please select at least one field', 'warning');
        return;
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    ${selectedValues.map(value => `<th>${value}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr>
                    ${selectedValues.map(() => `<td contenteditable="true"></td>`).join('')}
                </tr>
            </tbody>
        </table>
        <div class="actions" style="margin-top: 1rem;">
            <button class="btn btn-secondary" onclick="addTableRow()">
                <i class="fas fa-plus"></i> Add Row
            </button>
            <button class="btn" onclick="exportToExcel()">
                <i class="fas fa-file-excel"></i> Export to Excel
            </button>
        </div>
    `;

    document.getElementById('tableContainer').innerHTML = tableHTML;
}

function addTableRow() {
    const tbody = document.querySelector('table tbody');
    const columnCount = document.querySelectorAll('table th').length;
    const newRow = document.createElement('tr');
    
    for (let i = 0; i < columnCount; i++) {
        newRow.innerHTML += '<td contenteditable="true"></td>';
    }
    
    tbody.appendChild(newRow);
}

function exportToExcel() {
    const table = document.querySelector('table');
    if (!table) {
        showNotification('No table to export.', 'warning');
        return;
    }
    const rows = table.querySelectorAll('tr');
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = Array.from(cells).map(cell => cell.textContent);
        csvContent += rowData.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "form_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function captureImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            displayImage(file);
            processImage(file);
        }
    };
    
    input.click();
}

function displayImage(file) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    const reader = new FileReader();
    
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Form preview image">`;
    };
    
    reader.readAsDataURL(file);
}

function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    notificationContainer.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Event listener for file input
document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        displayImage(file);
        processImage(file);
    } else {
        showNotification('Please select a valid image file.', 'error');
    }
});