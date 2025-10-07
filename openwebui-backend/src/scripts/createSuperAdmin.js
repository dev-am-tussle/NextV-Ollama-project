/**
 * Script to create a Super Admin user in the dedicated SuperAdmin collection
 * Run this script to set up initial super admin access
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { SuperAdmin } from "../models/superAdmin.model.js";
import { connectDB } from "../config/ollama.db.js";
import dotenv from "dotenv";

dotenv.config();

async function createSuperAdmin() {
  try {
    await connectDB();
    
    const name = "Super Administrator";
    const email = "superadmin@admin.com";
    const password = "SuperAdmin123!";

    // Check if super admin already exists
    const existingAdmin = await SuperAdmin.findOne({ email });
    if (existingAdmin) {
      console.log("⚠️  Super admin already exists!");
      console.log(`Email: ${email}`);
      console.log(`Name: ${existingAdmin.name}`);
      console.log(`ID: ${existingAdmin._id}`);
      console.log(`Created: ${existingAdmin.created_at}`);
      console.log(`Active: ${existingAdmin.status === 'active' ? 'Yes' : 'No'}`);
      process.exit(0);
    }

    // Hash password before saving
    const password_hash = await SuperAdmin.hashPassword(password);

    // Create new super admin user
    const superAdmin = new SuperAdmin({
      name,
      email,
      password_hash,
      role: 'super_admin',
      status: 'active'
    });

    await superAdmin.save();
    
    console.log("✅ Super admin created successfully!");
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${superAdmin._id}`);
    console.log("🔒 Remember to change the password after first login");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();