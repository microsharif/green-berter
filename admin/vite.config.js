import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Admin runs on a separate port from the public client (5173) so both dev
// servers can run side by side against the same API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
});
