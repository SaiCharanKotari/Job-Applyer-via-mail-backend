const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) { return res.status(401).json({ success: false, error: 'Access denied' }); }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: "Invalid Token" });
  }
};

module.exports = auth;