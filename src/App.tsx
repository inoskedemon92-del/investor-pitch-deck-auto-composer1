import React, { useState, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Link as LinkIcon, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ChevronRight,
  LayoutDashboard,
  Target,
  Zap,
  Users,
  TrendingUp,
  Briefcase,
  Calendar,
  Handshake,
  PieChart,
  ShieldCheck,
  Presentation,
  Download,
  Edit3,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowRight,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { composeResearch, generateSlides } from './services/geminiService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface BMCData {
  research_output: {
    business_model_canvas: {
      "1_value_proposition": {
        problem_solved: string;
        needs_satisfied: string;
        usp: string;
        reason_to_spend: string;
      };
      "2_target_customer_segment": string;
      "3_channels": string;
      "4_customer_relations": {
        retention_strategy: string;
        type: string;
      };
      "5_revenue_streams": {
        sources: string;
        willingness_to_pay: string;
      };
      "6_key_resources": string;
      "7_key_activities_and_timeline": {
        activities: string;
        estimated_timeline: string;
      };
      "8_key_partners": string;
      "9_cost_structure": {
        breakdown_narrative: string;
        fixed_costs: string;
        variable_costs: string;
      };
      "10_competitive_advantage": {
        advantage_narrative: string;
        win_type: string;
      };
    };
    meta_data: {
      input_sources_processed: string[];
      research_confidence_score: string;
    };
  };
}

interface Slide {
  title: string;
  content: string;
  bullet_points: string[];
  visual_suggestion: string;
  stats?: string[];
}

interface SlideDeck {
  slides: Slide[];
}

type AppStep = 'input' | 'research' | 'slides';

