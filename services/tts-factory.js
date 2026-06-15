// Factory that selects the Text-to-Speech provider at runtime.
//
// Both providers expose the same interface (a `generate(gptReply, icount)`
// method and a `'speech'` event), so the rest of the app does not care which
// one is in use. Selection is driven by the TTS_PROVIDER env var:
//   - "deepgram" (default) -> Deepgram /v1/speak
//   - "60db" / "sixtydb"   -> 60db WebSocket TTS
require('dotenv').config();
require('colors');
const { TextToSpeechService } = require('./tts-service');
const { SixtyDbTextToSpeechService } = require('./tts-sixtydb-service');

function createTextToSpeechService() {
 const provider = (process.env.TTS_PROVIDER || 'deepgram').toLowerCase();

 switch (provider) {
   case '60db':
   case 'sixtydb':
     console.log('TTS provider: 60db'.cyan);
     return new SixtyDbTextToSpeechService();
   case 'deepgram':
     console.log('TTS provider: Deepgram'.cyan);
     return new TextToSpeechService();
   default:
     console.warn(`Unknown TTS_PROVIDER "${provider}", defaulting to Deepgram`.yellow);
     return new TextToSpeechService();
 }
}

module.exports = { createTextToSpeechService };
