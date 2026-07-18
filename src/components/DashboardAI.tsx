/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { MetricTracker } from '../lib/instrumentation';
import { useTrackedRender } from '../hooks/useDiagnostic';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, Offer, Flyer } from '../types';
import { calculateMarketRanking } from '../data';
import { Send, Sparkles, User, Bot, Loader2, Compass, AlertCircle } from 'lucide-react';
import { APP_CONFIG } from '../config/app';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
}

function DashboardAI({ flyers, offers }: Props) {
  useTrackedRender('DashboardAI', arguments[0] || {});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Olá! Sou o Assistente de Inteligência de Preços do ${APP_CONFIG.name} em ${APP_CONFIG.defaultCityShort}. 🤖🌾\n\nAnalisei nossa base histórica de ofertas coletadas nos supermercados locais. Posso te ajudar a encontrar correlações de preços, prever tendências e apontar os estabelecimentos mais baratos por categoria.\n\nComo posso ajudar seu planejamento de compras hoje?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clickable suggested prompts for quick demo testing
  const suggestions = [
    'Qual mercado realmente possui os menores preços?',
    'Qual produto mais aumentou este ano em São Gotardo?',
    'Vale a pena esperar para comprar café?',
    'Como está a evolução da Cesta Básica local?'
  ];

  // Compile statistics for grounding context to send to backend
  const pricingDataGrounding = useMemo(() => {
    const rankings = calculateMarketRanking(flyers, offers);
    return { rankings };
  }, [flyers, offers]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const activeModel = localStorage.getItem('gemini_model') || 'gemini-3.5-flash';
      // Post message history and regional grounding dataset to server API
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, text: m.text })),
          pricingData: pricingDataGrounding,
          geminiModel: activeModel
        })
      });

      const data = await response.json();
        MetricTracker.logGeminiCall(activeModel, 800, { context: 'ai-chat' });

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error in chat request:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        text: 'Desculpe-me, encontrei uma instabilidade ao me conectar com a base de dados de IA. Por favor, tente enviar sua pergunta novamente.',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-160px)]">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" /> Assistente de IA {APP_CONFIG.shortName}
        </h1>
        <p className="text-slate-500 mt-1">
          Co-piloto inteligente de {APP_CONFIG.defaultCityShort} treinado sobre dados históricos determinísticos dos supermercados locais
        </p>
      </div>

      {/* Main Chat Layout Container */}
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Sugestões e Ajuda */}
        <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-5 shrink-0 flex flex-col justify-between hidden sm:flex">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-500" /> Sugestões de Perguntas
            </h3>
            
            <div className="space-y-2">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sug)}
                  className="w-full text-left p-3 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 rounded-xl text-[11px] font-bold text-slate-700 hover:text-indigo-950 transition-all cursor-pointer leading-normal shadow-sm"
                >
                  "{sug}"
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-start gap-1.5 text-[9px] text-indigo-800 leading-normal font-medium mt-4">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            O assistente responde com base exclusiva no histórico de preços e não alucina ofertas inexistentes.
          </div>
        </div>

        {/* Right Side: Conversation Area */}
        <div className="flex-1 flex flex-col justify-between bg-slate-50/20">
          {/* Chat scrolling feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[440px]">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`p-2 rounded-xl text-white shadow-sm shrink-0 h-9 w-9 flex items-center justify-center ${
                    isUser ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}>
                    {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm whitespace-pre-line border ${
                    isUser 
                      ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                      : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-3 max-w-2xl">
                <div className="p-2 rounded-xl bg-slate-800 text-white shadow-sm shrink-0 h-9 w-9 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2 shadow-sm font-bold">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> Analisando base de dados de {APP_CONFIG.defaultCityShort}...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions overlay for mobile screens only */}
          <div className="px-6 py-2 flex gap-2 overflow-x-auto shrink-0 sm:hidden border-t border-slate-50 bg-white">
            {suggestions.slice(0, 2).map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sug)}
                className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Chat input form */}
          <div className="p-5 border-t border-slate-100 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder={`Pergunte sobre os preços em ${APP_CONFIG.defaultCityShort}... (ex: Qual o produto com maior alta?)`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 text-xs px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-bold transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-2xl font-bold cursor-pointer transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}

export default memo(DashboardAI);
