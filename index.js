const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();  // Load environment variables

const app = express();
const port = 8000;

// Set up CORS
const allowedOrigins = ['http://localhost:3000','https://smart-compare-wflf.vercel.app'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: 'GET,POST,PUT,DELETE',
    credentials: true
}));

app.use(express.json());

// Scrape product details from a webpage
app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const titleElement = $('span#productTitle').text().trim();
        const priceElement = $('span.a-offscreen').first().text().trim();
        const featureElements = [];

        $('ul.a-unordered-list.a-vertical.a-spacing-mini li span.a-list-item').each((index, element) => {
            const featureText = $(element).text().trim().replace(/\|/g, '');
            featureElements.push(featureText);
        });

        const features = [titleElement, featureElements.join('. ') + '.'];

        res.json({
            title: titleElement,
            price: priceElement,
            features: features
        });
    } catch (error) {
        console.error('Error while scraping:', error.message);
        res.status(500).json({ error: 'An error occurred while scraping the data' });
    }
});

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Compare products or generate text using Gemini AI
app.post('/compare', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        // Correctly call the Gemini model using generateContent with the prompt
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Generate text using the direct prompt
        const result = await model.generateContent(prompt);

        // Extract the generated text
        const generatedText = result.response.text();

        // Return the result
        res.json({ comparison: generatedText });
    } catch (error) {
        console.error('Error generating comparison:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate comparison' });
    }
});

app.listen(port, () => {
    console.log(`Web scraper and Gemini API server running on http://localhost:${port}`);
});
