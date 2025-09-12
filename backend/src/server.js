// ✅ โหลด env
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: `.env.development` });
} else {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);

// ✅ Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ✅ CORS Config
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// ✅ Security
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ✅ Static Files (optional: ถ้าเก็บ upload local)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes (รวมที่นี่)
const routes = require("./routes");
app.use("/api", routes);

// ✅ Error handler
const errorHandler = require("./middlewares/error.middleware");
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

// ✅ Graceful shutdown
const prisma = require("./prisma/client");
process.on("SIGINT", async () => {
  console.log("⏳ Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit();
});
