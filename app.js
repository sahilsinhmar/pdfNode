const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let employees = [];

app.post("/upload", upload.single("excelFile"), (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const header = data[0];
  const values = data.slice(1);

  const result = values.map((row) => {
    const obj = {};
    row.forEach((value, index) => {
      if (index === 0) {
        obj[header[index]] = Number(value);
      } else {
        obj[header[index]] = value;
      }
    });
    return obj;
  });

  employees = result;

  console.log("Result:", result);

  res.redirect("/generate-all");
});

app.get("/generate-all", async (req, res) => {
  const pdfDir = path.join(__dirname, "pdf");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
  }

  const pdfPromises = employees.map(async (employee) => {
    const html = await new Promise((resolve, reject) => {
      app.render(
        "employee",
        {
          employee,
          logoBase64: getBase64Image("public/assets/logo.webp"), // Get base64 encoded image
        },
        (err, html) => {
          if (err) return reject(err);
          resolve(html);
        }
      );
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForSelector(".logo");
    const pdfPath = path.join(pdfDir, `employee_${employee.Id}.pdf`);
    await page.pdf({ path: pdfPath, format: "A2", printBackground: true });
    await browser.close();
  });

  await Promise.all(pdfPromises);

  res.send("PDFs generated successfully!");
});

app.get("/print/:id", (req, res) => {
  const id = Number(req.params.id);
  const employee = employees.find((emp) => emp.Id === id);

  if (!employee) {
    res.status(404).send("Employee not found");
  } else {
    res.render("employee", {
      employee,
      logoBase64: getBase64Image("public/assets/logo.webp"),
    });
  }
});

function getBase64Image(imgPath) {
  const imgData = fs.readFileSync(imgPath).toString("base64");
  return `data:image/webp;base64,${imgData}`;
}

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
