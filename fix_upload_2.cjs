const fs = require('fs');

// Fix Upload
let uploadCode = fs.readFileSync('src/components/DashboardUpload.tsx', 'utf8');
if (!uploadCode.includes("const queryClient = useQueryClient();")) {
  uploadCode = uploadCode.replace(/export default function DashboardUpload\(\{ onAddFlyerAndOffers \}: Props\) \{/, "export default function DashboardUpload({ onAddFlyerAndOffers }: Props) {\n  const queryClient = useQueryClient();");
}
fs.writeFileSync('src/components/DashboardUpload.tsx', uploadCode);

// Fix Admin Scissors duplicate
let adminCode = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
adminCode = adminCode.replace(/import \{ Scissors \} from 'lucide-react';\nimport \{ Scissors, motion, AnimatePresence \} from 'motion\/react';/, "import { Scissors } from 'lucide-react';\nimport { motion, AnimatePresence } from 'motion/react';");
adminCode = adminCode.replace(/import \{ Scissors \} from 'lucide-react';\nimport \{ Scissors \} from 'lucide-react';/, "import { Scissors } from 'lucide-react';");
// It might be imported multiple times from different places. Let's just remove all Scissors from motion/react
adminCode = adminCode.replace(/Scissors,\s*motion/g, "motion");

// Fix Backup missing type
adminCode = adminCode.replace(/const handleRestoreBackupFromList = async \(bkp: any\) => \{/, "const handleRestoreBackupFromList = async (bkp: Backup) => {"); // wait, if Backup is missing, it needs to be imported!
if (!adminCode.includes("Backup")) {
  adminCode = adminCode.replace(/AuditLog/g, "AuditLog, Backup");
}
fs.writeFileSync('src/components/DashboardAdmin.tsx', adminCode);
console.log("Fixed!");
