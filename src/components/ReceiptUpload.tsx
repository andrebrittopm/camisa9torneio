import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadAvPaymentReceipt } from "@/lib/av-receipt-client";

interface ReceiptUploadProps {
  orderId: string;
  receiptAccessToken: string;
  onSuccess: (paymentStatus: string, reviewStatus: string) => void;
  currentPaymentStatus: string;
}

export function ReceiptUpload({ 
  orderId, 
  receiptAccessToken, 
  onSuccess,
  currentPaymentStatus 
}: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 1. Validação local de tamanho (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("O arquivo ultrapassa o limite de 10 MB.");
      return;
    }

    // 2. Validação local de tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Envie uma imagem JPG/PNG ou PDF válido.");
      return;
    }

    setFile(selectedFile);
    setSubmissionId(null); // Novo arquivo = novo submission_id será gerado

    // 3. Preview local
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSubmissionId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !receiptAccessToken || isUploading) return;

    setIsUploading(true);
    
    // Gerar ou reutilizar submissionId
    let currentSubId = submissionId;
    if (!currentSubId) {
      currentSubId = crypto.randomUUID();
      setSubmissionId(currentSubId);
    }

    const result = await uploadAvPaymentReceipt(orderId, receiptAccessToken, currentSubId, file);

    if (result.success && result.data) {
      toast.success("COMPROVANTE ENVIADO!");
      onSuccess(result.data.payment_status, result.data.review_status);
      
      // Limpeza após sucesso
      handleClear();
    } else {
      // Mapeamento de erros amigáveis
      switch (result.code) {
        case 'ORDER_ACCESS_DENIED':
          toast.error("Não foi possível autorizar o envio deste comprovante.");
          break;
        case 'SUBMISSION_KEY_REUSED':
        case 'RECEIPT_NOT_ALLOWED':
          toast.error("O comprovante não pode ser enviado neste momento.");
          break;
        case 'PAYMENT_ALREADY_CONFIRMED':
          toast.error("O pagamento deste pedido já foi confirmado.");
          break;
        case 'PAYLOAD_TOO_LARGE':
          toast.error("O arquivo ultrapassa o limite de 10 MB.");
          break;
        case 'UNSUPPORTED_FILE_TYPE':
          toast.error("Envie uma imagem JPG/PNG ou PDF válido.");
          break;
        case 'RECEIPT_STORAGE_UNAVAILABLE':
          toast.error("Serviço de armazenamento indisponível. Tente novamente.");
          break;
        default:
          toast.error(result.error || "Não foi possível enviar o comprovante agora. Tente novamente.");
      }
    }
    
    setIsUploading(false);
  };

  const isSubmitted = currentPaymentStatus === 'receipt_submitted';

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-[48px] overflow-hidden">
      <div className="p-8 md:p-12 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase tracking-tight">Comprovante PIX</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-ice/40">Anexe o arquivo para validação</p>
          </div>
          
          {isSubmitted && (
            <div className="px-6 py-3 bg-royal/20 border border-royal/30 rounded-2xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-royal-400" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-royal-200 block">Status do Envio</span>
                <span className="text-sm font-black text-white uppercase tracking-wider">Comprovante em Análise</span>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div 
              key="upload-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-64 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all hover:border-gold/30 hover:bg-gold/5 cursor-pointer overflow-hidden"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                    <Upload className="w-8 h-8 text-gold" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black uppercase tracking-widest text-xs text-ice">Clique para selecionar</p>
                    <p className="text-[10px] font-bold text-ice/20 uppercase tracking-widest">JPG, PNG ou PDF até 10MB</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="relative space-y-6">
                  <div className="bg-slate-950/50 border border-white/5 rounded-[32px] p-8 flex flex-col md:flex-row items-center gap-8">
                    {previewUrl ? (
                      <div className="w-32 h-32 rounded-2xl border border-white/10 overflow-hidden bg-white/5">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5">
                        <FileText className="w-12 h-12 text-gold" />
                      </div>
                    )}
                    
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <p className="text-lg font-black text-white truncate max-w-xs">{file.name}</p>
                      <p className="text-[10px] font-bold text-ice/40 uppercase tracking-widest">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}
                      </p>
                    </div>

                    <Button 
                      variant="ghost" 
                      onClick={handleClear}
                      disabled={isUploading}
                      className="h-12 w-12 rounded-full border border-white/10 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <Button 
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full h-20 glow-gold text-xl font-black uppercase tracking-widest rounded-[24px] gap-3"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        Enviar Comprovante
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="success-zone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 space-y-8 text-center"
            >
              <div className="w-20 h-20 bg-green-500/10 border-4 border-slate-950 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-3">
                <h4 className="text-3xl font-black uppercase tracking-tighter">Comprovante Recebido</h4>
                <p className="text-sm text-ice/40 leading-relaxed max-w-md mx-auto uppercase font-bold tracking-widest">
                  Obrigado! Sua submissão foi registrada e passará por conferência manual. Você receberá atualizações via WhatsApp.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
