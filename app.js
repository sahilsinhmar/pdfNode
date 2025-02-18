const express = require("express");
const path = require("path");
const { cleanup } = require("./convertToPdf");
const { concurrentLimiter, renderPreviewPage, renderTestPage, generatePdf, validatePdfRequest } = require("./controllers/pdfController");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.get("/health", (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    responseTime: process.hrtime(),
    message: "OK",
    timestamp: Date.now(),
  };
  res.status(200).json(healthCheck);
});
app.get("/preview", renderPreviewPage);
app.get("/test-page", renderTestPage);
app.get("/pdf", concurrentLimiter, validatePdfRequest, generatePdf);
app.get("/", (req, res) => {
  res.send("Project Name: PDF Node");
});

const server = app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

// Cleanup handlers for various exit scenarios
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Cleaning up...");
  await cleanup();
  server.close(() => process.exit(0));
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Cleaning up...");
  await cleanup();
  server.close(() => process.exit(0));
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await cleanup();
  server.close(() => process.exit(1));
});

module.exports = app;
