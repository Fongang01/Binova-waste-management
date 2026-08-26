import * as authService from "../services/authService.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    // Allow login for any existing user role (ADMIN or DRIVER)
    const result = await authService.loginUser(email, password);
    if (!result) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (result.disabled) return res.status(403).json({ success: false, message: "Account is not active" });

    res.json({ success: true, message: "Login successful", token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: user, message: "Profile updated successfully" });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
}

