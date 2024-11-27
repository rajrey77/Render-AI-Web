const messageEl = document.getElementById('message1');
const sendButton = document.getElementById('send');
const response = document.getElementById('response');
const imageInput = document.getElementById('imageInput');
const generateImage = document.getElementById('generateImage');
const fileNameEl = document.getElementById('fileName');
const passwordEl = document.getElementById('password');
const passwordContainer = document.getElementById('passwordContainer');
const fileNameContainer = document.getElementById('fileNameContainer');
const imageContainer = document.getElementById('imageContainer');

const messages = [];

generateImage.addEventListener('change', () => {
    if (generateImage.checked) {
        fileNameEl.disabled = false;
        fileNameContainer.style.display = 'block';
        passwordContainer.style.display = 'block';
        fileNameContainer.style.visibility = 'visible';
        passwordContainer.style.visibility = 'visible';
    } else {
        fileNameEl.disabled = true;
        fileNameContainer.style.display = 'none';
        passwordContainer.style.display = 'none';
        fileNameContainer.style.visibility = 'hidden';
        passwordContainer.style.visibility = 'hidden';
    }
});

sendButton.addEventListener('click', async() => {
    sendButton.disabled = true;
    const generateImageBoolean = generateImage.checked;
    const message = messageEl.value;
    const imageFile = imageInput.files[0];
    const password = passwordEl.value ? passwordEl.value : false;
    let allowImageCreation = false;
    let authResponse;
    if(!!password) {
        authResponse = await fetch('/authenticate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${password}`
            }
        });
        if(authResponse.status === 403 || authResponse.status === 401) {
            allowImageCreation = false;
        }else if(authResponse.status === 200) {
            allowImageCreation = true;
        }
    }
    if (message || imageFile) {
        const messagePushUser = {
            role: 'user',
            content: message,
        };
        const messagePushAssistant = {
            role: 'assistant',
            content: '',
        };
        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('messagesArr', JSON.stringify(messages));
            if(generateImageBoolean) {
                formData.append('generateImage', generateImageBoolean);
                formData.append('fileName', fileNameEl.value);
            }
            if (imageFile) {
                formData.append('image', imageFile);
            }
            const fresponse = await fetch('/get-response', {
                method: 'POST',
                body: formData
            });
            if (!fresponse.ok) {
                throw new Error('Network response was not ok');
            }
            if(fresponse.error !== 'Forbidden' && fresponse.error !== 'No credentials sent!') {
            const data = await fresponse.json();

            messagePushAssistant.content = data.response;
            messages.push(messagePushUser);
            messages.push(messagePushAssistant);

            const userMessageEl = document.createElement('div');
            userMessageEl.className = 'user-message';
            userMessageEl.textContent = `You: ${message}`;

            const assistantMessageEl = document.createElement('div');
            assistantMessageEl.className = 'assistant-message';
            assistantMessageEl.innerHTML = `Assistant: ${!generateImageBoolean ? data.response : 'Image Created.'}`;

            const separator = document.createElement('hr');
            separator.style.borderWidth = '9px';
            
            if(generateImageBoolean && allowImageCreation) {
                const downloadLink = document.createElement('a');
                downloadLink.href = data.response;
                downloadLink.download = fileNameEl.value;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                const getImage = fetch('/get-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imgName: fileNameEl.value ? fileNameEl.value : `dall-e-${Date.now()}.png` }),
                });
                const imageBlob = await getImage.then(res => res.blob());
                const imageUrl = URL.createObjectURL(imageBlob);
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = 'Generated Image';
                const br = document.createElement('br');
                response.prepend(br);
                response.prepend(imgElement);
            }

            response.prepend(separator);
            response.prepend(assistantMessageEl);
            response.prepend(separator.cloneNode());
            response.prepend(userMessageEl);

            messageEl.value = '';
            imageInput.value = '';
            }else{
                alert("Access Denied.");
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            sendButton.disabled = false;
        }
    }
});