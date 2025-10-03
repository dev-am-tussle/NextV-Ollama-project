import mongoose from "mongoose";
import dotenv from "dotenv";
import { AvailableModel } from "../models/availableModel.model.js";
import { connectDB, closeDB } from "../config/ollama.db.js";

dotenv.config();

const seedModels = [
  {
    name: "gemma:2b",
    display_name: "Gemma 2B",
    description: "Google's lightweight conversational AI model optimized for speed and efficiency. Perfect for quick responses and general chat.",
    size: "1.4GB",
    category: "general",
    tags: ["lightweight", "fast", "conversational"],
    provider: "ollama",
    model_family: "gemma",
    parameters: "2B",
    use_cases: ["chat", "simple-reasoning", "quick-questions"],
    performance_tier: "fast",
    min_ram_gb: 4,
    is_active: true
  },
  {
    name: "phi:2.7b",
    display_name: "Phi 2.7B",
    description: "Microsoft's efficient model with strong reasoning capabilities, especially good for coding and technical tasks.",
    size: "1.6GB",
    category: "coding",
    tags: ["coding", "reasoning", "technical"],
    provider: "ollama",
    model_family: "phi",
    parameters: "2.7B",
    use_cases: ["coding", "technical-analysis", "problem-solving"],
    performance_tier: "balanced",
    min_ram_gb: 6,
    is_active: true
  },
  {
    name: "llama2:7b",
    display_name: "Llama 2 7B",
    description: "Meta's powerful general-purpose model with excellent reasoning and creative capabilities. Best for complex tasks.",
    size: "3.8GB",
    category: "general",
    tags: ["powerful", "creative", "reasoning"],
    provider: "ollama",
    model_family: "llama2",
    parameters: "7B",
    use_cases: ["chat", "creative-writing", "analysis", "reasoning"],
    performance_tier: "powerful",
    min_ram_gb: 8,
    is_active: true
  },
  {
    name: "codellama:7b",
    display_name: "Code Llama 7B",
    description: "Specialized coding model based on Llama 2, optimized for code generation and programming tasks.",
    size: "3.8GB",
    category: "coding",
    tags: ["coding", "programming", "specialized"],
    provider: "ollama",
    model_family: "codellama",
    parameters: "7B",
    use_cases: ["coding", "code-generation", "debugging", "programming-help"],
    performance_tier: "powerful",
    min_ram_gb: 8,
    is_active: false // Initially disabled
  },
  {
    name: "mistral:7b",
    display_name: "Mistral 7B",
    description: "Mistral AI's efficient and capable model with excellent performance across various tasks.",
    size: "4.1GB",
    category: "general",
    tags: ["efficient", "versatile", "balanced"],
    provider: "ollama",
    model_family: "mistral",
    parameters: "7B",
    use_cases: ["chat", "analysis", "reasoning", "creative-writing"],
    performance_tier: "balanced",
    min_ram_gb: 8,
    is_active: true
  }
];

async function seedAvailableModels() {
  try {
    console.log("🌱 Starting to seed available models...");
    
    await connectDB();
    
    // Clear existing models (optional - remove this line if you want to keep existing data)
    await AvailableModel.deleteMany({});
    console.log("🗑️  Cleared existing models");
    
    // Insert seed data
    const inserted = await AvailableModel.insertMany(seedModels);
    console.log(`✅ Successfully seeded ${inserted.length} models:`);
    
    inserted.forEach(model => {
      console.log(`   - ${model.display_name} (${model.name}) - ${model.is_active ? 'Active' : 'Inactive'}`);
    });
    
  } catch (error) {
    console.error("❌ Error seeding models:", error);
  } finally {
    await closeDB();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
}

// Run the seed function
seedAvailableModels();