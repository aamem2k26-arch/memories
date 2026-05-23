import { createServer } from "./index";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 8000;

(async () => {
  try {
    const app = await createServer();
    app.listen(port, () => {
      console.log(`🚀 Backend server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    process.exit(1);
  }
})();
