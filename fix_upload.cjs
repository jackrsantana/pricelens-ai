const fs = require('fs');

let content = fs.readFileSync('src/components/DashboardUpload.tsx', 'utf8');

// DashboardUpload.tsx
content = content.replace(/UploadSession,?\s*/g, '');
content = content.replace(/import \{ sanitizeFlyer \} from '\.\.\/utils\/flyerSanitizer';\n/g, '');
content = content.replace(/Calendar,?\s*/g, '');
content = content.replace(/Eye,?\s*/g, '');
content = content.replace(/MapPin,?\s*/g, '');
content = content.replace(/CheckCircle2,?\s*/g, '');
content = content.replace(/ChevronRight,?\s*/g, '');
content = content.replace(/Trash2,?\s*/g, '');
content = content.replace(/Bug,?\s*/g, '');
content = content.replace(/Code,?\s*/g, '');
content = content.replace(/RefreshCw,?\s*/g, '');
content = content.replace(/Copy,?\s*/g, '');
content = content.replace(/type PipelineStatusStep = [\s\S]*?;\n/g, '');
content = content.replace(/const geminiModel = useTrackedState<string>\('gemini-3\.5-flash', 'DashboardUpload', 'geminiModel'\)\[0\];\n/g, '');

fs.writeFileSync('src/components/DashboardUpload.tsx', content);

let auditContent = fs.readFileSync('src/components/DashboardUploadAudit.tsx', 'utf8');
auditContent = auditContent.replace(/CropIcon,?\s*/g, '');
auditContent = auditContent.replace(/AlertTriangle,?\s*/g, '');
auditContent = auditContent.replace(/Copy,?\s*/g, '');
auditContent = auditContent.replace(/Sparkles,?\s*/g, '');
auditContent = auditContent.replace(/Filter,?\s*/g, '');
auditContent = auditContent.replace(/ChevronRight,?\s*/g, '');
auditContent = auditContent.replace(/Maximize,?\s*/g, '');
auditContent = auditContent.replace(/ArrowRight,?\s*/g, '');
auditContent = auditContent.replace(/Save,?\s*/g, '');
auditContent = auditContent.replace(/RotateCcw,?\s*/g, '');
auditContent = auditContent.replace(/FileText,?\s*/g, '');
auditContent = auditContent.replace(/MapIcon,?\s*/g, '');
auditContent = auditContent.replace(/ListPlus,?\s*/g, '');
auditContent = auditContent.replace(/Info,?\s*/g, '');
auditContent = auditContent.replace(/import \{ APP_CONFIG \} from '\.\.\/config\/app';\n/g, '');
fs.writeFileSync('src/components/DashboardUploadAudit.tsx', auditContent);
