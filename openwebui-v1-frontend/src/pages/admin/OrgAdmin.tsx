import { useState } from "react";
import { useParams } from "react-router-dom";
import { OrgAdminLayout, OrgAnalytics, UserManagement, BrandingSettings, AdminChat } from "@/components/admin/org";

type TabType = "dashboard" | "models" | "users" | "branding" | "chat" | "setting";

const OrgAdmin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const { slug } = useParams<{ slug: string }>();

  return (
    <>
      {activeTab === "chat" ? (
        // Full-page chat with back functionality
        <AdminChat onBack={() => setActiveTab("dashboard")} />
      ) : (
        // Normal layout for other tabs
        <OrgAdminLayout activeTab={activeTab} setActiveTab={setActiveTab} orgSlug={slug}>
          {activeTab === "dashboard" && <OrgAnalytics orgSlug={slug} />}
          {activeTab === "models" && <div>Models</div>}
          {activeTab === "users" && <UserManagement orgSlug={slug} />}
          {activeTab === "branding" && <BrandingSettings orgSlug={slug} />}
          {activeTab === "setting" && <div>Settings Content</div>}
        </OrgAdminLayout>
      )}
    </>
  );
};

export default OrgAdmin;