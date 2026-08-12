const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {

    try {

        let token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({
                message: "Access Denied. No Token."
            });
        }

        token = token.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid Token"
        });

    }

};

module.exports = protect;