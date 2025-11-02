document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');

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
            
            const response = await fetch(`../api/api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Redirect to dashboard on success
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = result.message || 'An error occurred';
            }
        } catch (err) {
            errorMessage.textContent = 'Could not connect to server';
        }
    };
});