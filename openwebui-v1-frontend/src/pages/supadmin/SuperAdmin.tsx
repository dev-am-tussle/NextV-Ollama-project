import { AdminLayout } from "./components/AdminLayout";
import { ModelCatalog } from "./components/ModelCatalog";

const SuperAdmin = () => {
  return (
    <AdminLayout>
      <ModelCatalog />
    </AdminLayout>
  );
};

export default SuperAdmin;