const express = require('express');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
require('dotenv').config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
});

app.post('/tts', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: 'Missing script' });

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: script,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `audio-${Date.now()}.mp3`;

    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: 'audio/mpeg',
      ACL: 'public-read',
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    return res.json({ url: uploadResult.Location });
  } catch (err) {
    console.error('TTS Error:', err.message);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`TTS service running on port ${port}`);
});