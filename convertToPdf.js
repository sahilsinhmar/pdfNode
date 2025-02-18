'use strict';

const puppeteer = require('puppeteer');
const MAX_PDF_SIZE = process.env.MAX_PDF_SIZE ? parseInt(process.env.MAX_PDF_SIZE, 10) : 20 * 1024 * 1024;

// Singleton browser instance
let browserInstance = null;

/**
 * Ensures a single persistent browser instance is available
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true
        });
    }
    return browserInstance;
}

/**
 * Converts a web page at the provided URL to a PDF buffer.
 * Uses a persistent browser instance and manages tabs efficiently.
 * 
 * @param {string} url - The URL of the page to convert to PDF
 * @param {Object} [pdfOptions={}] - Puppeteer PDF options
 * @returns {Promise<Buffer>} - Buffer containing the PDF data
 * @throws Will throw an error if URL is invalid or PDF generation fails
 */
async function convertToPdfFunction(url, pdfOptions = {}) {
    let page = null;
    try {
        // Validate input URL format and protocol restrictions
        if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
            throw new Error('Invalid URL provided. URL must be a string starting with http or https.');
        }

        // Check URL length limit
        const MAX_URL_LENGTH = 2048;
        if (url.length > MAX_URL_LENGTH) {
            throw new Error(`URL exceeds maximum allowed length of ${MAX_URL_LENGTH} characters.`);
        }

        // Validate URL accessibility with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error(`Endpoint responded with status ${response.status}`);
            }
        } catch (err) {
            clearTimeout(timeout);
            throw new Error('URL endpoint is not accessible: ' + err.message);
        }

        // Get persistent browser instance
        const browser = await getBrowser();
        page = await browser.newPage();

        // Set viewport to match A4 dimensions
        await page.setViewport({
            width: 1200,
            height: 1697,
            deviceScaleFactor: 1,
        });


        // Navigate with timeout and network idle
        await Promise.race([
            page.goto(url, { waitUntil: 'networkidle0' }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Page load timeout')), 30000)
            )
        ]);

        // Merge default options with provided options
        const defaultOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            },
            scale: 1.0,
            preferCSSPageSize: true
        };

        // Handle orientation if specified
        if (pdfOptions.orientation) {
            if (!['portrait', 'landscape'].includes(pdfOptions.orientation)) {
                throw new Error('Orientation must be either "portrait" or "landscape"');
            }
            defaultOptions.landscape = pdfOptions.orientation === 'landscape';
        }

        // Handle custom dimensions if specified
        if (pdfOptions.width && pdfOptions.height) {
            delete defaultOptions.format; // Remove format to use custom dimensions
            defaultOptions.width = pdfOptions.width;
            defaultOptions.height = pdfOptions.height;
        }

        const mergedOptions = { ...defaultOptions, ...pdfOptions };

        // Generate PDF
        const pdfBuffer = await page.pdf(mergedOptions);

        if (pdfBuffer.length > MAX_PDF_SIZE) {
            throw new Error(`Generated PDF exceeds maximum allowed size of ${MAX_PDF_SIZE} bytes`);
        }

        return pdfBuffer;
    } catch (error) {
        console.error('Error occurred in convertToPdfFunction:', error);
        throw error;
    } finally {
        // Close only the page, not the browser
        if (page) {
            await page.close();
        }
    }
}

/**
 * Clean up browser resources
 * Call this when shutting down the application
 */
async function cleanup() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}

module.exports = { convertToPdfFunction, cleanup };