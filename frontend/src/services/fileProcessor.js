/**
 * Browser-based file processing.
 * Handles PDF, images, and basic DOCX text extraction.
 */

import { queryModel } from './llmClient';

/**
 * Extract text content from a file.
 * @param {File} file - The file to process
 * @returns {Promise<Object>} {text, type, filename}
 */
export async function extractFileContent(file) {
    const filename = file.name;
    const mimeType = file.type;

    // Handle images - convert to base64 for vision models
    if (mimeType.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        return {
            text: `[Image: ${filename}]`,
            base64,
            type: 'image',
            filename,
            mimeType
        };
    }

    // Handle PDFs
    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
        const text = await extractPdfText(file);
        return {
            text,
            type: 'pdf',
            filename
        };
    }

    // Handle DOCX
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filename.endsWith('.docx')) {
        const text = await extractDocxText(file);
        return {
            text,
            type: 'docx',
            filename
        };
    }

    // Handle plain text files
    if (mimeType.startsWith('text/') ||
        filename.endsWith('.txt') ||
        filename.endsWith('.md') ||
        filename.endsWith('.json') ||
        filename.endsWith('.csv')) {
        const text = await file.text();
        return {
            text,
            type: 'text',
            filename
        };
    }

    throw new Error(`Unsupported file type: ${mimeType || filename}`);
}

/**
 * Convert file to base64.
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 string
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Extract text from a PDF file using PDF.js.
 * @param {File} file - The PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractPdfText(file) {
    // Dynamically import PDF.js
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `\n--- Page ${i} ---\n${pageText}`;
    }

    return fullText.trim();
}

/**
 * Extract text from a DOCX file using basic XML parsing.
 * @param {File} file - The DOCX file
 * @returns {Promise<string>} Extracted text
 */
async function extractDocxText(file) {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // DOCX files contain document.xml with the content
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
        throw new Error('Could not find document content in DOCX file');
    }

    // Parse XML and extract text content
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, 'text/xml');

    // Find all text elements
    const textNodes = xmlDoc.getElementsByTagName('w:t');
    let text = '';

    for (let i = 0; i < textNodes.length; i++) {
        text += textNodes[i].textContent;
        // Add space between elements for readability
        if (i < textNodes.length - 1) {
            text += ' ';
        }
    }

    return text.trim();
}

/**
 * Analyze file content with an LLM.
 * @param {string} extractedText - The extracted text from the file
 * @param {string} prompt - User's analysis prompt
 * @param {string} filename - Original filename
 * @param {string} fileType - Type of file (pdf, docx, image, text)
 * @returns {Promise<Object>} {analysis, model}
 */
export async function analyzeFileContent(extractedText, prompt, filename, fileType) {
    const systemPrompt = `You are an expert document analyst. The user has uploaded a ${fileType} file named "${filename}". 
Here is the extracted content from the file:

---
${extractedText}
---

Please analyze this content and respond to the user's request.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    // Use GPT OSS 120B for file analysis
    const model = {
        id: 'openai/gpt-oss-120b',
        provider: 'groq',
        name: 'GPT OSS 120B'
    };

    const response = await queryModel(model, messages);

    if (!response) {
        throw new Error('Failed to analyze file content');
    }

    return {
        analysis: response.content,
        model: model.name
    };
}

/**
 * Analyze an image with a vision model.
 * @param {string} base64Image - Base64 encoded image
 * @param {string} prompt - User's analysis prompt
 * @param {string} filename - Original filename
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<Object>} {analysis, model}
 */
export async function analyzeImage(base64Image, prompt, filename, mimeType) {
    // Use Google Gemini for vision
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    const requestBody = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Image
                    }
                }
            ]
        }]
    };

    const response = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        throw new Error('No response from vision model');
    }

    return {
        analysis: content,
        model: 'Gemini 2.0 Flash'
    };
}
