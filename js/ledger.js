// js/ledger.js
document.addEventListener("DOMContentLoaded", () => {
    // Get all the important elements from the page
    const ledgerForm = document.getElementById("ledger-form");
    const listEl = document.getElementById("ledger-list");
    const chartEl = document.getElementById("profit-chart");
    const formMessage = document.getElementById("form-message");

    // --- Helper function to call your API ---
    // This is the same 'api' function from your main.js
    const api = async (action, options = {}) => {
        const { method = 'GET', body = null, params = {} } = options;
        
        // This path is correct because the HTML is in 'pages/'
        let url = `../api/api.php?action=${action}`;
        if (method === 'GET' && Object.keys(params).length > 0) {
            url += '&' + new URLSearchParams(params).toString();
        }

        const fetchOptions = {
            method: method,
            headers: {}
        };
        
        if (method === 'POST' && body) {
            fetchOptions.headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, fetchOptions);
            const result = await response.json();
            
            if (result.auth === false) {
                window.location.href = 'login.html'; // Redirect if not logged in
                return null;
            }
            if (!result.success) {
                throw new Error(result.message);
            }
            return result;
        } catch (err) {
            formMessage.textContent = err.message; // Show error on the form
            return null;
        }
    };
    
    // --- Helper function to escape HTML ---
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    };

    // --- Main function to load all ledger data ---
    const loadLedger = async () => {
        // Show loading spinners
        listEl.innerHTML = '<div class="loading-spinner"></div>';
        chartEl.innerHTML = '<div class="loading-spinner"></div>';

        // Call the 'get_ledger' action in your api.php
        const result = await api('get_ledger');
        if (!result) return; // Error is handled by api()

        // --- 1. Render Profit Chart ---
        if (result.profits.length === 0) {
            chartEl.innerHTML = '<p style="text-align:center; font-size: 14px; color: var(--text-light);">No profit data yet.</p>';
        } else {
            const maxProfit = Math.max(...result.profits.map(p => p.profit));
            chartEl.innerHTML = result.profits.map(p => {
                const width = (p.profit / maxProfit) * 100;
                return `
                    <div class="chart-bar">
                        <span class="chart-bar-label">${escapeHTML(p.crop)}</span>
                        <div class="chart-bar-bg">
                            <div class="chart-bar-fill" style="width: ${width > 0 ? width : 0}%"></div>
                        </div>
                        <span class="chart-bar-value">RM ${parseFloat(p.profit).toFixed(2)}</span>
                    </div>
                `;
            }).join('');
        }
        
        // --- 2. Render Ledger List ---
        if (result.entries.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No ledger entries.</p>';
            return;
        }
        
        listEl.innerHTML = ''; // Clear loading spinner
        result.entries.forEach(e => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const profit = parseFloat(e.revenue) - parseFloat(e.cost);
            
            item.innerHTML = `
                <div>
                    <p style="font-weight: 600;">${escapeHTML(e.crop)}</p>
                    <span style="color: ${profit >= 0 ? 'var(--primary-dark)' : 'var(--error-color)'}; font-weight: 600;">
                        Profit: RM ${profit.toFixed(2)}
                    </span>
                    <br><span>${e.date} | Rev: RM ${e.revenue} | Cost: RM ${e.cost}</span>
                </div>
                <button class="delete-btn" data-id="${e.id}">&times;</button>
            `;
            
            // Add a click event to the new delete button
            item.querySelector('.delete-btn').onclick = async (event) => {
                const id = event.target.dataset.id;
                if (confirm('Delete this entry?')) {
                    // Call the 'delete_ledger' action in your api.php
                    await api('delete_ledger', { params: { id } });
                    loadLedger(); // Refresh the list
                }
            };
            listEl.appendChild(item);
        });
    };
    
    // --- Add Transaction (Form Submit) ---
    ledgerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the form from reloading
        formMessage.textContent = ''; // Clear old errors

        // Get data from the form
        const data = {
            crop: document.getElementById('ledger-crop').value,
            revenue: document.getElementById('ledger-revenue').value,
            cost: document.getElementById('ledger-cost').value,
            date: document.getElementById('ledger-date').value
        };

        if (!data.crop || !data.date) {
            formMessage.textContent = 'Crop and Date are required.';
            return;
        }

        // Call the 'add_ledger' action in your api.php
        const result = await api('add_ledger', { method: 'POST', body: data });
        
        if (result) {
            // It worked! Clear the form and reload the ledger
            ledgerForm.reset();
            document.getElementById('ledger-date').valueAsDate = new Date(); // Reset date to today
            loadLedger(); // Refresh
        }
    });

    // --- Initial Load ---
    // Set the date to today and load all the data
    document.getElementById('ledger-date').valueAsDate = new Date();
    loadLedger();
});