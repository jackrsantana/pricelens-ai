import re

with open('src/components/DashboardUploadAudit.tsx', 'r') as f:
    text = f.read()

# Replace handleProcessCrop to not call API if it's an edit
process_crop_func = """  const handleProcessCrop = async (percentCrop: { x: number, y: number, width: number, height: number }, croppedBase64: string) => {
    setIsProcessingCrop(true);
    try {
      if (cropMode === 'edit' && selectedOffer) {
        // Just update the crop region without running OCR again
        const updatedOffer = {
          ...selectedOffer,
          boundingBox: percentCrop,
          croppedImageUrl: croppedBase64,
          status: 'reviewed' as const,
          processingTimestamp: new Date().toISOString()
        };
        updateSession({
          extractedOffers: extractedOffers.map(o => o.id === selectedOffer.id ? updatedOffer : o),
          selectedOffer: updatedOffer
        });
      } else {
        // Add new manual offer, run OCR
        const activeModel = localStorage.getItem('gemini_model') || 'gemini-3.5-flash';
        const apiPromise = await fetch('/api/process-crop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: croppedBase64, geminiModel: activeModel })
        });
        const data = await apiPromise.json();
        if (!apiPromise.ok) throw new Error(data.error || 'Falha ao processar recorte');
        
        const newOffer: Offer = {
          id: `manual-${Date.now()}`,
          flyerId: uploadedFlyer.id,
          pageNum: 1,
          marketId: uploadedFlyer.marketId,
          originalName: data.originalName || 'Novo Produto',
          price: data.price || 0,
          previousPrice: data.previousPrice,
          unit: data.unit || 'un',
          confidence: data.confidence || 90,
          boundingBox: percentCrop,
          productCanonicalId: data.productCanonicalId,
          promotionType: data.promotionType || 'Normal',
          status: 'reviewed',
          modelUsed: activeModel,
          processingTimestamp: new Date().toISOString(),
          originalAiResponse: data.originalAiResponse || 'Recorte manual processado',
          croppedImageUrl: croppedBase64
        };

        updateSession({
          extractedOffers: [newOffer, ...extractedOffers],
          selectedOffer: newOffer
        });
      }
    } catch (err: any) {
      alert(`Erro ao analisar recorte: ${err.message}`);
    } finally {
      setIsProcessingCrop(false);
      setCropMode('none');
    }
  };"""

# Find the start and end of handleProcessCrop
start_idx = text.find("const handleProcessCrop = async")
end_idx = text.find("  const handleMarkAuditedAndNext =", start_idx)

text = text[:start_idx] + process_crop_func + "\n\n" + text[end_idx:]

with open('src/components/DashboardUploadAudit.tsx', 'w') as f:
    f.write(text)

