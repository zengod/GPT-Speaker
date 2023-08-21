'use strict'

const CONFIG = {
    lang: 'en-US',
    'mutations' : {
        timer: 7000,
        id: null
    },
    'text-to-speech' : {
        ss: window.speechSynthesis,
        chunkSize: 200
    },
    'speech-to-text' : {
        blocked: false,
        st: null
    }
}

const speechToText = (isTextToSpeach) => {

    CONFIG['speech-to-text'].st = new webkitSpeechRecognition();

    const textarea = document.getElementById('prompt-textarea'), submit = textarea.nextSibling;

    CONFIG['speech-to-text'].st.continuous = true;

    CONFIG['speech-to-text'].st.lang = CONFIG.lang;

    CONFIG['speech-to-text'].st.onresult = (e) => {

        textarea.value += e.results[e.results.length - 1][0].transcript;

        const inputEvent = new Event('input', { bubbles: true, cancelable: true });

        textarea.dispatchEvent(inputEvent);

        submit.click();

        CONFIG['speech-to-text'].st.stop();

        if(isTextToSpeach) {

            CONFIG['speech-to-text'].st.onend = null;
            CONFIG['speech-to-text'].st.onresult = null;
            CONFIG['speech-to-text'].st.onerror = null;
            CONFIG['speech-to-text'].st.onnomatch = null;
            CONFIG['speech-to-text'].st.onsoundstart = null;
            CONFIG['speech-to-text'].st.onsoundend = null;
            CONFIG['speech-to-text'].st.onaudiostart = null;
            CONFIG['speech-to-text'].st.onaudioend = null;
            CONFIG['speech-to-text'].st.onstart = null;
            CONFIG['speech-to-text'].st = null;
        }
    };

    CONFIG['speech-to-text'].st.onend = () => { if(!CONFIG['speech-to-text'].blocked) CONFIG['speech-to-text'].st.start(); }

    CONFIG['speech-to-text'].st.start();
};

const getVoices = () => {

    return new Promise((resolve) => {

            let id = setInterval(() => {

                if (CONFIG['text-to-speech'].ss.getVoices().length !== 0) {

                    resolve(CONFIG['text-to-speech'].ss.getVoices().find(voice => voice.lang === CONFIG.lang));

                    clearInterval(id);
                }

            }, 10);
        }
    )
};

const createChunk = (text, voice) => {

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = CONFIG.lang;

    utterance.voice = voice;

    utterance.pitch = 0.9;

    return utterance;
}

const splitSentence = (sentence) => {

    const words = sentence.split(' ');

    let firstChunk = '', secondChunk = '';

    for (const word of words) {

        if (firstChunk.length + word.length + 1 <= CONFIG["text-to-speech"].chunkSize) {

            firstChunk += (firstChunk ? ' ' : '') + word;

        } else {

            secondChunk += (secondChunk ? ' ' : '') + word;
        }
    }

    return [firstChunk, secondChunk];
}

const textReader = async (text) => {

    const sentences = text.split(/[.!?]/), chunks = [], systemVoice = await getVoices();

    for (let i = 0; i < sentences.length; i++) {

        if(!sentences[i].trim().length) continue;

        if(sentences[i].length <= CONFIG['text-to-speech'].chunkSize) {

            chunks.push(createChunk(sentences[i], systemVoice));

        } else {

            const tmp = splitSentence(sentences[i]);

            chunks.push(createChunk(tmp[0], systemVoice));

            chunks.push(createChunk(tmp[1], systemVoice));
        }
    }

    const readChunks = (index) => {

        if (index >= chunks.length) {

            CONFIG["speech-to-text"].blocked = false;

            return speechToText(true);
        }

        const utterance = chunks[index];

        utterance.addEventListener('end', () => {

            console.log(`--- Reading chunk ${index + 1}`);

            readChunks(index + 1);
        });

        utterance.onerror = (err) => {

            console.log(`-- ${err.error}. Allow sound + microphone permissions for GPT site.`);
        }

        CONFIG['text-to-speech'].ss.cancel();

        CONFIG['text-to-speech'].ss.speak(utterance);
    }

    readChunks(0);
};

