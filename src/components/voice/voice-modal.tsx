"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useVoice } from "@/hooks/use-voice";
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Square,
  MessageSquare,
  AlertCircle,
  Radio,
} from "lucide-react";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceMessage: (question: string) => Promise<any>;
}

type VoiceState = "listening" | "thinking" | "speaking" | "paused" | "error";

export function VoiceModal({ isOpen, onClose, onSendVoiceMessage }: VoiceModalProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("listening");
  const [activeTranscript, setActiveTranscript] = useState("");
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [aiSpeechText, setAiSpeechText] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const lastTranscriptRef = useRef("");
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const {
    isListening,
    transcript,
    setTranscript,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoice();

  // Send question to n8n / chat backend, speak response, and resume listening
  const handleAutoSend = useCallback(
    async (textToSend: string) => {
      const cleanPrompt = textToSend.trim();
      if (!cleanPrompt || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setVoiceState("thinking");
      setLastUserPrompt(cleanPrompt);
      setActiveTranscript("");
      setTranscript("");
      stopListening();

      try {
        const response = await onSendVoiceMessage(cleanPrompt);
        let assistantReply = "";

        if (response && response.assistantText) {
          assistantReply = response.assistantText;
        } else if (typeof response === "string") {
          assistantReply = response;
        } else {
          assistantReply = "I have reviewed your request and documents.";
        }

        setAiSpeechText(assistantReply);
        setVoiceState("speaking");

        if (!isMuted && isOpenRef.current) {
          speakText(assistantReply, () => {
            // Once AI finishes speaking, seamlessly resume listening
            if (isOpenRef.current) {
              isProcessingRef.current = false;
              setVoiceState("listening");
              setActiveTranscript("");
              setTranscript("");
              startListening();
            }
          });
        } else {
          // If muted or audio finished, switch back to listening after short pause
          setTimeout(() => {
            if (isOpenRef.current) {
              isProcessingRef.current = false;
              setVoiceState("listening");
              setActiveTranscript("");
              setTranscript("");
              startListening();
            }
          }, 1500);
        }
      } catch (err: any) {
        console.error("[VoiceModal] Error querying AI:", err);
        setErrorMessage(err.message || "Failed to query AI assistant.");
        setVoiceState("error");
        isProcessingRef.current = false;
      }
    },
    [isMuted, onSendVoiceMessage, setErrorMessage, setTranscript, speakText, startListening, stopListening]
  );

  // Auto-send detector on 2-second pause of silence after user speaks
  useEffect(() => {
    if (!isOpen || voiceState !== "listening" || isProcessingRef.current) return;

    if (transcript && transcript.trim().length > 0) {
      setActiveTranscript(transcript.trim());
      lastTranscriptRef.current = transcript.trim();

      // Reset previous silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Arm 2.0-second silence timer
      silenceTimerRef.current = setTimeout(() => {
        const textToSend = lastTranscriptRef.current;
        if (textToSend && textToSend.length > 0 && !isProcessingRef.current) {
          handleAutoSend(textToSend);
        }
      }, 1000);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [transcript, isOpen, voiceState, handleAutoSend]);

  // Modal lifecycle
  useEffect(() => {
    if (isOpen) {
      setVoiceState("listening");
      setActiveTranscript("");
      setAiSpeechText("");
      setLastUserPrompt("");
      setTranscript("");
      isProcessingRef.current = false;
      startListening();
    } else {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeaking();
      stopListening();
      isProcessingRef.current = false;
    }
  }, [isOpen, startListening, stopListening, stopSpeaking, setTranscript]);

  // Handle user tapping the central orb
  const handleOrbClick = () => {
    if (voiceState === "speaking") {
      // Tap to interrupt AI
      stopSpeaking();
      isProcessingRef.current = false;
      setVoiceState("listening");
      setActiveTranscript("");
      setTranscript("");
      startListening();
    } else if (voiceState === "listening") {
      // Manual pause
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopListening();
      setVoiceState("paused");
    } else if (voiceState === "paused" || voiceState === "error") {
      // Resume listening
      setErrorMessage(null);
      isProcessingRef.current = false;
      setVoiceState("listening");
      setActiveTranscript("");
      setTranscript("");
      startListening();
    }
  };

  const handleManualSendNow = () => {
    if (activeTranscript.trim() && !isProcessingRef.current) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      handleAutoSend(activeTranscript.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Background ambient lighting glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] transition-all duration-700 ${
            voiceState === "speaking"
              ? "bg-emerald-500/20"
              : voiceState === "thinking"
              ? "bg-purple-600/20"
              : "bg-sky-500/20"
          }`}
        />
      </div>

      <div className="relative w-full max-w-xl min-h-[540px] rounded-[36px] border border-slate-800/80 bg-slate-900/90 text-white p-6 sm:p-10 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-sky-400 shadow-sm">
            <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            <span className="tracking-wide">Voice Assistant</span>
          </div>

          <button
            onClick={onClose}
            title="Exit voice mode (Esc)"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Dynamic ChatGPT Voice Orb */}
        <div className="relative my-auto flex flex-col items-center justify-center py-6">
          {/* Animated acoustic ripples when listening */}
          {voiceState === "listening" && isListening && (
            <>
              <div className="absolute w-56 h-56 rounded-full border border-sky-400/25 animate-ripple-1 pointer-events-none" />
              <div className="absolute w-56 h-56 rounded-full border border-cyan-400/20 animate-ripple-2 pointer-events-none" />
              <div className="absolute w-56 h-56 rounded-full border border-teal-400/15 animate-ripple-3 pointer-events-none" />
            </>
          )}

          {/* Animated acoustic ripples when speaking */}
          {voiceState === "speaking" && (
            <>
              <div className="absolute w-60 h-60 rounded-full border border-emerald-400/30 animate-ripple-1 pointer-events-none" />
              <div className="absolute w-60 h-60 rounded-full border border-teal-400/25 animate-ripple-2 pointer-events-none" />
            </>
          )}

          {/* Glowing Orb Button */}
          <button
            onClick={handleOrbClick}
            className={`relative z-20 w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${
              voiceState === "listening"
                ? "bg-gradient-to-tr from-sky-500 via-cyan-400 to-teal-300 animate-orb-listening text-slate-950"
                : voiceState === "thinking"
                ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-400 animate-orb-thinking text-white"
                : voiceState === "speaking"
                ? "bg-gradient-to-tr from-emerald-400 via-teal-400 to-sky-400 animate-orb-speaking text-slate-950"
                : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-750"
            }`}
          >
            {voiceState === "listening" && <Mic className="w-14 h-14 animate-pulse" />}
            {voiceState === "thinking" && <Sparkles className="w-14 h-14 animate-spin" />}
            {voiceState === "speaking" && <Volume2 className="w-14 h-14 animate-pulse" />}
            {voiceState === "paused" && <MicOff className="w-14 h-14" />}
            {voiceState === "error" && <AlertCircle className="w-14 h-14 text-rose-400" />}
          </button>

          {/* Status Subtitle */}
          <div className="mt-8 text-center space-y-1.5 z-10">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-200">
              {voiceState === "listening" && (activeTranscript ? "Listening..." : "Listening to you")}
              {voiceState === "thinking" && "Thinking & querying documents..."}
              {voiceState === "speaking" && "AI Speaking"}
              {voiceState === "paused" && "Voice Paused"}
              {voiceState === "error" && "Microphone Issue"}
            </h3>

            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {voiceState === "listening" &&
                (activeTranscript
                  ? "Pause speaking for 1 seconds to send automatically"
                  : "Speak naturally about your documents...")}
              {voiceState === "thinking" && "Analyzing workspace & generating reply..."}
              {voiceState === "speaking" && "Tap the circle at any time to interrupt and speak"}
              {voiceState === "paused" && "Tap the circle to resume conversation"}
              {voiceState === "error" && (errorMessage || "Please allow microphone access")}
            </p>
          </div>
        </div>

        {/* Real-time Subtitles / Live Captions */}
        {showCaptions && (
          <div className="w-full bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-4 min-h-[72px] flex items-center justify-center text-center transition-all z-10">
            {voiceState === "listening" && (
              <p className="text-sm font-medium text-slate-200 italic leading-relaxed">
                {activeTranscript ? `“${activeTranscript}”` : "Speak a question..."}
              </p>
            )}

            {voiceState === "thinking" && (
              <p className="text-sm text-sky-400 font-medium animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>&ldquo;{lastUserPrompt}&rdquo;</span>
              </p>
            )}

            {voiceState === "speaking" && (
              <p className="text-sm font-medium text-emerald-300 leading-relaxed line-clamp-3">
                &ldquo;{aiSpeechText}&rdquo;
              </p>
            )}

            {voiceState === "paused" && (
              <p className="text-xs text-slate-500">Voice mode paused. Tap orb to speak.</p>
            )}
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800/80 z-10">
          {/* Mute Audio Output */}
          <button
            onClick={() => {
              if (!isMuted) stopSpeaking();
              setIsMuted((prev) => !prev);
            }}
            title={isMuted ? "Unmute AI speech" : "Mute AI speech"}
            className={`p-3 rounded-2xl border transition-colors ${
              isMuted
                ? "bg-rose-950/40 border-rose-800/60 text-rose-400"
                : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Quick Interrupt or Send Now button */}
          {voiceState === "speaking" && (
            <button
              onClick={() => {
                stopSpeaking();
                setVoiceState("listening");
                startListening();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrupt AI</span>
            </button>
          )}

          {voiceState === "listening" && activeTranscript && (
            <button
              onClick={handleManualSendNow}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/25"
            >
              <span>Send Now</span>
            </button>
          )}

          {/* Toggle Captions */}
          <button
            onClick={() => setShowCaptions((prev) => !prev)}
            title="Toggle Live Subtitles"
            className={`p-3 rounded-2xl border transition-colors ${
              showCaptions
                ? "bg-sky-950/40 border-sky-800/60 text-sky-400"
                : "bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

