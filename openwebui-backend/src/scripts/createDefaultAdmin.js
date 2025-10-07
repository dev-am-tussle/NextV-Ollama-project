import bcrypt from "bcryptjs";
import { Admin, createAdminWithDefaults } from "../models/admin.model.js";
import { connectDB } from "../config/ollama.db.js";

/**
 * Script to create the default admin user
 * This should be run once to set up the initial admin
 */

async function createDefaultAdmin() {
  try {
    // Connect to database
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@admin.com" });
    if (existingAdmin) {
      console.log("❌ Admin already exists with email: admin@admin.com");
      process.exit(1);
    }
    
    // Hash the password
    const password = "admin123"; // You can change this
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create admin data
    const adminData = {
      name: "Admin",
      email: "admin@admin.com",
      role: "admin", // Flexible role field
      admin_type: "super_admin", // Fixed admin type
      password_hash: password_hash,
      email_verified: true, // Set to true for default admin
      status: "active",
      profile: {
        job_title: "System Administrator",
        department: "IT"
      }
    };
    
    // Create admin with default settings
    const { admin, settings } = await createAdminWithDefaults(adminData);
    
    console.log("✅ Default admin created successfully!");
    console.log("📧 Email:", admin.email);
    console.log("🔑 Password:", password);
    console.log("👤 Role:", admin.role);
    console.log("� Admin Type:", admin.admin_type);
    console.log("�🆔 Admin ID:", admin._id);
    console.log("⚙️ Settings ID:", settings._id);
    console.log("");
    console.log("⚠️ IMPORTANT: Please change the default password after first login!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating default admin:", error);
    process.exit(1);
  }
}

// Run the script
createDefaultAdmin();