const getMessagesBoxes = () => {

    return document.querySelectorAll('.group.w-full.text-token-text-primary');
};

const isGPTMessage = (lastMessageBox) => {

    const controls = lastMessageBox.getElementsByTagName('button');

    /** 5 buttons - GPT, 3 button - user */

    return controls.length > 3;
};

const getLastMessageBox = () => {

    const messagesBoxesFound = getMessagesBoxes();

    const lastMessageBox = messagesBoxesFound[messagesBoxesFound.length - 1];

    if(isGPTMessage(lastMessageBox)) {

        const answer = lastMessageBox.querySelectorAll('.markdown.prose.w-full');

        const text = Array.from(answer[0].children)
            .filter(i => ['UL', 'P', 'OL'].includes(i.tagName))
            .map(i => {

                if(i.tagName === 'UL' || i.tagName === 'OL') {

                    let innerText = '';

                    i.querySelectorAll('li').forEach(li => {

                        innerText += li.innerText;
                    });

                    return innerText;

                } else {

                    return i.innerText;
                }
            })
            .join(' ');

        const previousText = localStorage.getItem('text');

        if(!previousText || (previousText && previousText !== text)) {

            console.log(text);

            localStorage.setItem('text', text);

           (document.getElementById('run-text-to-speech')).click();
        }
    }
};

const handleMutation = (mutationsList) => {

    for (const mutation of mutationsList) {

        if (mutation.type === 'childList') {

            clearTimeout(CONFIG.mutations.id);

            CONFIG.mutations.id = setTimeout(() => {

                getLastMessageBox();

            }, CONFIG.mutations.timer);
        }
    }
};

const createMutationObserver = (target) => {

    const observerOptions = {
        childList: true,
        subtree: true
    };

    const observer = new MutationObserver(handleMutation);

    observer.observe(target, observerOptions);

    return observer;
};

const waitMessagesBoxes = () => {

    return new Promise((resolve) => {

        setTimeout(() => {

            console.log('---- Searching messages boxes');

            const messages = getMessagesBoxes();

            if(messages.length > 0) resolve(messages);

            resolve(null);

        }, 500);
    });
};

const textToSpeechInit = async () => {

    /** Create tts button to play voice (browser security restriction) */

    const button = document.createElement('button');

    button.setAttribute('id', 'run-text-to-speech');

    button.style.cssText = 'height: 1px; width: 1px; background: transparent;';

    button.onclick = async () => {

        const text = localStorage.getItem('text');

        console.log('--- GPT speaking');

        if(text) await textReader(text);
    };

    document.body.appendChild(button);

    /** Searching for message boxes */

    let messagesBoxesFound = null;

    while(!messagesBoxesFound) messagesBoxesFound = await waitMessagesBoxes();

    /** Raise messages boxes observer */

    console.log(messagesBoxesFound);

    console.log('--- Creating observer');

    let observer = createMutationObserver(messagesBoxesFound[0].parentNode);

    /** Messages boxes observer lifecycle */

    chrome.storage.onChanged.addListener((changes) => {

        if('textToSpeech' in changes && changes.textToSpeech.newValue === false) { console.log('-- Observer disconnected'); observer.disconnect(); }

        if('textToSpeech' in changes && changes.textToSpeech.newValue === true)  { console.log('-- Observer restarted'); observer = createMutationObserver(messagesBoxesFound[0].parentNode); }
    });
};

window.onload = () => {

    chrome.storage.local.get(['lang', 'textToSpeech', 'speechToText']).then(async (result) => {

        CONFIG.lang = result.lang;

        if(result.speechToText) speechToText(result.textToSpeech);

        if(result.textToSpeech) await textToSpeechInit();
    });
};
