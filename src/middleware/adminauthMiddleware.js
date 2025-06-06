import jwt from 'jsonwebtoken';

export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Unauthorized: No token');
    return res.status(401).json({ success: false, message: 'Unauthorized: No token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ensure JWT_SECRET is set in env
    req.user = decoded;

    // Optional: Add role check if needed
    // if (decoded.role !== 'admin' && decoded.role !== 'superAdmin') {
    //   return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    // }

    next();
  } catch (error) {
    console.log('Unauthorized: Invalid token');
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
