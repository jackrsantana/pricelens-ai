const fs = require('fs');

let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// handleSaveConfig
content = content.replace(
  `const handleSaveConfig = () => {`,
  `const handleSaveConfig = useCallback(() => {`
);
content = content.replace(
  `    }, 600);\n  };\n\n  const subTabs = [`,
  `    }, 600);\n  }, [stagingOcrThreshold, stagingGeminiModel, stagingStorageLimit, stagingApiLimitRate, setOcrConfidenceThreshold, setGeminiModel, setStorageLimit, setApiLimitRate, logAction]);\n\n  const subTabs = [`
);

// handleOpenMarketModal
content = content.replace(
  `const handleOpenMarketModal = (m?: Market) => {`,
  `const handleOpenMarketModal = useCallback((m?: Market) => {`
);
content = content.replace(
  `    setIsMarketModalOpen(true);\n  };`,
  `    setIsMarketModalOpen(true);\n  }, []);`
);

// handleSaveMarket
content = content.replace(
  `const handleSaveMarket = async () => {`,
  `const handleSaveMarket = useCallback(async () => {`
);
content = content.replace(
  `      showError(\`Erro ao gravar estabelecimento: \${err.message}\`);\n    }\n  };\n\n  const handleDeleteMarket =`,
  `      showError(\`Erro ao gravar estabelecimento: \${err.message}\`);\n    }\n  }, [marketForm, editingMarketId, queryClient, logAction]);\n\n  const handleDeleteMarket =`
);

// handleDeleteMarket
content = content.replace(
  `const handleDeleteMarket = async (id: string, name: string) => {`,
  `const handleDeleteMarket = useCallback(async (id: string, name: string) => {`
);
content = content.replace(
  `      } catch (err: any) {\n        showError(\`Erro ao excluir estabelecimento: \${err.message}\`);\n      }\n    }\n  };\n\n  // ==========================================`,
  `      } catch (err: any) {\n        showError(\`Erro ao excluir estabelecimento: \${err.message}\`);\n      }\n    }\n  }, [queryClient, logAction]);\n\n  // ==========================================`
);

// handleOpenFlyerModal
content = content.replace(
  `const handleOpenFlyerModal = (f: Flyer) => {`,
  `const handleOpenFlyerModal = useCallback((f: Flyer) => {`
);
content = content.replace(
  `    setIsFlyerModalOpen(true);\n  };\n\n  const handleSaveFlyer = async () => {`,
  `    setIsFlyerModalOpen(true);\n  }, []);\n\n  const handleSaveFlyer = useCallback(async () => {`
);

// handleSaveFlyer
content = content.replace(
  `      showError(\`Erro ao gravar folheto: \${err.message}\`);\n    }\n  };`,
  `      showError(\`Erro ao gravar folheto: \${err.message}\`);\n    }\n  }, [flyerForm, queryClient, logAction]);`
);

// handleOpenDangerAction
content = content.replace(
  `const handleOpenDangerAction = (action: 'clean' | 'files') => {`,
  `const handleOpenDangerAction = useCallback((action: 'clean' | 'files') => {`
);
content = content.replace(
  `    setIsDangerUnlocked(false);\n  };\n\n  const deleteInBatches`,
  `    setIsDangerUnlocked(false);\n  }, []);\n\n  const deleteInBatches`
);

// deleteInBatches
content = content.replace(
  `const deleteInBatches = async (refs: any[]) => {`,
  `const deleteInBatches = useCallback(async (refs: any[]) => {`
);
content = content.replace(
  `      await batch.commit();\n    }\n  };\n\n  const handleExecuteDangerAction`,
  `      await batch.commit();\n    }\n  }, []);\n\n  const handleExecuteDangerAction`
);

// handleExecuteDangerAction
content = content.replace(
  `const handleExecuteDangerAction = async () => {`,
  `const handleExecuteDangerAction = useCallback(async () => {`
);
content = content.replace(
  `      setIsDangerUnlocked(true);\n    }\n  };\n\n  // ==========================================`,
  `      setIsDangerUnlocked(true);\n    }\n  }, [dangerAction, dangerConfirmPhrase, dangerUnderstandCheckbox, logAction, deleteInBatches]);\n\n  // ==========================================`
);

// Replace subTabs onClick with handleTabClick
content = content.replace(
  `                  onClick={() => {
                    if (activeSubTab !== tab.id) {
                      setActiveSubTab(tab.id);
                      if (tab.id === 'config') {
                        setStagingOcrThreshold(ocrConfidenceThreshold);
                        setStagingGeminiModel(geminiModel);
                        setStagingStorageLimit(storageLimit);
                        setStagingApiLimitRate(apiLimitRate);
                      }
                    }
                    setIsMobileSidebarOpen(false);
                  }}`,
  `                  onClick={() => handleTabClick(tab.id)}`
);

fs.writeFileSync('src/components/DashboardAdmin.tsx', content);
