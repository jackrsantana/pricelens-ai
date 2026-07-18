const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAI.tsx', 'utf8');

code = code.replace(/import React from 'react';\nimport \{ MetricTracker \} from '\.\.\/lib\/instrumentation';, \{ useState, useRef, useEffect, useMemo \} from 'react';/, "import React, { useState, useRef, useEffect, useMemo } from 'react';\nimport { MetricTracker } from '../lib/instrumentation';");

fs.writeFileSync('src/components/DashboardAI.tsx', code);
console.log("Fixed imports in DashboardAI!");
