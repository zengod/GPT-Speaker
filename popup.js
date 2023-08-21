window.onload = () => {

    const langElem = document.getElementById('lang'),

          textToSpeechElem = document.getElementById('textToSpeech'),

          speechToTextElem = document.getElementById('speechToText');

    chrome.storage.local.get(['lang', 'textToSpeech', 'speechToText']).then((result) => {

        langElem.value = result.lang || 'en-US';

        textToSpeechElem.checked = result.textToSpeech || false;

        speechToTextElem.checked = result.speechToText || false;
    });

    textToSpeechElem.onchange = (e) => {

        chrome.storage.local.set({ 'textToSpeech': e.target.checked }).then(() => {});
    }

    speechToTextElem.onchange = (e) => {

        chrome.storage.local.set({ 'speechToText': e.target.checked }).then(() => {});
    }

    langElem.onchange = (e) => {

        chrome.storage.local.set({'lang': e.target.value }).then(() => {});
    }
}

