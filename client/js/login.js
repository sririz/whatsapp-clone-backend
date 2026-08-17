console.log("LOGIN JS CONNECTED");

document
.getElementById("loginForm")
.addEventListener("submit", async (e)=>{

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try{
        const response = await fetch(
            "https://themessager.duckdns.org/api/auth/login",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        // If login is successful, save token and go to chat
        if(response.ok){
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            alert("Login Successful");
            window.location.href="chat.html";
        }
        // If backend says they need OTP verification
        else if (data.needsVerification) {
            localStorage.setItem("verifyEmail", email);
            alert(data.message);
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