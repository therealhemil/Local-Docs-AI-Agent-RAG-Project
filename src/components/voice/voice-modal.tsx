"use client";

import React, { useEffect, useState } from "react";
import { useVoice } from "@/hooks/use-voice";
import { Mic, MicOff, X, Sparkles, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceMessage: (question: string) => void;
}

export function VoiceModal({ isOpen, onClose, onSendVoiceMessage }: VoiceModalProps) {
  const [spokenText, setSpokenText] = useState("");

  const handleSpeechComplete = (transcript: string) => {
    if (transcript) {
      setSpokenText(transcript);
    }
  };

  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSpeaking,
  } = useVoice(handleSpeechComplete);

  useEffect(() => {
    if (isOpen) {
      setSpokenText("");
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen, startListening, stopListening]);

  useEffect(() => {
    if (transcript) {
      setSpokenText(transcript);
    }
  }, [transcript]);

  if (!isOpen) return null;

  const handleSend = () => {
    const textToSend = spokenText.trim();
    if (!textToSend) return;
    stopListening();
    onSendVoiceMessage(textToSend);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/95 text-white p-8 shadow-2xl overflow-hidden text-center flex flex-col items-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400 mb-8">
          <Sparkles className="w-4 h-4" />
          <span>AI Voice Assistant</span>
        </div>

        {/* Pulsing Glowing Voice Orb */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated pulsing outer rings */}
          {isListening && (
            <>
              <div className="absolute w-36 h-36 rounded-full bg-sky-500/20 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full bg-cyan-400/30 animate-pulse" />
            </>
          )}

          {/* Central Mic Orb */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isListening
                ? "bg-gradient-to-tr from-sky-500 to-teal-400 text-slate-950 scale-105 shadow-sky-500/50"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-pulse" />
            ) : (
              <MicOff className="w-10 h-10" />
            )}
          </button>
        </div>

        {/* Status Text & Audio Visualizer Bars */}
        <div className="mt-4 mb-6 space-y-3">
          <div className="flex items-center justify-center gap-1.5 h-10">
            {isListening ? (
              <>
                <div className="w-1 bg-sky-400 rounded-full audio-bar" />
                <div className="w-1 bg-cyan-400 rounded-full audio-bar" />
                <div className="w-1 bg-teal-400 rounded-full audio-bar" />
                <div className="w-1 bg-sky-400 rounded-full audio-bar" />
                <div className="w-1 bg-indigo-400 rounded-full audio-bar" />
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Click mic to start</span>
            )}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isListening ? "Listening to your question..." : "Voice input paused"}
          </p>
        </div>

        {/* Transcript Box */}
        <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 min-h-[90px] flex items-center justify-center">
          {spokenText ? (
            <p className="text-sm font-medium text-slate-200 italic leading-relaxed">
              &ldquo;{spokenText}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              {isListening ? "Speak naturally about your documents..." : "No speech detected yet"}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full">
          {isListening ? (
            <Button
              onClick={stopListening}
              variant="secondary"
              className="flex-1 justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
            >
              <span>Stop Listening</span>
            </Button>
          ) : (
            <Button
              onClick={startListening}
              variant="secondary"
              className="flex-1 justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700"
            >
              <span>Start Speaking</span>
            </Button>
          )}

          <Button
            onClick={handleSend}
            disabled={!spokenText.trim()}
            className="flex-1 justify-center rounded-xl shadow-lg shadow-sky-500/25 gap-1.5"
          >
            <span>Ask AI</span>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
