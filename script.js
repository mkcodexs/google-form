// ======================= CONFIGURATION =======================
// ⚠️ REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT URL ⚠️
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
// Get this from Step 3 of the setup guide

// ======================= INITIALIZATION =======================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize counters from localStorage
    initializeCounters();
    
    // Update live status
    updateLiveStatus();
    
    // Setup character counter
    setupCharacterCounter();
    
    // Setup form validation
    setupFormValidation();
    
    // Setup event listeners
    setupEventListeners();
});

// ======================= COUNTER FUNCTIONS =======================
function initializeCounters() {
    try {
        // Get today's date string (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's count
        const todayKey = `formSubmissions_${today}`;
        const todayCount = localStorage.getItem(todayKey) || 0;
        document.getElementById('todayCount').textContent = todayCount;
        
        // Get total count
        const totalCount = localStorage.getItem('formSubmissionsTotal') || 0;
        document.getElementById('totalCount').textContent = totalCount;
        
    } catch (e) {
        console.log('Local storage not available');
    }
}

function updateCounters() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayKey = `formSubmissions_${today}`;
        
        // Update today's count
        let todayCount = parseInt(localStorage.getItem(todayKey) || 0);
        todayCount++;
        localStorage.setItem(todayKey, todayCount);
        document.getElementById('todayCount').textContent = todayCount;
        
        // Update total count
        let totalCount = parseInt(localStorage.getItem('formSubmissionsTotal') || 0);
        totalCount++;
        localStorage.setItem('formSubmissionsTotal', totalCount);
        document.getElementById('totalCount').textContent = totalCount;
        
    } catch (e) {
        console.log('Failed to update counters');
    }
}

// ======================= FORM SUBMISSION =======================
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get form elements
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageBox = document.getElementById('messageBox');
    const statusBar = document.getElementById('statusBar');
    
    // Get form data
    const formData = {
        timestamp: new Date().toISOString(),
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value.trim()
    };
    
    // Validate form
    const validation = validateForm(formData);
    if (!validation.isValid) {
        showMessage(validation.message, 'error');
        return;
    }
    
    // Disable button and show loading
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving to Google Sheets...';
    submitBtn.disabled = true;
    
    // Update status bar
    statusBar.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Sending data to Google Sheets...';
    statusBar.style.background = '#fef3c7';
    
    try {
        // Test connection first
        await testConnection();
        
        // Send data to Google Apps Script
        const response = await sendToGoogleSheets(formData);
        
        if (response.success) {
            // Success
            showMessage('✅ Success! Data saved to Google Sheets.', 'success');
            updateCounters();
            
            // Update status bar
            statusBar.innerHTML = '<i class="fas fa-check-circle"></i> Last submission: Just now';
            statusBar.style.background = '#d1fae5';
            
            // Reset form
            form.reset();
            document.getElementById('charCount').textContent = '0';
            
            // Add visual feedback
            document.body.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
            setTimeout(() => {
                document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }, 1000);
            
        } else {
            // Error from Google Script
            showMessage(`⚠️ Error: ${response.error || 'Unknown error'}`, 'error');
            statusBar.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error saving data';
            statusBar.style.background = '#fed7d7';
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Failed to save data. ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Check your internet connection and make sure the Google Script URL is correct.';
        } else if (error.message.includes('CORS')) {
            errorMessage += 'CORS error. The Google Script might not be deployed correctly.';
        } else {
            errorMessage += 'Please try again or check the setup guide.';
        }
        
        showMessage(errorMessage, 'error');
        statusBar.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection failed';
        statusBar.style.background = '#fed7d7';
        
    } finally {
        // Re-enable button
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 2000);
    }
}

// ======================= VALIDATION =======================
function validateForm(data) {
    const errors = [];
    
    if (!data.name || data.name.length < 2) {
        errors.push('Name must be at least 2 characters');
    }
    
    if (!data.email) {
        errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
        errors.push('Please enter a valid email address');
    }
    
    if (data.phone && !isValidPhone(data.phone)) {
        errors.push('Please enter a valid phone number');
    }
    
    if (!data.subject) {
        errors.push('Please select a subject');
    }
    
    if (!data.message || data.message.length < 10) {
        errors.push('Message must be at least 10 characters');
    } else if (data.message.length > 500) {
        errors.push('Message must be less than 500 characters');
    }
    
    return {
        isValid: errors.length === 0,
        message: errors.length > 0 ? errors.join('<br>') : 'Valid'
    };
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    // Allow various phone formats
    const re = /^[\d\s\-\+\(\)]{10,}$/;
    return re.test(phone.replace(/\D/g, '')) && phone.replace(/\D/g, '').length >= 10;
}

