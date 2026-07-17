with open('src/components/DashboardAdmin.tsx', 'r') as f:
    text = f.read()

# 1. Import CropEditorModal if not imported
if "import CropEditorModal from './CropEditorModal';" not in text:
    text = text.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport CropEditorModal from './CropEditorModal';\nimport { Scissors } from 'lucide-react';")

# 2. Add state for crop editor
if "const [editingCropOffer, setEditingCropOffer] = useState<Offer | null>(null);" not in text:
    state_idx = text.find('const [cropSearch, setCropSearch] = useState')
    text = text[:state_idx] + "const [editingCropOffer, setEditingCropOffer] = useState<Offer | null>(null);\n  " + text[state_idx:]

# 3. Modify the 'crops' tab to render CropEditorModal
crops_tab_start = text.find("case 'crops':")
render_crops_end = text.find("return (", crops_tab_start)

# In the 'crops' tab, we find the "Ação" button and replace it with "Ajustar Recorte"
# But we need to target specifically the Ação button inside `case 'crops':`.
# Instead of replacing all, I'll find the button string inside case 'crops':
btn_str = '<button className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Ação</button>'
crops_action_start = text.find(btn_str, crops_tab_start)
while crops_action_start != -1 and crops_action_start < text.find("case 'products':", crops_tab_start):
    text = text[:crops_action_start] + """<button onClick={() => setEditingCropOffer(o)} className="flex items-center gap-1.5 p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Ajustar Recorte">
                          <Scissors className="w-4 h-4" /> Ajustar Recorte
                        </button>""" + text[crops_action_start + len(btn_str):]
    crops_action_start = text.find(btn_str, crops_tab_start)

# 4. Inject the CropEditorModal in the case 'crops' JSX
crops_jsx_end = text.find("</div>\n        );", crops_tab_start)
if crops_jsx_end != -1:
    modal_jsx = """
            <AnimatePresence>
              {editingCropOffer && (
                <CropEditorModal
                  imageUrl={flyers.find(f => f.id === editingCropOffer.flyerId)?.imageUrl || ''}
                  initialCrop={editingCropOffer.boundingBox}
                  onClose={() => setEditingCropOffer(null)}
                  onConfirm={async (percentCrop, croppedBase64) => {
                    const updatedOffer = {
                      ...editingCropOffer,
                      boundingBox: percentCrop,
                      croppedImageUrl: croppedBase64,
                      processingTimestamp: new Date().toISOString()
                    };
                    await onUpdateOffer(updatedOffer);
                    setEditingCropOffer(null);
                  }}
                />
              )}
            </AnimatePresence>
    """
    text = text[:crops_jsx_end] + modal_jsx + text[crops_jsx_end:]


# 5. Remove or replace all OTHER empty Ação buttons. The instructions say "Nenhum botão deve existir apenas como elemento visual".
# In DashboardAdmin, let's just remove them to avoid fake buttons.
text = text.replace('<button className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Ação</button>', '')

with open('src/components/DashboardAdmin.tsx', 'w') as f:
    f.write(text)

