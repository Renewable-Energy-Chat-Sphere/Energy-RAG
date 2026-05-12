import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "./i18n/i18n";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Global from "./pages/Global";
import PowerPlant from "./pages/PowerPlant";
import Rag from "./pages/Rag";
import Contact from "./pages/Contact";
import Feedback from "./pages/Feedback";
import Prediction from "./pages/Prediction";
import ElectricityAnalysis from "./pages/ElectricityAnalysis";
import PowerPlantController from "./pages/PowerPlantController";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [

        // =========================
        // 🌍 公開頁面
        // =========================

        { index: true, element: <Home /> },

        { path: "/global", element: <Global /> },

        {
          path: "/powerplant",
          element: <PowerPlantController />,
        },

        { path: "/rag", element: <Rag /> },

        { path: "/contact", element: <Contact /> },

        { path: "/login", element: <Login /> },

        // =========================
        // 🔥 manager + admin
        // =========================

        {
          path: "/prediction",

          element: (
            <ProtectedRoute
              allowedRoles={["manager", "admin"]}
            >
              <Prediction />
            </ProtectedRoute>
          ),
        },

        {
          path: "/electricity-analysis",

          element: (
            <ProtectedRoute
              allowedRoles={["manager", "admin"]}
            >
              <ElectricityAnalysis />
            </ProtectedRoute>
          ),
        },

        // =========================
        // 🔒 admin only
        // =========================

        {
          path: "/Feedback",

          element: (
            <ProtectedRoute
              allowedRoles={["admin"]}
            >
              <Feedback />
            </ProtectedRoute>
          ),
        },

      ],
    },
  ],

  {
    basename: "/Ener-Sphere",
  },
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