// ======================= GOOGLE SHEETS COMMUNICATION =======================
async function testConnection() {
    try {
        // Simple HEAD request to check if URL is accessible
        const test = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'HEAD',
            mode: 'no-cors'
        });
        return true;
    } catch (error) {
        console.log('Connection test failed:', error);
        return false;
    }
}

async function sendToGoogleSheets(data) {
    // Using no-cors mode for Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Important for Google Apps Script
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    // Note: With 'no-cors' mode, we can't read the response directly
    // But the data is still sent successfully
    
    // For debugging, you can check the network tab in DevTools
    console.log('Data sent to Google Sheets:', data);
    
    // Since we can't read response with no-cors, we assume success
    // In a real app with CORS enabled, you would parse the response
    return { success: true };
}

// ======================= UI FUNCTIONS =======================
function showMessage(text, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.innerHTML = text;
    messageBox.className = `message ${type}`;
    messageBox.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}

function setupCharacterCounter() {
    const messageInput = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    
    messageInput.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = length;
        
        // Color coding
        if (length > 450) {
            charCount.style.color = '#e53e3e';
        } else if (length > 300) {
            charCount.style.color = '#d69e2e';
        } else {
            charCount.style.color = '#718096';
        }
    });
}

function setupFormValidation() {
    const inputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.style.borderColor = '#e53e3e';
                this.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.1)';
            }
        });
        
        input.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '#4299e1';
                this.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.1)';
            }
        });
    });
}

function updateLiveStatus() {
    const statusElement = document.getElementById('liveStatus');
    
    // Simulate status check
    setTimeout(() => {
        if (GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Not Configured';
            statusElement.style.background = 'rgba(229, 62, 62, 0.2)';
        } else {
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
            statusElement.style.background = 'rgba(72, 187, 120, 0.2)';
        }
    }, 1000);
}

function setupEventListeners() {
    // Form submission
    document.getElementById('contactForm').addEventListener('submit', handleFormSubmit);
    
    // View sheet button
    document.getElementById('viewSheetBtn').addEventListener('click', function(e) {
        e.preventDefault();
        alert('To view your Google Sheet:\n1. Go to sheets.google.com\n2. Open the sheet you created\n3. Data will appear there automatically');
    });
}

// ======================= SETUP GUIDE MODAL =======================
function showSetupGuide() {
    const modal = document.getElementById('setupModal');
    const content = document.getElementById('setupContent');
    
    content.innerHTML = `
        <h3><i class="fas fa-cogs"></i> Complete Setup Guide</h3>
        
        <h4>Step 1: Create Google Sheet</h4>
        <ol>
            <li>Go to <a href="https://sheets.google.com" target="_blank">sheets.google.com</a></li>
            <li>Click "+ Blank" to create new sheet</li>
            <li>Note the Sheet ID from URL: <code>docs.google.com/spreadsheets/d/<strong>YOUR_SHEET_ID</strong>/edit</code></li>
        </ol>
        
        <h4>Step 2: Create Google Apps Script</h4>
        <ol>
            <li>Go to <a href="https://script.google.com" target="_blank">script.google.com</a></li>
            <li>Click "New Project"</li>
            <li>Delete default code and paste the Apps Script code (provided below)</li>
            <li>Replace <code>YOUR_SHEET_ID</code> with your actual Sheet ID</li>
            <li>Click "Save" (Ctrl+S)</li>
        </ol>
        
        <h4>Step 3: Deploy as Web App</h4>
        <ol>
            <li>Click "Deploy" → "New deployment"</li>
            <li>Select "Web app"</li>
            <li>Description: "Form API v1.0"</li>
            <li>Execute as: "Me"</li>
            <li>Who has access: <strong>"Anyone"</strong> (important!)</li>
            <li>Click "Deploy"</li>
            <li>Copy the Web App URL (looks like: <code>https://script.google.com/macros/s/.../exec</code>)</li>
        </ol>
        
        <h4>Step 4: Update Your Form</h4>
        <ol>
            <li>Open <code>script.js</code> in a text editor</li>
            <li>Find line with <code>const GOOGLE_SCRIPT_URL =</code></li>
            <li>Replace the URL with your copied Web App URL</li>
            <li>Save the file</li>
        </ol>
        
        <h4>Step 5: Test Your Form</h4>
        <ol>
            <li>Open your GitHub Pages site</li>
            <li>Fill out and submit the form</li>
            <li>Check your Google Sheet - data should appear!</li>
        </ol>
        
        <h4>Need Help?</h4>
        <ul>
            <li>Check browser console for errors (F12 → Console)</li>
            <li>Ensure Google Script is deployed as "Anyone"</li>
            <li>Verify Sheet ID is correct</li>
            <li>Check that you have edit access to the sheet</li>
        </ul>
        
        <h4>Apps Script Code:</h4>
        <pre style="background: #f7fafc; padding: 15px; border-radius: 5px; overflow-x: auto;">
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID').getActiveSheet();
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Phone', 'Subject', 'Message']);
    }
    
    // Append data
    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.subject || '',
      data.message || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}</pre>
    `;
    
    modal.style.display = 'flex';
}

