import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { ModelCatalog } from "./components/ModelCatalog";
import { UserManagement } from "./components/UserManagement";

const SuperAdmin = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<ModelCatalog />} />
        <Route path="/users" element={<UserManagement />} />
        {/* Add more routes as needed */}
        <Route path="/conversations" element={<div>Conversations Management Coming Soon...</div>} />
        <Route path="/settings" element={<div>Settings Coming Soon...</div>} />
        <Route path="/logs" element={<div>Logs Coming Soon...</div>} />
      </Routes>
    </AdminLayout>
  );
};

export default SuperAdmin;