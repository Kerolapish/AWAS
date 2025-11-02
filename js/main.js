// main.js
document.addEventListener("DOMContentLoaded", () => {
    const appContent = document.getElementById("app-content");
    const pageTitle = document.getElementById("page-title");
    const navButtons = document.querySelectorAll(".nav-btn");
    const logoutBtn = document.getElementById("logout-btn");

    // --- Global State ---
    const pageTitles = {
        weather: "Weather Alerts",
        reminders: "Reminders",
        ledger: "Ledger",
        crops: "Crops Knowledge",
    };

    // --- Utility Functions ---
    const api = async (action, options = {}) => {
        const { method = 'GET', body = null, params = {} } = options;
        
        let url = `api/api.php?action=${action}`;
        if (method === 'GET' && Object.keys(params).length > 0) {
            url += '&' + new URLSearchParams(params).toString();
        }

        // FIX: The API is in ../api/ from the perspective of index.html
        url = '../' + url;

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
            
            // Handle non-JSON responses (like from weather API proxy)
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                // If it's not JSON, it might be the weather API.
                // This is a bit of a hack, better to have /api/weather.php
                // But for now, we'll assume it's the weather data.
                // A better fix is in api.php to wrap the weather data.
                
                // Let's rely on the api.php fix instead.
                // Re-parsing as JSON. The fix in api.php makes this safe.
                result = JSON.parse(text);
            }

            // Check for authentication failure
            if (result.auth === false) {
                window.location.href = 'login.html';
                return null;
            }
            // Check for API-side error (e.g., success: false)
            if (result.success === false) {
                throw new Error(result.message);
            }
            // Check for OpenWeatherMap error (relayed by our API)
            if (result.success === true && action === 'get_weather' && result.data.cod != 200) {
                 throw new Error(result.data.message || 'Error fetching weather data.');
            }
            
            return result;
        } catch (err) {
            showError(err.message);
            return null;
        }
    };

    const cloneTemplate = (id) => {
        return document.getElementById(id).content.cloneNode(true);
    };

    const showLoading = () => {
        appContent.innerHTML = '';
        appContent.appendChild(cloneTemplate('template-loading'));
    };

    const showError = (message) => {
        const errorPage = cloneTemplate('template-error');
        errorPage.querySelector('.error-full-page').textContent = message;
        appContent.innerHTML = '';
        appContent.appendChild(errorPage);
    };
    
    const escapeHTML = (str) => {
        if (typeof str !== 'string') str = String(str);
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    };
    
    // --- Page Navigation ---
    const navigateTo = (pageId) => {
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageId);
        });
        pageTitle.textContent = pageTitles[pageId] || "Dashboard";
        
        // Load page content
        switch (pageId) {
            case 'weather':   loadWeather();   break;
            case 'reminders': loadReminders(); break;
            case 'ledger':    loadLedger();    break;
            case 'crops':     loadCrops();     break;
            default:          loadWeather();
        }
    };

    // --- Page Loaders ---
    
    // 1. WEATHER
    const loadWeather = async () => {
        showLoading();
        const page = cloneTemplate('template-weather');
        const output = page.getElementById('weather-output');
        
        page.getElementById('fetch-weather-btn').onclick = loadWeather;
        appContent.innerHTML = '';
        appContent.appendChild(page);

        try {
            const position = await new Promise((resolve, reject) => {
                 if (!navigator.geolocation) {
                    return reject(new Error("Geolocation is not supported by your browser."));
                }
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            const { latitude, longitude } = position.coords;
            output.innerHTML = '<div class="loading-spinner"></div>';
            
            const result = await api('get_weather', { params: { lat: latitude, lon: longitude } });
            if (!result) return; // Error handled by api()
            
            const weather = result.data; // Data is nested now

            // Render Weather
            const current = weather.current;
            let html = `
                <div class="form-card">
                    <h3>Current Weather</h3>
                    <p style="font-size: 2.5em; margin: 0; font-weight: 700;">${current.temp.toFixed(1)}°C</p>
                    <p>Feels like: ${current.feels_like.toFixed(1)}°C</p>
                    <p style="text-transform: capitalize;">${escapeHTML(current.weather[0].description)}</p>
                </div>
            `;
            
            if (weather.alerts && weather.alerts.length > 0) {
                html += `
                    <div class="weather-alert">
                        <h4>Weather Alerts!</h4>
                        ${weather.alerts.map(alert => 
                            `<p><strong>${escapeHTML(alert.event)}:</strong> ${escapeHTML(alert.description)}</p>`
                        ).join('')}
                    </div>
                `;
            }
            output.innerHTML = html;
            
        } catch (err) {
            output.innerHTML = `<p class="error">${err.message || "Could not get location. Please enable it in your browser."}</p>`;
        }
    };
    
    // 2. REMINDERS
    const loadReminders = async () => {
        showLoading();
        const page = cloneTemplate('template-reminders');
        const listEl = page.getElementById('reminder-list');
        
        page.getElementById('reminder-form').onsubmit = async (e) => {
            e.preventDefault();
            const input = page.getElementById('reminder-text');
            if (!input.value) return;
            
            const result = await api('add_reminder', {
                method: 'POST',
                body: { text: input.value }
            });
            
            if (result) {
                input.value = '';
                loadReminders(); // Refresh
            }
        };
        
        appContent.innerHTML = '';
        appContent.appendChild(page);
        
        const result = await api('get_reminders');
        if (!result) return;
        
        if (result.reminders.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No reminders set.</p>';
            return;
        }
        
        listEl.innerHTML = '';
        result.reminders.forEach(r => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div><p>${escapeHTML(r.text)}</p><span>${new Date(r.createdAt).toLocaleString()}</span></div>
                <button class="delete-btn" data-id="${r.id}">&times;</button>
            `;
            item.querySelector('.delete-btn').onclick = async (e) => {
                // --- THIS IS THE FIX ---
                // Use closest() to ensure we get the button, not the &times; text
                const id = e.target.closest('.delete-btn').dataset.id;
                // --- END OF FIX ---
                if (confirm('Delete this reminder?')) {
                    await api('delete_reminder', { params: { id } });
                    loadReminders(); // Refresh
                }
            };
            listEl.appendChild(item);
        });
    };
    
    // 3. LEDGER
    const loadLedger = async () => {
        showLoading();
        const page = cloneTemplate('template-ledger');
        const listEl = page.getElementById('ledger-list');
        const chartEl = page.getElementById('profit-chart');
        
        // Set date to today
        page.getElementById('ledger-date').valueAsDate = new Date();
        
        // Handle form submission
        page.getElementById('ledger-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                crop: page.getElementById('ledger-crop').value,
                revenue: page.getElementById('ledger-revenue').value,
                cost: page.getElementById('ledger-cost').value,
                date: page.getElementById('ledger-date').value
            };
            if (!data.crop || !data.date) return;
            
            await api('add_ledger', { method: 'POST', body: data });
            loadLedger(); // Refresh
        };
        
        appContent.innerHTML = '';
        appContent.appendChild(page);
        
        const result = await api('get_ledger');
        if (!result) return;
        
        // Render Profit Chart
        if (result.profits.length === 0) {
            chartEl.innerHTML = '<p style="text-align:center; font-size: 14px; color: var(--text-light);">No profit data yet.</p>';
        } else {
            // Find max profit for scaling, ensuring it's a positive number
            const maxProfit = Math.max(0, ...result.profits.map(p => parseFloat(p.profit)));
            
            chartEl.innerHTML = result.profits.map(p => {
                const profit = parseFloat(p.profit);
                // Handle cases where maxProfit is 0 to avoid division by zero
                const width = maxProfit > 0 ? (Math.max(0, profit) / maxProfit) * 100 : 0;
                
                return `
                    <div class="chart-bar">
                        <span class="chart-bar-label">${escapeHTML(p.crop)}</span>
                        <div class="chart-bar-bg">
                            <div class="chart-bar-fill" style="width: ${width}%"></div>
                        </div>
                        <span class="chart-bar-value">RM ${profit.toFixed(2)}</span>
                    </div>
                `;
            }).join('');
        }
        
        // Render Ledger List
        if (result.entries.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No ledger entries.</p>';
            return;
        }
        listEl.innerHTML = '';
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
            item.querySelector('.delete-btn').onclick = async (e) => {
                const id = e.target.closest('.delete-btn').dataset.id;
                if (confirm('Delete this entry?')) {
                    await api('delete_ledger', { params: { id } });
                    loadLedger(); // Refresh
                }
            };
            listEl.appendChild(item);
        });
    };
    
    // 4. CROPS
    const loadCrops = async () => {
        showLoading();
        const page = cloneTemplate('template-crops');
        const listEl = page.getElementById('crop-list');
        
        appContent.innerHTML = '';
        appContent.appendChild(page);

        const result = await api('get_crops');
        if (!result) return;
        
        if (result.crops.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">No crop data found.</p>';
            return;
        }
        
        listEl.innerHTML = '';
        result.crops.forEach(crop => {
            const item = document.createElement('div');
            item.className = 'crop-item-card';
            item.dataset.id = crop.id;
            item.innerHTML = `
                <img src="${escapeHTML(crop.image || '')}" alt="${escapeHTML(crop.name)}" onerror="this.style.display='none'">
                <div style="flex: 1;">
                    <p style="margin:0; font-weight: 600;">${escapeHTML(crop.name)}</p>
                    <span style="font-size: 14px; color: var(--text-light);">${escapeHTML(crop.bestSeason)}</span>
                </div>
                <span>&rarr;</span>
            `;
            item.onclick = () => loadCropDetail(crop.id);
            listEl.appendChild(item);
        });
    };
    
    const loadCropDetail = async (id) => {
        showLoading();
        const result = await api('get_crop_detail', { params: { id } });
        if (!result) return;
        
        const crop = result.crop;
        const page = cloneTemplate('template-crop-detail');
        
        page.querySelector('.btn-back').onclick = () => navigateTo('crops');
        page.getElementById('crop-image').src = crop.image || '';
        page.getElementById('crop-name').textContent = crop.name;
        page.getElementById('crop-season').textContent = crop.bestSeason;
        page.getElementById('crop-watering').textContent = crop.watering;
        page.getElementById('crop-cost').textContent = parseFloat(crop.avgCost).toFixed(2);
        page.getElementById('crop-revenue').textContent = parseFloat(crop.avgRevenue).toFixed(2);
        page.getElementById('crop-profit').textContent = parseFloat(crop.profitMargin).toFixed(1);
        
        const diseasesList = page.getElementById('crop-diseases');
        diseasesList.innerHTML = '';
        // Assuming diseases are stored as comma-separated string
        const diseases = crop.diseases ? crop.diseases.split(',') : [];
        if (diseases.length > 0) {
            diseases.forEach(d => {
                const li = document.createElement('li');
                li.textContent = escapeHTML(d.trim());
                diseasesList.appendChild(li);
            });
        } else {
            diseasesList.innerHTML = '<li>No common diseases listed.</li>';
        }
        
        appContent.innerHTML = '';
        appContent.appendChild(page);
    };
    
    // --- INIT ---
    const checkSession = async () => {
        const result = await api('check_session');
        if (result && result.auth) {
            navigateTo('weather'); // Start on weather page
            // Add click listeners
            navButtons.forEach(btn => {
                btn.onclick = () => navigateTo(btn.dataset.page);
            });
            logoutBtn.onclick = async (e) => {
                e.preventDefault();
                await api('logout');
                window.location.href = 'login.html';
            };
        } else {
            window.location.href = 'login.html';
        }
    };

    checkSession();
});