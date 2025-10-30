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
        manualChunks: {
          // React - Keep together with all React ecosystem
          'react-vendor': [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react-router-dom',
            'scheduler'
          ],
          
          // TanStack Query
          'query-vendor': ['@tanstack/react-query'],
          
          // Radix UI - Group 1: Dialogs & Overlays
          'ui-dialogs': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip'
          ],
          
          // Radix UI - Group 2: Form Controls
          'ui-forms': [
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-label'
          ],
          
          // Radix UI - Group 3: Navigation & Layout
          'ui-navigation': [
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-context-menu'
          ],
          
          // Radix UI - Group 4: Misc Components
          'ui-misc': [
            '@radix-ui/react-toast',
            '@radix-ui/react-progress',
            '@radix-ui/react-avatar',
            '@radix-ui/react-separator',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-slot'
          ],
          
          // Icons
          'icons': ['lucide-react'],
          
          // Forms
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Charts
          'charts': ['recharts'],
          
          // Utils
          'utils': [
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'date-fns'
          ],
          
          // HTTP & State
          'network': ['axios'],
          'state': ['zustand'],
          
          // Large libraries
          'xlsx': ['xlsx'],
          'cmdk': ['cmdk'],
          'carousel': ['embla-carousel-react'],
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