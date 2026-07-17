#!/bin/bash
sed -i '/<button/,/<\/button>/!b;//!d;/<button/h;//!H;/<\/button>/!d;x;/class.*text-indigo-600.*rounded-lg/d' src/components/DashboardAdmin.tsx