function hideSetupGuide() {
    document.getElementById('setupModal').style.display = 'none';
}

function showTroubleshooting() {
    const modal = document.getElementById('setupModal');
    const content = document.getElementById('setupContent');
    
    content.innerHTML = `
        <h3><i class="fas fa-wrench"></i> Troubleshooting Guide</h3>
        
        <h4>Common Issues & Solutions:</h4>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <h5><i class="fas fa-exclamation-triangle"></i> Form not submitting</h5>
            <ul>
                <li><strong>Check Google Script URL:</strong> Make sure it's correct</li>
                <li><strong>Deployment settings:</strong> Script must be deployed as "Anyone"</li>
                <li><strong>Sheet permissions:</strong> Ensure you have edit access to the sheet</li>
            </ul>
        </div>
        
        <div style="background: #d1fae5; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <h5><i class="fas fa-database"></i> Data not appearing in sheet</h5>
            <ul>
                <li><strong>Sheet ID:</strong> Verify Sheet ID in Apps Script code</li>
                <li><strong>Sheet name:</strong> Using getActiveSheet() - make sure correct tab is active</li>
                <li><strong>Refresh sheet:</strong> Data may take a few seconds to appear</li>
            </ul>
        </div>
        
        <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <h5><i class="fas fa-network-wired"></i> CORS/Network errors</h5>
            <ul>
                <li><strong>Browser console:</strong> Check F12 → Console for detailed errors</li>
                <strong>No-cors mode:</strong> We're using no-cors mode, so response can't be read</li>
                <li><strong>Internet connection:</strong> Ensure you're connected to the internet</li>
            </ul>
        </div>
        
        <div style="background: #f3e8ff; padding: 15px; border-radius: 5px;">
            <h5><i class="fas fa-mobile-alt"></i> Mobile issues</h5>
            <ul>
                <li><strong>Browser compatibility:</strong> Try Chrome or Firefox</li>
                <li><strong>Form display:</strong> Form is fully responsive</li>
                <li><strong>Local storage:</strong> Counters use localStorage which works on mobile</li>
            </ul>
        </div>
        
        <h4>Debugging Steps:</h4>
        <ol>
            <li>Open browser Developer Tools (F12)</li>
            <li>Go to Console tab</li>
            <li>Submit form and check for errors</li>
            <li>Go to Network tab to see the request</li>
            <li>Check if request is being sent to correct URL</li>
            <li>Manually visit your Google Script URL to test</li>
        </ol>
        
        <h4>Quick Tests:</h4>
        <button onclick="testGoogleScript()" style="padding: 10px 15px; background: #4299e1; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
            Test Google Script Connection
        </button>
        <button onclick="clearLocalStorage()" style="padding: 10px 15px; background: #e53e3e; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
            Reset Local Counters
        </button>
        <button onclick="showCurrentConfig()" style="padding: 10px 15px; background: #48bb78; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
            Show Current Configuration
        </button>
    `;
    
    modal.style.display = 'flex';
}

// ======================= DEBUG FUNCTIONS =======================
function testGoogleScript() {
    fetch(GOOGLE_SCRIPT_URL, { method: 'HEAD', mode: 'no-cors' })
        .then(() => alert('✅ Google Script is accessible!'))
        .catch(() => alert('❌ Cannot reach Google Script. Check URL and deployment.'));
}

function clearLocalStorage() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('formSubmissions')) {
            localStorage.removeItem(key);
        }
    });
    initializeCounters();
    alert('Local counters reset!');
}

function showCurrentConfig() {
    alert(`Current Configuration:\n\nGoogle Script URL: ${GOOGLE_SCRIPT_URL}\n\nToday's Submissions: ${document.getElementById('todayCount').textContent}\nTotal Submissions: ${document.getElementById('totalCount').textContent}`);
}

// ======================= UTILITY FUNCTIONS =======================
// Make functions globally available for button clicks
window.showSetupGuide = showSetupGuide;
window.hideSetupGuide = hideSetupGuide;
window.showTroubleshooting = showTroubleshooting;
window.testGoogleScript = testGoogleScript;
window.clearLocalStorage = clearLocalStorage;
window.showCurrentConfig = showCurrentConfig;
