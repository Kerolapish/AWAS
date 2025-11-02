// js/auth.js
document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("auth-form");
    const errorMessage = document.getElementById("error-message");

    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorMessage.textContent = ""; // Clear previous errors

            // Determine the API action based on the HTML file name
            const path = window.location.pathname;
            const page = path.substring(path.lastIndexOf('/') + 1);
            
            let action = "";
            if (page === 'login.html') action = 'login';
            if (page === 'register.html') action = 'register';
            if (page === 'forgot_password.html') action = 'forgot_password';

            if (!action) {
                errorMessage.textContent = "Error: Could not determine auth action.";
                return;
            }

            // Collect form data
            const formData = new FormData(authForm);
            const data = Object.fromEntries(formData.entries());

            let response; // Define response here to access it in catch
            try {
                response = await fetch('../api/api.php?action=' + action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    // Handle HTTP errors like 404 (Not Found) or 500 (Server Error)
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }

                // Try to parse as JSON
                const result = await response.json();

                if (result.success) {
                    if (action === 'login') {
                        // On successful login, go to the main app
                        window.location.href = 'index.html';
                    } else if (action === 'register') {
                        // On successful register, go to the login page
                        alert('Registration successful! Please login.');
                        window.location.href = 'login.html';
                    } else if (action === 'forgot_password') {
                        // On forgot password, just show the message
                        authForm.innerHTML = `<p style="text-align: center;">${result.message}</p><p class="auth-switch">Back to <a href="login.html">Login</a></p>`;
                    }
                } else {
                    // This is for API-level errors (e.g., "Invalid password", "Duplicate email")
                    errorMessage.textContent = result.message;
                }

            } catch (err) {
                // This block runs if fetch fails, response.ok is false, or response.json() fails
                
                console.error("Auth Error:", err); // Log the full error
                
                if (err instanceof SyntaxError) {
                    // This likely means response.json() failed because PHP sent text/HTML
                    errorMessage.innerHTML = "<b>Server Error:</b> Received invalid response. <br/> See browser console (F12) for details.";
                    // Attempt to read the raw text response to show the user
                    if (response) {
                        const rawText = await response.text();
                        console.error("Server returned non-JSON response:", rawText);
                    }
                } else if (err.message.startsWith('Server error:')) {
                    // This is our custom error from !response.ok (e.g., "Server error: 404 Not Found")
                    errorMessage.textContent = err.message;
                } else {
                    // This could be a network fetch error (e.g., server is down)
                    errorMessage.textContent = `Network error. Please try again.`;
                }
            }
        });
    }
});