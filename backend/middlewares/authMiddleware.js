import firebaseService from '../services/firebase.service.js';

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const user = await firebaseService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};


// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token;
    
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    try {
      const user = await firebaseService.verifyToken(token);
      
      req.user = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        role: user.email?.includes('admin') ? 'admin' : 'customer',
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed',
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// Middleware to check if user is admin

const checkAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Not authorized as an admin',
    });
  }
};
// Middleware to check if user is seller
const checkSeller = (req, res, next) => {
  if(req.user && req.user.role == 'seller'){
    next()
  } else{
    res.status(403).json({
      success: false,
      error: 'Not authorized as a seller'
    })
  }
}

export { protect, checkAdmin, checkSeller };
export default verifyFirebaseToken;