export default function App() {
  const [step, setStep] = useState<AppStep>('input');
  const [input, setInput] = useState('');
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [researchResult, setResearchResult] = useState<BMCData | null>(null);
  const [slideDeck, setSlideDeck] = useState<SlideDeck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Slide Editing State
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const handleCompose = async () => {
    if (!input.trim() && !urls.trim()) return;
    
    setLoading(true);
    setError(null);
    setStep('research');
    try {
      const urlList = urls.split('\n').filter(u => u.trim().startsWith('http'));
      const data = await composeResearch(input, urlList);
      setResearchResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSlides = async () => {
    if (!researchResult) return;
    setLoading(true);
    try {
      const deck = await generateSlides(researchResult);
      setSlideDeck(deck);
      setStep('slides');
      setActiveSlideIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate slides');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!slideDeck) return;
    setExporting(true);
    const pdf = new jsPDF('landscape', 'px', [1280, 720]);
    
    try {
      for (let i = 0; i < slideDeck.slides.length; i++) {
        setActiveSlideIndex(i);
        // Wait for state update and render
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (slideRef.current) {
          const canvas = await html2canvas(slideRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, 1280, 720);
          if (i < slideDeck.slides.length - 1) {
            pdf.addPage();
          }
        }
      }
      pdf.save('Pitch_Deck.pdf');
    } catch (err) {
      setError('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportBMC = async () => {
    if (!researchResult) return;
    setExporting(true);
    const pdf = new jsPDF('portrait', 'px', [794, 1123]); // A4 size at 96 DPI
    const element = document.getElementById('bmc-grid');
    try {
      if (element) {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 794;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save('Business_Model_Canvas.pdf');
      }
    } catch (err) {
      setError('Failed to export BMC PDF');
    } finally {
      setExporting(false);
    }
  };

  const updateSlide = (updatedSlide: Slide) => {
    if (!slideDeck) return;
    const newSlides = [...slideDeck.slides];
    newSlides[activeSlideIndex] = updatedSlide;
    setSlideDeck({ slides: newSlides });
  };

  const copyJSON = () => {
    if (!researchResult) return;
    navigator.clipboard.writeText(JSON.stringify(researchResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Investor Pitch Deck Auto Composer</h1>
            <p className="text-xs text-black/50 uppercase tracking-widest font-medium">
              {step === 'input' ? 'Input Phase' : step === 'research' ? 'Research Phase' : 'Slide Generation Phase'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {step === 'research' && researchResult && (
            <>
              <button 
                onClick={copyJSON}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-colors text-sm font-medium"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
              <button 
                onClick={handleGenerateSlides}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium"
              >
                <Presentation className="w-4 h-4" />
                Generate Slides
              </button>
            </>
          )}
          {step === 'slides' && (
            <>
              <button 
                onClick={() => setStep('research')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Research
              </button>
              <button 
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium shadow-lg shadow-black/10 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-8 py-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">Transform your idea into a <span className="text-black/40 italic">winning pitch.</span></h2>
                <p className="text-black/50 text-lg">Provide your business concept, and our AI agent will conduct deep market research and compose a full investor deck.</p>
              </div>

              <section className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8 space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Raw Idea & Context
                  </label>
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe your business idea, founder bios, funding goals, and any raw data..."
                    className="w-full h-64 p-6 rounded-2xl bg-[#F9F9F9] border border-black/5 focus:ring-4 focus:ring-black/5 focus:bg-white focus:border-black outline-none transition-all resize-none text-base leading-relaxed"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-black/40 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Reference URLs
                  </label>
                  <textarea 
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                    placeholder="Paste URLs (one per line) for market research..."
                    className="w-full h-24 p-6 rounded-2xl bg-[#F9F9F9] border border-black/5 focus:ring-4 focus:ring-black/5 focus:bg-white focus:border-black outline-none transition-all resize-none text-sm"
                  />
                </div>

                <button 
                  onClick={handleCompose}
                  disabled={loading || (!input.trim() && !urls.trim())}
                  className="w-full py-5 bg-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-xl shadow-black/10"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  {loading ? 'Analyzing Market Data...' : 'Start Research Workflow'}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-900 font-medium">{error}</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {step === 'research' && (
            <motion.div 
              key="research"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Meta & Status */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-black/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold">Research Complete</h3>
                      <p className="text-xs text-black/40">Market data synthesized</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setStep('input');
                      setResearchResult(null);
                      setSlideDeck(null);
                    }}
                    className="text-xs font-bold text-black/40 hover:text-black transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Reset
                  </button>
                </div>

                  {researchResult && (
                    <div className="space-y-4 pt-4 border-t border-black/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-black/60 font-medium">Confidence Score</span>
                        <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                          {researchResult.research_output.meta_data.research_confidence_score}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-black/30">Sources Processed</span>
                        <div className="flex flex-wrap gap-2">
                          {researchResult.research_output.meta_data.input_sources_processed.map((source, i) => (
                            <span key={i} className="text-[10px] bg-black/5 px-2 py-1 rounded-md font-bold text-black/60">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button 
                          onClick={handleExportBMC}
                          disabled={exporting}
                          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-colors text-xs font-bold disabled:opacity-50"
                        >
                          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          {exporting ? 'Exporting...' : 'PDF Report'}
                        </button>
                        <button 
                          onClick={copyJSON}
                          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-black/10 hover:bg-black/5 transition-colors text-xs font-bold"
                        >
                          {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : 'JSON Data'}
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleGenerateSlides}
                    disabled={loading}
                    className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black/90 transition-all shadow-lg shadow-black/5"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Presentation className="w-5 h-5" />}
                    Generate Investor Deck
                  </button>
                </div>
              </div>

              {/* Right Column: BMC Grid */}
              <div className="lg:col-span-8 space-y-6">
                {researchResult ? (
                  <div id="bmc-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-3xl border border-black/5">
                    <BMCSection 
                      icon={<Target className="w-5 h-5" />}
                      title="1. Value Proposition"
                      className="md:col-span-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <SubSection label="Problem Solved" content={researchResult.research_output.business_model_canvas["1_value_proposition"].problem_solved} />
                        <SubSection label="Needs Satisfied" content={researchResult.research_output.business_model_canvas["1_value_proposition"].needs_satisfied} />
                        <SubSection label="Unique Selling Proposition" content={researchResult.research_output.business_model_canvas["1_value_proposition"].usp} />
                        <SubSection label="Reason to Spend" content={researchResult.research_output.business_model_canvas["1_value_proposition"].reason_to_spend} />
                      </div>
                    </BMCSection>

                    <BMCSection icon={<Users className="w-5 h-5" />} title="2. Target Customer Segment">
                      <p className="text-sm leading-relaxed text-black/70">{researchResult.research_output.business_model_canvas["2_target_customer_segment"]}</p>
                    </BMCSection>

                    <BMCSection icon={<ChevronRight className="w-5 h-5" />} title="3. Channels">
                      <p className="text-sm leading-relaxed text-black/70">{researchResult.research_output.business_model_canvas["3_channels"]}</p>
                    </BMCSection>

                    <BMCSection icon={<TrendingUp className="w-5 h-5" />} title="4. Customer Relations">
                      <div className="space-y-4">
                        <SubSection label="Type" content={researchResult.research_output.business_model_canvas["4_customer_relations"].type} />
                        <SubSection label="Retention Strategy" content={researchResult.research_output.business_model_canvas["4_customer_relations"].retention_strategy} />
                      </div>
                    </BMCSection>

                    <BMCSection icon={<Briefcase className="w-5 h-5" />} title="5. Revenue Streams">
                      <div className="space-y-4">
                        <SubSection label="Sources" content={researchResult.research_output.business_model_canvas["5_revenue_streams"].sources} />
                        <SubSection label="Willingness to Pay" content={researchResult.research_output.business_model_canvas["5_revenue_streams"].willingness_to_pay} />
                      </div>
                    </BMCSection>

                    <BMCSection icon={<Zap className="w-5 h-5" />} title="6. Key Resources">
                      <p className="text-sm leading-relaxed text-black/70">{researchResult.research_output.business_model_canvas["6_key_resources"]}</p>
                    </BMCSection>

                    <BMCSection icon={<Calendar className="w-5 h-5" />} title="7. Key Activities & Timeline">
                      <div className="space-y-4">
                        <SubSection label="Activities" content={researchResult.research_output.business_model_canvas["7_key_activities_and_timeline"].activities} />
                        <SubSection label="Estimated Timeline" content={researchResult.research_output.business_model_canvas["7_key_activities_and_timeline"].estimated_timeline} />
                      </div>
                    </BMCSection>

                    <BMCSection icon={<Handshake className="w-5 h-5" />} title="8. Key Partners">
                      <p className="text-sm leading-relaxed text-black/70">{researchResult.research_output.business_model_canvas["8_key_partners"]}</p>
                    </BMCSection>

                    <BMCSection icon={<PieChart className="w-5 h-5" />} title="9. Cost Structure">
                      <div className="space-y-4">
                        <SubSection label="Breakdown" content={researchResult.research_output.business_model_canvas["9_cost_structure"].breakdown_narrative} />
                        <div className="grid grid-cols-2 gap-4">
                          <SubSection label="Fixed Costs" content={researchResult.research_output.business_model_canvas["9_cost_structure"].fixed_costs} />
                          <SubSection label="Variable Costs" content={researchResult.research_output.business_model_canvas["9_cost_structure"].variable_costs} />
                        </div>
                      </div>
                    </BMCSection>

                    <BMCSection icon={<ShieldCheck className="w-5 h-5" />} title="10. Competitive Advantage">
                      <div className="space-y-4">
                        <SubSection label="Win Type" content={researchResult.research_output.business_model_canvas["10_competitive_advantage"].win_type} />
                        <SubSection label="Moat Analysis" content={researchResult.research_output.business_model_canvas["10_competitive_advantage"].advantage_narrative} />
                      </div>
                    </BMCSection>
                  </div>
                ) : (
                  <div className="h-full min-h-[600px] bg-white rounded-2xl border border-black/5 flex flex-col items-center justify-center p-12 space-y-8">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-black/5 border-t-black rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-black animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-bold">Synthesizing Research</h2>
                      <p className="text-sm text-black/40 max-w-sm">Our AI agent is performing deep market analysis and filling out the Business Model Canvas parameters...</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 'slides' && slideDeck && (
            <motion.div 
              key="slides"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Slide Navigator */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                  <div className="p-4 border-b border-black/5 bg-black/5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">Slide Deck Navigator</h3>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto p-2 space-y-1">
                    {slideDeck.slides.map((slide, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setActiveSlideIndex(idx);
                          setIsEditing(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                          activeSlideIndex === idx 
                            ? 'bg-black text-white shadow-lg shadow-black/10' 
                            : 'hover:bg-black/5 text-black/60'
                        }`}
                      >
                        <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                          activeSlideIndex === idx ? 'bg-white/20' : 'bg-black/5'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold truncate">{slide.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Slide Editor/Preview */}
              <div className="lg:col-span-9 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      disabled={activeSlideIndex === 0}
                      onClick={() => setActiveSlideIndex(prev => prev - 1)}
                      className="p-2 rounded-full hover:bg-black/5 disabled:opacity-20 transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-black/40">Slide {activeSlideIndex + 1} of {slideDeck.slides.length}</span>
                    <button 
                      disabled={activeSlideIndex === slideDeck.slides.length - 1}
                      onClick={() => setActiveSlideIndex(prev => prev + 1)}
                      className="p-2 rounded-full hover:bg-black/5 disabled:opacity-20 transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold ${
                      isEditing ? 'bg-emerald-600 text-white' : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {isEditing ? 'Save Changes' : 'Edit Slide'}
                  </button>
                </div>

                {/* Slide Preview Area */}
                <div className="relative group">
                  <div 
                    ref={slideRef}
                    className="aspect-video bg-white rounded-3xl shadow-2xl shadow-black/10 border border-black/5 p-16 flex flex-col justify-center overflow-hidden"
                  >
                    {isEditing ? (
                      <div className="space-y-8 h-full">
                        <input 
                          value={slideDeck.slides[activeSlideIndex].title}
                          onChange={(e) => updateSlide({ ...slideDeck.slides[activeSlideIndex], title: e.target.value })}
                          className="text-5xl font-bold tracking-tight w-full bg-black/5 p-2 rounded-xl outline-none"
                        />
                        <textarea 
                          value={slideDeck.slides[activeSlideIndex].content}
                          onChange={(e) => updateSlide({ ...slideDeck.slides[activeSlideIndex], content: e.target.value })}
                          className="text-xl text-black/60 w-full bg-black/5 p-2 rounded-xl outline-none h-24 resize-none"
                        />
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-black/30">Bullet Points</h4>
                          {slideDeck.slides[activeSlideIndex].bullet_points.map((bp, i) => (
                            <input 
                              key={i}
                              value={bp}
                              onChange={(e) => {
                                const newBPs = [...slideDeck.slides[activeSlideIndex].bullet_points];
                                newBPs[i] = e.target.value;
                                updateSlide({ ...slideDeck.slides[activeSlideIndex], bullet_points: newBPs });
                              }}
                              className="w-full bg-black/5 p-2 rounded-lg outline-none text-sm"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-12 h-full flex flex-col">
                        <div className="space-y-4">
                          <motion.h2 
                            key={`title-${activeSlideIndex}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-6xl font-black tracking-tighter leading-none"
                          >
                            {slideDeck.slides[activeSlideIndex].title}
                          </motion.h2>
                          <motion.p 
                            key={`content-${activeSlideIndex}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl text-black/50 font-medium max-w-3xl"
                          >
                            {slideDeck.slides[activeSlideIndex].content}
                          </motion.p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-grow">
                          <motion.ul 
                            key={`bullets-${activeSlideIndex}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-4"
                          >
                            {slideDeck.slides[activeSlideIndex].bullet_points.map((bp, i) => (
                              <li key={i} className="flex items-start gap-4">
                                <div className="mt-2 w-2 h-2 bg-black rounded-full shrink-0" />
                                <span className="text-xl font-semibold text-black/80">{bp}</span>
                              </li>
                            ))}
                          </motion.ul>

                          <motion.div 
                            key={`visual-${activeSlideIndex}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="bg-black/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 border border-black/5"
                          >
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                              <Zap className="w-8 h-8 text-black" />
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-black/30">Visual Suggestion</h4>
                              <p className="text-sm font-bold text-black/60 italic leading-relaxed">
                                "{slideDeck.slides[activeSlideIndex].visual_suggestion}"
                              </p>
                            </div>
                            {slideDeck.slides[activeSlideIndex].stats && slideDeck.slides[activeSlideIndex].stats!.length > 0 && (
                              <div className="pt-4 flex flex-wrap justify-center gap-2">
                                {slideDeck.slides[activeSlideIndex].stats!.map((stat, i) => (
                                  <span key={i} className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                    {stat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/20">
                            Investor Pitch Deck / Confidential
                          </div>
                          <div className="text-4xl font-black text-black/5">
                            {String(activeSlideIndex + 1).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BMCSection({ icon, title, children, className = "" }: { icon: React.ReactNode, title: string, children: React.ReactNode, className?: string }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm border border-black/5 p-6 space-y-4 ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-black/5 pb-4">
        <div className="text-black/40">{icon}</div>
        <h3 className="font-bold text-sm tracking-tight">{title}</h3>
      </div>
      <div className="pt-2">
        {children}
      </div>
    </motion.section>
  );
}

function SubSection({ label, content }: { label: string, content: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">{label}</span>
      <p className="text-sm leading-relaxed text-black/80">{content}</p>
    </div>
  );
}
