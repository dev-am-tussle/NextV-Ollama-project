import axios from 'axios';
import { User } from '../models/user.models.js';
import { Organization } from '../models/organization.model.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get Ollama base URL from environment variable
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

class OnboardingService {
  // Check if Ollama is installed and running
  async checkOllamaInstallation() {
    try {
      // Check if Ollama process is running
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
        timeout: 5000
      });
      return {
        installed: true,
        running: true,
        version: response.data?.version || 'unknown',
        models: response.data?.models || []
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        // Ollama might be installed but not running
        try {
          const { stdout } = await execAsync('ollama --version');
          return {
            installed: true,
            running: false,
            version: stdout.trim(),
            models: []
          };
        } catch (versionError) {
          return {
            installed: false,
            running: false,
            version: null,
            models: []
          };
        }
      }
      return {
        installed: false,
        running: false,
        version: null,
        models: []
      };
    }
  }

  // Get organization models for user
  async getOrganizationModels(userId) {
    try {
      const user = await User.findById(userId).populate('organization_id');
      if (!user || !user.organization_id) {
        throw new Error('User organization not found');
      }

      const organization = user.organization_id;
      const allowedModels = organization.allowed_models || [];
      
      // Get currently installed models from Ollama
      const ollamaStatus = await this.checkOllamaInstallation();
      const installedModels = ollamaStatus.models.map(model => model.name);

      // Categorize models
      const categorizedModels = {
        downloaded: allowedModels.filter(model => installedModels.includes(model)),
        available: allowedModels.filter(model => !installedModels.includes(model)),
        recommended: organization.recommended_models || []
      };

      return {
        organization: organization.name,
        models: categorizedModels,
        totalAllowed: allowedModels.length
      };
    } catch (error) {
      console.error('Error getting organization models:', error);
      throw error;
    }
  }

  // Pull/download a model through Ollama
  async pullModel(modelName, onProgress = null) {
    try {
      const pullUrl = `${OLLAMA_BASE_URL}/api/pull`;
      const response = await axios.post(pullUrl, 
        { name: modelName },
        {
          responseType: 'stream',
          timeout: 300000 // 5 minutes timeout
        }
      );

      return new Promise((resolve, reject) => {
        let progressData = {};
        
        response.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const data = JSON.parse(line);
              progressData = { ...progressData, ...data };
              
              if (onProgress) {
                onProgress(progressData);
              }
              
              if (data.status === 'success') {
                resolve({ success: true, model: modelName });
              }
            });
          } catch (parseError) {
            // Ignore JSON parse errors for incomplete chunks
          }
        });

        response.data.on('end', () => {
          resolve({ success: true, model: modelName });
        });

        response.data.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error(`Error pulling model ${modelName}:`, error);
      throw error;
    }
  }

  // Update user configuration step
  async updateConfigStep(userId, step, completed = true) {
    try {
      console.log('🔧 updateConfigStep:', { userId, step, completed });

      // First ensure user has config_check field
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize config_check if it doesn't exist
      if (!user.config_check) {
        console.log('🔧 Initializing config_check for user during update');
        await User.findByIdAndUpdate(
          userId,
          { 
            $set: { 
              config_check: {
                completed: false,
                steps: {
                  ollama_installed: false,
                  models_selected: false,
                  models_downloaded: false
                },
                completed_at: null
              }
            }
          }
        );
      }

      const updatePath = `config_check.steps.${step}`;
      const updateData = { [updatePath]: completed };

      // Check if all steps would be completed after this update
      const currentUser = await User.findById(userId);
      if (currentUser && currentUser.config_check) {
        const steps = { ...currentUser.config_check.steps, [step]: completed };
        const allStepsCompleted = steps.ollama_installed && 
                                 steps.models_selected && 
                                 steps.models_downloaded;
        
        if (allStepsCompleted) {
          updateData['config_check.completed'] = true;
          updateData['config_check.completed_at'] = new Date();
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      );

      console.log('✅ Config step updated:', {
        userId,
        step,
        completed,
        newConfigCheck: updatedUser.config_check
      });

      return updatedUser.config_check;
    } catch (error) {
      console.error('❌ Error updating config step:', error);
      throw error;
    }
  }

  // Get user configuration status
  async getUserConfigStatus(userId) {
    try {
      console.log('🔍 getUserConfigStatus - Looking for user:', userId);
      
      const user = await User.findById(userId).select('config_check');
      if (!user) {
        console.error('❌ User not found with ID:', userId);
        throw new Error('User not found');
      }

      console.log('✅ User found:', {
        userId: user._id,
        hasConfigCheck: !!user.config_check,
        configCheck: user.config_check
      });

      // If user doesn't have config_check field (existing users), initialize it
      if (!user.config_check) {
        console.log('🔧 Initializing config_check for existing user');
        const defaultConfigCheck = {
          completed: false,
          steps: {
            ollama_installed: false,
            models_selected: false,
            models_downloaded: false
          },
          completed_at: null
        };

        await User.findByIdAndUpdate(
          userId,
          { $set: { config_check: defaultConfigCheck } },
          { new: true }
        );

        return defaultConfigCheck;
      }

      return user.config_check;
    } catch (error) {
      console.error('❌ Error getting user config status:', error);
      throw error;
    }
  }

  // Start Ollama service (Windows)
  async startOllamaService() {
    try {
      // Try to start Ollama service
      const { stdout } = await execAsync('ollama serve', { timeout: 10000 });
      return { success: true, message: 'Ollama service started' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Verify onboarding completion
  async verifyOnboardingCompletion(userId) {
    try {
      const configStatus = await this.getUserConfigStatus(userId);
      const ollamaStatus = await this.checkOllamaInstallation();
      const orgModels = await this.getOrganizationModels(userId);

      const verification = {
        configComplete: configStatus.completed,
        ollamaRunning: ollamaStatus.running,
        modelsDownloaded: orgModels.models.downloaded.length > 0,
        allChecks: false
      };

      verification.allChecks = verification.configComplete && 
                               verification.ollamaRunning && 
                               verification.modelsDownloaded;

      return verification;
    } catch (error) {
      console.error('Error verifying onboarding completion:', error);
      throw error;
    }
  }
}

export default new OnboardingService();