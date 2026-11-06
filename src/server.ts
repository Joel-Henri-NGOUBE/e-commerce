import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
export const server = app.listen(PORT, () => console.log(`http://localhost:${PORT}`));