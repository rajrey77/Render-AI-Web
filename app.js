const express = require('express');
const eai = require('easier-openai');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cron = require('node-cron');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;
const imageGenerationLimit = parseInt(process.env.IMAGE_GENERATION_LIMIT, 10);

const userImageCount = {};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/attachedImgs');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage }).fields([
    { name: 'image', maxCount: 1 },
    { name: 'fileName', maxCount: 1 },
    { name: 'generateImage', maxCount: 1 },
    { name: 'message', maxCount: 1 },
    { name: 'messages', maxCount: 1 }
]);

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/gen-imgs', express.static('gen-imgs'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/authenticate', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No credentials sent!' });
    }
    const [type, password] = authHeader.split(' ');
    if (type !== 'Bearer' || password !== process.env.ACCESS_PASSWORD) {
        return res.status(403).json({ error: 'Forbidden' });
    } else {
        return res.status(200).json({ message: 'Authenticated' });
    }
});

app.post('/get-image', upload, async(req, res) => {
    const { imgName } = req.body;
    const imagePath = path.join(__dirname, 'gen-imgs', imgName);
    if (fs.existsSync(imagePath)) {
        res.download(imagePath, imgName, (err) => {
            if (err) {
                res.status(500).json({ error: 'Error downloading the image' });
            }
        });
    }
});
app.post('/get-response', upload, async(req, res) => {
    const { message, messagesArr, generateImage, fileName } = req.body;
    const userIp = req.ip;
    const imageLink = req.files['image'] ? `./public/attachedImgs/${req.files['image'][0].filename}` : null;
    const linkImage = !!req.files['image'];
    let messages = Array.isArray(messagesArr) ? messagesArr : JSON.parse(messagesArr);
    const generateImageBoolean = generateImage === 'true';
    const fileNameValue = fileName || `dall-e-${Date.now()}.png`;
    let imgModel = '';

    if (generateImageBoolean) {
        if (!userImageCount[userIp]) {
            userImageCount[userIp] = 0;
        }
        if (userImageCount[userIp] > imageGenerationLimit) {
            imgModel = 'dall-e-2';
        }else{
            imgModel = 'dall-e-3';
        }
        userImageCount[userIp] += 1;
    }

    try {
        let response;
        if(generateImageBoolean) {
            response = await eai.image.generate({
                prompt: message,
                model: imgModel,
            }, {
                file: true,
                fileName: fileNameValue
            });
            const imagePath = `/gen-imgs/${fileNameValue}`;
            return res.json({ response: imagePath });
        } else if (linkImage) {
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
            return res.json({ response: await response });
        } else {
            messages.push({ role: 'user', content: message });
            response = await eai.chat.getResponse({
                prompt: message,
                messages: messages,
                model: 'gpt-4o-mini',
                maxTokens: 2000,
                sysInstructions: "You are a helpful assistant. Your job is to help the user with whatever they need. If they ask questions that need solving, like math questions, please use the tools given to you. Your response should be in HTML format, without including stuff like triple backticks (```). Make sure that you be accurate with your calculations. Please don't cut off your answers. If the user asks if they are correct or if they need help, don't rush into assumption. Solve the problem first yourself, and then decide if the user needs help, or if they are correct. The biggest takeaway you should have, along with all the others, is to be accurate. You don't want to give incorrect or misleading information. You should also use bootstrap to make the page look nice. Also, use colors to make sure the page doesn't look bland. I have tested you, and you sometimes don't use HTML FORMAT! MAKE SURE TO LIMIT THE TOKEN USAGE AS MUCH AS YOU CAN. YOUR MAX TOKEN USAGE IS 350!",
            });
            return res.json({ response: await response });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

cron.schedule('0 0 * * *', () => {
    const directory = 'public/attachedImgs';
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
    // Reset user image count every day at midnight
    for (const user in userImageCount) {
        userImageCount[user] = 0;
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});