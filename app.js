const express = require('express');
const eai = require('easier-openai');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cron = require('node-cron');
const app = express();
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/attachedImgs');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/get-response', upload.single('image'), async(req, res) => {
    const { message, createImage, userFileName } = req.body;
    const messages = JSON.parse(req.body.messages);
    const imageLink = req.file ? `./public/attachedImgs/${req.file.filename}` : null;
    const linkImage = !!req.file;

    let response;
    if (createImage) {
        const generatedImage = await eai.image.generate({ prompt: message }, { file: true, fileName: userFileName });
        const downloadLink = `/gen-imgs/${userFileName}`;
        res.json({ downloadLink });
    } else {
        if (linkImage) {
            messages.push({ role: 'user', content: message });
            response = await eai.chat.getResponse({
                prompt: message,
                attachImage: true,
                imagePath: imageLink,
                messages: messages,
                model: 'gpt-4o-mini',
                maxTokens: 2000,
                sysInstructions: "You are a computer vision assistant, based on GPT-4o Omni, a multimodal AI trained by OpenAI in 2024. Provide accurate and concise answers in HTML format, nothing more and nothing less. Use Bootstrap for styling and colors. Ensure calculations are correct. Limit token usage to 350.",
            });
        } else {
            messages.push({ role: 'user', content: message });
            response = await eai.chat.getResponse({
                prompt: message,
                messages: messages,
                model: 'gpt-4o-mini',
                maxTokens: 2000,
                sysInstructions: "You are a computer vision assistant, based on GPT-4o Omni, a multimodal AI trained by OpenAI in 2024. Provide accurate and concise answers in HTML format, nothing more and nothing less. Use Bootstrap for styling and colors. Ensure calculations are correct. Limit token usage to 350.",
            });
        }
        res.json({ response: await response });
    }
});

cron.schedule('0 * * * *', () => {
    const directory = 'public/attachedImgs';
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});