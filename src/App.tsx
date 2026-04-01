/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, Code, Copy, Check, Loader2, AlertCircle,
  RefreshCw, Folder, HelpCircle, X, ChevronDown, ChevronRight,
  Info, Eye, BookOpen, Zap, ArrowRight, CheckCircle2, FileDown,
  Image as FileImage, FileType2 as FilePdf2, PackageOpen as ArchiveIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateST8Project } from './lib/gemini';
import JSZip from 'jszip';

/* ─────────────────────────────────────────
   Tooltip Component
───────────────────────────────────────── */
function Tooltip({ children, content, side = 'top' }: {
  children: React.ReactNode;
  content: string | React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [visible, setVisible] = useState(false);
  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-[200] pointer-events-none ${positionClasses[side]}`}
          >
            <div className="bg-[#0d1117] border border-tech-accent/40 text-tech-text font-mono text-[10px] px-3 py-2 rounded-none shadow-[0_0_20px_rgba(0,242,255,0.15)] max-w-[240px] leading-relaxed whitespace-pre-line">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ─────────────────────────────────────────
   InfoBadge – small inline hint
───────────────────────────────────────── */
function InfoBadge({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <Info className="w-3.5 h-3.5 text-tech-muted hover:text-tech-accent transition-colors cursor-help" />
    </Tooltip>
  );
}

/* ─────────────────────────────────────────
   HelpPanel – collapsible guide sidebar
───────────────────────────────────────── */
function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    {
      icon: <Upload className="w-4 h-4" />,
      title: 'Upload Test Document',
      desc: 'Drag & drop or click to upload your IC test datasheet (PDF or screenshot). The AI will parse the chip\'s pin map, test conditions, and limits.',
      tip: 'Supported: PDF, PNG, JPG, WEBP. Best results with clear, high-resolution images.',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: 'Generate ST8 Project',
      desc: 'Click "Generate Full ST8 Project". The AI synthesizes a complete SmarTest 8 project including TestMethod, TestSuite, TestPlan, SpecSheet, and PinConfig.',
      tip: 'Generation takes 15–60 seconds depending on datasheet complexity.',
    },
    {
      icon: <FileDown className="w-4 h-4" />,
      title: 'Download Files',
      desc: 'Click individual file tabs to download single files, or use "Download All Files" to get a ZIP archive with the full project folder structure.',
      tip: 'Files are organized to drop directly into your ST8 workspace directory.',
    },
  ];

  const outputFiles = [
    { ext: '.java', desc: 'TestMethod & TestSuite logic' },
    { ext: '.pc', desc: 'Pin Configuration (PinConfig)' },
    { ext: '.spec', desc: 'SpecSheet – limits & conditions' },
    { ext: '.tf', desc: 'Test Flow definition' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed top-0 right-0 h-full w-[380px] max-w-[95vw] bg-tech-bg border-l border-tech-border z-[160] flex flex-col overflow-y-auto custom-scrollbar"
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-tech-bg/95 backdrop-blur border-b border-tech-border p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-tech-accent" />
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-tech-accent">Usage Guide</span>
              </div>
              <button onClick={onClose} className="text-tech-muted hover:text-tech-text transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Steps */}
              <div className="space-y-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-tech-muted">Workflow</p>
                {steps.map((s, i) => (
                  <div key={i} className="border border-tech-border bg-tech-card/30 p-4 space-y-2 relative">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 border border-tech-accent/40 bg-tech-accent/10 flex items-center justify-center text-tech-accent shrink-0">
                        {s.icon}
                      </span>
                      <span className="font-mono text-[10px] text-tech-accent uppercase tracking-widest">Step {i + 1}</span>
                    </div>
                    <p className="font-sans text-sm font-semibold text-tech-text">{s.title}</p>
                    <p className="font-mono text-[10px] text-tech-muted leading-relaxed">{s.desc}</p>
                    <div className="mt-2 border-l-2 border-tech-accent/30 pl-3">
                      <p className="font-mono text-[9px] text-tech-accent/70 leading-relaxed">💡 {s.tip}</p>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 text-tech-accent/40">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Output File Types */}
              <div className="space-y-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-tech-muted">Generated File Types</p>
                <div className="grid grid-cols-2 gap-2">
                  {outputFiles.map((f) => (
                    <div key={f.ext} className="border border-tech-border bg-tech-card/20 p-3 space-y-1">
                      <p className="font-mono text-[11px] text-tech-accent">{f.ext}</p>
                      <p className="font-mono text-[9px] text-tech-muted">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="space-y-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-tech-muted">FAQ</p>
                {[
                  { q: 'What file formats are supported?', a: 'PDF datasheets, PNG/JPG/WEBP screenshots of test plans or spec tables.' },
                  { q: 'How accurate is the output?', a: 'AI-generated code requires engineering review. Always validate limits and pin assignments against your datasheet before running on hardware.' },
                  { q: 'Is my data sent to a server?', a: 'Yes — the file is sent to the Google Gemini API for analysis. Do not upload confidential NDA-protected datasheets.' },
                  { q: 'Can I re-generate?', a: 'Yes. Click "Clear Session" to reset and upload a new file.' },
                ].map((item, i) => (
                  <FAQItem key={i} q={item.q} a={item.a} />
                ))}
              </div>

              {/* Version note */}
              <div className="border border-tech-border/50 bg-tech-accent/5 p-4 space-y-1">
                <p className="font-mono text-[9px] uppercase text-tech-accent tracking-widest">Platform Target</p>
                <p className="font-mono text-[10px] text-tech-muted">Advantest V93000 · SmarTest 8.2.5+</p>
                <p className="font-mono text-[9px] text-tech-muted/60 mt-2">Output is compatible with ST8 JAVA TestMethod API v5.x</p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-tech-border bg-tech-card/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center p-3 text-left group"
      >
        <span className="font-mono text-[10px] text-tech-text group-hover:text-tech-accent transition-colors">{q}</span>
        {open ? <ChevronDown className="w-3 h-3 text-tech-muted shrink-0" /> : <ChevronRight className="w-3 h-3 text-tech-muted shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="font-mono text-[10px] text-tech-muted px-3 pb-3 leading-relaxed border-t border-tech-border/50 pt-2">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   StepBanner – top progress indicator
───────────────────────────────────────── */
function StepBanner({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Upload Document' },
    { n: 2, label: 'Generate Code' },
    { n: 3, label: 'Download Files' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 py-3 border-b border-tech-border bg-tech-card/20">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-center gap-2 px-4">
            <span
              className={`w-5 h-5 flex items-center justify-center font-mono text-[10px] border transition-all duration-300 ${
                step > s.n
                  ? 'bg-tech-accent/20 border-tech-accent text-tech-accent'
                  : step === s.n
                  ? 'bg-tech-accent text-tech-bg border-tech-accent font-bold'
                  : 'border-tech-border text-tech-muted'
              }`}
            >
              {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : s.n}
            </span>
            <span className={`font-mono text-[9px] uppercase tracking-widest hidden sm:block ${step === s.n ? 'text-tech-accent' : 'text-tech-muted'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 transition-colors duration-500 ${step > s.n ? 'bg-tech-accent/60' : 'bg-tech-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Main App
───────────────────────────────────────── */
export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<{ name: string; content: string; directory: string }[]>([]);
  const [projectName, setProjectName] = useState<string>('ST8_Project');
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Derive current workflow step
  const currentStep = result ? 3 : file ? 2 : 1;

  const parseGeneratedFiles = (text: string) => {
    const files: { name: string; content: string; directory: string }[] = [];
    const projectNameMatch = text.match(/\*\*Project Name\*\*:\s*([^\n]+)/i) || text.match(/Project Name:\s*([^\n]+)/i);
    if (projectNameMatch) {
      setProjectName(projectNameMatch[1].trim().replace(/\s+/g, '_'));
    }
    const sections = text.split(/### File: /i);
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\n');
      const filename = lines[0].trim().replace(/[*#`]/g, '');
      const dirMatch = section.match(/### Directory: ([^\n]+)/i) || section.match(/Directory: ([^\n]+)/i);
      const directory = dirMatch ? dirMatch[1].trim().replace(/[*#`]/g, '') : '';
      const contentMatch = section.match(/```(?:\w+)?\n([\s\S]*?)```/);
      if (contentMatch && contentMatch[1]) {
        files.push({ name: filename, content: contentMatch[1].trim(), directory });
      }
    }
    return files;
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const root = zip.folder(projectName);
    generatedFiles.forEach((f) => {
      if (f.directory) {
        root?.folder(f.directory)?.file(f.name, f.content);
      } else {
        root?.file(f.name, f.content);
      }
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setGeneratedFiles([]);
      setActiveTab(0);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const code = await generateST8Project(base64, file.type);
          setResult(code);
          const files = parseGeneratedFiles(code);
          setGeneratedFiles(files);
          setActiveTab(0);
        } catch (err: any) {
          setError(err.message || 'Failed to generate code. Please check your API key or file.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Error reading file.');
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      const codeMatch = result.match(/```java\n([\s\S]*?)\n```/) || result.match(/```\n([\s\S]*?)\n```/);
      navigator.clipboard.writeText(codeMatch ? codeMatch[1] : result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setGeneratedFiles([]);
    setActiveTab(0);
  };

  return (
    <div className="min-h-screen bg-tech-bg text-tech-text font-sans selection:bg-tech-accent selection:text-tech-bg">
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* ── Header ── */}
      <header className="border-b border-tech-border bg-tech-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-serif italic text-3xl md:text-4xl tracking-tight text-tech-accent glow-text">
              V93000 SMT8 Project AutoGen
            </h1>
            <p className="font-mono text-[10px] uppercase text-tech-muted mt-1.5 tracking-[0.3em]">
              Advantest V93000 SmarTest 8 Full Project Generator
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="font-mono text-[10px] uppercase border border-tech-border px-3 py-1 bg-tech-card text-tech-muted">
              v2.0.0
            </div>
            <div className="font-mono text-[10px] uppercase border border-tech-accent/50 px-3 py-1 bg-tech-accent/10 text-tech-accent shadow-[0_0_10px_rgba(0,242,255,0.1)]">
              Full Project Automation
            </div>
            <Tooltip content="Open Usage Guide & FAQ" side="bottom">
              <button
                id="help-btn"
                onClick={() => setHelpOpen(true)}
                className="flex items-center gap-1.5 border border-tech-border px-3 py-1 font-mono text-[10px] uppercase text-tech-muted hover:border-tech-accent hover:text-tech-accent transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Help
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Step Progress Banner */}
        <StepBanner step={currentStep as 1 | 2 | 3} />
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* ── Left Column ── */}
        <section className="space-y-8">

          {/* ── Step 1: Upload ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-tech-accent text-xs">01</span>
              <h2 className="font-serif italic text-xl">Upload Data Sheet / Test Plan</h2>
              <InfoBadge text={"Upload your IC test document.\nSupported: PDF, PNG, JPG, WEBP\n\nTip: High-resolution scans yield\nbetter AI interpretation."} />
            </div>

            {/* Drop Zone */}
            <div
              {...getRootProps()}
              id="upload-dropzone"
              className={`tech-border p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 bg-tech-card/30 ${
                isDragActive
                  ? 'border-tech-accent bg-tech-accent/5 shadow-[inset_0_0_20px_rgba(0,242,255,0.07)]'
                  : 'hover:border-tech-accent/50 hover:bg-tech-card/50'
              }`}
            >
              <input {...getInputProps()} />

              <div className="relative mb-5">
                <Upload className={`w-10 h-10 transition-transform duration-500 ${isDragActive ? 'scale-110 text-tech-accent' : 'text-tech-muted'}`} />
                {isDragActive && (
                  <motion.div layoutId="glow" className="absolute inset-0 blur-xl bg-tech-accent/20 -z-10" />
                )}
              </div>

              {file ? (
                <div className="text-center space-y-1">
                  <p className="font-mono text-sm font-bold text-tech-accent">{file.name}</p>
                  <p className="font-mono text-[10px] text-tech-muted">{(file.size / 1024).toFixed(2)} KB · Ready to generate</p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="font-mono text-sm tracking-wide">
                    {isDragActive ? 'Release to upload…' : 'Drop file here, or click to browse'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {[
                      { icon: <FilePdf2 className="w-3 h-3" />, label: 'PDF' },
                      { icon: <FileImage className="w-3 h-3" />, label: 'PNG' },
                      { icon: <FileImage className="w-3 h-3" />, label: 'JPG' },
                      { icon: <FileImage className="w-3 h-3" />, label: 'WEBP' },
                    ].map((t) => (
                      <Tooltip key={t.label} content={`Upload ${t.label} file`}>
                        <span className="flex items-center gap-1 font-mono text-[9px] uppercase text-tech-muted border border-tech-border px-2 py-1">
                          {t.icon}
                          {t.label}
                        </span>
                      </Tooltip>
                    ))}
                  </div>
                  <p className="font-mono text-[9px] text-tech-muted/60">
                    Works best with clear, legible test limit tables
                  </p>
                </div>
              )}
            </div>

            {/* Image Preview */}
            {preview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="tech-border p-2 bg-black/40 backdrop-blur-md relative group"
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-mono text-[9px] uppercase text-tech-accent border border-tech-accent/30 px-2 py-1 flex items-center gap-1 bg-tech-bg/80">
                    <Eye className="w-2.5 h-2.5" /> Preview
                  </span>
                </div>
                <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain opacity-80" />
              </motion.div>
            )}
          </div>

          {/* ── Step 2: Configuration & Generate ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-tech-accent text-xs">02</span>
              <h2 className="font-serif italic text-xl">Configuration</h2>
              <InfoBadge text={"These settings describe the target\nSmarTest environment.\nCurrently pre-configured for ST8.2.5+"} />
            </div>

            <div className="tech-border p-8 space-y-6 bg-tech-card/40">
              {/* Config Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label className="font-mono text-[10px] uppercase text-tech-muted tracking-widest">Environment</label>
                    <InfoBadge text="Target SmarTest version.\nOutput Java API calls target ST8.2.5+." />
                  </div>
                  <div className="font-mono text-sm border border-tech-border px-4 py-3 bg-tech-card text-tech-accent border-l-2 border-l-tech-accent">
                    SmarTest 8.2.5+
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label className="font-mono text-[10px] uppercase text-tech-muted tracking-widest">Output Files</label>
                    <InfoBadge text=".java — TestMethod logic&#10;.pc   — Pin Configuration&#10;.spec — Spec limits&#10;.tf   — Test Flow" />
                  </div>
                  <div className="font-mono text-[10px] border border-tech-border px-4 py-3 bg-tech-card/50 text-tech-muted tracking-wide">
                    .java · .pc · .spec · .tf
                  </div>
                </div>
              </div>

              {/* Warning banner if no file */}
              {!file && !loading && (
                <div className="border border-tech-border/40 bg-tech-accent/5 px-4 py-3 flex items-start gap-3">
                  <Info className="w-4 h-4 text-tech-accent shrink-0 mt-0.5" />
                  <p className="font-mono text-[10px] text-tech-muted leading-relaxed">
                    Upload a test document above before generating. The AI will analyze pin maps, test conditions, and limit tables from your file.
                  </p>
                </div>
              )}

              {file && !loading && !result && (
                <div className="border border-tech-accent/20 bg-tech-accent/5 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-tech-accent shrink-0 mt-0.5" />
                  <p className="font-mono text-[10px] text-tech-accent leading-relaxed">
                    File ready. Click "Generate Full ST8 Project" to start AI synthesis. This may take 15–60 seconds.
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <Tooltip
                content={
                  !file
                    ? 'Upload a file first before generating'
                    : loading
                    ? 'Generation in progress…'
                    : 'Start AI code synthesis from your document'
                }
                side="bottom"
              >
                <button
                  id="generate-btn"
                  onClick={handleGenerate}
                  disabled={!file || loading}
                  className={`w-full py-5 font-mono text-sm uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${
                    !file || loading
                      ? 'opacity-20 cursor-not-allowed border border-tech-border'
                      : 'bg-tech-accent text-tech-bg font-bold hover:shadow-[0_0_30px_rgba(0,242,255,0.35)] active:scale-[0.98]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Project…
                    </span>
                  ) : (
                    'Generate Full ST8 Project'
                  )}
                  {!loading && file && (
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                  )}
                </button>
              </Tooltip>

              {/* Clear Session */}
              {file && (
                <Tooltip content="Remove current file and reset all output" side="top">
                  <button
                    id="reset-btn"
                    onClick={reset}
                    className="w-full py-2 font-mono text-[10px] uppercase text-tech-muted hover:text-tech-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Clear Session
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="border-l-4 border-red-500 bg-red-500/10 p-5 flex gap-4 text-red-400 tech-border"
            >
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase font-bold">System Error</p>
                <p className="font-mono text-xs leading-relaxed">{error}</p>
                <p className="font-mono text-[9px] text-red-400/60 mt-2">
                  Tip: Check your VITE_OPENROUTER_API_KEY in .env or Vercel dashboard and ensure the uploaded file is a clear, readable document.
                </p>
              </div>
            </motion.div>
          )}
        </section>

        {/* ── Right Column: Result ── */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="font-mono text-tech-accent text-xs">03</span>
              <h2 className="font-serif italic text-xl">Generated Project Files</h2>
              {result && (
                <InfoBadge text={"Click a file tab to download it.\nUse 'Download All' for a ZIP with\nthe full project folder structure."} />
              )}
            </div>

            {result && generatedFiles.length > 0 && (
              <Tooltip content={`Download ${projectName}.zip with all ${generatedFiles.length} files`} side="left">
                <button
                  id="download-all-btn"
                  onClick={downloadAll}
                  className="font-mono text-[10px] uppercase border border-tech-accent/30 px-4 py-2 text-tech-accent hover:bg-tech-accent hover:text-tech-bg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.05)]"
                >
                  <ArchiveIcon className="w-3 h-3" />
                  Download All ({generatedFiles.length})
                </button>
              </Tooltip>
            )}
          </div>

          <div className="tech-border bg-black/60 backdrop-blur-xl min-h-[600px] relative overflow-hidden shadow-2xl flex flex-col">
            <AnimatePresence mode="wait">

              {/* Loading State */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-10 text-center z-20"
                >
                  <div className="relative">
                    <Loader2 className="w-16 h-16 animate-spin text-tech-accent opacity-40" />
                    <div className="absolute inset-0 blur-2xl bg-tech-accent/20 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-tech-accent animate-pulse">
                      Neural Analysis in Progress
                    </p>
                    <p className="font-serif italic text-xl text-tech-text/80">
                      Synthesizing SmarTest 8.2.5 Logic…
                    </p>
                    <p className="font-mono text-[9px] text-tech-muted">
                      Parsing pin map · Building spec sheet · Writing TestMethod…
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Result State */}
              {!loading && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col h-full overflow-hidden"
                >
                  {/* File Tabs */}
                  {generatedFiles.length > 0 && (
                    <div className="border-b border-tech-border bg-black/40 shrink-0">
                      <div className="p-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
                        {generatedFiles.map((f, idx) => (
                          <Tooltip
                            key={idx}
                            content={`${f.name}\n${f.directory ? `📁 ${f.directory}` : 'Root directory'}\n\nClick to download this file`}
                            side="bottom"
                          >
                            <button
                              id={`file-tab-${idx}`}
                              onClick={() => { setActiveTab(idx); downloadFile(f.name, f.content); }}
                              className={`flex items-center gap-2 font-mono text-[10px] whitespace-nowrap border px-3 py-1.5 transition-all group ${
                                activeTab === idx
                                  ? 'border-tech-accent text-tech-accent bg-tech-accent/10'
                                  : 'border-tech-border hover:border-tech-accent hover:text-tech-accent bg-tech-card/50'
                              }`}
                            >
                              <div className="flex flex-col items-start gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                  {f.name}
                                </div>
                                {f.directory && (
                                  <div className="flex items-center gap-1 opacity-30 text-[8px]">
                                    <Folder className="w-2 h-2" />
                                    {f.directory}
                                  </div>
                                )}
                              </div>
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                      <div className="px-3 pb-2">
                        <p className="font-mono text-[9px] text-tech-muted">
                          ↑ Click any file tab to download it individually
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="flex-1 overflow-auto p-8 md:p-10 markdown-body custom-scrollbar bg-black/20">
                    <div className="flex justify-end mb-6 gap-3 flex-wrap">
                      <Tooltip content="Copy the full generated content to clipboard" side="left">
                        <button
                          id="copy-btn"
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 font-mono text-[10px] uppercase text-tech-accent border border-tech-accent/30 px-3 py-1 hover:bg-tech-accent/10 transition-colors"
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied!' : 'Copy All Content'}
                        </button>
                      </Tooltip>
                    </div>

                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline ? (
                            <div className="relative my-8 first:mt-0">
                              <div className="absolute -top-3 left-4 px-2 py-1 bg-tech-card border border-tech-border font-mono text-[8px] text-tech-muted uppercase tracking-widest z-10">
                                {match ? match[1] : 'code'}
                              </div>
                              <pre className="p-6 pt-8 bg-[#020408] border border-tech-border/50 overflow-x-auto shadow-inner">
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            </div>
                          ) : (
                            <code className="bg-tech-accent/10 text-tech-accent px-1.5 py-0.5 rounded font-bold" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {result}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {!loading && !result && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center space-y-8 p-10 text-center"
                >
                  <div className="p-8 border border-tech-border/30 rounded-full bg-tech-card/20 relative">
                    <Code className="w-12 h-12 text-tech-muted opacity-30" />
                    <div className="absolute inset-0 border border-tech-accent/10 rounded-full animate-ping" />
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-tech-muted">Waiting for Input</p>
                    <p className="font-serif italic text-lg opacity-30">Project files will appear here</p>
                  </div>

                  {/* Quick Start Guide inline */}
                  <div className="border border-tech-border/40 bg-tech-card/10 p-6 text-left max-w-sm w-full space-y-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-tech-accent mb-3">Quick Start</p>
                    {[
                      '① Upload a test datasheet (PDF or image)',
                      '② Click "Generate Full ST8 Project"',
                      '③ Download individual files or the full ZIP',
                    ].map((t) => (
                      <p key={t} className="font-mono text-[10px] text-tech-muted leading-relaxed">{t}</p>
                    ))}
                    <button
                      onClick={() => setHelpOpen(true)}
                      className="mt-3 font-mono text-[9px] uppercase text-tech-accent hover:underline flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3" /> View full guide
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-tech-border mt-20 p-12 text-center bg-tech-card/20">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-px w-20 bg-tech-accent/30 mx-auto" />
          <p className="font-mono text-[9px] uppercase text-tech-muted tracking-[0.4em] leading-loose">
            © 2026 Technical Hardware Solutions<br />
            Precision ATE Code Synthesis Engine<br />
            Optimized for Advantest SmarTest 8.2.5
          </p>
          <button
            onClick={() => setHelpOpen(true)}
            className="font-mono text-[9px] uppercase text-tech-muted hover:text-tech-accent transition-colors flex items-center gap-1.5 mx-auto"
          >
            <HelpCircle className="w-3 h-3" /> Usage Guide & FAQ
          </button>
        </div>
      </footer>
    </div>
  );
}
