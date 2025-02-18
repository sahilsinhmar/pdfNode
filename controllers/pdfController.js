const { convertToPdfFunction } = require('../convertToPdf');
const { query, validationResult } = require('express-validator');

// Create a simple rate limiter for concurrent requests
const MAX_CONCURRENT_REQUESTS = 10;
let currentRequests = 0;
const requestQueue = [];

function processNextRequest() {
    if (requestQueue.length > 0 && currentRequests < MAX_CONCURRENT_REQUESTS) {
        const next = requestQueue.shift();
        next();
    }
}

// Middleware to handle concurrent request limit
const concurrentLimiter = (req, res, next) => {
    if (currentRequests >= MAX_CONCURRENT_REQUESTS) {
        requestQueue.push(() => {
            currentRequests++;
            next();
        });
    } else {
        currentRequests++;
        next();
    }
};

// Validation middleware
const validatePdfRequest = [
    query('url')
        .exists()
        .withMessage('URL is required'),
        // .isURL({ protocols: ['http', 'https'], require_protocol: true })
        // .withMessage('Valid HTTP/HTTPS URL is required'),
    query('options')
        .optional()
        .custom((value) => {
            try {
                const options = JSON.parse(value);
                
                // Validate scale if present
                if (options.scale !== undefined) {
                    const scale = parseFloat(options.scale);
                    if (scale < 0.1 || scale > 2.0) {
                        throw new Error('Scale must be between 0.1 and 2.0');
                    }
                }
                
                // Validate format if present
                if (options.format && !['A4', 'A3', 'Letter', 'Legal', 'Tabloid'].includes(options.format)) {
                    throw new Error('Invalid format specified');
                }
                
                // Validate landscape if present
                if (options.landscape !== undefined && typeof options.landscape !== 'boolean') {
                    throw new Error('Landscape must be a boolean value');
                }
                
                // Validate printBackground if present
                if (options.printBackground !== undefined && typeof options.printBackground !== 'boolean') {
                    throw new Error('PrintBackground must be a boolean value');
                }
                
                return true;
            } catch (error) {
                throw new Error('Invalid PDF options: ' + error.message);
            }
        })
];

// Controller methods
const renderPreviewPage = (req, res) => {
    res.render('preview');
};

const renderTestPage = (req, res) => {
    res.render('test-page');
};

const generatePdf = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation Error',
                userMessage: errors.array()[0].msg,
                details: errors.array()
            });
        }

        const url = req.query.url;
        let pdfOptions = {};

        if (req.query.options) {
            const options = JSON.parse(req.query.options);
            pdfOptions = {
                format: options.format,
                landscape: options.landscape,
                printBackground: options.printBackground,
                scale: options.scale,
                margin: options.margin
            };
        }

        const pdfBuffer = await convertToPdfFunction(url, pdfOptions);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline',
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        
        // Determine user-friendly error message based on error type
        let statusCode = 500;
        let userMessage = 'An error occurred while generating the PDF';
        
        if (error.message.includes('Invalid URL') || error.message.includes('URL endpoint is not accessible')) {
            statusCode = 400;
            userMessage = 'The provided URL is not accessible. Please check the URL and try again.';
        } else if (error.message.includes('exceeds maximum allowed size')) {
            statusCode = 413;
            userMessage = 'The generated PDF is too large. Please try with a simpler page or adjust the settings.';
        } else if (error.message.includes('timeout')) {
            statusCode = 504;
            userMessage = 'The request timed out. Please try again with a different page or adjust the settings.';
        }

        res.status(statusCode).json({ 
            error: error.message,
            userMessage
        });
    } finally {
        currentRequests--;
        processNextRequest();
    }
};

module.exports = {
    concurrentLimiter,
    renderPreviewPage,
    renderTestPage,
    generatePdf,
    validatePdfRequest
};