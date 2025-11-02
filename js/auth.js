// Authentication functionality is currently disabled
/* 
All authentication code has been commented out as part of transitioning to a weather-only functionality.
This file is kept for reference but is not actively used.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');

    const handleServerResponse = async (response) => {
        // First check if the response is OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the response content type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new TypeError("Server didn't return JSON");
        }

        return await response.json();
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = {
            email: form.email.value,
            password: form.password.value
        };

        // Add additional fields for registration
        if (form.fullName) {
            formData.fullName = form.fullName.value;
        }
        if (form.phone) {
            formData.phone = form.phone.value;
        }

        try {
            // Determine if this is login or register based on the form fields
            const action = form.fullName ? 'register' : 'login';
            
            console.log('Sending request to server...', {
                action,
                formData,
                url: `../api/api.php?action=${action}`
            });
            
            const response = await fetch(`http://localhost/AWAS/api/api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            // Log the raw response for debugging
            // First check if the response is OK
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the response content type
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new TypeError("Server didn't return JSON");
            }

            const result = await response.json();
            
            const data = await handleServerResponse(response);
            console.log('Server response:', data);

            if (result.success) {
                console.log('Login successful, redirecting...');
                // Store user info in localStorage if needed
                if (result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                }
                // Redirect to dashboard
                window.location.href = 'index.html';
            } else {
                console.error('Login failed:', result);
                errorMessage.textContent = result.message || 'An error occurred';
            }
        } catch (err) {
            console.error('Connection error:', err);
            errorMessage.textContent = `Server connection error: ${err.message}`;
            
            // Try to fetch error details
            try {
                const errorResponse = await fetch('../api/api.php');
                const errorText = await errorResponse.text();
                console.log('PHP Response:', errorText);
            } catch (e) {
                console.error('Could not fetch error details:', e);
            }
        }
    };
});
*/