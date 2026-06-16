import type { NextFunction, Request, Response } from "express";
import { supabase } from "./supabase";
import type { AuthProvider } from "./prisma/generated/enums";
import { prisma } from "./db";

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

    try {
        console.log(data)
        const res = await prisma.user.create({
            data: {
                email: data.user.email!,
                id: data.user.id,
                name: data.user.user_metadata.name,
                provider: data.user.app_metadata.provider as AuthProvider,
            }
        })
        console.log(res)
    } catch (error) {
        console.log("user not created cause already exists", error)
    }
    (req as any).userId = data.user?.id;
    next();
}   