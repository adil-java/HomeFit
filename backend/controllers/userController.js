export const getProfile = (req, res) => {
  res.json({
    success: true,
    message: "User profile fetched successfully",
    user: req.user, // Firebase-authenticated user info
  });
};
