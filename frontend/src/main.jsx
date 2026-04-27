import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Global from "./pages/Global";
import Rag from "./pages/Rag";
import Contact from "./pages/Contact";
import Feedback from "./pages/Feedback";
import Prediction from "./pages/Prediction";


const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/global", element: <Global /> },
        { path: "/rag", element: <Rag /> },
        { path: "/contact", element: <Contact /> },
        { path: "/Feedback", element: <Feedback /> },
        { path: "/prediction", element: <Prediction /> }
      ],
    },
  ],
  {
    basename: "/Ener-Sphere", // ⭐⭐⭐ 加這一行（關鍵）
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
