// =========================================
// Real-time Password Validation
// =========================================
const passwordInput = document.getElementById("password");
const reqLength = document.getElementById("req-length");
const reqCapital = document.getElementById("req-capital");
const reqNumber = document.getElementById("req-number");
const reqSpecial = document.getElementById("req-special");

passwordInput.addEventListener("keyup", () => {
    const val = passwordInput.value;
    
    // Check length
    if (val.length >= 8) {
        reqLength.classList.add("valid");
        reqLength.innerText = "✅ At least 8 characters";
    } else {
        reqLength.classList.remove("valid");
        reqLength.innerText = "❌ At least 8 characters";
    }
    
    // Check capital
    if (/[A-Z]/.test(val)) {
        reqCapital.classList.add("valid");
        reqCapital.innerText = "✅ 1 Capital letter (A-Z)";
    } else {
        reqCapital.classList.remove("valid");
        reqCapital.innerText = "❌ 1 Capital letter (A-Z)";
    }
    
    // Check number
    if (/[0-9]/.test(val)) {
        reqNumber.classList.add("valid");
        reqNumber.innerText = "✅ 1 Number (0-9)";
    } else {
        reqNumber.classList.remove("valid");
        reqNumber.innerText = "❌ 1 Number (0-9)";
    }
    
    // Check special character
    if (/[@$!%*?&^#()_\-+=\[\]{};':"\\|,.<>\/?]/.test(val)) {
        reqSpecial.classList.add("valid");
        reqSpecial.innerText = "✅ 1 Special character (!@#$%^&*)";
    } else {
        reqSpecial.classList.remove("valid");
        reqSpecial.innerText = "❌ 1 Special character (!@#$%^&*)";
    }
});

// =========================================
// Register Form Submit
// =========================================
document.getElementById("registerForm").addEventListener("submit", async(e) => {

    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Final check before sending to backend
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=\[\]{};':"\\|,.<>\/?])[A-Za-z\d@$!%*?&^#()_\-+=\[\]{};':"\\|,.<>\/?]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
        alert("Please ensure your password meets all the requirements below.");
        return;
    }

    try {
        const response = await fetch(
            "https://themessager.duckdns.org/api/auth/register",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    name,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        console.log(data);

        if(response.ok){
            // Save email to localStorage so verify.js knows who to verify
            localStorage.setItem("verifyEmail", email);
            alert(data.message + " Please check your email for the OTP.");
            window.location.href = "verify.html";
        }
        else{
            alert(data.message);
        }
    }
    catch(error){
        console.log(error);
        alert("Server Error");
    }
});