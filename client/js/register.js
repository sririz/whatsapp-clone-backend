document
.getElementById("registerForm")
.addEventListener("submit", async(e)=>{

    e.preventDefault();

    const name =
    document.getElementById("name").value;

    const email =
    document.getElementById("email").value;

    const password =
    document.getElementById("password").value;

    try{
        const response = await fetch(
            "http://13.61.35.45/api/auth/register",
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
            alert("Registration Successful");
            window.location.href="login.html";
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