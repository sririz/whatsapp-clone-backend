document.getElementById("verifyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = localStorage.getItem("verifyEmail");
    const otp = document.getElementById("otp").value;

    if (!email) {
        alert("Error: Email not found. Please go back and login/register.");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("https://themessager.duckdns.org/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (response.ok) {
            // Success! Save token and go to chat
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.removeItem("verifyEmail"); // Clean up
            alert("Email verified! Logging you in...");
            window.location.href = "chat.html";
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.log(error);
        alert("Server Error");
    }
});

// Resend OTP Logic
document.getElementById("resendBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = localStorage.getItem("verifyEmail");

    try {
        const response = await fetch("https://themessager.duckdns.org/api/auth/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        alert(data.message);
    } catch (error) {
        alert("Server Error");
    }
});