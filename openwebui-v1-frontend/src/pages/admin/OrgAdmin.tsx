import { useState } from "react";
import { useParams } from "react-router-dom";
import { OrgAdminLayout, OrgAnalytics, UserManagement, BrandingSettings } from "@/components/admin/org";
import { AdminModelsPage } from "./models";

type TabType = "dashboard" | "models" | "users" | "branding" | "setting";

const OrgAdmin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const { slug } = useParams<{ slug: string }>();

  return (
    <OrgAdminLayout activeTab={activeTab} setActiveTab={setActiveTab} orgSlug={slug}>
      {activeTab === "dashboard" && <OrgAnalytics orgSlug={slug} />}
      {activeTab === "models" && <AdminModelsPage />}
      {activeTab === "users" && <UserManagement orgSlug={slug} />}
      {activeTab === "branding" && <BrandingSettings orgSlug={slug} />}
      {activeTab === "setting" && <div>Settings Content</div>}
    </OrgAdminLayout>
  );
};

export default OrgAdmin;