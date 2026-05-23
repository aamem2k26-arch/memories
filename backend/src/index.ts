import path from "path"
import cors from "cors"
import multer from "multer"
import express from "express"
import authRoutes from "./routes/auth.route"
import { checkDbConnection } from "./config/db"
import memoryRoutes from "./routes/memory.route"
import type { Request, Response, NextFunction } from "express"

export async function createServer() {
    try {
        await checkDbConnection()

        const app = express()

        app.use(cors())
        app.use(express.json({ limit: '500mb' }))
        app.use(express.urlencoded({ extended: true, limit: '500mb' }))
        
        // Routes
        app.use("/api/auth", authRoutes)
        app.use("/api/memories", memoryRoutes)

        app.get("/api/health", (_req, res) => {
            res.json({
                status: "Backend is running and DB is connected! 🚀",
            })
        })

        app.use("/api", (req, res) => {
            res.status(404).json({
                success: false,
                message: `API Route Not Found: [${req.method}] ${req.originalUrl}`,
                tip: "Make sure you are using the correct Method (GET/POST/PUT/DELETE) and no extra spaces in the URL."
            });
        });

        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
            console.error("SERVER ERROR:", err);

            // Handle Multer Errors
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        message: `Unexpected file field: ${err.field}. Only one file is allowed for this document.`
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `File Upload Error: ${err.message}`
                });
            }

            // Handle custom errors from fileFilter
            if (err.message && (err.message.includes('Only .png') || err.message.includes('formats are allowed'))) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

            res.status(statusCode).json({
                success: false,
                message: err.message || "Something went wrong. Please try again.",
            });
        });

        return app
    } catch (error) {
        console.error("Error in createServer:", error)
        throw error
    }
}