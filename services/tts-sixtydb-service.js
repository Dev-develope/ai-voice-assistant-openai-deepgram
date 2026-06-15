// 60db (sixtydb) Text-to-Speech provider using the 60db WebSocket API.
//
// This mirrors the interface of services/tts-service.js (Deepgram) so the two
// providers are interchangeable: same `generate(gptReply, interactionCount)`
// method and the same `'speech'` event signature consumed by app.js.
//
// The WebSocket transport is used (rather than the HTTP endpoints) because it
// is the only 60db transport that can emit MULAW @ 8000 Hz audio, which is
// exactly what Twilio's media streams expect - so no transcoding is needed.
require('dotenv').config();
require('colors');
const { Buffer } = require('node:buffer');
const EventEmitter = require('events');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// 60db WebSocket TTS endpoint. The API key is passed as a query parameter.
const SIXTYDB_WS_URL = 'wss://api.60db.ai/ws/tts';

class SixtyDbTextToSpeechService extends EventEmitter {
 constructor() {
   super();

   this.apiKey = process.env.SIXTYDB_API_KEY;
   this.voiceId = process.env.SIXTYDB_VOICE_ID;   // optional - server default if unset

   // Per-context state: maps a context_id to its segment metadata plus the
   // audio chunks received so far. Twilio plays audio back in order using
   // partialResponseIndex, so each generate() call gets its own context.
   this.contexts = {};

   this.ws = null;
   this.ready = null;   // resolves once the socket is authenticated

   if (!this.apiKey) {
     console.error('SIXTYDB_API_KEY is not set - 60db TTS will not work'.red);
   }

   this.connect();
 }

 // Open the websocket and wire up message handling. `ready` resolves when the
 // server confirms authentication via `connection_established`.
 connect() {
   this.ready = new Promise((resolve, reject) => {
     const url = `${SIXTYDB_WS_URL}?apiKey=${encodeURIComponent(this.apiKey || '')}`;
     this.ws = new WebSocket(url);

     this.ws.on('open', () => {
       console.log('60db TTS -> websocket opened'.cyan);
     });

     this.ws.on('message', (data) => {
       let msg;
       try {
         msg = JSON.parse(data.toString());
       } catch (err) {
         console.error('60db TTS -> failed to parse message'.red);
         console.error(err);
         return;
       }
       this.handleMessage(msg, resolve);
     });

     this.ws.on('error', (err) => {
       console.error('60db TTS -> websocket error'.red);
       console.error(err);
       reject(err);
     });

     this.ws.on('close', () => {
       console.log('60db TTS -> websocket closed'.yellow);
     });
   });

   // Prevent unhandled-rejection noise if the socket errors before first use.
   this.ready.catch(() => {});
 }

 // Route inbound server messages.
 handleMessage(msg, resolveReady) {
   // Authentication succeeded - safe to start creating contexts.
   if (msg.connection_established) {
     console.log('60db TTS -> connection established'.cyan);
     resolveReady();
     return;
   }

   // A synthesized audio frame for a given context.
   if (msg.audio_chunk) {
     const { context_id, audioContent } = msg.audio_chunk;
     const ctx = this.contexts[context_id];
     if (ctx && audioContent) {
       // MULAW chunks concatenate directly (per 60db docs).
       ctx.chunks.push(Buffer.from(audioContent, 'base64'));
     }
     return;
   }

   // All audio for the flushed text has arrived - emit it and clean up.
   if (msg.flush_completed) {
     this.finishContext(msg.flush_completed.context_id);
     return;
   }

   if (msg.error) {
     console.error('60db TTS -> error message'.red);
     console.error(msg.error);
   }
 }

 // Concatenate buffered audio for a context, emit the 'speech' event in the
 // exact shape app.js expects, then close the context.
 finishContext(contextId) {
   const ctx = this.contexts[contextId];
   if (!ctx) { return; }

   const base64String = Buffer.concat(ctx.chunks).toString('base64');

   // Same signature as the Deepgram provider: (index, audio, text, icount)
   this.emit('speech', ctx.partialResponseIndex, base64String, ctx.partialResponse, ctx.interactionCount);

   // Tell the server we are done with this context and drop local state.
   this.send({ close_context: { context_id: contextId } });
   delete this.contexts[contextId];
 }

 // Safely send a JSON message over the socket.
 send(obj) {
   if (this.ws && this.ws.readyState === WebSocket.OPEN) {
     this.ws.send(JSON.stringify(obj));
   }
 }

 // Convert text to speech via 60db. Mirrors the Deepgram service's signature.
 async generate(gptReply, interactionCount) {
   const { partialResponseIndex, partialResponse } = gptReply;

   // Skip if no text to convert
   if (!partialResponse) { return; }

   try {
     // Wait until the socket is authenticated before creating a context.
     await this.ready;

     // One context per spoken segment keeps audio frames correctly routed.
     const contextId = uuidv4();
     this.contexts[contextId] = {
       partialResponseIndex,
       partialResponse,
       interactionCount,
       chunks: [],
     };

     // Configure the voice + audio format. MULAW @ 8000 Hz matches Twilio's
     // media streams exactly, so the emitted audio needs no transcoding.
     this.send({
       create_context: {
         context_id: contextId,
         voice_id: this.voiceId,
         audio_config: {
           audio_encoding: 'MULAW',
           sample_rate_hertz: 8000,
         },
       },
     });

     // Send the text, then flush to trigger synthesis of the buffered text.
     this.send({ send_text: { context_id: contextId, text: partialResponse } });
     this.send({ flush_context: { context_id: contextId } });
   } catch (err) {
     console.error('Error occurred in 60db TextToSpeech service');
     console.error(err);
   }
 }
}

module.exports = { SixtyDbTextToSpeechService };
