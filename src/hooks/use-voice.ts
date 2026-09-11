"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useVoice(onSpeechComplete?: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onCompleteRef = useRef(onSpeechComplete);
  const transcriptRef = useRef("");
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callback and transcript refs in sync to avoid unnecessary re-renders
  useEffect(() => {
    onCompleteRef.current = onSpeechComplete;
  }, [onSpeechComplete]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          } else {
            interimTranscript += result[0].transcript;
          }
        }
      }

      const combined = (finalTranscript + interimTranscript).trim();
      if (combined) {
        setTranscript(combined);
        transcriptRef.current = combined;
        setErrorMessage(null);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[useVoice] Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        // Harmless pause in speech - do not abort listening
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMessage("Microphone access was denied. Please allow microphone permissions in your browser.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === "audio-capture") {
        setErrorMessage("No microphone detected. Please plug in or enable your microphone.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === "network") {
        setErrorMessage("Network connection error during voice recognition.");
      }
    };

    recognition.onend = () => {
      // If user is still supposed to be listening (e.g. paused speaking), auto-restart
      if (isListeningRef.current) {
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Ignore if already active
            }
          }
        }, 150);
      } else {
        setIsListening(false);
        const finalRecorded = transcriptRef.current.trim();
        if (finalRecorded && onCompleteRef.current) {
          onCompleteRef.current(finalRecorded);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    setTranscript("");
    transcriptRef.current = "";
    isListeningRef.current = true;
    setIsListening(true);

    // Request microphone access explicitly to make sure permissions are prompted
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release tracks immediately so SpeechRecognition can take over the device
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage("Microphone permission denied. Please allow microphone access in your browser.");
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be running
      }
    } else {
      // Fallback simulation mode for unsupported environments
      const mockPhrases = [
        "What is the key summary of this document?",
        "What are the main provisions and deliverables?",
        "Can you explain the payment deadlines and penalties?",
        "Who are the responsible stakeholders mentioned in the report?",
      ];
      const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];

      let charIndex = 0;
      const interval = setInterval(() => {
        if (!isListeningRef.current) {
          clearInterval(interval);
          return;
        }
        if (charIndex <= randomPhrase.length) {
          const partial = randomPhrase.slice(0, charIndex);
          setTranscript(partial);
          transcriptRef.current = partial;
          charIndex += 2;
        } else {
          clearInterval(interval);
        }
      }, 50);
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }

    const finalResult = transcriptRef.current.trim();
    if (finalResult && onCompleteRef.current) {
      onCompleteRef.current(finalResult);
    }
  }, []);

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text for natural speech (remove markdown asterisks, backticks, citations, etc.)
    const cleanSpeechText = text
      .replace(/```[\s\S]*?```/g, " code omitted. ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/[*#_~>]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanSpeechText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick best natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Jenny")) &&
        v.lang.startsWith("en")
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = (e) => {
      console.warn("[useVoice] TTS error:", e);
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    isSupported,
    isSpeaking,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
}
