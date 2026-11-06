import express from "express";
import type { Request, Response } from "express";
import cors from "cors";

import { JsonDB, Config } from "node-json-db";
import type { Order, Product, User } from "./types/types.js";

const app = express();

app.use(cors());

app.use(express.json());

const db = new JsonDB(new Config("data/db.json", true, true, "/", false));

app.get("/commands", async (req: Request, res: Response) => {
    const commands = await db.getObjectDefault<Order[]>("/commands", []);
    res.json(commands);
});

app.post("/commands", async (req: Request, res: Response) => {
    const { userId, productId, quantity } = req.body ?? {};

    if (![userId, productId, quantity].every((value) => Number.isInteger(value) && value > 0)) {
        res.status(400).json({ error: "userId, productId et quantity doivent être des entiers positifs." });
        return;
    }

    const [users, products, commands] = await Promise.all([
        db.getObjectDefault<User[]>("/users", []),
        db.getObjectDefault<Product[]>("/products", []),
        db.getObjectDefault<Order[]>("/commands", [])
    ]);
    const productIndex = products.findIndex((entry) => entry.id === productId);

    if (!users.some((entry) => entry.id === userId) || productIndex === -1) {
        res.status(404).json({ error: "Client ou produit introuvable." });
        return;
    }

    const product = products[productIndex];
    if (!product) {
        res.status(404).json({ error: "Produit introuvable." });
        return;
    }
    if (product.stock < quantity) {
        res.status(409).json({ error: "Stock insuffisant." });
        return;
    }

    const command: Order = {
        id: commands.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1,
        userId,
        productId,
        quantity,
        status: "preparing",
        createdAt: new Date().toISOString()
    };

    await db.push(`/products/${productIndex}/stock`, (product as Product).stock - quantity, true);
    await db.push("/commands[]", command);

    res.status(201).json(command);
});

app.patch("/commands/:id/status", async (req: Request, res: Response) => {
    const commandId = Number(req.params.id);
    const { status } = req.body ?? {};

    if (!Number.isInteger(commandId) || commandId <= 0 || !["shipped", "cancelled"].includes(status)) {
        res.status(400).json({ error: "Statut invalide." });
        return;
    }

    const commands = await db.getObjectDefault<Order[]>("/commands", []);
    const commandIndex = commands.findIndex((entry) => entry.id === commandId);
    const command = commands[commandIndex];

    if (!command) {
        res.status(404).json({ error: "Commande introuvable." });
        return;
    }
    if (command.status !== "preparing") {
        res.status(409).json({ error: "Cette commande ne peut plus changer de statut." });
        return;
    }

    if (status === "cancelled") {
        const products = await db.getObjectDefault<Product[]>("/products", []);
        const productIndex = products.findIndex((entry) => entry.id === command.productId);
        if (productIndex === -1) {
            res.status(404).json({ error: "Produit introuvable." });
            return;
        }
        await db.push(`/products/${productIndex}/stock`, (products[productIndex] as Product).stock + command.quantity, true);
    }

    await db.push(`/commands/${commandIndex}/status`, status, true);

    if (status === "shipped") {
        setTimeout(() => {
            void db.push(`/commands/${commandIndex}/status`, "delivered", true)
                .catch((error: unknown) => console.error("Impossible de livrer la commande automatiquement:", error));
        }, 20_000);
    }

    res.json({ ...command, status });
});

const PORT = process.env.PORT || 3000;
export const server = app.listen(PORT, () => console.log(`http://localhost:${PORT}`));