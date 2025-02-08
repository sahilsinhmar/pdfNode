const express = require("express");
const path = require("path");
const { cleanup } = require('./convertToPdf');
const {
    concurrentLimiter,
    renderPreviewPage,
    renderTestPage,
    generatePdf
} = require('./controllers/pdfController');

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.get('/preview', renderPreviewPage);
app.get('/test-page', renderTestPage);
app.get('/pdf', concurrentLimiter, generatePdf);

const server = app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

// Cleanup handlers for various exit scenarios
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Cleaning up...');
  await cleanup();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Cleaning up...');
  await cleanup();
  server.close(() => process.exit(0));
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await cleanup();
  server.close(() => process.exit(1));
});

module.exports = app;


