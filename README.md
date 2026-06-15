# Low-Cost AI Voice Assistant with OpenAI, Deepgram & Twilio

Build your own AI voice assistant that can handle inbound calls using OpenAI's GPT for conversation, Deepgram for speech processing, and Twilio for telephony - all for around 1 cent per minute! 

![CleanShot 2024-11-23 at 17 47 04 1](https://github.com/user-attachments/assets/33d7c3d7-92f5-4103-9080-ce95611bc1b2)

[Watch the Tutorial Video](https://youtu.be/99wIgoEGUTM)

## Overview

This repository is Part 1 of a series demonstrating how to build production-ready AI voice assistants. In this first part, we focus on handling inbound calls and basic FAQ responses, achieving:

- ~1 second latency
- ~$0.01 per minute cost
- Natural conversation flow with interruption handling
- Scalable architecture for future expansion

Coming in Part 2 (stay tuned!):
- Function calling capabilities
- Outbound call handling
- Enhanced text-to-speech with 11.labs
- And more!

## System Architecture

### High-Level Architecture

![CleanShot 2024-11-24 at 17 45 26](https://github.com/user-attachments/assets/746793d6-8a0d-437e-8665-5ad82bffd4b5)

Key Components:
1. **Twilio**: Handles inbound calls and audio streaming
2. **Deepgram**: 
   - Speech-to-Text: Real-time transcription
   - Text-to-Speech: Response generation
3. **OpenAI GPT**: Natural language processing and response generation
4. **WebSocket Server**: Real-time audio streaming and service orchestration

### Code Architecture

![CleanShot 2024-11-24 at 17 45 09](https://github.com/user-attachments/assets/c712440e-11bc-4f5d-b586-add03df02b00)

The system is built with a modular architecture:
- `app.js`: Main server and WebSocket handling
- `services/`:
  - `gpt-service.js`: OpenAI integration and conversation management
  - `stream-service.js`: Audio streaming and buffer management
  - `transcription-service.js`: Speech-to-text processing
  - `tts-service.js`: Text-to-speech conversion

## Setup Guide

### Prerequisites
- Node.js (v14+)
- npm/yarn
- Accounts with:
  - Twilio
  - Deepgram
  - OpenAI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Barty-Bart/ai-voice-assistant-openai-deepgram.git
cd ai-voice-assistant-openai-deepgram
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
SERVER=your-server-domain
DEEPGRAM_API_KEY=your-deepgram-api-key
VOICE_MODEL=your-preferred-voice-model
OPENAI_API_KEY=your-openai-api-key

# Text-to-speech provider selection (optional, defaults to "deepgram")
# Set to "60db" to use 60db TTS instead of Deepgram.
TTS_PROVIDER=deepgram
# Required only when TTS_PROVIDER=60db
SIXTYDB_API_KEY=your-60db-api-key
SIXTYDB_VOICE_ID=your-60db-voice-id
```

### Text-to-Speech Providers

The text-to-speech layer is provider-agnostic. `app.js` builds a TTS service via
`services/tts-factory.js`, which selects an implementation based on `TTS_PROVIDER`:

| `TTS_PROVIDER` | Implementation | Notes |
| --- | --- | --- |
| `deepgram` (default) | `services/tts-service.js` | Deepgram `/v1/speak`, µ-law @ 8000 Hz |
| `60db` (or `sixtydb`) | `services/tts-sixtydb-service.js` | 60db WebSocket TTS, MULAW @ 8000 Hz |

Both implementations share the same interface (a `generate(gptReply, interactionCount)`
method and a `'speech'` event), so they are fully interchangeable and the rest of the
app is unaware of which one is active. The 60db provider uses the WebSocket API because
it is the only 60db transport that emits MULAW @ 8000 Hz directly, matching Twilio's
media-stream format with no transcoding.

4. Configure Twilio:
- Set up a Twilio phone number
- Configure webhook to point to your `/incoming` endpoint
- Ensure your server has HTTPS (required for Twilio)

5. Start the server:
```bash
npm start
```

## How It Works

1. **Call Initiation**:
   - Customer calls Twilio number
   - Twilio establishes WebSocket connection with server

2. **Real-time Processing**:
   - Speech-to-Text: Customer audio → Deepgram → Text
   - Processing: Text → OpenAI GPT → Response
   - Text-to-Speech: Response → Deepgram → Audio
   - Audio streamed back to caller

3. **Key Features**:
   - Real-time transcription and response
   - Natural conversation handling
   - Interruption detection
   - Ordered message queuing

## Future Improvements

- Implement streaming TTS API from Deepgram for reduced latency
- Integrate Elevenlabs for enhanced voice quality
- Add outbound calling capabilities
- Implement function calling for complex tasks
- Add more sophisticated conversation handling

## Costs & Performance

- **Cost**: Approximately 1 cent per minute
  - Significantly lower than commercial alternatives ($5-10 cents/min)
- **Latency**: ~1 second response time
  - Can be further optimized with streaming TTS

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Resources

- [Tutorial Video](https://youtu.be/99wIgoEGUTM)
- [OpenAI Documentation](https://platform.openai.com/docs)
- [Deepgram Documentation](https://developers.deepgram.com)
- [Twilio Documentation](https://www.twilio.com/docs)

## Source Code

This project was built based on Twilio's [Call-GPT](https://github.com/twilio-labs/call-gpt).

## Keywords
ai voice assistant, openai gpt, deepgram, twilio, voice ai, chatbot, conversational ai, speech recognition, text to speech, websocket, nodejs, real-time audio, low-cost ai, inbound calls

---

Star ⭐ this repository if you find it helpful!
