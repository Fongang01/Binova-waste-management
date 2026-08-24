import * as authService from "../services/authService.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const result = await authService.loginAdmin(email, password);
    if (!result) return res.status(401).json({ success: false, message: "Invalid credentials" });
    if (result.disabled) return res.status(403).json({ success: false, message: "Account is not active" });
    if (result.forbidden) return res.status(403).json({ success: false, message: "Insufficient permissions" });

    res.json({ success: true, message: "Login successful", token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
}
