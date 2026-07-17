#!/bin/bash
sed -i -e '/const handleExecuteImport = async () => {/,/  };/c\
  const handleExecuteImport = async () => {\
    if (!importPayload) return;\
    try {\
      const batch = writeBatch(db);\
      Object.entries(importPayload).forEach(([collectionName, docs]) => {\
        (docs as any[]).forEach(docData => {\
          const docId = docData.id;\
          if (docId) {\
            batch.set(doc(db, collectionName, docId), docData);\
          }\
        });\
      });\
      await batch.commit();\
      logAction('"'"'DB_IMPORT'"'"', `Administrador importou backup externo e restaurou dados.`);\
      showSuccess("Banco de dados restaurado com sucesso do arquivo de backup!");\
      setImportFileSummary(null);\
      setImportPayload(null);\
    } catch (err: any) {\
      showError(`Erro na restauração: ${err.message}`);\
    }\
  };\
\
  const handleRestoreBackupFromList = async (bkp: Backup) => {\
    if (window.confirm(`Deseja restaurar a aplicação para o estado do backup "${bkp.id}"? Isso substituirá as tabelas atuais!`)) {\
      try {\
        const payloadDoc = await getDoc(doc(db, '"'"'backup_payloads'"'"', bkp.id));\
        if (payloadDoc.exists()) {\
          const payload = payloadDoc.data();\
          const batch = writeBatch(db);\
          Object.entries(payload).forEach(([collectionName, docs]) => {\
            if (collectionName !== '"'"'id'"'"') {\
              (docs as any[]).forEach(docData => {\
                if (docData.id) {\
                  batch.set(doc(db, collectionName, docData.id), docData);\
                }\
              });\
            }\
          });\
          await batch.commit();\
          logAction('"'"'DB_RESTORE'"'"', `Administrador restaurou backup ${bkp.id}`);\
          showSuccess("Backup restaurado com sucesso!");\
        } else {\
          showError("Dados do backup não encontrados.");\
        }\
      } catch (err: any) {\
        showError(`Erro ao restaurar backup: ${err.message}`);\
      }\
    }\
  };' src/components/DashboardAdmin.tsx
