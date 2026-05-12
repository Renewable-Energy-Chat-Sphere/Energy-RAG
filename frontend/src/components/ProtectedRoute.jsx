import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, children }) {
  const storedUser = localStorage.getItem("user");

  const user = storedUser
    ? JSON.parse(storedUser)
    : { username: "訪客", role: "user" };

  const role = user.role || "user";

  if (!allowedRoles.includes(role)) {
    alert("你沒有權限進入此頁面");
    return <Navigate to="/" replace />;
  }

  return children;
}