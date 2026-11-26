'use client';

import React, { useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';

interface VoiceRecorderInputProps {
  onAudioCaptured: (file: File) => void;
  onTranscriptUpdate: (transcript: string) => void;
}

export function VoiceRecorderInput({ onAudioCaptured, onTranscriptUpdate }: VoiceRecorderInputProps) {
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState('');
  const [speechSupported] = useState(() => {
    if (typeof window === 'undefined') return true;
    const win = window as unknown as Record<string, unknown>;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        setRecordedUrl(URL.createObjectURL(blob));
        onAudioCaptured(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;

      // Live Web Speech API Speech-to-Text
      const win = window as unknown as Record<string, unknown>;
      const SpeechRec = (win.SpeechRecognition || win.webkitSpeechRecognition) as
        | (new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: (ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
            start: () => void;
            stop: () => void;
          })
        | undefined;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = lang;
        rec.onresult = (event) => {
          let full = '';
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript + ' ';
          }
          onTranscriptUpdate(full.trim());
        };
        rec.start();
        recognitionRef.current = rec;
      }

      setMicError('');
      setRecording(true);
    } catch {
      setMicError('Microphone permission is required to record voice notes.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recognitionRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-[#121215] p-2.5">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as 'en-IN' | 'hi-IN')}
        disabled={recording}
        className="rounded-lg border border-white/[0.08] bg-[#18181c] px-2 py-1 text-[11px] font-mono text-zinc-300 outline-none"
      >
        <option value="en-IN">English / Hinglish</option>
        <option value="hi-IN">Hindi (हिन्दी)</option>
      </select>

      {!recording ? (
        <button
          type="button"
          onClick={() => void startRecording()}
          className="flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/25 cursor-pointer"
        >
          <Mic size={13} /> Record Voice Note
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white animate-pulse cursor-pointer"
        >
          <Square size={11} /> Stop Recording
        </button>
      )}

      {recordedUrl && !recording && (
        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
          <Volume2 size={12} /> Voice note ready (Gemini 2.5 will transcribe on submit)
        </span>
      )}
      {!speechSupported && !recordedUrl && (
        <span className="text-[10px] text-zinc-400">
          Audio captured for Gemini 2.5 transcription
        </span>
      )}
      {micError && (
        <span className="w-full text-[11px] text-red-400">{micError}</span>
      )}
    </div>
  );
}
