import { useState } from "react";
import { useParams } from "react-router-dom";
import { OrgAdminLayout, OrgAnalytics, UserManagement, BrandingSettings, AdminChat } from "@/components/admin/org";

type TabType = "dashboard" | "users" | "branding" | "chat";

const OrgAdmin = () => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const { slug } = useParams<{ slug: string }>();

  return (
    <OrgAdminLayout activeTab={activeTab} setActiveTab={setActiveTab} orgSlug={slug}>
      {activeTab === "dashboard" && <OrgAnalytics orgSlug={slug} />}
      {activeTab === "users" && <UserManagement orgSlug={slug} />}
      {activeTab === "branding" && <BrandingSettings orgSlug={slug} />}
      {activeTab === "chat" && <AdminChat />}
    </OrgAdminLayout>
  );
};

export default OrgAdmin;