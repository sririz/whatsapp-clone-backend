const User = require("../models/User");

// =========================
// Get All Users
// =========================

const getUsers = async (req, res) => {

    try {

        const users = await User.find({

            _id: {
                $ne: req.user.id
            }

        })
        .select(
            "-password"
        )
        .sort({
            name: 1
        });

        res.status(200).json({

            success: true,

            count: users.length,

            users: users.map(user => ({

                _id: user._id,

                name: user.name,

                email: user.email,

                profilePic: user.profilePic,

                about: user.about,

                isOnline: user.isOnline,

                lastSeen: user.lastSeen,

                createdAt: user.createdAt

            }))

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: "Server Error"

        });

    }

};

module.exports = {
    getUsers
};