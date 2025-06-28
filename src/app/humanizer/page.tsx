// app/humanizer/page.tsx
"use client";

import { useState } from 'react';
import { Loader2, Sparkles, Trash2, ClipboardCopy, Check, CaseSensitive, Pilcrow } from 'lucide-react';

export default function TextToolPage() {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [desiredStyle, setDesiredStyle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [outputTitle, setOutputTitle] = useState<string>('');

  const handleCopy = () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  const handleHumanizeOnly = async () => {
    if (!inputText.trim()) { setError("Please enter some text."); return; }
    setIsLoading(true);
    setLoadingStep('Humanizing...');
    setOutputTitle('Humanized Text:');
    setError(null);
    setOutputText('');

    try {
      const response = await fetch('/api/humanize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToHumanize: inputText, desiredStyle: desiredStyle.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || 'Failed to humanize text.'); }
      setOutputText(data.humanizedText);
    } catch (err: unknown) { // Fix 1: Changed 'any' to 'unknown'
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleHumanizeAndProofread = async () => {
    if (!inputText.trim()) { setError("Please enter some text."); return; }
    setIsLoading(true);
    setOutputTitle('Humanized & Proofread Text:');
    setError(null);
    setOutputText('');

    try {
      setLoadingStep('Step 1: Humanizing...');
      const humanizeRes = await fetch('/api/humanize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToHumanize: inputText, desiredStyle: desiredStyle.trim() || undefined }),
      });
      const humanizeData = await humanizeRes.json();
      if (!humanizeRes.ok) { throw new Error(humanizeData.error || 'Failed during the humanizing step.'); }

      setLoadingStep('Step 2: Proofreading...');
      const proofreadRes = await fetch('/api/proofread-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToProofread: humanizeData.humanizedText }),
      });
      const proofreadData = await proofreadRes.json();
      if (!proofreadRes.ok) { throw new Error(proofreadData.error || 'Failed during the proofreading step.'); }
      setOutputText(proofreadData.correctedText);

    } catch (err: unknown) { // Fix 2: Changed 'any' to 'unknown'
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during the process.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleProofreadOnly = async () => {
    if (!inputText.trim()) { setError("Please enter some text."); return; }
    setIsLoading(true);
    setLoadingStep('Proofreading...');
    setOutputTitle('Proofread Text:');
    setError(null);
    setOutputText('');

    try {
      const response = await fetch('/api/proofread-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToProofread: inputText }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || 'Failed to proofread text.'); }
      setOutputText(data.correctedText);
    } catch (err: unknown) { // Fix 3: Changed 'any' to 'unknown'
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };


  return (
    <div className="w-full container bg-slate-800/50 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
          AI Text Enhancement Suite
        </h1>
        <p className="text-slate-400 mt-2">Choose your tool to enhance, humanize, or perfect your text.</p>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">Error! </strong><span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="inputText" className="block text-sm font-medium text-slate-300">Your Text:</label>
            {inputText && <button type="button" onClick={() => setInputText('')} className="text-slate-400 hover:text-white" title="Clear input text"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <textarea id="inputText" value={inputText} onChange={(e) => setInputText(e.target.value)} rows={8} className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-orange-500 focus:border-orange-500" placeholder="Paste your text here..." />
        </div>
        
        <div>
          <label htmlFor="desiredStyle" className="block text-sm font-medium text-slate-300 mb-1">Desired Style (for Humanizer):</label>
          <input type="text" id="desiredStyle" value={desiredStyle} onChange={(e) => setDesiredStyle(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-orange-500 focus:border-orange-500" placeholder="e.g., conversational, witty, professional" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={handleHumanizeOnly} disabled={isLoading || !inputText.trim()} className="flex items-center justify-center gap-2 w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading && loadingStep.includes('Humaniz') ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Humanize
          </button>
          
          <button onClick={handleHumanizeAndProofread} disabled={isLoading || !inputText.trim()} className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading && loadingStep.includes('Step') ? <Loader2 className="h-5 w-5 animate-spin" /> : <Pilcrow className="h-5 w-5" />}
            Humanize & Proofread
          </button>
          
          <button onClick={handleProofreadOnly} disabled={isLoading || !inputText.trim()} className="flex items-center justify-center gap-2 w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading && loadingStep.includes('Proofread') ? <Loader2 className="h-5 w-5 animate-spin" /> : <CaseSensitive className="h-5 w-5" />}
            Proofread
          </button>
        </div>
        {isLoading && <p className="text-center text-orange-400 animate-pulse">{loadingStep}</p>}
      </div>

      {outputText && !isLoading && (
        <div className="mt-8 p-6 bg-slate-700/50 rounded-lg">
           <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-orange-300">{outputTitle}</h3>
            <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 rounded-md text-slate-200">
              {isCopied ? ( <><Check className="h-4 w-4 text-green-400" /> Copied!</> ) : ( <><ClipboardCopy className="h-4 w-4" /> Copy</> )}
            </button>
          </div>
          <pre className="bg-slate-800 p-4 rounded-md text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">{outputText}</pre>
        </div>
      )}
    </div>
  );
}