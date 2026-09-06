import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Password from './pages/Password.jsx';
import Stores from './pages/Stores.jsx';
import AdminDashboard, { AdminUserDetail } from './pages/AdminDashboard.jsx';
import StoreOwnerDashboard from './pages/StoreOwnerDashboard.jsx';
import { ROLES } from './mock/roles.js';
import RoleProtectedRoute from './components/RoleProtectedRoute.jsx';

const ALL_ROLES = [
  ROLES.NORMAL_USER,
  ROLES.STORE_OWNER,
  ROLES.SYSTEM_ADMINISTRATOR,
];

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'auth',
        element: <Auth />,
      },
      {
        path: 'stores',
        element: <RoleProtectedRoute allowedRoles={[ROLES.NORMAL_USER]} />,
        children: [
          {
            index: true,
            element: <Stores />,
          },
        ],
      },
      {
        path: 'admin',
        element: <RoleProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMINISTRATOR]} />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: 'users/:userId',
            element: <AdminUserDetail />,
          },
        ],
      },
      {
        path: 'owner',
        element: <RoleProtectedRoute allowedRoles={[ROLES.STORE_OWNER]} />,
        children: [
          {
            index: true,
            element: <StoreOwnerDashboard />,
          },
        ],
      },
      {
        path: 'password',
        element: <RoleProtectedRoute allowedRoles={ALL_ROLES} />,
        children: [
          {
            index: true,
            element: <Password />,
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
