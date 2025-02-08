# PDF Conversion Web Application - Product Requirements Document

## Overview
A web-based application that converts web pages to PDF files with customizable options. The application provides a user-friendly interface for URL input and PDF configuration, along with a preview feature.

## Features

### 1. Core PDF Conversion
- **URL to PDF Conversion**: Convert any web page to PDF by providing its URL
- **Maximum File Size**: 5MB default limit (configurable via environment variables)
- **Error Handling**: Comprehensive error handling for invalid URLs, timeouts, and size limits
- **Security**: URL validation and protocol restrictions (http/https only)

### 2. PDF Customization Options
- **Paper Format**: Supports multiple formats (A4, Letter, Legal)
- **Orientation**: Portrait or Landscape modes
- **Margins**: Customizable margins (top, right, bottom, left)
- **Background**: Option to include/exclude background graphics
- **Scale**: Adjustable page scaling (0.1 to 2.0)

### 3. User Interface
- **Preview Page**: Interactive interface for PDF generation settings
- **Real-time Preview**: Live preview of the generated PDF
- **Responsive Design**: Built with Tailwind CSS for mobile responsiveness

## Technical Specifications

### Frontend
- **Framework**: Express.js with EJS templating
- **Styling**: Tailwind CSS
- **Preview**: Embedded PDF viewer
- **Input Validation**: Client-side validation for URL and options

### Backend
- **Server**: Node.js with Express
- **PDF Generation**: Puppeteer for headless browser PDF creation
- **Response Format**: Binary PDF data with appropriate headers
- **Error Handling**: Structured error responses in JSON format

### Performance Requirements
- **Timeout**: 5-second timeout for URL accessibility checks
- **URL Limits**: Maximum URL length of 2048 characters
- **PDF Size**: Configurable maximum PDF file size (default 5MB)

## API Endpoints

### 1. PDF Generation Endpoint
- **Route**: `/pdf`
- **Method**: GET
- **Parameters**:
  - `url`: Target webpage URL (required)
  - `options`: JSON string containing PDF options (optional)
    ```javascript
    {
      format: string,      // e.g., 'A4'
      landscape: boolean,  // true/false
      printBackground: boolean,
      scale: number,      // 0.1 to 2.0
      margin: {
        top: string,
        right: string,
        bottom: string,
        left: string
      }
    }
    ```
- **Response**: PDF file or error JSON

### 2. Preview Page
- **Route**: `/preview`
- **Method**: GET
- **Response**: HTML page with PDF configuration interface

### 3. Test Page
- **Route**: `/test-page`
- **Method**: GET
- **Purpose**: A4 formatted test page for PDF conversion testing

## Testing
- Unit tests with Jest
- API testing with Supertest
- E2E testing with Playwright
- Test coverage for core conversion functionality
- Error case validation

## Future Enhancements
1. Batch processing of multiple URLs
2. Custom header/footer options
3. PDF password protection
4. Cloud storage integration
5. API rate limiting
6. User authentication
7. Custom templates for PDF generation

## Deployment Requirements
- Node.js environment
- Sufficient memory for Puppeteer operations
- Network access for URL fetching
- Storage space for temporary PDF files
- Environment variables for configuration