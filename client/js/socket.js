let onlineUsers = [];



const socketHandler = (io) => {


    io.on("connection", (socket) => {


        console.log(
            "🟢 Connected:",
            socket.id
        );



        // ==========================
        // User Join
        // ==========================

        socket.on(
            "join",
            (userId) => {


                // Avoid duplicate users

                const existingUser =
                onlineUsers.find(
                    user =>
                    user.userId === userId
                );


                if(!existingUser){


                    onlineUsers.push({

                        userId:userId,

                        socketId:socket.id

                    });


                }



                // Create private room

                socket.join(userId);



                console.log(
                    "Online Users:",
                    onlineUsers
                );


            }
        );







        // ==========================
        // Real Time Message
        // ==========================

        socket.on(
            "sendMessage",
            (data)=>{


                console.log(
                    "Message:",
                    data.message
                );



                const receiver =
                onlineUsers.find(

                    user =>
                    user.userId === data.receiver

                );



                if(receiver){


                    io.to(
                        receiver.socketId
                    )
                    .emit(

                        "receiveMessage",

                        {

                            sender:data.sender,

                            message:data.message

                        }

                    );


                    console.log(
                        "Message delivered"
                    );


                }
                else{


                    console.log(
                        "User offline"
                    );


                }



            }
        );








        // ==========================
        // Disconnect
        // ==========================

        socket.on(
            "disconnect",
            ()=>{


                onlineUsers =
                onlineUsers.filter(

                    user =>
                    user.socketId !== socket.id

                );



                console.log(
                    "🔴 Disconnected:",
                    socket.id
                );



            }
        );



    });



};



module.exports = socketHandler;