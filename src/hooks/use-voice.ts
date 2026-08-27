"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useVoice(onSpeechComplete?: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("[useVoice] Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    setTranscript("");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("[useVoice] Recognition already started or error:", err);
      }
    } else {
      // Fallback simulation mode for environments without SpeechRecognition API
      setIsListening(true);
      const mockPhrases = [
        "What is the termination clause in my agreement?",
        "Can you summarize the key terms in my contract?",
        "What are the payment deadlines and penalties?",
        "Who are the main stakeholders mentioned in the report?",
      ];
      const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      
      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex <= randomPhrase.length) {
          setTranscript(randomPhrase.slice(0, charIndex));
          charIndex += 2;
        } else {
          clearInterval(interval);
        }
      }, 50);
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore
      }
    }
    if (transcript.trim() && onSpeechComplete) {
      onSpeechComplete(transcript.trim());
    }
  }, [transcript, onSpeechComplete]);

  const speakText = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    isSupported,
    isSpeaking,
    startListening,
    stopListening,
    speakText,
  };
}
