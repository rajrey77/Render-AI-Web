const messageEl = document.getElementById('message1');
const sendButton = document.getElementById('send');
const response = document.getElementById('response');
const imageInput = document.getElementById('imageInput');

const messages = [];

sendButton.addEventListener('click', async() => {
    const message = messageEl.value;
    const imageFile = imageInput.files[0];
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
            formData.append('messages', JSON.stringify(messages));
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const fresponse = await fetch('/get-response', {
                method: 'POST',
                body: formData,
            });
            const data = await fresponse.json();
            messagePushAssistant.content = data.response;
            messages.push(messagePushUser);
            messages.push(messagePushAssistant);

            const userMessageEl = document.createElement('div');
            userMessageEl.className = 'user-message';
            userMessageEl.textContent = `You: ${message}`;

            const assistantMessageEl = document.createElement('div');
            assistantMessageEl.className = 'assistant-message';
            assistantMessageEl.innerHTML = `Assistant: ${data.response}`;

            const separator = document.createElement('hr');
            separator.style.borderWidth = '9px'; // Set the thickness of the line
            
            response.prepend(separator);
            response.prepend(assistantMessageEl);
            response.prepend(separator.cloneNode()); // Add another line before the response
            response.prepend(userMessageEl);

            messageEl.value = ''; // Clear the input field
            imageInput.value = ''; // Clear the file input
        } catch (error) {
            console.error('Error:', error);
        }
    }
});