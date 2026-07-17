import re

with open('src/components/DashboardUploadAudit.tsx', 'r') as f:
    text = f.read()

missing_code = """
  // Track history for undo
  useEffect(() => {
    if (historyStack.length === 0 || JSON.stringify(historyStack[historyStack.length - 1]) !== JSON.stringify(extractedOffers)) {
      setHistoryStack(prev => [...prev, extractedOffers].slice(-20)); // Keep last 20 states
    }
  }, [extractedOffers]);

  const handleUndo = () => {
    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop(); // remove current state
      const previousState = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      updateSession({ extractedOffers: previousState });
    }
  };

  const filteredOffers = useMemo(() => {
    return extractedOffers.filter(o => {
      const matchSearch = o.originalName.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || 
                         (filter === 'pending' && o.status !== 'reviewed') ||
                         (filter === 'low_confidence' && o.confidence < 85);
      return matchSearch && matchFilter;
    });
  }, [extractedOffers, search, filter]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedOffer && listRef.current) {
      const el = document.getElementById(`offer-item-${selectedOffer.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedOffer?.id]);

  const handleUpdateOffer = (updated: Offer) => {
    updateSession({
      extractedOffers: extractedOffers.map(o => o.id === updated.id ? updated : o),
      selectedOffer: updated.id === selectedOffer?.id ? updated : selectedOffer
    });
  };

"""

target = "  const handleMarkAuditedAndNext ="
text = text.replace(target, missing_code + target)

with open('src/components/DashboardUploadAudit.tsx', 'w') as f:
    f.write(text)

