export type User = {
    id: number;
    name: string;
    username: string;
    email: string;
};
export type Product = {
    id: number;
    name: string;
    stock: number; // quantité disponible
};
export type Status = "preparing" | "shipped" | "delivered" | "cancelled";
export type Order = {
    id: number;
    userId: User["id"]; // client qui commande
    productId: Product["id"]; // produit commandé
    quantity: number;
    status: Status;
    createdAt: string; // date au format ISO
};