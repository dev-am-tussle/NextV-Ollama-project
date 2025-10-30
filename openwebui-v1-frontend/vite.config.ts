import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Node modules chunking
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            if (id.includes('react-router')) {
              return 'react-router';
            }
            
            // Radix UI - Split into smaller chunks by component type
            if (id.includes('@radix-ui')) {
              if (id.includes('dialog') || id.includes('alert-dialog')) {
                return 'radix-dialog';
              }
              if (id.includes('dropdown') || id.includes('menu')) {
                return 'radix-menu';
              }
              if (id.includes('select') || id.includes('combobox')) {
                return 'radix-select';
              }
              if (id.includes('popover') || id.includes('tooltip') || id.includes('hover-card')) {
                return 'radix-overlay';
              }
              if (id.includes('tabs') || id.includes('accordion') || id.includes('collapsible')) {
                return 'radix-navigation';
              }
              // All other radix components
              return 'radix-misc';
            }
            
            // Data fetching
            if (id.includes('@tanstack/react-query')) {
              return 'tanstack-query';
            }
            
            // HTTP client
            if (id.includes('axios')) {
              return 'axios';
            }
            
            // Icons
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'react-forms';
            }
            
            // Validation
            if (id.includes('zod')) {
              return 'zod';
            }
            
            // State management
            if (id.includes('zustand')) {
              return 'zustand';
            }
            
            // Charts
            if (id.includes('recharts')) {
              return 'recharts';
            }
            
            // Date handling
            if (id.includes('date-fns')) {
              return 'date-fns';
            }
            
            // Excel/CSV
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            
            // Utilities
            if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            
            // All other node_modules
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1500 kB
    chunkSizeWarningLimit: 1500,
    
    // Additional optimizations
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    minify: 'esbuild', // Use esbuild (faster and already included with Vite)
    // Note: If you want terser, run: npm install -D terser
    // Then change minify to 'terser' and uncomment terserOptions below
    
    // terserOptions: {
    //   compress: {
    //     drop_console: true, // Remove console.logs in production
    //     drop_debugger: true,
    //   },
    // },
  },
}));