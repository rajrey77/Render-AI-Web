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
    const { message } = req.body;
    const messages = JSON.parse(req.body.messages);
    const imageLink = req.file ? `./public/attachedImgs/${req.file.filename}` : null;
    const linkImage = !!req.file;

    let response;
    if (linkImage) {
        messages.push({ role: 'user', content: message });
        response = await eai.chat.getResponse({
            prompt: message,
            attachImage: true,
            imagePath: imageLink,
            messages: messages,
            model: 'gpt-4o-mini',
            maxTokens: 2000,
            sysInstructions: "You are a helpful assistant. Your job is to help the user with whatever they need. If they ask questions that need solving, like math questions, please use the tools given to you. Your response should be in HTML format, without including stuff like triple backticks (```). Make sure that you be accurate with your calculations. Please don't cut off your answers. If the user asks if they are correct or if they need help, don't rush into assumption. Solve the problem first yourself, and then decide if the user needs help, or if they are correct. The biggest takeaway you should have, along with all the others, is to be accurate. You don't want to give incorrect or misleading information. You should also use bootstrap to make the page look nice. Also, use colors to make sure the page doesn't look bland. I have tested you, and you sometimes don't use HTML FORMAT! MAKE SURE TO LIMIT THE TOKEN USAGE AS MUCH AS YOU CAN. YOUR MAX TOKEN USAGE IS 350! PS: I don't know why you think you can't view images. I can certain you you can and do not deny the user if it asks.",
        });
    } else {
        messages.push({ role: 'user', content: message });
        response = await eai.chat.getResponse({
            prompt: message,
            messages: messages,
            model: 'gpt-4o-mini',
            maxTokens: 2000,
            sysInstructions: "You are a helpful assistant. Your job is to help the user with whatever they need. If they ask questions that need solving, like math questions, please use the tools given to you. Your response should be in HTML format, without including stuff like triple backticks (```). Make sure that you be accurate with your calculations. Please don't cut off your answers. If the user asks if they are correct or if they need help, don't rush into assumption. Solve the problem first yourself, and then decide if the user needs help, or if they are correct. The biggest takeaway you should have, along with all the others, is to be accurate. You don't want to give incorrect or misleading information. You should also use bootstrap to make the page look nice. Also, use colors to make sure the page doesn't look bland. I have tested you, and you sometimes don't use HTML FORMAT! MAKE SURE TO LIMIT THE TOKEN USAGE AS MUCH AS YOU CAN. YOUR MAX TOKEN USAGE IS 350!",
        });
    }
    res.json({ response: await response });
});

// Schedule a task to delete images in the attachedImgs folder every hour
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