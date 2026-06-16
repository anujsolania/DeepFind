import type { NextFunction, Request, Response } from "express";
import { supabase } from "./supabase";

export default async function middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!data.user?.id) {
        return res.status(401).json({ error: "User ID not found" });
    }
    (req as any).userId = data.user?.id;
    next();
}   