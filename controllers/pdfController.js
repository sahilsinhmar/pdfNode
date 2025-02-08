const { convertToPdfFunction } = require('../convertToPdf');

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

// Controller methods
const renderPreviewPage = (req, res) => {
    res.render('preview');
};

const renderTestPage = (req, res) => {
    res.render('test-page');
};

const generatePdf = async (req, res) => {
    try {
        const url = req.query.url;
        let pdfOptions = {};

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ 
                error: 'URL is required',
                userMessage: 'Please provide a valid URL'
            });
        }

        if (!/^https?:\/\//.test(url)) {
            return res.status(400).json({ 
                error: 'Invalid URL protocol',
                userMessage: 'URL must begin with http:// or https://'
            });
        }

        if (req.query.options) {
            try {
                const options = JSON.parse(req.query.options);
                console.log(options)
                pdfOptions = {
                    format: options.format,
                    landscape: options.landscape,
                    printBackground: options.printBackground,
                    scale: options.scale,
                    margin: options.margin
                };

                // Validate scale range
                if (pdfOptions.scale < 0.1 || pdfOptions.scale > 2.0) {
                    return res.status(400).json({
                        error: 'Invalid scale value',
                        userMessage: 'Scale must be between 0.1 and 2.0'
                    });
                }
            } catch (e) {
                return res.status(400).json({ 
                    error: 'Invalid PDF options',
                    userMessage: 'Invalid PDF options provided'
                });
            }
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
    generatePdf
};