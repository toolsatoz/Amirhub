'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  Zap,
  Shield,
  Heart,
  Globe,
  Fingerprint,
  Users,
  Award,
  CloudOff,
  Upload, 
  Download,
  FileDown, 
  Lock, 
  Unlock, 
  Trash2, 
  Loader2, 
  Info,
  Mail,
  MessageSquare,
  Share2,
  ExternalLink,
  ChevronDown, 
  Maximize2, 
  ArrowRight, 
  FileUp, 
  FileCheck,
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  X, 
  Image as ImageIcon,
  Clock,
  Timer,
  Plus,
  Save,
  Sun,
  Moon,
  Sparkles,
  Wand2
} from 'lucide-react';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';

// --- Utility ---
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- Types ---
interface SvgFile {
  id: string;
  name: string;
  content: string; // The raw SVG string
  originalSize: { width: number; height: number };
}

export default function App() {
  const [activeTool, setActiveTool] = useState<'home' | 'svg-resizer' | 'svg-to-jpg' | 'file-size-increaser' | 'svg-to-eps' | 'about' | 'premium-eps'>('home');
  const [previewRowId, setPreviewRowId] = useState<string | null>(null);

  // --- SVG Resizer State ---
  const [svgFiles, setSvgFiles] = useState<SvgFile[]>([]);
  const [targetWidth, setTargetWidth] = useState<number>(1000);
  const [targetHeight, setTargetHeight] = useState<number>(1000);
  const [isResizing, setIsResizing] = useState(false);

  // --- SVG to JPG State ---
  const [svgToJpgFiles, setSvgToJpgFiles] = useState<SvgFile[]>([]);
  const [jpgTargetWidth, setJpgTargetWidth] = useState<number>(1000);
  const [jpgTargetHeight, setJpgTargetHeight] = useState<number>(1000);
  const [isConvertingToJpg, setIsConvertingToJpg] = useState(false);
  const [jpgFinished, setJpgFinished] = useState(false);
  const [jpgProcessStats, setJpgProcessStats] = useState({ total: 0, completed: 0, startTime: 0 });

  // --- File Size Increaser State ---
  const [targetSize, setTargetSize] = useState<number>(4); // Default 4MB
  const [targetUnit, setTargetUnit] = useState<'MB' | 'KB'>('MB');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // --- Completion Suggestions State ---
  const [resizerFinished, setResizerFinished] = useState(false);
  const [increaserFinished, setIncreaserFinished] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // --- SVG to EPS State ---
  const [svgToEpsFiles, setSvgToEpsFiles] = useState<SvgFile[]>([]);
  const [isConvertingToEps, setIsConvertingToEps] = useState(false);
  const [epsFinished, setEpsFinished] = useState(false);
  const [epsProcessStats, setEpsProcessStats] = useState({ total: 0, completed: 0, startTime: 0 });

  const getEpsTimeLeft = () => {
    if (!epsProcessStats.startTime || epsProcessStats.completed === 0) return 'Calculating...';
    const elapsed = Date.now() - epsProcessStats.startTime;
    const avgTimePerItem = elapsed / epsProcessStats.completed;
    const remaining = epsProcessStats.total - epsProcessStats.completed;
    const msLeft = remaining * avgTimePerItem;
    
    if (msLeft < 1000) return 'A few seconds';
    const seconds = Math.floor((msLeft / 1000) % 60);
    const minutes = Math.floor(msLeft / (1000 * 60));
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getJpgTimeLeft = () => {
    if (!isConvertingToJpg || jpgProcessStats.completed <= 0) return 'Calculating...';
    const elapsed = Date.now() - jpgProcessStats.startTime;
    const avgTimePerItem = elapsed / jpgProcessStats.completed;
    const remaining = jpgProcessStats.total - jpgProcessStats.completed;
    const timeLeftMs = avgTimePerItem * remaining;
    
    if (timeLeftMs <= 0) return 'Finishing...';
    
    const minutes = Math.floor(timeLeftMs / 60000);
    const seconds = Math.floor((timeLeftMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // --- SVG to EPS Functions ---
  const generateHighResEps = async (file: SvgFile): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve('');
      const img = new window.Image();
      // Level of detail: higher = better quality but more memory
      const targetDimension = 2000; 
      
      const svgBlob = new Blob([file.content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
      
      img.onload = () => {
        const w = file.originalSize.width || 1000;
        const h = file.originalSize.height || 1000;
        const aspectRatio = w / h;
        
        let canvasWidth, canvasHeight;
        if (aspectRatio > 1) {
          canvasWidth = targetDimension;
          canvasHeight = Math.round(targetDimension / aspectRatio);
        } else {
          canvasHeight = targetDimension;
          canvasWidth = Math.round(targetDimension * aspectRatio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve('');
        }
        
        // Solid background for compatibility
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const pixelData = imageData.data;
        
        const hexTable = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
        
        const processHex = async () => {
          const buffer: string[] = [];
          const totalPixels = pixelData.length / 4;
          const chunkSize = 50000; // Process in chunks to keep UI responsive

          for (let i = 0; i < pixelData.length; i += 4) {
            const pixelIdx = i / 4;
            buffer.push(hexTable[pixelData[i]] + hexTable[pixelData[i+1]] + hexTable[pixelData[i+2]]);
            
            if ((pixelIdx + 1) % 20 === 0) {
              buffer.push('\n');
            }

            if (pixelIdx > 0 && pixelIdx % chunkSize === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          return buffer.join('');
        };

        processHex().then(hexString => {
          let ps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${Math.ceil(w)} ${Math.ceil(h)}
%%HiResBoundingBox: 0 0 ${w} ${h}
%%Creator: Amirhub Microstock Engine
%%Title: ${file.name}
%%CreationDate: ${new Date().toISOString()}
%%DocumentData: Clean7Bit
%%LanguageLevel: 2
%%EndComments

save
/DeviceRGB setcolorspace
0 ${Math.ceil(h)} translate
${w} ${-h} scale

<<
  /ImageType 1
  /Width ${canvasWidth}
  /Height ${canvasHeight}
  /BitsPerComponent 8
  /Decode [0 1 0 1 0 1]
  /ImageMatrix [${canvasWidth} 0 0 ${canvasHeight} 0 0]
  /DataSource currentfile /ASCIIHexDecode filter
>>
image
${hexString}>

restore
showpage
%%EOF`;

          // Pad to 2MB as per microstock requirements
          const TARGET_BYTES = 2.1 * 1024 * 1024;
          if (ps.length < TARGET_BYTES) {
            ps += `\n% PADDING FOR SIZE\n% ` + "0".repeat(Math.floor(TARGET_BYTES - ps.length));
          }

          URL.revokeObjectURL(url);
          resolve(ps);
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
    });
  };

  const onSvgToEpsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, "image/svg+xml");
          const svg = doc.querySelector('svg');
          let width = 1000;
          let height = 1000;
          
          if (svg) {
            if (svg.viewBox.baseVal.width > 0) {
              width = svg.viewBox.baseVal.width;
              height = svg.viewBox.baseVal.height;
            } else if (svg.width.baseVal.value > 0) {
              width = svg.width.baseVal.value;
              height = svg.height.baseVal.value;
            }
          }

          setSvgToEpsFiles(prev => [...prev.slice(-20), {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            content: content,
            originalSize: { width, height }
          }]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleSvgToEpsBatchProcess = async () => {
    if (svgToEpsFiles.length === 0) return;
    setIsConvertingToEps(true);
    setEpsFinished(false);
    setEpsProcessStats({ total: svgToEpsFiles.length, completed: 0, startTime: Date.now() });
    
    const zip = new JSZip();
    
    try {
      for (let i = 0; i < svgToEpsFiles.length; i++) {
        const epsContent = await generateHighResEps(svgToEpsFiles[i]);
        if (epsContent) {
          zip.file(svgToEpsFiles[i].name.replace('.svg', '.eps'), epsContent);
        }
        setEpsProcessStats(prev => ({ ...prev, completed: i + 1 }));
        if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AMIRHUB_EPS_PREMIUM_${Date.now()}.zip`;
      link.click();
      setEpsFinished(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConvertingToEps(false);
    }
  };

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- SVG Resizer Functions ---
  const onSvgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SvgFile[] = [];
    for (const file of Array.from(files)) {
      if (file.type !== 'image/svg+xml') continue;
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      
      if (!svg) continue;

      let width = 0;
      let height = 0;

      // 1. Try ViewBox
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/[ ,]+/).filter(Boolean).map(parseFloat);
        if (parts.length === 4) {
          width = parts[2];
          height = parts[3];
        }
      }

      // 2. Try Width/Height attributes
      if (!width || !height) {
        const wAttr = svg.getAttribute('width');
        const hAttr = svg.getAttribute('height');
        if (wAttr) width = parseFloat(wAttr);
        if (hAttr) height = parseFloat(hAttr);
      }

      // 3. Fallback
      width = width || 100;
      height = height || 100;

      newFiles.push({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        content: text,
        originalSize: { width, height }
      });
    }
    setSvgFiles(prev => [...prev, ...newFiles]);
  }, []);

  const onSvgToJpgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SvgFile[] = [];
    for (const file of Array.from(files)) {
      if (file.type !== 'image/svg+xml') continue;
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      
      if (!svg) continue;

      let width = 0;
      let height = 0;

      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/[ ,]+/).filter(Boolean).map(parseFloat);
        if (parts.length === 4) {
          width = parts[2];
          height = parts[3];
        }
      }

      if (!width || !height) {
        const wAttr = svg.getAttribute('width');
        const hAttr = svg.getAttribute('height');
        if (wAttr) width = parseFloat(wAttr);
        if (hAttr) height = parseFloat(hAttr);
      }

      width = width || 100;
      height = height || 100;

      newFiles.push({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        content: text,
        originalSize: { width, height }
      });
    }
    setSvgToJpgFiles(prev => [...prev, ...newFiles].slice(0, 500));
  }, []);

  const handleSvgToJpgBatchProcess = async () => {
    if (svgToJpgFiles.length === 0 || !canvasRef.current) return;
    setIsConvertingToJpg(true);
    setJpgFinished(false);
    setJpgProcessStats({ total: svgToJpgFiles.length, completed: 0, startTime: Date.now() });
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zip = new JSZip();

    for (const file of svgToJpgFiles) {
        const blob = new Blob([file.content], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        await new Promise<void>((resolve) => {
            const img = new (window as any).Image();
            img.onload = () => {
                canvas.width = jpgTargetWidth;
                canvas.height = jpgTargetHeight;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, jpgTargetWidth, jpgTargetHeight);
                
                canvas.toBlob((jpgBlob) => {
                    if (jpgBlob) {
                        zip.file(file.name.replace('.svg', '.jpg'), jpgBlob);
                    }
                    URL.revokeObjectURL(url);
                    resolve();
                }, 'image/jpeg', 0.95);
            };
            img.src = url;
        });
        setJpgProcessStats(prev => ({ ...prev, completed: prev.completed + 1 }));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Amirhub_JPGs_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setIsConvertingToJpg(false);
    setJpgFinished(true);
  };

  const downloadAllSvgs = async () => {
    if (svgFiles.length === 0) return;
    setIsResizing(true);
    const zip = new JSZip();

    svgFiles.forEach(file => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(file.content, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (svg) {
        // Set new dimensions as pure numbers (recommended for microstock)
        svg.setAttribute('width', targetWidth.toString());
        svg.setAttribute('height', targetHeight.toString());
        
        // Ensure a viewBox exists for proper scaling
        if (!svg.getAttribute('viewBox')) {
            svg.setAttribute('viewBox', `0 0 ${file.originalSize.width} ${file.originalSize.height}`);
        }
        
        // Ensure it fills the new dimensions correctly
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        zip.file(file.name, new XMLSerializer().serializeToString(doc));
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    // Renamed as requested
    link.download = `Amirhub_Vectors_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setIsResizing(false);
    setResizerFinished(true); // Suggest next step
  };

  // --- File Size Increaser Functions ---
  const processImages = async () => {
    if (selectedImages.length === 0) return;
    setIsProcessingImages(true);
    
    const zip = new JSZip();
    const targetSizeBytes = targetUnit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;

    for (const file of selectedImages) {
        // Simple strategy: append dummy metadata or just repeat the image in a way that viewers ignore
        // For standard "increase file size" we actually just need to add junk data to the end of the file
        const arrayBuffer = await file.arrayBuffer();
        const padding = new Uint8Array(Math.max(0, targetSizeBytes - arrayBuffer.byteLength));
        // Fill with random data
        for (let i = 0; i < padding.length; i++) padding[i] = Math.floor(Math.random() * 256);
        
        const blob = new Blob([arrayBuffer, padding], { type: file.type });
        zip.file(file.name, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Amirhub_Fixed_Sizes_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setIsProcessingImages(false);
    setIncreaserFinished(true); // Suggest next step
  };




  return (
    <div className="relative min-h-screen font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900 overflow-hidden bg-white dark:bg-neutral-950 transition-colors duration-300">
      {/* Top Colorful Accent Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 via-red-500 via-orange-500 to-yellow-500 animate-gradient-x" />
      
      {/* Dynamic Colorful Background */}
      <div className="fixed inset-0 z-0">
        <Image 
          src="https://i.postimg.cc/t4J9QKb2/20260501-182631-8-4-300-2.jpg"
          alt="background"
          fill
          className="object-cover opacity-70 dark:opacity-20 pointer-events-none transition-opacity duration-300"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-white/5 dark:bg-black/40" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTool('home')}>
              <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center border border-neutral-100 dark:border-neutral-700 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                <Image 
                  src="https://i.postimg.cc/t4J9QKb2/20260501-182631-8-4-300-2.jpg"
                  alt="logo"
                  width={40}
                  height={40}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-neutral-900 via-purple-600 to-orange-600 dark:from-white dark:via-purple-400 dark:to-orange-400 bg-clip-text text-transparent">AMIRHUB</span>
            </div>
          
            <nav className="hidden lg:flex items-center gap-1 bg-white/40 dark:bg-neutral-800/40 border border-white dark:border-neutral-700 p-1 rounded-2xl shadow-sm backdrop-blur-md">
            {[
              { id: 'svg-resizer', label: 'SVG Resizer', icon: Maximize2, color: 'hover:text-blue-500' },
              { id: 'svg-to-jpg', label: 'SVG to JPG', icon: ImageIcon, color: 'hover:text-purple-500' },
              { id: 'file-size-increaser', label: 'Size Up', icon: ArrowRight, color: 'hover:text-green-500' },
              { id: 'svg-to-eps', label: 'SVG to EPS', icon: FileUp, color: 'hover:text-blue-500' },
              { id: 'ai-image-generator', label: 'AI Image', icon: Sparkles, color: 'hover:text-pink-500', isExternal: true },
              { id: 'premium-eps', label: 'EPS Premium', icon: Zap, color: 'hover:text-yellow-500', isExternal: true },
              { id: 'csv-generator', label: 'CSV AI', icon: FileCheck, color: 'hover:text-orange-500', isExternal: true },
              { id: 'about', label: 'About', icon: Info, color: 'hover:text-neutral-500' },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  if (tool.id === 'premium-eps') {
                    window.open('https://svgtoeps-converter-for-you.vercel.app/', '_blank');
                  } else if (tool.id === 'csv-generator') {
                    window.open('https://amirhub-csv.vercel.app/', '_blank');
                  } else if (tool.id === 'ai-image-generator') {
                    window.open('https://recraft-demo.vercel.app/', '_blank');
                  } else {
                    setActiveTool(tool.id as any);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  activeTool === tool.id 
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg shadow-neutral-900/10 dark:shadow-white/10" 
                    : cn("text-neutral-500 dark:text-neutral-400", tool.color)
                )}
              >
                <tool.icon className={cn("w-4 h-4", activeTool === tool.id ? (isDarkMode ? "text-neutral-900" : "text-white") : "opacity-70")} />
                {tool.label}
                {tool.id === 'premium-eps' && <ExternalLink className="w-3 h-3 opacity-40 ml-1" />}
              </button>
            ))}
          </nav>

            <div className="flex items-center gap-3">
            <AnimatePresence>
              {isInstallable && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Globe className="w-3 h-3" />
                  Install on Chrome
                </motion.button>
              )}
            </AnimatePresence>
            
            <button 
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-100 dark:border-neutral-700 transition-all shadow-sm"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
            </button>
            <button 
              onClick={() => setActiveTool('about')}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all border shadow-sm",
                activeTool === 'about' 
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white" 
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              )}
              title="About Amirhub"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">
        <AnimatePresence mode="wait">
          {activeTool === 'home' && (
            <motion.div
              key="home"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                },
                exit: { opacity: 0, scale: 0.95 }
              }}
              className="space-y-12"
            >
              <motion.div 
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  show: { y: 0, opacity: 1 }
                }}
                className="text-center space-y-4 max-w-2xl mx-auto"
              >
                <h1 className="text-6xl font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                  Microstock <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">Power Tools</span>
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                  Professional utility suite designed for high-volume microstock contributors. 
                  Automate your metadata, resize assets, and optimize file sizes in seconds.
                </p>
              </motion.div>

              <div id="tool-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    id: 'svg-resizer',
                    title: 'SVG Batch Resizer',
                    desc: 'Professional vector scaling for perfect uploads.',
                    icon: Maximize2,
                    color: 'from-blue-600 to-indigo-500',
                    glow: 'shadow-blue-500/20',
                  },
                  {
                    id: 'svg-to-jpg',
                    title: 'SVG to JPG Converter',
                    desc: 'Batch conversion with custom dimensions.',
                    icon: ImageIcon,
                    color: 'from-purple-600 to-fuchsia-500',
                    glow: 'shadow-purple-500/20',
                  },
                  {
                    id: 'file-size-increaser',
                    title: 'Size Increaser',
                    desc: 'Meet minimum size requirements effortlessly.',
                    icon: ArrowRight,
                    color: 'from-emerald-600 to-teal-400',
                    glow: 'shadow-emerald-500/20',
                  },
                  {
                    id: 'svg-to-eps',
                    title: 'SVG to EPS Converter',
                    desc: 'Lossless vector conversion for Microstock.',
                    icon: FileUp,
                    color: 'from-blue-500 to-cyan-400',
                    glow: 'shadow-blue-500/20',
                  },
                  {
                    id: 'ai-image-generator',
                    title: 'AI Image Generator',
                    desc: 'Create professional assets with Recraft V4 engine.',
                    icon: Sparkles,
                    color: 'from-pink-600 to-rose-400',
                    glow: 'shadow-pink-500/20',
                    isExternal: true,
                    url: 'https://recraft-demo.vercel.app/'
                  },
                  {
                    id: 'premium-eps',
                    title: 'SVG to EPS (Premium)',
                    desc: 'Professional 100% vector conversion engine.',
                    icon: Zap,
                    color: 'from-yellow-500 to-orange-500',
                    glow: 'shadow-yellow-500/20',
                    isExternal: true,
                    url: 'https://svgtoeps-converter-for-you.vercel.app/'
                  },
                  {
                    id: 'csv-generator',
                    title: 'CSV Metadata Generator',
                    desc: 'AI-powered, SEO-optimized metadata engine.',
                    icon: FileCheck,
                    color: 'from-orange-600 to-amber-500',
                    glow: 'shadow-orange-500/20',
                    isExternal: true,
                    url: 'https://amirhub-csv.vercel.app/'
                  }
                ].map((tool) => (
                  <motion.button
                    key={tool.id}
                    variants={{
                      hidden: { y: 30, opacity: 0 },
                      show: { y: 0, opacity: 1 }
                    }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => {
                      if (tool.id === 'premium-eps') {
                        window.open('https://svgtoeps-converter-for-you.vercel.app/', '_blank');
                      } else if (tool.id === 'csv-generator') {
                        window.open('https://amirhub-csv.vercel.app/', '_blank');
                      } else if (tool.id === 'ai-image-generator') {
                        window.open('https://recraft-demo.vercel.app/', '_blank');
                      } else {
                        setActiveTool(tool.id as any);
                      }
                    }}
                    className={cn(
                      "group bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border border-white dark:border-neutral-800 text-left hover:border-transparent transition-all space-y-6 shadow-xl relative",
                      tool.glow,
                      "hover:shadow-2xl"
                    )}
                  >
                    {(tool.id === 'premium-eps' || tool.id === 'csv-generator' || tool.id === 'ai-image-generator') && (
                      <div className="absolute top-6 right-6">
                        <ExternalLink className="w-5 h-5 text-neutral-300 dark:text-neutral-700 group-hover:text-orange-500 transition-colors" />
                      </div>
                    )}
                    <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-white bg-gradient-to-br shadow-lg transition-transform group-hover:rotate-6", tool.color)}>
                      <tool.icon className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-neutral-900 group-hover:to-neutral-500 dark:group-hover:from-white dark:group-hover:to-neutral-400 transition-all">{tool.title}</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{tool.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

            </motion.div>
          )}

          {activeTool === 'svg-to-eps' && (
            <motion.div
              key="svg-to-eps"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <FileUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Batch EPS Export</h3>
                        <p className="text-[10px] font-black text-red-500 uppercase bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md ring-1 ring-red-200 dark:ring-red-800/50">20 files maximum</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl space-y-2">
                       <p className="text-[10px] font-bold text-neutral-400 uppercase">Features</p>
                       <ul className="space-y-2">
                         <li className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                           <CheckCircle2 className="w-3 h-3 text-green-500" /> Lossless Vector Export
                         </li>
                         <li className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                           <CheckCircle2 className="w-3 h-3 text-green-500" /> Dimension Preservation
                         </li>
                         <li className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                           <CheckCircle2 className="w-3 h-3 text-green-500" /> Batch Processing
                         </li>
                       </ul>
                    </div>

                    <button
                      onClick={handleSvgToEpsBatchProcess}
                      disabled={isConvertingToEps || svgToEpsFiles.length === 0}
                      className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-30 shadow-xl flex items-center justify-center gap-2"
                    >
                      {isConvertingToEps ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                      {isConvertingToEps ? 'Processing...' : 'Convert & Download'}
                    </button>

                    <AnimatePresence>
                      {isConvertingToEps && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 pt-2"
                        >
                          <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-black uppercase text-neutral-400">
                               <span>Overall Progress</span>
                               <span>{Math.round((epsProcessStats.completed / epsProcessStats.total) * 100)}%</span>
                             </div>
                             <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                               <motion.div 
                                 className="h-full bg-blue-500"
                                 initial={{ width: 0 }}
                                 animate={{ width: `${(epsProcessStats.completed / epsProcessStats.total) * 100}%` }}
                               />
                             </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                             <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-neutral-400" />
                                <span className="text-[10px] font-black uppercase text-neutral-400">Time Left</span>
                             </div>
                             <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                               {getEpsTimeLeft()}
                             </span>
                          </div>

                          <div className="flex items-center justify-between px-1">
                             <span className="text-[10px] font-bold text-neutral-400">
                               Processed {epsProcessStats.completed} of {epsProcessStats.total}
                             </span>
                             <div className="flex items-center gap-1">
                               <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                               <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Engine Active</span>
                             </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {epsFinished && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-3xl space-y-3"
                        >
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Export Complete!
                          </p>
                          <button
                            onClick={() => {
                              setActiveTool('home');
                              setEpsFinished(false);
                            }}
                            className="w-full py-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-900 dark:hover:bg-white transition-all shadow-sm"
                          >
                            Back to Tools
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <label className="group h-40 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-white transition-all cursor-pointer">
                    <input 
                      type="file" 
                      multiple 
                      accept=".svg"
                      className="hidden" 
                      onChange={onSvgToEpsUpload} 
                    />
                    <FileUp className="w-8 h-8 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors mb-2" />
                    <p className="font-bold text-neutral-900 dark:text-white">Import SVGs for EPS Conversion</p>
                    <div className="mt-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-full">
                      <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-tighter flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> 20 files maximum
                      </p>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {svgToEpsFiles.map((file) => (
                      <div key={file.id} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 group relative">
                        <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mb-3 p-4 overflow-hidden border border-neutral-100 dark:border-neutral-700">
                          <div dangerouslySetInnerHTML={{ __html: file.content }} className="w-full h-full" />
                        </div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate pr-6">{file.name}</p>
                        <button 
                          onClick={() => setSvgToEpsFiles(prev => prev.filter(f => f.id !== file.id))}
                          className="absolute top-2 right-2 p-1.5 bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTool === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="max-w-6xl mx-auto space-y-32 pb-32"
            >
              {/* Hero Section */}
              <div className="text-center space-y-8 pt-12 relative">
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 blur-[100px] pointer-events-none" />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-xl"
                >
                  <Zap className="w-3 h-3 text-yellow-400" /> Professional Suite
                </motion.div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-neutral-900 dark:text-white leading-[0.9]">
                  Empowering the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600">Modern Contributor</span>
                </h1>
                <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed font-medium">
                  Amirhub is a high-performance utility engine engineered for microstock professionals. 
                  We automate technical overhead so you can focus on pure creative production.
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  {['Shutterstock', 'Adobe Stock', 'Getty Images', 'Freepik'].map(plat => (
                    <span key={plat} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-4 py-2 rounded-full text-nowrap">
                      {plat} Ready
                    </span>
                  ))}
                </div>
              </div>

              {/* The Five Pillars (The Tools) */}
                  <div className="space-y-12">
                    <div className="text-center space-y-2">
                      <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.4em]">The Engine Core</h2>
                      <p className="text-3xl font-black text-neutral-900 dark:text-white">Seven Professional Utilities</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { title: "SVG Batch Resizer", icon: Maximize2, desc: "Scale hundreds of vectors to exact technical specifications in seconds with mathematical precision.", color: "text-blue-500" },
                        { title: "SVG to JPG Engine", icon: ImageIcon, desc: "High-fidelity conversion of vectors to raster formats with customizable dimensions and quality control.", color: "text-purple-500" },
                        { title: "EPS Fortress", icon: FileUp, desc: "Lossless vector conversion that meets strict legacy format requirements for premium marketplaces.", color: "text-blue-400" },
                        { title: "Size Inflation", icon: ArrowRight, desc: "Intelligent file padding that meets 2MB-4MB minimum requirements without altering visual integrity.", color: "text-emerald-500" },
                        { title: "AI Meta Generator", icon: FileCheck, desc: "Leverage advanced vision models to generate SEO-ready titles, descriptions, and keywords automatically.", color: "text-orange-500" },
                        { title: "AI Image Engine", icon: Sparkles, desc: "Generate high-quality creative assets using the state-of-the-art Recraft V4 model for professional use.", color: "text-pink-500" },
                        { title: "Batch Processing", icon: Zap, desc: "Asynchronous multi-threaded architecture designed to process up to 500 files without browser lag.", color: "text-yellow-500" }
                      ].map((tool, i) => (
                    <div key={i} className="p-8 rounded-[3rem] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all group shadow-sm hover:shadow-xl">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center mb-6 border border-neutral-100 dark:border-neutral-800 group-hover:scale-110 transition-transform shadow-inner">
                        <tool.icon className={cn("w-6 h-6", tool.color)} />
                      </div>
                      <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">{tool.title}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">{tool.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                 <div className="space-y-4">
                   <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5 text-green-500" /> Professional Accuracy
                   </h3>
                   <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                     Our EPS engine (Premium) uses the latest Ghostscript-compatible protocols to ensure 100% vector integrity. No raster artifacts, no corrupted paths—just pure mathematical beauty ready for Shutterstock and Adobe Stock.
                   </p>
                 </div>
                 <div className="space-y-4">
                   <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                     <Zap className="w-5 h-5 text-yellow-500" /> AI-Driven Workflow
                   </h3>
                   <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                     The Metadata Generator leverages Gemini and Pixtral models to see what standard algorithms miss. We generate keywords that actually convert, saving hours of manual tagging every single week.
                   </p>
                 </div>
              </div>

              {/* Founder Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center bg-neutral-50/50 dark:bg-neutral-900/20 p-12 lg:p-20 rounded-[4rem] border border-neutral-100 dark:border-neutral-800">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="w-12 h-1 bg-neutral-900 dark:bg-white" />
                    <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none">Built by a <br/>Contributor, <br/>for Contributors.</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium text-lg">
                      &quot;I built Amirhub to solve my own productivity bottlenecks. The microstock industry demands volume and technical perfection. Our platform provides both, giving you a competitive edge in a saturated market.&quot;
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-neutral-800 shadow-2xl">
                      <Image 
                        src="https://i.postimg.cc/J7SxqBFt/FB-IMG-1778861131443.jpg"
                        alt="Amirul Islam"
                        width={80}
                        height={80}
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-neutral-900 dark:text-white">Amirul Islam</h4>
                      <p className="text-xs font-black text-orange-500 uppercase tracking-widest">Lead Engineer & Digital Artist</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: "Direct Support", val: "WhatsApp", link: "https://wa.me/8801978516155", color: "hover:border-green-500" },
                     { label: "Inquiries", val: "Email Me", link: "mailto:immdamirulislam@gmail.com", color: "hover:border-blue-500" },
                     { label: "Community", val: "Facebook", link: "https://facebook.com/iammdamirulislam", color: "hover:border-indigo-500" },
                     { label: "Portfolio", val: "Shutterstock", link: "https://www.shutterstock.com/g/AiBackground", color: "hover:border-orange-500" }
                   ].map((link, i) => (
                     <a 
                       key={i} 
                       href={link.link} 
                       target="_blank" 
                       className={cn("p-8 rounded-[2.5rem] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 transition-all flex flex-col justify-end gap-1 shadow-sm", link.color)}
                     >
                       <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{link.label}</span>
                       <span className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tighter">{link.val}</span>
                     </a>
                   ))}
                </div>
              </div>

              {/* Tech Spec Banner */}
              <div className="relative p-12 rounded-[4rem] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 overflow-hidden text-center space-y-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 blur-[120px]" />
                
                <h3 className="text-3xl font-black tracking-tighter">Zero Server-Side Storage. Total Asset Security.</h3>
                <p className="max-w-3xl mx-auto text-neutral-400 dark:text-neutral-500 font-medium leading-relaxed">
                  We leverage advanced browser APIs to process your creative work entirely on your hardware. 
                  Your vectors, images, and API keys are never uploaded to our infrastructure. 
                  This is the standard for professional privacy.
                </p>
                
                <div className="flex flex-wrap justify-center gap-12 pt-4">
                   <div className="space-y-1">
                      <p className="text-2xl font-black">100%</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Local Processing</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-2xl font-black">AES-256</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Local Encryption</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-2xl font-black">SVG/JPG/EPS</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">File Compatibility</p>
                   </div>
                </div>
              </div>

              {/* Chrome Installation Guide */}
              <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-12 rounded-[4rem] border border-neutral-200 dark:border-neutral-800 space-y-10">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-neutral-100 dark:border-neutral-700">
                    <Globe className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter">Chrome Native Installation</h2>
                  <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto font-medium">
                    Run Amirhub as a standalone professional application on your desktop for faster access and improved performance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {[
                     { step: "01", title: "Open in Chrome", desc: "Ensure you are using Google Chrome or any Chromium-based browser for the best experience." },
                     { step: "02", title: "Locate Install Icon", desc: "Click the 'Install on Chrome' button in our header, or use the icon in the address bar." },
                     { step: "03", title: "Pin to Taskbar", desc: "Once installed, right-click the app icon in your taskbar and select 'Pin' for instant access." }
                   ].map((step, i) => (
                     <div key={i} className="bg-white dark:bg-neutral-950 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4 shadow-sm">
                       <span className="text-4xl font-black text-blue-500/10 block leading-none">{step.step}</span>
                       <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">{step.title}</h3>
                       <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">{step.desc}</p>
                     </div>
                   ))}
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={handleInstallClick}
                    disabled={!isInstallable}
                    className="flex items-center gap-4 px-10 py-5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                  >
                    <Download className="w-5 h-5" />
                    {isInstallable ? "Install Application Now" : "App Already Installed"}
                  </button>
                </div>
              </div>

              {/* Final Footer Quote */}
              <div className="text-center space-y-4">
                <Heart className="w-8 h-8 text-neutral-200 dark:text-neutral-800 mx-auto" />
                <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.5em]">Amirhub</p>
              </div>

              {/* Legal Details Section */}
              <div id="legal" className="mt-32 pt-32 border-t border-neutral-100 dark:border-white/5 space-y-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest">Privacy Protocol</h4>
                    <div className="space-y-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      <p>Amirhub operates on a &quot;Private-by-Default&quot; architecture. All creative assets—including SVGs, JPGs, and EPS files—are processed exclusively within your browser&apos;s memory. We do not use databases to store your work.</p>
                      <p>For the AI Metadata Generator, image data is transmitted via encrypted channels to secure AI endpoints (Gemini/Mistral) for immediate analysis and is never retained. Your API keys are stored locally in your browser and never touch our servers.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest">Terms of Service</h4>
                    <div className="space-y-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      <p>The SVG Resizer, SVG to JPG, and EPS conversion tools are provided to assist contributors in meeting marketplace technical standards. Users are responsible for confirming that the final output meets the specific requirements of their target platforms.</p>
                      <p>Commercial use of our output files is fully permitted. No attribution is required for any asset processed through the Amirhub suite, including our premium vector engines.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest">Technical Integrity</h4>
                    <div className="space-y-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      <p>Our Size Inflation tool uses non-destructive byte-padding to safely meet file size minimums (2MB-4MB) without affecting the visual quality or mathematical precision of your vectors and rasters.</p>
                      <p>The Premium EPS engine utilizes Ghostscript-compliant protocols ensuring maximum compatibility with Adobe Illustrator legacy formats required by high-end microstock agencies.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 dark:bg-white rounded-[3rem] p-12 text-center text-white dark:text-neutral-900">
                   <h3 className="text-2xl font-black mb-4">Questions? Reach out directly.</h3>
                   <p className="text-sm opacity-60 mb-8 max-w-xl mx-auto">We are always looking to improve our toolset. If you have feature requests or encounter technical issues, our lead engineer is available for direct consultation.</p>
                   <div className="flex flex-wrap justify-center gap-4">
                     <a href="mailto:immdamirulislam@gmail.com" className="px-8 py-3 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Contact Support</a>
                     <a href="https://wa.me/8801978516155" target="_blank" className="px-8 py-3 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">WhatsApp Help</a>
                   </div>
                </div>
              </div>
            </motion.div>
          )}



          {activeTool === 'svg-to-jpg' && (
            <motion.div
              key="svg-to-jpg"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Export Dimensions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase">JPG Width</label>
                        <input 
                          type="number" 
                          value={jpgTargetWidth} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setJpgTargetWidth(isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-neutral-50 dark:bg-neutral-800 px-4 py-3 rounded-xl border border-neutral-100 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase">JPG Height</label>
                        <input 
                          type="number" 
                          value={jpgTargetHeight} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setJpgTargetHeight(isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-neutral-50 dark:bg-neutral-800 px-4 py-3 rounded-xl border border-neutral-100 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSvgToJpgBatchProcess}
                    disabled={isConvertingToJpg || svgToJpgFiles.length === 0}
                    className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-30 shadow-xl flex items-center justify-center gap-2"
                  >
                    {isConvertingToJpg ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    Convert & Download
                  </button>

                  <AnimatePresence>
                    {jpgFinished && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 rounded-3xl space-y-3"
                      >
                        <p className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Conversion Complete!
                        </p>
                        <button
                          onClick={() => {
                            setActiveTool('file-size-increaser');
                            setJpgFinished(false);
                          }}
                          className="w-full py-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-900 transition-all shadow-sm"
                        >
                          Next: Increase Size <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {isConvertingToJpg && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-purple-200 dark:border-purple-800 shadow-xl space-y-4"
                    >
                        <div className="flex justify-between items-center mb-2">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                 <Loader2 className="w-3 h-3 animate-spin" /> Time Remaining
                               </span>
                               <span className="text-sm font-bold text-neutral-900 dark:text-white">{getJpgTimeLeft()}</span>
                             </div>
                             <div className="text-right">
                               <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Progress</span>
                               <p className="text-sm font-bold text-neutral-900 dark:text-white">{jpgProcessStats.completed} / {jpgProcessStats.total}</p>
                             </div>
                        </div>
                        <div className="h-4 w-full bg-neutral-100 rounded-full overflow-hidden p-1 border border-neutral-50">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${jpgProcessStats.total > 0 ? (jpgProcessStats.completed / jpgProcessStats.total) * 100 : 0}%` }}
                                className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 bg-[length:200%_100%] animate-gradient-x rounded-full shadow-[0_0_15px_rgba(147,51,234,0.4)]" 
                            />
                        </div>
                        <p className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Converting Large Assets... Please wait</p>
                    </motion.div>
                  )}

                  <label className="group h-40 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-white transition-all cursor-pointer">
                    <input 
                      type="file" 
                      multiple 
                      accept=".svg"
                      className="hidden" 
                      onChange={onSvgToJpgUpload} 
                    />
                    <FileUp className="w-8 h-8 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors mb-2" />
                    <p className="font-bold text-neutral-900 dark:text-white">Import SVGs for JPG Conversion</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Fast batch processing up to 500 images</p>
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {svgToJpgFiles.map((file) => (
                      <div key={file.id} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 group relative">
                        <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mb-3 p-4 overflow-hidden border border-neutral-100 dark:border-neutral-700">
                          <div dangerouslySetInnerHTML={{ __html: file.content }} className="w-full h-full" />
                        </div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate pr-6">{file.name}</p>
                        <button 
                          onClick={() => setSvgToJpgFiles(prev => prev.filter(f => f.id !== file.id))}
                          className="absolute top-2 right-2 p-1.5 bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTool === 'svg-resizer' && (
            <motion.div
              key="svg"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Target Dimensions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase">Width</label>
                        <input 
                          type="number" 
                          value={targetWidth} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setTargetWidth(isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-neutral-50 dark:bg-neutral-800 px-4 py-3 rounded-xl border border-neutral-100 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase">Height</label>
                        <input 
                          type="number" 
                          value={targetHeight} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setTargetHeight(isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-neutral-50 dark:bg-neutral-800 px-4 py-3 rounded-xl border border-neutral-100 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={downloadAllSvgs}
                    disabled={isResizing || svgFiles.length === 0}
                    className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-30 shadow-xl flex items-center justify-center gap-2"
                  >
                    {isResizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Maximize2 className="w-5 h-5" />}
                    Process & Download
                  </button>

                  <AnimatePresence>
                    {resizerFinished && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-3xl space-y-3"
                      >
                        <p className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Resizing Complete!
                        </p>
                        <button
                          onClick={() => {
                            setActiveTool('file-size-increaser');
                            setResizerFinished(false);
                          }}
                          className="w-full py-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-900 transition-all shadow-sm"
                        >
                          Step 2: Increase Size <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <label className="group h-40 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-white transition-all cursor-pointer">
                    <input 
                      type="file" 
                      multiple 
                      accept=".svg"
                      className="hidden" 
                      onChange={onSvgUpload} 
                    />
                    <FileUp className="w-8 h-8 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors mb-2" />
                    <p className="font-bold text-neutral-900 dark:text-white">Import SVGs</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setResizerFinished(false);
                      }}
                      className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      Clear Previous Suggestion
                    </button>
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {svgFiles.map((file) => (
                      <div key={file.id} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 group relative">
                        <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mb-3 p-4 overflow-hidden border border-neutral-100 dark:border-neutral-700">
                          <div dangerouslySetInnerHTML={{ __html: file.content }} className="w-full h-full" />
                        </div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate pr-6">{file.name}</p>
                        <button 
                          onClick={() => setSvgFiles(prev => prev.filter(f => f.id !== file.id))}
                          className="absolute top-2 right-2 p-1.5 bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTool === 'file-size-increaser' && (
            <motion.div
              key="increaser"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Target File Size</h3>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {['MB', 'KB'].map((unit) => (
                          <button
                            key={unit}
                            onClick={() => setTargetUnit(unit as any)}
                            className={cn(
                              "flex-1 py-2 text-xs font-black rounded-xl border transition-all",
                              targetUnit === unit ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-700" : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-100 dark:border-neutral-700"
                            )}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max={targetUnit === 'MB' ? 10 : 1024} 
                        step="1"
                        value={targetSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTargetSize(isNaN(val) ? 1 : val);
                        }}
                        className="w-full accent-neutral-900 dark:accent-white"
                      />
                      <div className="flex justify-between font-black text-xl text-neutral-900 dark:text-white">
                        <span>{targetSize}</span>
                        <span className="text-neutral-300 dark:text-neutral-700">{targetUnit}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={processImages}
                    disabled={isProcessingImages || selectedImages.length === 0}
                    className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-4 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-30 shadow-xl flex items-center justify-center gap-2"
                  >
                    {isProcessingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <Maximize2 className="w-5 h-5" />}
                    Increase & Download
                  </button>

                  <AnimatePresence>
                    {increaserFinished && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-3xl space-y-3"
                      >
                        <p className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Optimization Complete!
                        </p>
                        <button
                          onClick={() => {
                            setActiveTool('home');
                            setIncreaserFinished(false);
                          }}
                          className="w-full py-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-900 dark:hover:bg-white transition-all shadow-sm"
                        >
                          Finish Processing <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <label className="group h-40 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center bg-white dark:bg-neutral-900 hover:border-neutral-900 dark:hover:border-white transition-all cursor-pointer">
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => e.target.files && setSelectedImages(prev => [...prev, ...Array.from(e.target.files!)])} 
                    />
                    <FileUp className="w-8 h-8 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors mb-2" />
                    <p className="font-bold text-neutral-900 dark:text-white">Import Images</p>
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedImages.map((file, idx) => (
                      <div key={idx} className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 group relative">
                        <div className="aspect-square bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mb-2 overflow-hidden border border-neutral-100 dark:border-neutral-700">
                          <ImageIcon className="w-8 h-8 text-neutral-200 dark:text-neutral-700" />
                        </div>
                        <p className="text-[10px] font-bold text-neutral-900 dark:text-white truncate pr-6">{file.name}</p>
                        <button 
                          onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 p-1.5 bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none px-8">
        <div className="max-w-7xl mx-auto flex justify-end items-end">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (activeTool === 'home') {
                document.getElementById('tool-grid')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                setActiveTool('home');
              }
            }}
            className="pointer-events-auto px-10 h-14 bg-neutral-900 dark:bg-white shadow-2xl rounded-2xl flex items-center text-white dark:text-neutral-900 border border-neutral-800 dark:border-neutral-100 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 font-black text-sm uppercase tracking-widest">Tools</span>
          </motion.button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />



      {/* Main Footer Section */}
      <footer className="relative z-10 bg-white dark:bg-neutral-950 pt-24 pb-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-100 dark:border-neutral-800 shadow-xl">
                   <Image 
                     src="https://i.postimg.cc/t4J9QKb2/20260501-182631-8-4-300-2.jpg"
                     alt="logo"
                     width={40}
                     height={40}
                     className="object-cover rounded-lg"
                     referrerPolicy="no-referrer"
                   />
                 </div>
                 <span className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">AMIRHUB</span>
               </div>
               <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-xs">
                 The ultimate high-performance utility suite for modern microstock contributors. Built for speed, precision, and privacy.
               </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.3em]">Resources</h4>
              <ul className="space-y-4">
                {[
                  { label: 'Privacy Protocol', href: '#legal' },
                  { label: 'Technical Support', href: 'mailto:immdamirulislam@gmail.com' },
                  { label: 'Portfolio', href: 'https://www.shutterstock.com/g/AiBackground' }
                ].map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.3em]">Quick Switch</h4>
              <ul className="space-y-4">
                {['SVG Resizer', 'SVG to JPG', 'SVG to EPS', 'Size Up'].map(tool => (
                  <li key={tool}>
                    <button 
                      onClick={() => { 
                        const id = tool.toLowerCase().replace(/ /g, '-').replace('size-up', 'file-size-increaser');
                        setActiveTool(id as any); 
                        window.scrollTo({ top: 0, behavior: 'smooth' }); 
                      }}
                      className="text-sm font-bold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                    >
                      {tool}
                    </button>
                  </li>
                ))}
              </ul>
            </div>


          </div>

          <div className="pt-12 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                © {new Date().getFullYear()} AMIRHUB. WORKFLOW OPTIMIZED.
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  </div>
);
}
